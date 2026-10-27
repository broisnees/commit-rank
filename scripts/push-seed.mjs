#!/usr/bin/env node
/**
 * Push a locally crawled D1 database (developers + crawl state) to the remote D1.
 * Boards are not sent (one can exceed D1's 100 KB statement limit); rebuild them remotely
 * afterwards with POST /api/admin/rebuild (see README).
 *
 *   node scripts/push-seed.mjs [--persist .wrangler/state] [--max-stubs N] [--dry-run]
 *
 * --max-stubs caps how many not-yet-fetched developers are sent (D1 free plan: 100k rows
 * written per day; an insert costs 2). Re-run on another day to send the rest.
 *
 * Safe to re-run: rows are upserted with json_each (no SQL escaping pitfalls), a remote row
 * is only replaced by a strictly newer local fetch, and discovered-but-unfetched developers
 * are inserted without touching remote stats. Each chunk is retried on D1's transient
 * import errors.
 */
import { DatabaseSync } from 'node:sqlite'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const flag = name => args.includes(`--${name}`)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const persist = option('persist', '.wrangler/state')
const dir = join(persist, 'v3/d1/miniflare-D1DatabaseObject')
const file = readdirSync(dir).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
if (!file) throw new Error(`No local D1 database under ${dir}`)
const db = new DatabaseSync(join(dir, file), { readOnly: true })

// D1 caps a statement at 100 KB; 120 rows of JSON stays well under it even with long fields.
const ROWS_PER_STATEMENT = 120
const STATEMENTS_PER_FILE = 8
const quote = json => `'${json.replaceAll("'", "''")}'`

const USER_COLUMNS = [
  'login', 'id', 'name', 'location', 'company', 'loc', 'followers', 'commits', 'prs', 'reviews',
  'issues', 'contributions', 'active_days', 'automated', 'fetched_at',
]
const STAT_COLUMNS = USER_COLUMNS.filter(c => c !== 'login')

function usersStatement(rows) {
  const select = USER_COLUMNS.map(c => `value ->> '${c}'`).join(', ')
  return `INSERT INTO users (${USER_COLUMNS.join(', ')})
SELECT ${select} FROM json_each(${quote(JSON.stringify(rows))}) WHERE true
ON CONFLICT (login) DO UPDATE SET ${STAT_COLUMNS.map(c => `${c} = excluded.${c}`).join(', ')}
WHERE excluded.fetched_at IS NOT NULL AND (users.fetched_at IS NULL OR excluded.fetched_at > users.fetched_at);`
}

function crawlStatement(rows) {
  return `INSERT INTO crawl (loc, total, discovered_at, refreshed_at)
SELECT value ->> 'loc', value ->> 'total', value ->> 'discovered_at', value ->> 'refreshed_at'
FROM json_each(${quote(JSON.stringify(rows))}) WHERE true
ON CONFLICT (loc) DO UPDATE SET
  total = COALESCE(excluded.total, crawl.total),
  discovered_at = MAX(COALESCE(excluded.discovered_at, 0), COALESCE(crawl.discovered_at, 0)),
  refreshed_at = MAX(COALESCE(excluded.refreshed_at, 0), COALESCE(crawl.refreshed_at, 0));`
}

const chunk = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

// Fetched developers first (they matter most), then discovered ones without stats yet.
const maxStubs = Number(option('max-stubs', Infinity))
let stubs = 0
const users = db
  .prepare(`SELECT ${USER_COLUMNS.join(', ')} FROM users ORDER BY fetched_at IS NULL, followers DESC`)
  .all()
  .filter(u => u.fetched_at != null || stubs++ < maxStubs)
const statements = [
  ...chunk(users, ROWS_PER_STATEMENT).map(usersStatement),
  crawlStatement(db.prepare('SELECT loc, total, discovered_at, refreshed_at FROM crawl').all()),
]
const fetched = users.filter(u => u.commits != null).length
console.log(`${users.length} developers (${fetched} with stats), ${statements.length} statements`)
if (flag('dry-run')) process.exit(0)

const out = mkdtempSync(join(tmpdir(), 'commitrank-seed-'))
const files = chunk(statements, STATEMENTS_PER_FILE).map((part, i) => {
  const path = join(out, `part-${String(i).padStart(3, '0')}.sql`)
  writeFileSync(path, part.join('\n'))
  return path
})

for (const [i, path] of files.entries()) {
  for (let attempt = 1; ; attempt++) {
    try {
      const log = execFileSync(
        'npx',
        ['wrangler', 'd1', 'execute', 'commit-rank', '--remote', '--file', path, '--yes'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
      const written = log.match(/"rows_written": (\d+)/)?.[1] ?? '?'
      console.log(`part ${i + 1}/${files.length}: ok (${written} rows written)`)
      break
    } catch (error) {
      const message = String(error.stdout ?? '') + String(error.stderr ?? '')
      const transient = /D1_RESET_DO|Not currently importing|currently importing|timed out|fetch failed|unavailable|7009|7500|ECONNRESET/i.test(message)
      if (!transient || attempt >= 5) {
        console.error(`part ${i + 1}/${files.length}: failed\n${message.slice(-600)}`)
        process.exit(1)
      }
      console.log(`part ${i + 1}/${files.length}: transient error, retry ${attempt}`)
      execFileSync('sleep', [String(attempt * 5)])
    }
  }
}
console.log('done')
