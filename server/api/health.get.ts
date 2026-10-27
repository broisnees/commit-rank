/** Operational snapshot: GitHub token budget, database coverage. Never throws. */
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const [github, db] = await Promise.all([
    githubRateLimit(event).then(
      r => ({ ok: true, ...r }),
      (error: Error) => ({ ok: false, error: error.message }),
    ),
    useDB(event)
      .prepare(
        `SELECT (SELECT COUNT(*) FROM users) AS tracked,
                (SELECT COUNT(*) FROM users WHERE commits IS NOT NULL) AS fetched,
                (SELECT COUNT(*) FROM boards) AS boards,
                (SELECT MAX(built_at) FROM boards) AS lastBuild`,
      )
      .first()
      .then(
        r => ({ ok: true, ...r }),
        (error: Error) => ({ ok: false, error: error.message }),
      ),
  ])
  return { ok: github.ok && db.ok, github, db, at: Date.now() }
})
