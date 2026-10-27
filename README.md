# commitrank

Fast GitHub leaderboards: commits, pull requests, reviews, contributions and followers, ranked by country (or any city), plus a profile page for every GitHub user. The app is built with Nuxt 4 and UnoCSS and runs on Cloudflare Workers with D1 and KV.

## Routes

| Route | What |
| --- | --- |
| `/` | Search + popular leaderboards |
| `/rank/:location?by=commits\|prs\|reviews\|contributions\|followers` | Top 100 (podium + list, instant metric switching, filter) |
| `/u/:login` | Profile: 12-month stats, heatmap, streaks, languages, repos, PRs, exact rank in their country and worldwide |
| `/locations` | ~60 countries; type any city to rank it on the fly |
| `/countries` | Countries ranked against each other (developers, commits, PRs, contributions, per-developer averages) |
| `/repos`, `/repos/trending` | Top repositories worldwide (stars, forks, by language) and new repositories gaining stars fastest |
| `/repos/:owner/:name` | Repository detail: stats, languages, contributors, 52-week commit activity, releases |
| `/compare?a=owner/name&b=owner/name` | Two repositories side by side |
| `/firsts` | GitHub's own firsts: the earliest accounts and repository #1 (press ↑↑↓↓←→←→BA anywhere, too) |
| `/api/leaderboard/:location`, `/api/countries`, `/api/users/:login`, `/api/users/:login/ranks`, `POST /api/users/:login/refresh`, `/api/repos/*`, `/api/firsts`, `/api/search?q=`, `/api/health` | JSON |

## How ranking works

GitHub can't sort users by commits, so commitrank keeps its own index in **D1**:

1. **Discovery.** For each country (search terms include its major cities), the crawler pulls the **1,000 most-followed users** from GitHub search, which is the maximum GitHub returns.
2. **Stats.** Each user's last-12-month commits, PRs, reviews, issues and contributions are fetched with batched GraphQL. They're refreshed about daily.
3. **Boards.** After a crawl slice, the location's leaderboard is rebuilt with one SQL window query (at most every 30 minutes per location) and stored as a single row. A page view is one D1 row read, or zero reads when it's cached in memory.
4. **Automation filter.** Auto-commit scripts can log 1,000+ commits a day. Accounts averaging 100+ commits (or 150+ contributions) per active day are flagged and kept off the rankings. Each board lists them under "Excluded as likely automation".
5. **Location stuffing.** A location naming 6 or more countries ("uk usa india nepal ...") is written to match every country's search, so those developers rank on no country's board. People listing where they've lived name at most 5.
6. **Claim by visiting.** Opening any profile registers that developer with fresh stats. If they make their country's top 100, the board is rebuilt on the spot. Their rank is exact among everyone tracked in the country, plus a worldwide rank when they're in the global top 100.

A profile's **Refresh** button re-fetches it from GitHub (10-minute cooldown) and re-ranks it.

Cron (`*/2 * * * *`, `server/tasks/crawl/step.ts`) discovers one location if due and fetches stats for 40 users per run. That fits the Workers and D1 **free** plans. On Workers Paid, raise `NUXT_CRAWL_BATCH` (for example 150) to crawl about 4× faster.

### Resilience

- Every GitHub-backed value is stale-while-revalidate. If GitHub errors or rate-limits, the last good value is served.
- The crawler pauses itself when the token's hourly GraphQL budget drops below 400 points, keeping headroom for visitors.
- Rate-limit responses are waited out using GitHub's `retry-after` header. Heavy batches that fail are split and retried.
- Search suggestions degrade to "no suggestions" instead of erroring. Profile sections are isolated, so one failing section never breaks the page.
- `GET /api/health` shows the token budget and database coverage.

### GitHub limits

Contribution stats cost GitHub roughly 0.5–1s of compute per active user, and each token gets about 60s per minute (secondary rate limit). Batches are 10 users with 4 in flight, and rate-limit responses are waited out using GitHub's `retry-after`. Add more tokens, from different accounts, comma-separated in `NUXT_GITHUB_TOKEN` to go faster.

## Develop

```sh
pnpm install
pnpm wrangler d1 migrations apply commit-rank --local
NUXT_GITHUB_TOKEN=$(gh auth token) pnpm dev
```

