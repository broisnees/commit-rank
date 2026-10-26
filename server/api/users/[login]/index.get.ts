export default defineEventHandler(event => {
  const login = assertLogin(getRouterParam(event, 'login'))
  return getProfile(login, { event })
})
