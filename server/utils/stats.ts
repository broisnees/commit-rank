import type { H3Event } from 'h3'

// 10 users per aliased query: 20+ regularly hits GitHub 502s on contribution-heavy fields
const BATCH_SIZE = 10
const PAGE_SIZE = 100
// Contribution queries cost GitHub ~0.5–1s of compute per active user and each token gets
// ~60s of compute per minute (secondary rate limit), so keep a small worker pool.
const CONCURRENCY = 4

const SEARCH_QUERY = /* GraphQL */ `
  query ($q: String!, $after: String) {
    search(type: USER, query: $q, first: 100, after: $after) {
      userCount
      nodes { ... on User { databaseId login name location company followers { totalCount } } }
    }
  }
`

const USER_FRAGMENT = /* GraphQL */ `
  fragment U on User {
    databaseId login name location company
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount } } }
    }
  }
`

interface RawStub {
  databaseId?: number
  login?: string
  name?: string | null
  location?: string | null
  company?: string | null
  followers?: { totalCount: number }
}

interface SearchResponse {
  search: { userCount: number; nodes: (RawStub | null)[] }
}

interface RawUser {
  databaseId: number
  login: string
  name: string | null
  location: string | null
  company: string | null
  followers: { totalCount: number }
  contributionsCollection: {
    totalCommitContributions: number
    totalPullRequestContributions: number
    totalPullRequestReviewContributions: number
    totalIssueContributions: number
    contributionCalendar: {
      totalContributions: number
      weeks: { contributionDays: { contributionCount: number }[] }[]
    }
  }
}

/** A discovered user without contribution stats yet. */
export type UserStub = Pick<RankedUser, 'id' | 'login' | 'name' | 'location' | 'company' | 'followers'>

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export function locationSearchQuery(loc: LocationInfo) {
  const where =
    loc.slug === 'global' ? 'followers:>=1000' : loc.terms.map(t => `location:"${t}"`).join(' ')
  return `${where} type:user sort:followers-desc`
}

// Search cursors are base64("cursor:<offset>"), so every page can be requested at once.
const pageCursor = (page: number) => (page === 0 ? null : btoa(`cursor:${page * PAGE_SIZE}`))

/**
 * The `depth` most-followed GitHub users for a location (GitHub search caps at 1000).
 * Cheap: no contribution data, ~1 request per 100 users.
 */
export async function discoverUsers(loc: LocationInfo, depth: number, event?: H3Event) {
  const q = locationSearchQuery(loc)
  const fetchPage = (page: number) =>
    githubGraphQL<SearchResponse>(SEARCH_QUERY, { q, after: pageCursor(page) }, event).catch(() =>
      githubGraphQL<SearchResponse>(SEARCH_QUERY, { q, after: pageCursor(page) }, event),
    )
  // The first page says how many results exist; only ask for pages that can have users.
  const first = await fetchPage(0)
  const available = Math.min(depth, 1000, first.search.userCount)
  const rest = await mapLimit(
    Array.from({ length: Math.max(Math.ceil(available / PAGE_SIZE) - 1, 0) }, (_, i) => i + 1),
    5,
    page =>
      fetchPage(page).catch(error => {
        console.warn(`[discover] ${loc.slug} page ${page + 1} failed:`, error.message)
        return null
      }),
  )
  const pages = [first, ...rest]
  const seen = new Set<string>()
  const users: UserStub[] = []
  for (const node of pages.flatMap(p => p?.search.nodes ?? [])) {
    if (!node?.login || !node.databaseId || seen.has(node.login.toLowerCase())) continue
    seen.add(node.login.toLowerCase())
    users.push({
      id: node.databaseId,
      login: node.login,
      name: node.name || null,
      location: node.location || null,
      company: node.company?.trim() || null,
      followers: node.followers?.totalCount ?? 0,
    })
  }
  return { users: users.slice(0, depth), total: first.search.userCount }
}

function toRankedUser(u: RawUser): RankedUser {
  const c = u.contributionsCollection
  return {
    id: u.databaseId,
    login: u.login,
    name: u.name || null,
    location: u.location || null,
    company: u.company?.trim() || null,
    followers: u.followers.totalCount,
    commits: c.totalCommitContributions,
    prs: c.totalPullRequestContributions,
    reviews: c.totalPullRequestReviewContributions,
    issues: c.totalIssueContributions,
    contributions: c.contributionCalendar.totalContributions,
    activeDays: c.contributionCalendar.weeks.reduce(
      (sum, w) => sum + w.contributionDays.filter(d => d.contributionCount > 0).length,
      0,
    ),
  }
}

/** Contribution stats for one batch of logins via a single aliased query. */
async function fetchBatch(logins: string[], event?: H3Event, attempt = 0): Promise<RankedUser[]> {
  const fields = logins.map((login, i) => `u${i}: user(login: ${JSON.stringify(login)}) { ...U }`)
  try {
    const data = await githubGraphQL<Record<string, RawUser | null>>(
      `query { ${fields.join(' ')} } ${USER_FRAGMENT}`,
      {},
      event,
    )
    return Object.values(data)
      .filter((u): u is RawUser => !!u?.contributionsCollection)
      .map(toRankedUser)
  } catch (error) {
    const { statusCode, data } = error as { statusCode?: number; data?: { retryAfter?: number } }
    // Secondary rate limit: wait it out (GitHub says how long), then retry the same batch.
    if (statusCode === 429 && attempt < 2) {
      await sleep(Math.min(data?.retryAfter ?? 30, 90) * 1000)
      return fetchBatch(logins, event, attempt + 1)
    }
    if (statusCode === 429) throw error
    // "Resource limits exceeded" / 502 on heavy batches: split and retry the halves.
    if (logins.length <= 2 || attempt > 1) {
      console.warn(`[stats] dropped ${logins.join(',')}:`, (error as Error).message)
      return []
    }
    const mid = Math.ceil(logins.length / 2)
    const halves = await Promise.all(
      [logins.slice(0, mid), logins.slice(mid)].map(part => fetchBatch(part, event, attempt + 1)),
    )
    return halves.flat()
  }
}

/** Contribution stats for many users, batched and rate-limit aware. */
export async function fetchStats(logins: string[], event?: H3Event): Promise<RankedUser[]> {
  const batches: string[][] = []
  for (let i = 0; i < logins.length; i += BATCH_SIZE) batches.push(logins.slice(i, i + BATCH_SIZE))
  return (await mapLimit(batches, CONCURRENCY, batch => fetchBatch(batch, event))).flat()
}
