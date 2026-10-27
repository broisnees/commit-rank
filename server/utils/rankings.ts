import type { H3Event } from 'h3'
import type { D1Database } from './db'
import type { UserStub } from './stats'

/** Rows shown per metric on a leaderboard. */
export const BOARD_LIMIT = 100
/** Users with no curated country (found via the global search). */
export const OTHER = 'other'

const HOUR = 60 * 60 * 1000
// Tiered freshness: developers who could be on a board (1+ commit a day or 50+ PRs a year)
// are re-fetched daily, the long tail every 3 days. Keeps rankings accurate on a small budget.
const ACTIVE_MAX_AGE = 20 * HOUR
const QUIET_MAX_AGE = 72 * HOUR
const REDISCOVER_AFTER = 72 * HOUR
// A location's board scans its rows several times over, so the crawler rebuilds it at most
// this often; a qualifying profile claim still rebuilds it at once.
const BOARD_REBUILD_AFTER = HOUR / 2
// The global board and country aggregates scan every row, so they run on a slower clock.
const GLOBAL_REBUILD_AFTER = 6 * HOUR
const COUNTRIES_REBUILD_AFTER = 6 * HOUR
const CUSTOM_MAX_AGE = 6 * 60 * 60
/** GraphQL points kept in reserve for visitors; the crawler pauses below this. */
const MIN_RATE_LIMIT = 400
/** Automated accounts listed under a board, for transparency. */
const AUTOMATED_SHOWN = 12

const STAT_COLUMNS =
  'login, id, name, location, company, followers, commits, prs, reviews, issues, contributions, active_days AS activeDays'

const slugFor = (location: string | null, fallback: string) =>
  matchLocation(location)?.slug ?? fallback

// ---------------------------------------------------------------------------
// Writes: one statement per call via json_each (D1 free plan allows 50 queries per invocation)
// ---------------------------------------------------------------------------

/**
 * Insert newly discovered users; refresh profile fields of known ones still waiting for stats.
 * Fetched rows are left alone: their next stats refresh rewrites these fields anyway, and
 * rediscovery re-sees ~1,000 users per location, most with a changed follower count.
 */
export async function saveStubs(db: D1Database, stubs: UserStub[], fallbackSlug: string) {
  if (!stubs.length) return
  const rows = stubs.map(u => ({ ...u, loc: slugFor(u.location, fallbackSlug) }))
  await db
    .prepare(
      `INSERT INTO users (login, id, name, location, company, loc, followers)
       SELECT value ->> 'login', value ->> 'id', value ->> 'name', value ->> 'location',
              value ->> 'company', value ->> 'loc', value ->> 'followers'
       FROM json_each(?1) WHERE true
       ON CONFLICT (login) DO UPDATE SET
         id = excluded.id, name = excluded.name, location = excluded.location,
         company = excluded.company, loc = excluded.loc, followers = excluded.followers
       WHERE users.fetched_at IS NULL AND (
         users.followers != excluded.followers OR users.loc != excluded.loc
         OR users.location IS NOT excluded.location OR users.name IS NOT excluded.name)`,
    )
    .bind(JSON.stringify(rows))
    .run()
}

/** Store fresh contribution stats (and current profile fields). */
export async function saveStats(db: D1Database, users: RankedUser[], fallbackSlug: string) {
  if (!users.length) return
  const now = Date.now()
  const rows = users.map(u => ({
    ...u,
    loc: slugFor(u.location, fallbackSlug),
    active_days: u.activeDays ?? null,
    automated: isAutomated(u) ? 1 : 0,
    fetched_at: now,
  }))
  await db
    .prepare(
      `INSERT INTO users (login, id, name, location, company, loc, followers, commits, prs,
                          reviews, issues, contributions, active_days, automated, fetched_at)
       SELECT value ->> 'login', value ->> 'id', value ->> 'name', value ->> 'location',
              value ->> 'company', value ->> 'loc', value ->> 'followers', value ->> 'commits',
              value ->> 'prs', value ->> 'reviews', value ->> 'issues', value ->> 'contributions',
              value ->> 'active_days', value ->> 'automated', value ->> 'fetched_at'
       FROM json_each(?1) WHERE true
       ON CONFLICT (login) DO UPDATE SET
         id = excluded.id, name = excluded.name, location = excluded.location,
         company = excluded.company, loc = excluded.loc, followers = excluded.followers,
         commits = excluded.commits, prs = excluded.prs, reviews = excluded.reviews,
         issues = excluded.issues, contributions = excluded.contributions,
         active_days = excluded.active_days, automated = excluded.automated,
         fetched_at = excluded.fetched_at`,
    )
    .bind(JSON.stringify(rows))
    .run()
}

