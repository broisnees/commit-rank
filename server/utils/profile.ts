import type { H3Event } from 'h3'

export const PROFILE_MAX_AGE = 60 * 60

const PROFILE_QUERY = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      databaseId login name bio company location websiteUrl twitterUsername createdAt
      followers { totalCount }
      following { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, orderBy: { field: STARGAZERS, direction: DESC }) {
        totalCount
        nodes {
          nameWithOwner url description stargazerCount forkCount
          primaryLanguage { name color }
        }
      }
      mergedPrs: pullRequests(states: MERGED) { totalCount }
      allPrs: pullRequests { totalCount }
      issues { totalCount }
      recentPrs: pullRequests(first: 8, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes { title url number state createdAt repository { nameWithOwner } }
      }
      firstRepo: repositories(first: 1, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes { nameWithOwner url createdAt }
      }
      firstPr: pullRequests(first: 1, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes { title url createdAt repository { nameWithOwner } }
      }
      firstIssue: issues(first: 1, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes { title url createdAt repository { nameWithOwner } }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        totalRepositoryContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
        commitContributionsByRepository(maxRepositories: 8) {
          contributions { totalCount }
          repository {
            nameWithOwner url description stargazerCount forkCount
            primaryLanguage { name color }
          }
        }
      }
    }
  }
