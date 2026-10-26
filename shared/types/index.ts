export type MetricKey = 'commits' | 'prs' | 'reviews' | 'contributions' | 'followers'

export interface LocationInfo {
  slug: string
  name: string
  flag: string
  region: string
  /** `location:` search terms, OR-ed by GitHub search */
  terms: string[]
  /** extra strings that map a profile's free-text location to this place */
  aliases?: string[]
}

export interface RankedUser {
  id: number
  login: string
  name: string | null
  location: string | null
  company: string | null
  followers: number
  commits: number
  prs: number
  reviews: number
  issues: number
  contributions: number
  /** days with at least one contribution in the last 12 months */
  activeDays?: number
}

export interface Leaderboard {
  location: LocationInfo
  /** union of the top `limit` users for every metric; sort by a metric and take `limit` */
  users: RankedUser[]
  limit: number
  /** developers we track and rank in this location */
  indexedUsers: number
  /** GitHub users matching the location search */
  totalUsers: number
  /**
   * Accounts kept off the ranking as likely automation (auto-commit scripts:
   * hundreds of commits per active day). Top few by commits, for transparency.
   */
  automated?: RankedUser[]
  generatedAt: number
}

/** Country-level leaderboard row (GET /api/countries). Sums cover tracked developers only. */
export interface CountryStat {
  slug: string
  name: string
  flag: string
  region: string
  developers: number
  commits: number
  prs: number
  reviews: number
  contributions: number
  top: { id: number; login: string; name: string | null; commits: number } | null
}

export interface CountriesBoard {
  countries: CountryStat[]
  generatedAt: number
}

/** GitHub's own firsts (GET /api/firsts): the earliest accounts and repository #1. */
export interface GitHubFirsts {
  users: { id: number; login: string; name: string | null; createdAt: string; bio: string | null }[]
  repo: {
    id: number
    name: string
    url: string
    description: string | null
    createdAt: string
    stars: number
  } | null
  generatedAt: number
}

export interface ProfileFirst {
  title: string
  url: string
  repo: string
  createdAt: string
}

export interface RepoSummary {
  name: string
  url: string
  description: string | null
  stars: number
  forks: number
  language: { name: string; color: string | null } | null
}

export interface PullRequestSummary {
  title: string
  url: string
  number: number
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  createdAt: string
  repo: string
}

export interface Profile {
  id: number
  login: string
  name: string | null
  bio: string | null
  company: string | null
  location: string | null
  websiteUrl: string | null
  twitter: string | null
  createdAt: string
  followers: number
  following: number
  publicRepos: number
  stars: number
  mergedPrs: number
  totalPrs: number
  totalIssues: number
  year: {
    commits: number
    prs: number
    reviews: number
    issues: number
    repos: number
    private: number
    contributions: number
  }
  calendar: { start: string; counts: number[]; levels: number[] }
  streak: { current: number; longest: number; bestDay: { date: string; count: number } | null }
  languages: { name: string; color: string | null; count: number }[]
  topRepos: RepoSummary[]
  contributedRepos: (RepoSummary & { commits: number })[]
  recentPrs: PullRequestSummary[]
  /** days with at least one contribution in the last 12 months */
  activeDays: number
  /** a user's own firsts on GitHub (easter-egg card) */
  firsts: {
    repo: { name: string; url: string; createdAt: string } | null
    pr: ProfileFirst | null
    issue: ProfileFirst | null
  }
  /** likely automation: hundreds of commits per active day */
  automated: boolean
  generatedAt: number
}

export interface UserRanks {
  location: Pick<LocationInfo, 'slug' | 'name' | 'flag'> | null
  /** exact position among every tracked developer in the location */
  ranks: Record<MetricKey, number> | null
  /** worldwide position when inside the global top `limit`, else null */
  global: Record<MetricKey, number | null> | null
  pool: number
}

export interface SearchUser {
  id: number
  login: string
  name: string | null
  followers: number
}