/** Users GitHub didn't return (renamed, deleted, dropped batch) wait a full cycle before retrying. */
async function markAttempted(db: D1Database, logins: string[]) {
  if (!logins.length) return
  await db
    .prepare(`UPDATE users SET fetched_at = ?1 WHERE login IN (SELECT value FROM json_each(?2))`)
    .bind(Date.now(), JSON.stringify(logins))
    .run()
}

// ---------------------------------------------------------------------------
// Boards: precomputed per location, one row read per page view
// ---------------------------------------------------------------------------

type BoardRow = RankedUser & { automated: number }

const boardMemory = new Map<string, { at: number; board: Leaderboard }>()
const BOARD_MEMORY_TTL = 60_000

/** Highest first by one metric, ties to the more-followed developer. */
const rankBy = <T extends RankedUser>(users: T[], key: MetricKey) =>
  [...users].sort((a, b) => b[key] - a[key] || b.followers - a.followers)

const withoutFlag = ({ automated: _, ...user }: BoardRow): RankedUser => user

/**
 * Per-metric floors no one below can cross into the global top N, plus the ranked count.
 * Floors sit 20% under the last global board's cutoffs; a metric whose floor no longer leaves
 * N developers above it (or a first build) takes its exact Nth value instead.
 */
async function globalFloors(db: D1Database) {
  const last = await db
    .prepare(`SELECT data FROM boards WHERE loc = 'global'`)
    .first<{ data: string }>()
  const previous = last ? (JSON.parse(last.data) as Leaderboard) : null
  const floors = Object.fromEntries(
    METRIC_KEYS.map(key => [
      key,
      previous && previous.users.length >= BOARD_LIMIT
        ? Math.floor(valueAt(previous, key) * 0.8)
        : Number.MAX_SAFE_INTEGER,
    ]),
  ) as Record<MetricKey, number>
  const counts = await db
    .prepare(
      `SELECT COUNT(*) AS n, ${METRIC_KEYS.map((key, i) => `SUM(${key} >= ?${i + 1}) AS ${key}`).join(', ')}
       FROM users WHERE commits IS NOT NULL AND automated = 0`,
    )
    .bind(...METRIC_KEYS.map(key => floors[key]))
    .first<Record<MetricKey | 'n', number | null>>()
  const n = counts?.n ?? 0
  const needed = Math.min(BOARD_LIMIT, n)
  for (const key of METRIC_KEYS) {
    if ((counts?.[key] ?? 0) >= needed) continue
    const row = await db
      .prepare(
        `SELECT ${key} AS v FROM users WHERE commits IS NOT NULL AND automated = 0
         ORDER BY ${key} DESC LIMIT 1 OFFSET ?1`,
      )
      .bind(needed - 1)
      .first<{ v: number }>()
    floors[key] = row?.v ?? 0
  }
  return { n, floors }
}

/**
 * Rebuild a location's board (or the global one) from tracked users. Ranking runs here, not
 * in SQL: five ROW_NUMBER() windows re-read every row ~18 times. A location's ~1,000 rows are
 * read once; the global board reads only developers above its floors.
 */
