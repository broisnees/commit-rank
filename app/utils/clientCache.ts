/**
 * Browser-side cache for page data, shared by hover-prefetch and the pages' useAsyncData.
 * A link hovered for a moment is usually loaded before it's clicked, so navigation renders
 * instantly. Never used on the server (module state would leak across requests).
 */
const TTL = 5 * 60_000
const store = new Map<string, { at: number; value?: unknown; pending?: Promise<unknown> }>()

const fresh = (at: number) => Date.now() - at < TTL

/** Synchronous read for useAsyncData's getCachedData. */
export function peekClientData<T>(key: string): T | undefined {
  if (import.meta.server) return undefined
  const hit = store.get(key)
  return hit && fresh(hit.at) ? (hit.value as T | undefined) : undefined
}

export function primeClientData(key: string, value: unknown) {
  if (import.meta.client && value) store.set(key, { at: Date.now(), value })
}

/** Fetch once, share in-flight requests, keep the result for a few minutes. */
export function loadClientData<T>(key: string, url: string): Promise<T> {
  const hit = store.get(key)
  if (hit && fresh(hit.at)) {
    if (hit.value !== undefined) return Promise.resolve(hit.value as T)
    if (hit.pending) return hit.pending as Promise<T>
  }
  const pending = ($fetch(url) as Promise<T>).then(
    value => {
      if (value) store.set(key, { at: Date.now(), value })
      else store.delete(key)
      return value
    },
    error => {
      store.delete(key)
      throw error
    },
  )
  store.set(key, { at: Date.now(), pending })
  return pending
}

export const leaderboardKey = (slug: string) => `leaderboard:${slug.toLowerCase()}`
export const profileKey = (login: string) => `profile:${login.toLowerCase()}`
export const repoKey = (fullName: string) => `repo:${fullName.toLowerCase()}`
