export default defineEventHandler(event => {
  const slug = getRouterParam(event, 'location') ?? ''
  // ?cached=1 never waits on GitHub: SSR uses it so an unbuilt location renders a skeleton
  // immediately and the browser triggers the build.
  return getLeaderboard(slug, { event, cachedOnly: !!getQuery(event).cached })
})
