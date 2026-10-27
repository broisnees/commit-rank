/**
 * Run crawl steps on demand (seeding a fresh database, or catching up after deploy).
 * Disabled unless NUXT_ADMIN_TOKEN is set; send it as `authorization: Bearer <token>`.
 * One request runs at most `steps` steps (default 1) so it stays inside Worker limits.
 */
export default defineEventHandler(async event => {
  const { adminToken, discoverDepth } = useRuntimeConfig(event)
  const auth = getRequestHeader(event, 'authorization')
  if (!adminToken || auth !== `Bearer ${adminToken}`) {
    throw createError({ statusCode: 404 })
  }
  const query = getQuery(event)
  const users = Math.min(Math.max(Number(query.users) || 40, 10), 150)
  const steps = Math.min(Math.max(Number(query.steps) || 1, 1), 3)
  const results = []
  for (let i = 0; i < steps; i++) {
    const result = await crawlStep({
      users,
      depth: Number(discoverDepth) || 1000,
      event,
      aggregatesEvery: query.aggregates ? Number(query.aggregates) * 60_000 : undefined,
    })
    results.push(result)
    if (result.paused || (!result.discovered && !result.refreshed.length)) break
  }
  return results
})