export async function buildBoard(db: D1Database, slug: string): Promise<Leaderboard | null> {
  const loc = resolveLocation(slug)
  if (!loc) return null
  const global = slug === 'global'
  const { n, floors } = global ? await globalFloors(db) : { n: undefined, floors: undefined }
  const statement = floors
    ? db
        .prepare(
          `SELECT ${STAT_COLUMNS}, automated FROM users WHERE commits IS NOT NULL AND (
             automated = 1 OR ${METRIC_KEYS.map((key, i) => `${key} >= ?${i + 1}`).join(' OR ')})`,
        )
        .bind(...METRIC_KEYS.map(key => floors[key]))
    : db
        .prepare(`SELECT ${STAT_COLUMNS}, automated FROM users WHERE loc = ?1 AND commits IS NOT NULL`)
        .bind(slug)
  const [{ results: rows }, crawl] = await Promise.all([
    statement.all<BoardRow>(),
    db.prepare('SELECT total FROM crawl WHERE loc = ?1').bind(slug).first<{ total: number | null }>(),
  ])
  const ranked = rows.filter(u => !u.automated)
  if (!ranked.length) return null

  // the union of the top N for every metric
  const top = new Map<string, RankedUser>()
  for (const key of METRIC_KEYS) {
    for (const user of rankBy(ranked, key).slice(0, BOARD_LIMIT)) top.set(user.login, withoutFlag(user))
  }
  const indexedUsers = n ?? ranked.length
  const board: Leaderboard = {
    location: loc,
    users: [...top.values()],
    limit: BOARD_LIMIT,
    indexedUsers,
    totalUsers: Math.max(crawl?.total ?? 0, indexedUsers),
    automated: rankBy(rows.filter(u => u.automated), 'commits')
      .slice(0, AUTOMATED_SHOWN)
      .map(withoutFlag),
    generatedAt: Date.now(),
  }
  await db
    .prepare(
      `INSERT INTO boards (loc, data, built_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (loc) DO UPDATE SET data = excluded.data, built_at = excluded.built_at`,
    )
    .bind(slug, JSON.stringify(board), board.generatedAt)
    .run()
  boardMemory.set(slug, { at: Date.now(), board })
  return board
}

/** Precomputed board from the per-isolate memory or D1; never calls GitHub. */
export async function readBoard(slug: string, event?: H3Event): Promise<Leaderboard | null> {
  const hot = boardMemory.get(slug)
  if (hot && Date.now() - hot.at < BOARD_MEMORY_TTL) return hot.board
  const row = await useDB(event)
    .prepare('SELECT data FROM boards WHERE loc = ?1')
    .bind(slug)
    .first<{ data: string }>()
  if (!row) return hot?.board ?? null
  const board = JSON.parse(row.data) as Leaderboard
  boardMemory.set(slug, { at: Date.now(), board })
  return board
}

const bootstrapping = new Map<string, Promise<Leaderboard | null>>()

/**
 * First visit to a location the crawler hasn't reached yet: rank its 100 most-followed
 * developers right now (10–30s), then the crawler deepens it in the background.
 */
function bootstrapBoard(loc: LocationInfo, event?: H3Event) {
  const pending = bootstrapping.get(loc.slug)
  if (pending) return pending
  const task = (async () => {
    const db = useDB(event)
    const { users: stubs, total } = await discoverUsers(loc, BOARD_LIMIT, event)
    const fallback = loc.slug === 'global' ? OTHER : loc.slug
    await saveStubs(db, stubs, fallback)
    await db
      .prepare(
        `INSERT INTO crawl (loc, total) VALUES (?1, ?2)
         ON CONFLICT (loc) DO UPDATE SET total = excluded.total`,
      )
      .bind(loc.slug, total)
      .run()
    await saveStats(db, await fetchStats(stubs.map(s => s.login), event), fallback)
    return buildBoard(db, loc.slug)
  })().finally(() => bootstrapping.delete(loc.slug))
  bootstrapping.set(loc.slug, task)
  return task
}

/** Any free-text city: ranked on the fly from its 100 most-followed users, cached in KV. */
function customBoard(loc: LocationInfo, event?: H3Event) {
  return swr(`custom:v1:${loc.slug}`, CUSTOM_MAX_AGE, async () => {
    const { users: stubs, total } = await discoverUsers(loc, BOARD_LIMIT, event)
    const users = await fetchStats(stubs.map(s => s.login), event)
    // Their stats also feed the country boards they belong to.
    event?.waitUntil(saveStats(useDB(event), users, OTHER).catch(() => {}))
    return {
      location: loc,
      users,
      limit: BOARD_LIMIT,
      indexedUsers: users.length,
      totalUsers: total,
      generatedAt: Date.now(),
    } satisfies Leaderboard
  }, { event })
}

