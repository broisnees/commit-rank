import { REPO_NAME } from '#shared/types/repos'

export default defineEventHandler(event => {
  const owner = getRouterParam(event, 'owner') ?? ''
  const name = getRouterParam(event, 'name') ?? ''
  if (!REPO_NAME.test(owner) || !REPO_NAME.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid repository name' })
  }
  return getRepoDetail(owner, name, event)
})
