export interface RepoLanguage {
  name: string
  color: string | null
}

export interface RepoListItem {
  /** owner/name */
  name: string
  owner: string
  ownerAvatar: string
  description: string | null
  stars: number
  forks: number
  language: RepoLanguage | null
  createdAt: string
  pushedAt: string
}

export interface RepoList {
  items: RepoListItem[]
  /** repositories GitHub matched for the query */
  total: number
  generatedAt: number
}

export type RepoSort = 'stars' | 'forks' | 'updated'
export type TrendingSince = 'day' | 'week' | 'month'

export interface RepoRelease {
  name: string
  tag: string
  url: string
  publishedAt: string | null
}

export interface RepoContributor {
  login: string
  avatarUrl: string
  contributions: number
}

export interface RepoDetail {
  name: string
  owner: string
  ownerAvatar: string
  ownerType: 'User' | 'Organization'
  description: string | null
  url: string
  homepage: string | null
  topics: string[]
  license: string | null
  createdAt: string
  pushedAt: string
  archived: boolean
  fork: boolean
  stars: number
  forks: number
  watchers: number
  openIssues: number
  closedIssues: number
  openPrs: number
  mergedPrs: number
  releases: number
  recentReleases: RepoRelease[]
  defaultBranch: string | null
  /** commits on the default branch */
  commits: number | null
  /** bytes per language, largest first (top 7 + "Other") */
  languages: (RepoLanguage & { size: number })[]
  /** null when GitHub refuses (huge repos) or fails */
  contributors: RepoContributor[] | null
  /** commits per week for the last 52 weeks, oldest first; null while GitHub computes it */
  activity: number[] | null
  generatedAt: number
}

export interface RepoSearchItem {
  name: string
  ownerAvatar: string
  description: string | null
  stars: number
}

export interface CountryRepos {
  slug: string
  /** developers whose repositories were searched */
  owners: string[]
  items: RepoListItem[]
  generatedAt: number
}

/** Language filters: label shown in the UI → GitHub search `language:` value. */
export const REPO_LANGUAGES = [
  { slug: 'typescript', label: 'TypeScript', query: 'typescript' },
  { slug: 'javascript', label: 'JavaScript', query: 'javascript' },
  { slug: 'python', label: 'Python', query: 'python' },
  { slug: 'go', label: 'Go', query: 'go' },
  { slug: 'rust', label: 'Rust', query: 'rust' },
  { slug: 'java', label: 'Java', query: 'java' },
  { slug: 'cpp', label: 'C++', query: 'cpp' },
  { slug: 'c', label: 'C', query: 'c' },
  { slug: 'csharp', label: 'C#', query: 'csharp' },
  { slug: 'php', label: 'PHP', query: 'php' },
  { slug: 'ruby', label: 'Ruby', query: 'ruby' },
  { slug: 'kotlin', label: 'Kotlin', query: 'kotlin' },
  { slug: 'swift', label: 'Swift', query: 'swift' },
  { slug: 'dart', label: 'Dart', query: 'dart' },
  { slug: 'zig', label: 'Zig', query: 'zig' },
  { slug: 'shell', label: 'Shell', query: 'shell' },
] as const

export type RepoLanguageSlug = (typeof REPO_LANGUAGES)[number]['slug']

export function findRepoLanguage(slug: unknown) {
  return REPO_LANGUAGES.find(l => l.slug === slug) ?? null
}

export const REPO_NAME = /^[\w.-]{1,100}$/
