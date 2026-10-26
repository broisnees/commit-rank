export default defineNuxtConfig({
  modules: ['@unocss/nuxt', '@nuxtjs/color-mode', '@nuxt/fonts'],

  devtools: { enabled: true },

  css: ['~/assets/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    dataValue: 'theme',
    classSuffix: '',
    storageKey: 'commitrank-color-mode',
  },

  runtimeConfig: {
    // Comma-separated list of GitHub tokens (classic or fine-grained, no scopes needed).
    // Set via NUXT_GITHUB_TOKEN. Multiple tokens are rotated to spread rate limits.
    githubToken: '',
    // Most-followed users discovered per location (GitHub search caps at 1000).
    discoverDepth: 1000,
    // Users whose stats one cron run fetches (every 2 min): 50 → ~36k refreshes/day, about
    // 40k D1 rows written, inside the free plan's 100k. On Workers Paid raise to 150.
    crawlBatch: 50,
    // Enables POST /api/admin/crawl (NUXT_ADMIN_TOKEN). Empty = disabled.
    adminToken: '',
    public: {
      siteUrl: 'https://commitrank.dev',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#0a0a0a' }],
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/about': { prerender: true },
    '/locations': { prerender: true },
    '/rank': { redirect: '/rank/global' },
    '/api/**': { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=600' } },
    '/api/search': { headers: { 'cache-control': 'public, max-age=3600' } },
  },

  router: { options: { scrollBehaviorType: 'smooth' } },

  experimental: {
    viewTransition: true,
    typedPages: true,
  },

  compatibilityDate: '2026-10-01',

  // The crawler only runs in production (Cron Trigger); in dev run `crawl:seed` by hand.
  $production: {
    nitro: {
      scheduledTasks: {
        '*/2 * * * *': ['crawl:step'],
      },
    },
  },

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    experimental: { tasks: true },
    // about.html instead of about/index.html: Workers assets then serve /about without a redirect
    prerender: { autoSubfolderIndex: false },
    // Cache lives in Workers KV in production, on disk in dev.
    storage: {
      cache: { driver: 'cloudflare-kv-binding', binding: 'CACHE' },
    },
    devStorage: {
      cache: { driver: 'fs-lite', base: './.data/cache' },
    },
  },

  fonts: {
    providers: { fontshare: false, adobe: false, fontsource: false },
    families: [
      { name: 'Geist', provider: 'google', weights: [400, 500, 600], global: true },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500, 600], global: true },
    ],
  },


  typescript: { strict: true },
})
