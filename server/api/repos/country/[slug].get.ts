export default defineEventHandler(event => {
  const slug = String(getRouterParam(event, 'slug') ?? '').toLowerCase()
  const loc = resolveLocation(slug)
  if (!loc || loc.region === 'Custom') throw createError({ statusCode: 404, statusMessage: 'Unknown location' })
  return getCountryRepos(loc.slug, event)
})
