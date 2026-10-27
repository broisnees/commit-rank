import type { RepoSort } from '#shared/types/repos'

const SORTS: RepoSort[] = ['stars', 'forks', 'updated']

export default defineEventHandler(event => {
  const query = getQuery(event)
  const sort = SORTS.includes(query.sort as RepoSort) ? (query.sort as RepoSort) : 'stars'
  const lang = typeof query.lang === 'string' && findRepoLanguage(query.lang) ? query.lang : null
  return getTopRepos(sort, lang, event)
})
