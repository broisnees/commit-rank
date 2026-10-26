import type { H3Event } from 'h3'

interface Entry<T> {
  t: number
  v: T
}

// Per-isolate hot layer in front of KV; small and bounded.
const MEMORY_LIMIT = 300
const memory = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function remember(key: string, entry: Entry<unknown>) {
  memory.delete(key)
  memory.set(key, entry)
  if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value!)
}

async function read<T>(key: string): Promise<Entry<T> | null> {
  const hot = memory.get(key) as Entry<T> | undefined
  if (hot) return hot
  const stored = await useStorage('cache')
    .getItem<Entry<T>>(key)
    .catch(() => null)
  if (stored) remember(key, stored)
  return stored
}

function refresh<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending
  const task = fn()
    .then(async v => {
      const entry = { t: Date.now(), v }
      remember(key, entry)
      await useStorage('cache')
        .setItem(key, entry)
        .catch(error => console.error(`[cache] write ${key}`, error))
      return v
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, task)
  return task
}

/**
 * Stale-while-revalidate cache backed by the `cache` storage mount (Workers KV in prod).
 * Fresh entries return immediately; stale ones return immediately and refresh in the
 * background; misses wait for `fn`. Entries never expire from KV, so GitHub outages
 * or rate limits fall back to the last good value.
 */
export async function swr<T>(
  key: string,
  maxAgeSeconds: number,
  fn: () => Promise<T>,
  opts: { event?: H3Event; force?: boolean } = {},
): Promise<T> {
  if (opts.force) return refresh(key, fn)
  const entry = await read<T>(key)
  if (!entry) {
    // keep building even if the visitor leaves, so the next one gets a warm cache
    const build = refresh(key, fn)
    opts.event?.waitUntil(build.catch(() => {}))
    return build
  }
  if (Date.now() - entry.t > maxAgeSeconds * 1000) {
    const background = refresh(key, fn).catch(error =>
      console.error(`[cache] revalidate ${key}`, error),
    )
    opts.event?.waitUntil(background)
  }
  return entry.v
}

/** Read a cached entry (fresh or stale) without ever computing it. */
export function peek<T>(key: string): Promise<Entry<T> | null> {
  return read<T>(key)
}
