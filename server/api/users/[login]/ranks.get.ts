/**
 * Exact position among every tracked developer in the user's country, plus worldwide
 * position when in the global top 100. Viewing a profile also (re)registers that developer,
 * so anyone can get ranked by opening their own page.
 */
export default defineEventHandler(async (event): Promise<UserRanks> => {
  const login = assertLogin(getRouterParam(event, 'login'))
  const profile = await getProfile(login, { event })

  const row = await useDB(event)
    .prepare('SELECT fetched_at, commits FROM users WHERE login = ?1')
    .bind(profile.login)
    .first<{ fetched_at: number | null; commits: number | null }>()
  if (row?.commits == null || (row.fetched_at ?? 0) < profile.generatedAt) {
    event.waitUntil(
      claimProfile(profile, event).catch(error => console.error(`[claim] ${login}`, error)),
    )
  }

  return rankProfile(profile, event)
})
