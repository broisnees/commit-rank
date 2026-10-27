/**
 * Rebuild precomputed boards from the database (e.g. after pushing seed data).
 * Same auth as /api/admin/crawl. Pages through ~10 boards per request (D1 free plan:
 * 50 queries per invocation): call with ?offset=0, then the returned `next` until null.
 */
export default defineEventHandler(async event => {
  const { adminToken } = useRuntimeConfig(event)
  if (!adminToken || getRequestHeader(event, 'authorization') !== `Bearer ${adminToken}`) {
    throw createError({ statusCode: 404 })
  }
  const slugs = [...LOCATIONS.map(l => l.slug), 'global']
  const offset = Math.max(Number(getQuery(event).offset) || 0, 0)
  const page = slugs.slice(offset, offset + 10)
  const db = useDB(event)
  const built: string[] = []
  for (const slug of page) if (await buildBoard(db, slug)) built.push(slug)
  const next = offset + page.length < slugs.length ? offset + page.length : null
  if (next === null) await buildCountries(db)
  return { built, next, countries: next === null }
})
