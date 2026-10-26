<script setup lang="ts">
const featured = FEATURED_SLUGS.map(slug => resolveLocation(slug)!)

const boards = [
  {
    to: '/rank/global',
    icon: 'i-lucide:git-commit-horizontal',
    title: 'Commit rank',
    text: 'Who shipped the most commits over the last 12 months.',
  },
  {
    to: '/rank/global?by=prs',
    icon: 'i-lucide:git-pull-request',
    title: 'PR rank',
    text: 'Pull requests opened across every public repository.',
  },
  {
    to: '/countries',
    icon: 'i-lucide:earth',
    title: 'Countries',
    text: 'Every country ranked by its developers, commits and PRs.',
  },
  {
    to: '/repos',
    icon: 'i-lucide:book-marked',
    title: 'Top repositories',
    text: 'The most-starred projects on GitHub, by language.',
  },
  {
    to: '/repos/trending',
    icon: 'i-lucide:flame',
    title: 'Trending',
    text: 'New repositories picking up stars this week.',
  },
  {
    to: '/compare',
    icon: 'i-lucide:git-compare',
    title: 'Compare',
    text: 'Put two repositories side by side.',
  },
]

const steps = [
  { title: 'Set your location', text: 'Add a country or city to your GitHub profile, like “Kathmandu, Nepal”.' },
  { title: 'Open your profile', text: 'Search your username. Your stats are fetched and ranked on the spot.' },
  { title: 'Climb the board', text: 'Leaderboards refresh in the background, every few hours.' },
]

useSeoMeta({
  title: 'GitHub leaderboards',
  ogTitle: 'commitrank · GitHub leaderboards',
})
</script>

<template>
  <main>
    <section class="relative container min-h-[calc(100dvh-3.5rem)] flex flex-col">
      <header class="flex-1 flex flex-col items-center justify-center text-center pt-16 pb-8">
        <h1 class="sr-only">commitrank</h1>
        <AppLogo
          class="text-[2.75rem] sm:text-6xl md:text-7xl mb-5 motion-safe:animate-fade-in motion-safe:animate-fill-both"
          aria-hidden="true"
        />
        <p
          class="text-fg-muted text-lg sm:text-xl m-0 mb-10 max-w-[34ch] motion-safe:animate-slide-up motion-safe:animate-fill-both"
          style="animation-delay: 0.1s"
        >
          GitHub leaderboards, fast. Commits, pull requests and reviews, ranked by country.
        </p>
        <div
          class="w-full flex justify-center motion-safe:animate-slide-up motion-safe:animate-fill-both"
          style="animation-delay: 0.2s"
        >
          <UserSearch size="lg" autofocus />
        </div>
        <p class="mt-4 mb-0 text-sm text-fg-subtle font-mono max-sm:hidden">
          Press <kbd class="kbd">/</kbd> to search from anywhere
        </p>
      </header>

      <nav
        aria-labelledby="popular-heading"
        class="pt-4 pb-20 sm:pb-28 text-center max-w-2xl mx-auto motion-safe:animate-fade-in motion-safe:animate-fill-both"
        style="animation-delay: 0.3s"
      >
        <h2 id="popular-heading" class="label-micro m-0 mb-4">Popular leaderboards</h2>
        <ul class="flex flex-wrap items-center justify-center gap-2 list-none m-0 p-0">
          <li v-for="loc in featured" :key="loc.slug">
            <NuxtLink
              :to="`/rank/${loc.slug}`"
              class="inline-flex items-center gap-2 h-10 px-3.5 rounded-full border border-border bg-bg-subtle font-mono text-sm text-fg-muted transition-[color,background-color,border-color] duration-150 hover:(text-fg border-border-hover bg-bg-muted) focus-ring"
            >
              <span aria-hidden="true">{{ loc.flag }}</span>
              {{ loc.name }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/locations"
              class="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full font-mono text-sm text-fg-subtle transition-colors duration-150 hover:text-fg focus-ring"
            >
              All locations
              <span class="i-lucide:arrow-right size-4" aria-hidden="true" />
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </section>

    <section class="border-t border-border py-16 sm:py-24 bg-bg-subtle/40">
      <div class="container max-w-5xl flex flex-col gap-16">
        <div>
          <h2 class="section-title mb-6">Explore</h2>
          <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none m-0 p-0">
            <li v-for="board in boards" :key="board.to">
              <NuxtLink :to="board.to" class="group flex flex-col h-full card card-hover p-5 focus-ring">
                <span class="grid place-items-center size-10 rounded-lg bg-bg-muted text-accent">
                  <span :class="board.icon" class="size-5" aria-hidden="true" />
                </span>
                <h3 class="font-mono text-base font-medium mt-4 mb-1 flex items-center gap-1.5">
                  {{ board.title }}
                  <span class="i-lucide:arrow-right size-4 opacity-0 -translate-x-1 transition-[opacity,translate] duration-150 group-hover:(opacity-100 translate-x-0)" aria-hidden="true" />
                </h3>
                <p class="text-sm text-fg-muted m-0">{{ board.text }}</p>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <h2 class="section-title mb-6">Get ranked</h2>
          <ol class="grid gap-6 sm:grid-cols-3 list-none m-0 p-0">
            <li v-for="(step, i) in steps" :key="step.title" class="flex gap-4">
              <span class="grid place-items-center size-8 shrink-0 rounded-full border border-border font-mono text-sm text-fg-subtle tabular">{{ i + 1 }}</span>
              <div>
                <h3 class="m-0 text-base font-medium">{{ step.title }}</h3>
                <p class="m-0 mt-1 text-sm text-fg-muted">{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  </main>
</template>
