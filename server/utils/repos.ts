import type { H3Event } from 'h3'
import type {
  CountryRepos,
  RepoContributor,
  RepoDetail,
  RepoList,
  RepoListItem,
  RepoSearchItem,
  RepoSort,
  TrendingSince,
} from '#shared/types/repos'
import { findRepoLanguage } from '#shared/types/repos'

const HOUR = 60 * 60

const LIST_FIELDS = /* GraphQL */ `
  nameWithOwner description stargazerCount forkCount createdAt pushedAt
  owner { login avatarUrl(size: 80) }
  primaryLanguage { name color }
`

const SEARCH_LIST = /* GraphQL */ `
  query ($q: String!, $first: Int!) {
    search(type: REPOSITORY, query: $q, first: $first) {
      repositoryCount
      nodes { ... on Repository { ${LIST_FIELDS} } }
    }
  }
`

interface RawListRepo {
  nameWithOwner?: string
  description: string | null
  stargazerCount: number
  forkCount: number
  createdAt: string
  pushedAt: string
  owner: { login: string; avatarUrl: string }
  primaryLanguage: { name: string; color: string | null } | null
}

interface SearchListResponse {
  search: { repositoryCount: number; nodes: (RawListRepo | null)[] }
}

function toListItem(r: RawListRepo): RepoListItem {
  return {
    name: r.nameWithOwner!,
    owner: r.owner.login,
    ownerAvatar: r.owner.avatarUrl,
    description: r.description,
    stars: r.stargazerCount,
    forks: r.forkCount,
    language: r.primaryLanguage,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt,
  }
}

async function searchList(q: string, first: number, event?: H3Event): Promise<RepoList> {
  const { search } = await githubGraphQL<SearchListResponse>(SEARCH_LIST, { q, first }, event)
  return {
    items: search.nodes.filter((n): n is RawListRepo => !!n?.nameWithOwner).map(toListItem),
    total: search.repositoryCount,
    generatedAt: Date.now(),
  }
}

const languageQualifier = (lang: string | null) => {
  const found = findRepoLanguage(lang)
  return found ? ` language:${found.query}` : ''
}

/** Most starred / forked / recently active repositories worldwide. */
export function getTopRepos(sort: RepoSort, lang: string | null, event?: H3Event) {
  const where = {
    stars: 'stars:>1000 sort:stars-desc',
    forks: 'forks:>500 sort:forks-desc',
    // well-known projects ordered by latest push
    updated: 'stars:>10000 sort:updated-desc',
  }[sort]
  const q = `${where}${languageQualifier(lang)} archived:false`
  return swr(`repos:top:v1:${sort}:${lang ?? 'all'}`, 6 * HOUR, () => searchList(q, 100, event), {
    event,
  })
}

const SINCE_DAYS: Record<TrendingSince, number> = { day: 1, week: 7, month: 30 }

/** New repositories gaining stars fastest: created in the window, sorted by stars. */
export function getTrendingRepos(since: TrendingSince, lang: string | null, event?: H3Event) {
  return swr(
    `repos:trending:v1:${since}:${lang ?? 'all'}`,
    HOUR,
    () => {
      const from = new Date(Date.now() - SINCE_DAYS[since] * 86_400_000).toISOString().slice(0, 10)
      return searchList(`created:>=${from} stars:>5 sort:stars-desc${languageQualifier(lang)}`, 100, event)
    },
    { event },
  )
}

const SEARCH_PICKER = /* GraphQL */ `
  query ($q: String!) {
    search(type: REPOSITORY, query: $q, first: 8) {
      nodes { ... on Repository { nameWithOwner description stargazerCount owner { avatarUrl(size: 56) } } }
    }
  }
`

interface PickerResponse {
  search: {
    nodes: ({
      nameWithOwner?: string
      description: string | null
      stargazerCount: number
      owner: { avatarUrl: string }
    } | null)[]
  }
}

/** Repo picker suggestions; "owner/name" matches that repo first. */
export function searchRepos(raw: string, event?: H3Event): Promise<RepoSearchItem[]> {
  const q = raw.trim().toLowerCase().replace(/[^\w./ -]/g, '').slice(0, 80)
  if (q.length < 2) return Promise.resolve([])
  return swr(
    `repos:search:v1:${q}`,
    24 * HOUR,
    async () => {
      const exact = /^[\w.-]+\/[\w.-]+$/.test(q)
      const { search } = await githubGraphQL<PickerResponse>(
        SEARCH_PICKER,
        { q: exact ? `repo:${q}` : `${q} in:name sort:stars-desc` },
        event,
      )
      let nodes = search.nodes
      // "owner/partial" isn't an exact repo: fall back to a fuzzy search on both parts
      if (exact && !nodes.length) {
        const [owner, name] = q.split('/')
        nodes = (
          await githubGraphQL<PickerResponse>(
            SEARCH_PICKER,
            { q: `${name} user:${owner} sort:stars-desc` },
            event,
          ).catch(() => ({ search: { nodes: [] } }))
        ).search.nodes
      }
      return nodes
        .filter(n => n?.nameWithOwner)
        .map(n => ({
          name: n!.nameWithOwner!,
          ownerAvatar: n!.owner.avatarUrl,
          description: n!.description,
          stars: n!.stargazerCount,
        }))
    },
    { event },
  )
}

