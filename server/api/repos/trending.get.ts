import type { TrendingSince } from '#shared/types/repos'

const SINCE: TrendingSince[] = ['day', 'week', 'month']

export default defineEventHandler(event => {
  const query = getQuery(event)
  const since = SINCE.includes(query.since as TrendingSince) ? (query.since as TrendingSince) : 'week'
  const lang = typeof query.lang === 'string' && findRepoLanguage(query.lang) ? query.lang : null
  return getTrendingRepos(since, lang, event)
})
