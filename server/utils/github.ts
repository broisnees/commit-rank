import type { H3Event } from 'h3'

interface GraphQLResponse<T> {
  data?: T | null
  errors?: { type?: string; message: string }[]
}

let rotation = 0

function nextToken(event?: H3Event): string {
  const raw =
    (event ? useRuntimeConfig(event) : useRuntimeConfig()).githubToken ||
    process.env.NUXT_GITHUB_TOKEN ||
    (globalThis as { __env__?: Record<string, string> }).__env__?.NUXT_GITHUB_TOKEN ||
    ''
  const tokens = String(raw)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
  if (!tokens.length) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_GITHUB_TOKEN is not configured' })
  }
  return tokens[rotation++ % tokens.length]!
}

/** Normalise fetch failures: 429 (rate limited, with retryAfter), 404, or 502. */
function toGitHubError(error: any) {
  const status: number | undefined = error?.response?.status
  const headers: Headers | undefined = error?.response?.headers
  // Secondary limits send retry-after; primary limits send the reset epoch.
  const reset = Number(headers?.get('x-ratelimit-reset'))
  const retryAfter =
    Number(headers?.get('retry-after')) ||
    (reset ? Math.max(Math.ceil(reset - Date.now() / 1000), 1) : undefined)
  return createError({
    statusCode: status === 403 || status === 429 ? 429 : status === 404 ? 404 : 502,
    statusMessage:
      status === 401
        ? 'GitHub token rejected'
        : status === 404
          ? 'Not found on GitHub'
          : 'GitHub API request failed',
    data: { retryAfter },
    cause: error,
  })
}

/**
 * Minimal GitHub GraphQL client. Partial errors (one aliased user missing) are tolerated
 * and surface as `null` fields; a response with no data at all throws.
 */
export async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
  event?: H3Event,
): Promise<T> {
  let res: GraphQLResponse<T>
  try {
    res = await $fetch<GraphQLResponse<T>>('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'authorization': `bearer ${nextToken(event)}`,
        'user-agent': 'commitrank',
      },
      body: { query, variables },
      timeout: 25_000,
      // callers decide how to retry (heavy batches split instead of repeating)
      retry: 0,
    })
  } catch (error) {
    throw toGitHubError(error)
  }
  if (!res.data) {
    const first = res.errors?.[0]
    throw createError({
      statusCode: first?.type === 'RATE_LIMITED' ? 429 : first?.type === 'NOT_FOUND' ? 404 : 502,
      statusMessage: first?.message ?? 'Empty response from GitHub',
    })
  }
  return res.data
}

/**
 * GitHub REST client for the few things GraphQL lacks (lookup by numeric id, commit
 * activity stats). `path` is relative, e.g. `/user/1` or `/repos/vuejs/core/stats/participation`.
 */
export async function githubREST<T>(
  path: string,
  opts: { query?: Record<string, string | number>; event?: H3Event } = {},
): Promise<T> {
  try {
    return await ($fetch as (url: string, opts: object) => Promise<T>)(`https://api.github.com${path}`, {
      headers: {
        'authorization': `bearer ${nextToken(opts.event)}`,
        'accept': 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'commitrank',
      },
      query: opts.query,
      timeout: 15_000,
      retry: 1,
      retryDelay: 500,
    })
  } catch (error) {
    throw toGitHubError(error)
  }
}

/** Primary GraphQL budget (points left this hour) for the next token in rotation. */
export async function githubRateLimit(event?: H3Event) {
  const { rateLimit } = await githubGraphQL<{
    rateLimit: { limit: number; remaining: number; resetAt: string }
  }>('query { rateLimit { limit remaining resetAt } }', {}, event)
  return rateLimit
}
