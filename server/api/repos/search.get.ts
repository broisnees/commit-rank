export default defineEventHandler(event => searchRepos(String(getQuery(event).q ?? ''), event))
