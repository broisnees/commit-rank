const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Manual: run crawl steps back to back for a few minutes to fill a fresh database.
 * Paced at ~150 users/minute to stay inside GitHub's per-token compute budget.
 * Dev: curl "localhost:3000/_nitro/tasks/crawl:seed?minutes=4"
 */
export default defineTask({
  meta: {
    name: 'crawl:seed',
    description: 'Run crawl steps back to back to fill the database',
  },
  async run({ payload }) {
    const config = useRuntimeConfig()
    const minutes = Math.min(Number(payload?.minutes) || 4, 14)
    const users = Number(payload?.users) || 100
    const deadline = Date.now() + minutes * 60_000
    let steps = 0
    let fetched = 0
    let idle = false
    let last: Awaited<ReturnType<typeof crawlStep>> | undefined

    while (Date.now() < deadline) {
      const started = Date.now()
      // locally the board scans are free, so rebuild every step and keep global + countries
      // close to live
      last = await crawlStep({
        users,
        depth: Number(config.discoverDepth) || 1000,
        aggregatesEvery: 3 * 60_000,
        boardsEvery: 0,
      })
      steps++
      fetched += last.fetched
      if (last.paused) {
        await sleep(60_000)
        continue
      }
      if (!last.discovered && !last.refreshed.length) {
        idle = true
        break
      }
      await sleep(Math.max((users / 150) * 60_000 - (Date.now() - started), 0))
    }
    return { result: { steps, fetched, idle, last } }
  },
})
