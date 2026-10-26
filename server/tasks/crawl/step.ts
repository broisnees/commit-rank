/**
 * Cron (every 2 minutes): discover one location's developers if due, fetch stats for a
 * slice of missing/stale ones, rebuild that location's board. Sized for the Workers free
 * plan; raise NUXT_CRAWL_BATCH on a paid plan to crawl faster.
 */
export default defineTask({
  meta: {
    name: 'crawl:step',
    description: 'Discover developers and refresh a slice of their stats',
  },
  async run() {
    const config = useRuntimeConfig()
    const result = await crawlStep({
      users: Number(config.crawlBatch) || 50,
      depth: Number(config.discoverDepth) || 1000,
    })
    return { result }
  },
})
