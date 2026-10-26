<script setup lang="ts">
useSeoMeta({ title: 'How ranking works', description: 'How commitrank builds its GitHub leaderboards.' })
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <article class="max-w-[65ch] flex flex-col gap-10 text-fg-muted">
      <header>
        <h1 class="m-0 mb-3 font-mono text-3xl sm:text-4xl font-medium tracking-tight text-fg">How ranking works</h1>
        <p class="m-0 text-lg">commitrank turns the public GitHub API into fast leaderboards.</p>
      </header>

      <section class="flex flex-col gap-3">
        <h2 class="section-title text-fg">Who gets ranked</h2>
        <p class="m-0">
          For each country we search GitHub for users whose profile location matches the country or its
          major cities, and track up to its <span class="text-fg">1,000 most-followed developers</span> (the most
          GitHub search returns). A background crawler fetches everyone's last-12-month stats and keeps them
          fresh, and each leaderboard shows the top 100 on every metric. <strong class="text-fg">Global</strong>
          ranks everyone we track, worldwide.
        </p>
        <p class="m-0">
          Anyone else joins by opening their own profile here: their stats are fetched on the spot and their
          rank is exact among every developer tracked in their country.
        </p>
        <p class="m-0">
          Accounts averaging hundreds of commits per active day (auto-commit scripts, mirrors, bots) are kept off
          the rankings so they reflect people, and are listed separately under each leaderboard.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="section-title text-fg">Metrics</h2>
        <dl class="m-0 flex flex-col gap-3">
          <div v-for="key in METRIC_KEYS" :key="key" class="flex gap-3">
            <dt class="shrink-0"><span :class="METRICS[key].icon" class="text-accent" aria-hidden="true" /></dt>
            <dd class="m-0"><span class="font-mono text-fg">{{ METRICS[key].label }}</span>: {{ METRICS[key].blurb }}.</dd>
          </div>
        </dl>
        <p class="m-0 text-sm">
          Private contributions only count toward <span class="font-mono">Contributions</span>, and only when
          the user opted in to showing them on their GitHub profile.
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="section-title text-fg">Freshness</h2>
        <p class="m-0">
          Every leaderboard is precomputed, so a page is a single database read. The crawler refreshes a slice of
          developers every couple of minutes and rebuilds the boards it touches; open leaderboards pick up new
          data on their own. Profiles are cached for an hour, and the <span class="font-mono text-fg">Refresh stats</span>
          button on a profile re-fetches it from GitHub immediately.
        </p>
      </section>

      <section id="get-ranked" class="flex flex-col gap-3">
        <h2 class="section-title text-fg">Get ranked</h2>
        <p class="m-0">
          Set your location on GitHub to something like “Kathmandu, Nepal”. Your profile page here shows where you
          stand right away.
        </p>
      </section>

      <p class="m-0 text-sm text-fg-subtle">
        Built on public GitHub data. Not affiliated with GitHub.
      </p>
    </article>
  </main>
</template>