export async function getLeaderboard(
  slug: string,
  opts: { event?: H3Event; cachedOnly?: boolean } = {},
): Promise<Leaderboard | null> {
  const loc = resolveLocation(slug)
  if (!loc) throw createError({ statusCode: 404, statusMessage: `Unknown location "${slug}"` })
  if (loc.region === 'Custom') {
    if (opts.cachedOnly) return (await peek<Leaderboard>(`custom:v1:${loc.slug}`))?.v ?? null
    return customBoard(loc, opts.event)
  }
  const board = await readBoard(loc.slug, opts.event)
  if (board || opts.cachedOnly) return board
  return bootstrapBoard(loc, opts.event)
}

// ---------------------------------------------------------------------------
// Profiles: visiting a profile puts that developer on the board immediately
// ---------------------------------------------------------------------------

export function profileStats(profile: Profile): RankedUser {
  return {
    id: profile.id,
    login: profile.login,
    name: profile.name,
    location: profile.location,
    company: profile.company,
    followers: profile.followers,
    commits: profile.year.commits,
    prs: profile.year.prs,
    reviews: profile.year.reviews,
    issues: profile.year.issues,
    contributions: profile.year.contributions,
    activeDays: profile.activeDays,
  }
}

const valueAt = (board: Leaderboard, key: MetricKey) =>
  [...board.users].sort((a, b) => b[key] - a[key])[board.limit - 1]?.[key] ?? 0

export async function claimProfile(profile: Profile, event?: H3Event) {
  const db = useDB(event)
  const stats = profileStats(profile)
  const slug = slugFor(profile.location, OTHER)
  await saveStats(db, [stats], OTHER)
  if (slug === OTHER) return
  const board = await readBoard(slug, event)
  const qualifies = !board || METRIC_KEYS.some(key => stats[key] >= valueAt(board, key))
  if (qualifies) await buildBoard(db, slug)
}

export async function rankProfile(profile: Profile, event?: H3Event): Promise<UserRanks> {
  const stats = profileStats(profile)
  const loc = matchLocation(profile.location)
  const global = await readBoard('global', event)
  const globalRanks = global
    ? (Object.fromEntries(
        METRIC_KEYS.map(key => {
          const ahead = global.users.filter(
            u => u.login.toLowerCase() !== stats.login.toLowerCase() && u[key] > stats[key],
          ).length
          // a zero ties with everyone, so it's not a ranking worth showing
          return [key, stats[key] > 0 && ahead < global.limit ? ahead + 1 : null]
        }),
      ) as Record<MetricKey, number | null>)
    : null

  if (!loc) return { location: null, ranks: null, global: globalRanks, pool: 0 }

  const row = await useDB(event)
    .prepare(
      `SELECT COUNT(*) AS n,
              SUM(commits > ?2) AS commits, SUM(prs > ?3) AS prs, SUM(reviews > ?4) AS reviews,
              SUM(contributions > ?5) AS contributions, SUM(followers > ?6) AS followers
       FROM users WHERE loc = ?1 AND commits IS NOT NULL AND automated = 0 AND login != ?7`,
    )
    .bind(
      loc.slug,
      stats.commits,
      stats.prs,
      stats.reviews,
      stats.contributions,
      stats.followers,
      stats.login,
    )
    .first<Record<MetricKey | 'n', number | null>>()

  const ranks = Object.fromEntries(
    METRIC_KEYS.map(key => [key, (row?.[key] ?? 0) + 1]),
  ) as Record<MetricKey, number>
  return {
    location: { slug: loc.slug, name: loc.name, flag: loc.flag },
    ranks,
    global: globalRanks,
    pool: (row?.n ?? 0) + 1,
  }
}

// ---------------------------------------------------------------------------
// Countries: one aggregate row per curated location, precomputed like boards
// ---------------------------------------------------------------------------

interface CountryRow {
  loc: string
  developers: number
  total_commits: number
  total_prs: number
  total_reviews: number
  total_contributions: number
  id: number
  login: string
  name: string | null
  commits: number
}

let countriesMemory: { at: number; board: CountriesBoard } | undefined