const REPO_DETAIL = /* GraphQL */ `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner url description homepageUrl createdAt pushedAt isArchived isFork
      owner { __typename login avatarUrl(size: 160) }
      stargazerCount forkCount
      watchers { totalCount }
      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }
      openPrs: pullRequests(states: OPEN) { totalCount }
      mergedPrs: pullRequests(states: MERGED) { totalCount }
      licenseInfo { spdxId name }
      repositoryTopics(first: 12) { nodes { topic { name } } }
      languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
        edges { size node { name color } }
      }
      releases(first: 5, orderBy: { field: CREATED_AT, direction: DESC }) {
        totalCount
        nodes { name tagName url publishedAt }
      }
      defaultBranchRef { name target { ... on Commit { history { totalCount } } } }
    }
  }
`

interface RawDetail {
  repository: null | {
    nameWithOwner: string
    url: string
    description: string | null
    homepageUrl: string | null
    createdAt: string
    pushedAt: string
    isArchived: boolean
    isFork: boolean
    owner: { __typename: 'User' | 'Organization'; login: string; avatarUrl: string }
    stargazerCount: number
    forkCount: number
    watchers: { totalCount: number }
    openIssues: { totalCount: number }
    closedIssues: { totalCount: number }
    openPrs: { totalCount: number }
    mergedPrs: { totalCount: number }
    licenseInfo: { spdxId: string | null; name: string } | null
    repositoryTopics: { nodes: { topic: { name: string } }[] }
    languages: { edges: { size: number; node: { name: string; color: string | null } }[] }
    releases: {
      totalCount: number
      nodes: { name: string | null; tagName: string; url: string; publishedAt: string | null }[]
    }
    defaultBranchRef: { name: string; target: { history?: { totalCount: number } } } | null
  }
}

async function buildRepoDetail(owner: string, name: string, event?: H3Event): Promise<RepoDetail> {
  // Contributors and activity are REST extras: they fail or lag on some repos, never fatally.
  const [graph, contributors, participation] = await Promise.all([
    githubGraphQL<RawDetail>(REPO_DETAIL, { owner, name }, event),
    githubREST<{ login?: string; avatar_url?: string; contributions: number }[]>(
      `/repos/${owner}/${name}/contributors`,
      { query: { per_page: 12 }, event },
    ).catch(() => null),
    githubREST<{ all?: number[] }>(`/repos/${owner}/${name}/stats/participation`, { event }).catch(
      () => null,
    ),
  ])
  const r = graph.repository
  if (!r) throw createError({ statusCode: 404, statusMessage: `Repository ${owner}/${name} not found` })

  const edges = r.languages.edges
  const languages = edges.slice(0, 7).map(e => ({ ...e.node, size: e.size }))
  const rest = edges.slice(7).reduce((sum, e) => sum + e.size, 0)
  if (rest) languages.push({ name: 'Other', color: null, size: rest })

  const list: RepoContributor[] | null = Array.isArray(contributors)
    ? contributors
        .filter(c => c.login && c.avatar_url)
        .map(c => ({ login: c.login!, avatarUrl: c.avatar_url!, contributions: c.contributions }))
    : null

  return {
    name: r.nameWithOwner,
    owner: r.owner.login,
    ownerAvatar: r.owner.avatarUrl,
    ownerType: r.owner.__typename,
    description: r.description,
    url: r.url,
    homepage: r.homepageUrl || null,
    topics: r.repositoryTopics.nodes.map(n => n.topic.name),
    license: r.licenseInfo ? (r.licenseInfo.spdxId && r.licenseInfo.spdxId !== 'NOASSERTION' ? r.licenseInfo.spdxId : r.licenseInfo.name) : null,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt,
    archived: r.isArchived,
    fork: r.isFork,
    stars: r.stargazerCount,
    forks: r.forkCount,
    watchers: r.watchers.totalCount,
    openIssues: r.openIssues.totalCount,
    closedIssues: r.closedIssues.totalCount,
    openPrs: r.openPrs.totalCount,
    mergedPrs: r.mergedPrs.totalCount,
    releases: r.releases.totalCount,
    recentReleases: r.releases.nodes.map(n => ({
      name: n.name || n.tagName,
      tag: n.tagName,
      url: n.url,
      publishedAt: n.publishedAt,
    })),
    defaultBranch: r.defaultBranchRef?.name ?? null,
    commits: r.defaultBranchRef?.target.history?.totalCount ?? null,
    languages,
    contributors: list,
    // 202 "still computing" comes back as an empty body
    activity: Array.isArray(participation?.all) && participation.all.length ? participation.all : null,
    generatedAt: Date.now(),
  }
}

export function getRepoDetail(owner: string, name: string, event?: H3Event) {
  const key = `repos:detail:v1:${owner.toLowerCase()}/${name.toLowerCase()}`
  return swr(key, HOUR, () => buildRepoDetail(owner, name, event), { event })
}

/** Most starred repositories owned by a location's most-followed developers. */
export function getCountryRepos(slug: string, event?: H3Event): Promise<CountryRepos> {
  return swr(
    `repos:country:v1:${slug}`,
    12 * HOUR,
    async () => {
      const board = await readBoard(slug, event)
      const candidates = [...(board?.users ?? [])].sort((a, b) => b.followers - a.followers)
      // GitHub search queries are capped at 256 characters
      const suffix = ' sort:stars-desc'
      const owners: string[] = []
      let length = suffix.length
      for (const user of candidates) {
        const part = ` user:${user.login}`
        if (length + part.length > 250) break
        owners.push(user.login)
        length += part.length
      }
      if (!owners.length) return { slug, owners, items: [], generatedAt: Date.now() }
      const list = await searchList(`${owners.map(o => `user:${o}`).join(' ')}${suffix}`, 20, event)
      return { slug, owners, items: list.items, generatedAt: list.generatedAt }
    },
    { event },
  )
}
