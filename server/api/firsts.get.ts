interface RestUser {
  id: number
  login: string
  name: string | null
  bio: string | null
  created_at: string
}

interface RestRepo {
  id: number
  full_name: string
  html_url: string
  description: string | null
  created_at: string
  stargazers_count: number
}

/** GitHub's earliest accounts (ids 1–8) and repository #1, looked up live and cached for a month. */
export default defineEventHandler(event =>
  swr('firsts:v1', 30 * 24 * 60 * 60, async (): Promise<GitHubFirsts> => {
    const [users, repo] = await Promise.all([
      Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          githubREST<RestUser>(`/user/${i + 1}`, { event }).catch(() => null),
        ),
      ),
      githubREST<RestRepo>('/repositories/1', { event }).catch(() => null),
    ])
    const found = users.filter((u): u is RestUser => !!u)
    if (!found.length && !repo) {
      throw createError({ statusCode: 502, statusMessage: 'GitHub is not responding' })
    }
    return {
      users: found.map(u => ({
        id: u.id,
        login: u.login,
        name: u.name,
        bio: u.bio,
        createdAt: u.created_at,
      })),
      repo: repo
        ? {
            id: repo.id,
            name: repo.full_name,
            url: repo.html_url,
            description: repo.description,
            createdAt: repo.created_at,
            stars: repo.stargazers_count,
          }
        : null,
      generatedAt: Date.now(),
    }
  }, { event }),
)