export async function buildCountries(db: D1Database): Promise<CountriesBoard> {
  // One scan: per-country sums plus each country's top committer (with a single MAX(),
  // SQLite takes the bare columns from the row holding it).
  const { results } = await db
    .prepare(
      `SELECT loc, COUNT(*) AS developers, SUM(commits) AS total_commits, SUM(prs) AS total_prs,
              SUM(reviews) AS total_reviews, SUM(contributions) AS total_contributions,
              MAX(commits) AS commits, id, login, name
       FROM users
       WHERE commits IS NOT NULL AND automated = 0 AND loc != ?1
       GROUP BY loc`,
    )
    .bind(OTHER)
    .all<CountryRow>()

  const countries: CountryStat[] = results.flatMap(row => {
    const loc = LOCATIONS.find(l => l.slug === row.loc)
    if (!loc) return []
    return [{
      slug: loc.slug,
      name: loc.name,
      flag: loc.flag,
      region: loc.region,
      developers: row.developers,
      commits: row.total_commits,
      prs: row.total_prs,
      reviews: row.total_reviews,
      contributions: row.total_contributions,
      top: { id: row.id, login: row.login, name: row.name, commits: row.commits },
    }]
  }).sort((a, b) => b.commits - a.commits)

  const board: CountriesBoard = { countries, generatedAt: Date.now() }
  await db
    .prepare(
      `INSERT INTO boards (loc, data, built_at) VALUES ('countries', ?1, ?2)
       ON CONFLICT (loc) DO UPDATE SET data = excluded.data, built_at = excluded.built_at`,
    )
    .bind(JSON.stringify(board), board.generatedAt)
    .run()
  countriesMemory = { at: Date.now(), board }
  return board
}

export async function readCountries(event?: H3Event): Promise<CountriesBoard> {
  if (countriesMemory && Date.now() - countriesMemory.at < BOARD_MEMORY_TTL) {
    return countriesMemory.board
  }
  const db = useDB(event)
  const row = await db
    .prepare(`SELECT data FROM boards WHERE loc = 'countries'`)
    .first<{ data: string }>()
  if (!row) return buildCountries(db)
  const board = JSON.parse(row.data) as CountriesBoard
  countriesMemory = { at: Date.now(), board }
  return board
}

// ---------------------------------------------------------------------------
// Crawler: discovers users per location and keeps their stats fresh, a slice per run
// ---------------------------------------------------------------------------

interface CrawlRow {
  loc: string
  total: number | null
  discovered_at: number | null
  refreshed_at: number | null
}

const FEATURED = new Set(FEATURED_SLUGS)

