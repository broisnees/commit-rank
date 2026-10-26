const SEARCH_USERS = /* GraphQL */ `
  query ($q: String!) {
    search(type: USER, query: $q, first: 8) {
      nodes { ... on User { databaseId login name followers { totalCount } } }
    }
  }
`

interface SearchResponse {
  search: {
    nodes: ({ databaseId?: number; login?: string; name?: string | null; followers?: { totalCount: number } } | null)[]
  }
}

export default defineEventHandler(async (event): Promise<SearchUser[]> => {
  const q = String(getQuery(event).q ?? '')
    .trim()
    .replace(/[^\w\- ]/g, '')
    .slice(0, 39)
    .toLowerCase()
  if (q.length < 2) return []

  // Suggestions are best-effort: a GitHub hiccup means no suggestions, never an error.
  return swr(`search:v1:${q}`, 24 * 60 * 60, async () => {
    const { search } = await githubGraphQL<SearchResponse>(
      SEARCH_USERS,
      { q: `${q} in:login in:name type:user` },
      event,
    )
    return search.nodes
      .filter(n => n?.login && n.databaseId)
      .map(n => ({
        id: n!.databaseId!,
        login: n!.login!,
        name: n!.name || null,
        followers: n!.followers?.totalCount ?? 0,
      }))
  }, { event }).catch(() => [])
})