Cron doesn't run in dev. To fill the local database, run crawl rounds by hand. Each call runs about 4 minutes at ~150 users/min:

```sh
curl "localhost:3000/_nitro/tasks/crawl:seed?minutes=4"   # repeat until it returns "idle": true
```

## Deploy (Cloudflare)

Live at **https://commit-rank.jotko.workers.dev**, on the **broisnees** account. Resources, with ids in `wrangler.jsonc`:

- KV `commit-rank-cache`
- D1 `commit-rank`, with migrations 0001–0003 applied
- secrets `NUXT_GITHUB_TOKEN` and `NUXT_ADMIN_TOKEN`; the admin token is kept locally in `.admin-token`, which is gitignored

```sh
pnpm run deploy                                                # nuxt build && wrangler deploy
pnpm wrangler d1 migrations apply commit-rank --remote         # after adding a migration
gh auth token | pnpm wrangler secret put NUXT_GITHUB_TOKEN     # rotate the GitHub token
```

### Syncing data

- **Continuous.** Cron runs every 2 minutes. It discovers one location when due (every 72h) and fetches stats for up to 50 developers in one location. Board contenders (1+ commit a day or 50+ PRs a year) are refreshed daily, never-fetched developers next, and the long tail every 3 days.
- **Claims.** Opening any profile, or pressing *Refresh stats*, syncs that developer at once.
- **Catch-up / seeding.** Crawl locally at full GitHub speed, then push:

```sh
# 1. crawl locally (dev server running): repeat, or loop, until it reports "idle": true
curl "localhost:3000/_nitro/tasks/crawl:seed?minutes=4"
# 2. push developers + crawl state (idempotent; never overwrites fresher production rows)
node scripts/push-seed.mjs --max-stubs 30000
# 3. rebuild production boards from the pushed rows
for o in 0 10 20 30 40 50; do
  curl -s -X POST -H "authorization: Bearer $(cat .admin-token)" \
    "https://commit-rank.jotko.workers.dev/api/admin/rebuild?offset=$o"; echo
done
```

`POST /api/admin/crawl?users=100` runs one crawl step on production on demand, with the same bearer token.

**Free-plan budget.** D1 allows 100k rows written per day. The `users` table is `WITHOUT ROWID` with a single `loc` index, so a stats refresh costs 1 written row and a new developer costs 2. Steady crawling uses about 40k/day. D1 also allows 5M rows read per day. Boards are ranked in the Worker rather than in SQL, where five `ROW_NUMBER()` windows re-read each row about 18 times: a location's board reads its rows once, the global board reads only developers above 80% of its last cutoffs, and the global and country aggregates rebuild every 6h. Per-query costs measured on a copy of production put steady crawling at about 3M rows read per day. Push large seeds in parts (`--max-stubs`) on different days. On Workers Paid, raise `NUXT_CRAWL_BATCH` (for example 150) and push everything at once.

**Test the built Worker locally** (real `workerd`, local D1/KV):

```sh
pnpm build
pnpm wrangler dev --var "NUXT_GITHUB_TOKEN:$(gh auth token)" --test-scheduled
curl "http://localhost:8787/__scheduled?cron=*/2+*+*+*+*"     # fire one crawl step
```

Config (env/secrets): `NUXT_GITHUB_TOKEN` (required, comma-separate several), `NUXT_ADMIN_TOKEN` (enables `/api/admin/*`), `NUXT_CRAWL_BATCH` (default 50), `NUXT_DISCOVER_DEPTH` (default 1000).
The cron pattern in `wrangler.jsonc` must match `scheduledTasks` in `nuxt.config.ts`.

## Layout

```
app/        pages, components (ui/* on Reka UI, Leaderboard/*, Profile/*, Repo/*),
            utils/clientCache + plugins/prefetch (instant nav)
server/     api routes (+ admin/crawl, admin/rebuild); utils: github (GraphQL + REST), stats (discovery +
            batched stats), rankings (D1 boards, countries, claims, ranks, crawler), repos, cache (KV
            stale-while-revalidate); tasks/crawl (cron + seed)
scripts/    push-seed.mjs (local D1 → remote D1)
shared/     types, metrics, locations (countries + city aliases), used by app and server
migrations/ D1 schema
```
