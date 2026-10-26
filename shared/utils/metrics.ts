import type { MetricKey } from '../types'

export const METRICS: Record<MetricKey, { label: string; unit: string; icon: string; blurb: string }> = {
  commits: {
    label: 'Commits',
    unit: 'commits',
    icon: 'i-lucide:git-commit-horizontal',
    blurb: 'commits in the last 12 months',
  },
  prs: {
    label: 'Pull requests',
    unit: 'PRs',
    icon: 'i-lucide:git-pull-request',
    blurb: 'pull requests opened in the last 12 months',
  },
  reviews: {
    label: 'Reviews',
    unit: 'reviews',
    icon: 'i-lucide:scan-eye',
    blurb: 'pull request reviews in the last 12 months',
  },
  contributions: {
    label: 'Contributions',
    unit: 'contribs',
    icon: 'i-lucide:activity',
    blurb: 'public and private contributions in the last 12 months',
  },
  followers: {
    label: 'Followers',
    unit: 'followers',
    icon: 'i-lucide:users',
    blurb: 'followers on GitHub',
  },
}

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[]

export function isMetricKey(value: unknown): value is MetricKey {
  return typeof value === 'string' && value in METRICS
}

export function avatarUrl(id: number, size: number) {
  return `https://avatars.githubusercontent.com/u/${id}?s=${size}&v=4`
}

/**
 * Likely automation (auto-commit scripts, mirror bots): sustained hundreds of commits or
 * contributions per active day. Kept off rankings but listed separately for transparency.
 */
export function isAutomated(u: { commits: number; contributions: number; activeDays?: number | null }) {
  const days = Math.max(u.activeDays ?? 365, 1)
  return (
    (u.commits >= 10_000 && u.commits / days >= 100) ||
    (u.contributions >= 20_000 && u.contributions / days >= 150)
  )
}