export async function crawlStep(opts: {
  users: number
  depth: number
  event?: H3Event
  /** how stale the global/countries aggregates may get (they scan everyone) */
  aggregatesEvery?: number
  /** minimum time between rebuilds of one location's board */
  boardsEvery?: number
}) {
  const db = useDB(opts.event)
  const now = Date.now()
  const summary: {
    discovered?: string
    refreshed: string[]
    fetched: number
    boards: string[]
    paused?: string
  } = { refreshed: [], fetched: 0, boards: [] }

  // Leave the token's hourly budget to visitors when it runs low.
  const { remaining, resetAt } = await githubRateLimit(opts.event)
  if (remaining < MIN_RATE_LIMIT) {
    summary.paused = `GitHub budget low (${remaining} left until ${resetAt})`
    return summary
  }

  // Featured places first, so a fresh database fills the most visited boards first.
  const ordered = [...FEATURED_SLUGS, ...LOCATIONS.map(l => l.slug).filter(s => !FEATURED.has(s))]
  const discoverable = ordered
  const refreshable = [...ordered.filter(s => s !== 'global'), OTHER]
  let { results: crawl } = await db.prepare('SELECT * FROM crawl').all<CrawlRow>()
  if (crawl.length < refreshable.length + 1) {
    await db
      .prepare('INSERT OR IGNORE INTO crawl (loc) SELECT value FROM json_each(?1)')
      .bind(JSON.stringify([...new Set([...discoverable, ...refreshable])]))
      .run()
    crawl = (await db.prepare('SELECT * FROM crawl').all<CrawlRow>()).results
  }
  const byLoc = new Map(crawl.map(c => [c.loc, c]))

  // 1. Discovery: one location per run, never-seen first, then anything older than 3 days.
  const discover = discoverable
    .map(slug => byLoc.get(slug)!)
    .filter(c => now - (c.discovered_at ?? 0) > REDISCOVER_AFTER)
    .sort((a, b) => (a.discovered_at ?? 0) - (b.discovered_at ?? 0))[0]
  if (discover) {
    const loc = resolveLocation(discover.loc)!
    const { users, total } = await discoverUsers(loc, opts.depth, opts.event)
    await saveStubs(db, users, loc.slug === 'global' ? OTHER : loc.slug)
    await db
      .prepare('UPDATE crawl SET discovered_at = ?2, total = ?3 WHERE loc = ?1')
      .bind(loc.slug, now, total)
      .run()
    summary.discovered = loc.slug
  }

  // 2. Refresh: spend the user budget on the location waiting longest (a just-discovered
  //    one goes first, featured ones get a head start), most-followed missing/stale users first.
  //    One location per run: a visit reads the location's rows twice (pick users, rebuild the
  //    board), so each visit should refresh as many developers as the budget allows.
  const priority = (c: CrawlRow) =>
    c.loc === summary.discovered
      ? -Infinity
      : (c.refreshed_at ?? 0) - (FEATURED.has(c.loc) ? 2 * HOUR : 0)
  const queue = refreshable.map(slug => byLoc.get(slug)!).sort((a, b) => priority(a) - priority(b))
  const targets = queue.slice(0, 1)
  const { results: built } = await db
    .prepare('SELECT loc, built_at FROM boards WHERE loc IN (SELECT value FROM json_each(?1))')
    .bind(JSON.stringify([...targets.map(t => t.loc), 'global', 'countries']))
    .all<{ loc: string; built_at: number }>()
  const builtAt = (loc: string) => built.find(b => b.loc === loc)?.built_at ?? 0
  let budget = opts.users
  for (const target of targets) {
    if (budget <= 0) break
    const { results } = await db
      .prepare(
        `SELECT login FROM users
         WHERE loc = ?1 AND (
           fetched_at IS NULL OR
           fetched_at < CASE WHEN commits >= 365 OR prs >= 50 THEN ?2 ELSE ?3 END
         )
         -- stale board contenders first (accuracy), then never-fetched (coverage), then the rest
         ORDER BY CASE
                    WHEN fetched_at IS NOT NULL AND (commits >= 365 OR prs >= 50) THEN 0
                    WHEN fetched_at IS NULL THEN 1
                    ELSE 2
                  END,
                  COALESCE(commits, 0) DESC, followers DESC
         LIMIT ?4`,
      )
      .bind(target.loc, now - ACTIVE_MAX_AGE, now - QUIET_MAX_AGE, budget)
      .all<{ login: string }>()
    await db.prepare('UPDATE crawl SET refreshed_at = ?2 WHERE loc = ?1').bind(target.loc, now).run()
    if (!results.length) continue

    const logins = results.map(r => r.login)
    const stats = await fetchStats(logins, opts.event)
    await saveStats(db, stats, target.loc)
    const got = new Set(stats.map(s => s.login.toLowerCase()))
    await markAttempted(db, logins.filter(l => !got.has(l.toLowerCase())))
    budget -= logins.length
    summary.refreshed.push(target.loc)
    summary.fetched += stats.length
    // A slice that skips the rebuild reaches the board at this location's next rebuild.
    const boardDue = now - builtAt(target.loc) > (opts.boardsEvery ?? BOARD_REBUILD_AFTER)
    if (target.loc !== OTHER && boardDue && (await buildBoard(db, target.loc))) {
      summary.boards.push(target.loc)
    }
  }

  // 3. Global and country aggregates scan everyone, so they rebuild on a slower clock.
  if (now - builtAt('global') > (opts.aggregatesEvery ?? GLOBAL_REBUILD_AFTER)) {
    if (await buildBoard(db, 'global')) summary.boards.push('global')
  }
  if (now - builtAt('countries') > (opts.aggregatesEvery ?? COUNTRIES_REBUILD_AFTER)) {
    await buildCountries(db)
    summary.boards.push('countries')
  }

  return summary
}