`

interface RawRepo {
  nameWithOwner: string
  url: string
  description: string | null
  stargazerCount: number
  forkCount: number
  primaryLanguage: { name: string; color: string | null } | null
}

interface RawFirst {
  title: string
  url: string
  createdAt: string
  repository: { nameWithOwner: string }
}

const toFirst = (node: RawFirst | undefined): ProfileFirst | null =>
  node ? { title: node.title, url: node.url, repo: node.repository.nameWithOwner, createdAt: node.createdAt } : null

interface RawProfile {
  user: null | {
    databaseId: number
    login: string
    name: string | null
    bio: string | null
    company: string | null
    location: string | null
    websiteUrl: string | null
    twitterUsername: string | null
    createdAt: string
    followers: { totalCount: number }
    following: { totalCount: number }
    repositories: { totalCount: number; nodes: RawRepo[] }
    mergedPrs: { totalCount: number }
    allPrs: { totalCount: number }
    issues: { totalCount: number }
    firstRepo: { nodes: { nameWithOwner: string; url: string; createdAt: string }[] }
    firstPr: { nodes: RawFirst[] }
    firstIssue: { nodes: RawFirst[] }
    recentPrs: {
      nodes: {
        title: string
        url: string
        number: number
        state: 'OPEN' | 'CLOSED' | 'MERGED'
        createdAt: string
        repository: { nameWithOwner: string }
      }[]
    }
    contributionsCollection: {
      totalCommitContributions: number
      totalPullRequestContributions: number
      totalPullRequestReviewContributions: number
      totalIssueContributions: number
      totalRepositoryContributions: number
      restrictedContributionsCount: number
      contributionCalendar: {
        totalContributions: number
        weeks: {
          contributionDays: { date: string; contributionCount: number; contributionLevel: string }[]
        }[]
      }
      commitContributionsByRepository: {
        contributions: { totalCount: number }
        repository: RawRepo
      }[]
    }
  }
}

const LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

function toRepo(r: RawRepo): RepoSummary {
  return {
    name: r.nameWithOwner,
    url: r.url,
    description: r.description,
    stars: r.stargazerCount,
    forks: r.forkCount,
    language: r.primaryLanguage,
  }
}

function streaks(days: { date: string; count: number }[]) {
  let longest = 0
  let run = 0
  let bestDay: { date: string; count: number } | null = null
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0
    if (run > longest) longest = run
    if (day.count > (bestDay?.count ?? 0)) bestDay = day
  }
  // Today may simply not have activity yet; don't break the streak for it.
  let current = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]!.count > 0) current++
    else if (i !== days.length - 1) break
  }
  return { current, longest, bestDay }
}

function languageBreakdown(repos: RawRepo[]) {
  const counts = new Map<string, { name: string; color: string | null; count: number }>()
  for (const repo of repos) {
    const lang = repo.primaryLanguage
    if (!lang) continue
    const entry = counts.get(lang.name) ?? { ...lang, count: 0 }
    entry.count++
    counts.set(lang.name, entry)
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count)
  const top = sorted.slice(0, 6)
  const rest = sorted.slice(6).reduce((sum, l) => sum + l.count, 0)
  if (rest) top.push({ name: 'Other', color: null, count: rest })
  return top
}

async function buildProfile(login: string, event?: H3Event): Promise<Profile> {
  // Contribution data occasionally times out on GitHub's side; one retry clears most of it.
  const { user } = await githubGraphQL<RawProfile>(PROFILE_QUERY, { login }, event).catch(
    (error: { statusCode?: number }) => {
      if (error.statusCode !== 502) throw error
      return githubGraphQL<RawProfile>(PROFILE_QUERY, { login }, event)
    },
  )
  if (!user) throw createError({ statusCode: 404, statusMessage: `GitHub user "${login}" not found` })

  const c = user.contributionsCollection
  const days = c.contributionCalendar.weeks.flatMap(w => w.contributionDays)
  const repos = user.repositories.nodes
  const activeDays = days.filter(d => d.contributionCount > 0).length

  return {
    id: user.databaseId,
    login: user.login,
    name: user.name || null,
    bio: user.bio || null,
    company: user.company?.trim() || null,
    location: user.location || null,
    websiteUrl: user.websiteUrl || null,
    twitter: user.twitterUsername || null,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    publicRepos: user.repositories.totalCount,
    stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
    mergedPrs: user.mergedPrs.totalCount,
    totalPrs: user.allPrs.totalCount,
    totalIssues: user.issues.totalCount,
    year: {
      commits: c.totalCommitContributions,
      prs: c.totalPullRequestContributions,
      reviews: c.totalPullRequestReviewContributions,
      issues: c.totalIssueContributions,
      repos: c.totalRepositoryContributions,
      private: c.restrictedContributionsCount,
      contributions: c.contributionCalendar.totalContributions,
    },
    calendar: {
      start: days[0]?.date ?? new Date().toISOString().slice(0, 10),
      counts: days.map(d => d.contributionCount),
      levels: days.map(d => LEVELS[d.contributionLevel] ?? 0),
    },
    streak: streaks(days.map(d => ({ date: d.date, count: d.contributionCount }))),
    languages: languageBreakdown(repos),
    topRepos: repos.slice(0, 6).map(toRepo),
    contributedRepos: c.commitContributionsByRepository
      .map(r => ({ ...toRepo(r.repository), commits: r.contributions.totalCount }))
      .sort((a, b) => b.commits - a.commits),
    recentPrs: user.recentPrs.nodes.map(pr => ({
      title: pr.title,
      url: pr.url,
      number: pr.number,
      state: pr.state,
      createdAt: pr.createdAt,
      repo: pr.repository.nameWithOwner,
    })),
    activeDays,
    firsts: {
      repo: user.firstRepo.nodes[0]
        ? {
            name: user.firstRepo.nodes[0].nameWithOwner,
            url: user.firstRepo.nodes[0].url,
            createdAt: user.firstRepo.nodes[0].createdAt,
          }
        : null,
      pr: toFirst(user.firstPr.nodes[0]),
      issue: toFirst(user.firstIssue.nodes[0]),
    },
    automated: isAutomated({
      commits: c.totalCommitContributions,
      contributions: c.contributionCalendar.totalContributions,
      activeDays,
    }),
    generatedAt: Date.now(),
  }
}

const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

export function assertLogin(login: string | undefined): string {
  if (!login || !LOGIN.test(login)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid GitHub username' })
  }
  return login
}

// v2: firsts, activeDays, automated
export const profileCacheKey = (login: string) => `profile:v2:${login.toLowerCase()}`

export function getProfile(login: string, opts: { event?: H3Event; force?: boolean } = {}) {
  return swr(
    profileCacheKey(login),
    PROFILE_MAX_AGE,
    () => buildProfile(login, opts.event),
    opts,
  )
}
