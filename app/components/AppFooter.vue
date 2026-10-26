<script setup lang="ts">
// fixed at render time so server and client agree
const year = new Date().getUTCFullYear()

const popular = FEATURED_SLUGS.slice(1, 7).map(slug => resolveLocation(slug)!)

const columns = [
  {
    title: 'Developers',
    links: [
      { to: '/rank/global', label: 'Global leaderboard' },
      { to: '/countries', label: 'Countries' },
      { to: '/rank/global?by=prs', label: 'Pull request rank' },
      { to: '/rank/global?by=reviews', label: 'Review rank' },
    ],
  },
  {
    title: 'Repositories',
    links: [
      { to: '/repos', label: 'Top repositories' },
      { to: '/repos/trending', label: 'Trending' },
      { to: '/compare', label: 'Compare repos' },
    ],
  },
  {
    title: 'Popular countries',
    links: [
      ...popular.map(loc => ({ to: `/rank/${loc.slug}`, label: loc.name })),
      { to: '/locations', label: 'All locations →' },
    ],
  },
  {
    title: 'Project',
    links: [
      { to: '/about', label: 'How ranking works' },
      { to: '/about#get-ranked', label: 'Get ranked' },
      { to: '/firsts', label: 'GitHub firsts' },
      { to: 'https://docs.github.com/en/graphql', label: 'GitHub API', external: true },
    ],
  },
]
</script>

<template>
  <footer class="mt-auto border-t border-border bg-bg-subtle/40">
    <div class="container pt-12 pb-8">
      <div class="grid gap-x-8 gap-y-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div class="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col gap-4 max-w-xs">
          <NuxtLink to="/" aria-label="commitrank home" class="self-start text-xl rounded-md focus-ring">
            <AppLogo />
          </NuxtLink>
          <p class="m-0 text-sm text-fg-muted">
            Fast GitHub leaderboards for developers and repositories: commits, pull requests and
            reviews, ranked by country.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener"
            class="self-start inline-flex items-center gap-2 min-h-8 text-sm link-subtle rounded focus-ring"
          >
            <span class="i-simple-icons:github size-4" aria-hidden="true" />
            Data from GitHub
          </a>
        </div>

        <nav v-for="col in columns" :key="col.title" :aria-label="col.title">
          <h2 class="label-micro m-0 mb-3">{{ col.title }}</h2>
          <ul class="list-none m-0 p-0 flex flex-col">
            <li v-for="link in col.links" :key="link.label">
              <NuxtLink
                :to="link.to"
                :target="'external' in link ? '_blank' : undefined"
                :rel="'external' in link ? 'noopener' : undefined"
                class="inline-flex items-center gap-1 min-h-8 text-sm link-subtle rounded focus-ring"
              >
                {{ link.label }}
                <span v-if="'external' in link" class="i-lucide:arrow-up-right size-3.5 opacity-60" aria-hidden="true" />
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <div class="mt-12 pt-6 border-t border-border flex flex-col-reverse gap-6 md:flex-row md:items-center md:justify-between">
        <p class="m-0 text-xs text-fg-subtle max-w-md">
          © {{ year }} commitrank. Public GitHub data, refreshed continuously in the background.
          Not affiliated with GitHub.
        </p>

        <AppearancePicker variant="button" side="top" />
      </div>
    </div>
  </footer>
</template>
