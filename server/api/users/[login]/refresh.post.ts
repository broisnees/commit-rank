const COOLDOWN = 10 * 60 * 1000

/** Re-fetch a profile from GitHub now (10-minute cooldown) and re-rank it. */
export default defineEventHandler(async (event): Promise<Profile> => {
  const login = assertLogin(getRouterParam(event, 'login'))
  const cached = (await peek<Profile>(profileCacheKey(login)))?.v
  const age = cached ? Date.now() - cached.generatedAt : Infinity
  if (age < COOLDOWN) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Refreshed recently, try again in a few minutes',
      data: { retryAfter: Math.ceil((COOLDOWN - age) / 1000) },
    })
  }
  const profile = await getProfile(login, { event, force: true })
  await claimProfile(profile, event).catch(error => console.error(`[refresh] ${login}`, error))
  return profile
})
