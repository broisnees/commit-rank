import type { H3Event } from 'h3'

// The slice of the D1 API we use (keeps @cloudflare/workers-types out of the app).
export interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

export interface D1Database {
  prepare(sql: string): D1Statement
  batch(statements: D1Statement[]): Promise<unknown[]>
}

/** D1 binding from the request (prod) or the global env (cron, dev platform proxy). */
export function useDB(event?: H3Event): D1Database {
  const env =
    event?.context.cloudflare?.env ?? (globalThis as { __env__?: Record<string, unknown> }).__env__
  const db = env?.DB as D1Database | undefined
  if (!db) throw createError({ statusCode: 500, statusMessage: 'D1 binding "DB" is not configured' })
  return db
}
