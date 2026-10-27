<script setup lang="ts">
type CountryMetric = 'developers' | 'commits' | 'prs' | 'contributions' | 'average'

// Commits leads: while the crawl fills in, developer counts mostly reflect indexing progress
const TABS: { key: CountryMetric; label: string; short: string; icon: string }[] = [
  { key: 'commits', label: 'Commits', short: 'commits', icon: METRICS.commits.icon },
  { key: 'prs', label: 'Pull requests', short: 'PRs', icon: METRICS.prs.icon },
  { key: 'contributions', label: 'Contributions', short: 'contribs', icon: METRICS.contributions.icon },
  { key: 'average', label: 'Commits per dev', short: 'per dev', icon: 'i-lucide:gauge' },
  { key: 'developers', label: 'Developers', short: 'devs', icon: 'i-lucide:users' },
]

const route = useRoute()
const metric = computed<CountryMetric>(() => {
  const by = String(route.query.by ?? '')
  return TABS.some(t => t.key === by) ? (by as CountryMetric) : 'commits'
})
const tab = computed(() => TABS.find(t => t.key === metric.value)!)

const { data, error, refresh } = await useAsyncData(
  'countries',
  () => $fetch<CountriesBoard>('/api/countries'),
  { lazy: true },
)

const region = ref('All')
const regions = ['All', ...LOCATION_REGIONS]

const value = (c: CountryStat) =>
  metric.value === 'average'
    ? c.developers
      ? Math.round(c.commits / c.developers)
      : 0
    : c[metric.value]

const ranked = computed(() =>
  [...(data.value?.countries ?? [])]
    .filter(c => c.developers > 0)
    .sort((a, b) => value(b) - value(a) || b.developers - a.developers)
    .map((country, i) => ({ country, rank: i + 1, value: value(country) })),
)
const shown = computed(() =>
  region.value === 'All' ? ranked.value : ranked.value.filter(r => r.country.region === region.value),
)
const max = computed(() => shown.value[0]?.value ?? 0)
const totals = computed(() => {
  const list = data.value?.countries ?? []
  return {
    developers: list.reduce((sum, c) => sum + c.developers, 0),
    commits: list.reduce((sum, c) => sum + c.commits, 0),
    countries: list.filter(c => c.developers > 0).length,
  }
})

const medal: Record<number, string> = { 1: 'text-gold', 2: 'text-silver', 3: 'text-bronze' }

useSeoMeta({
  title: 'Countries',
  description: 'Countries ranked by their GitHub developers: commits, pull requests and contributions.',
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <header class="mb-8 max-w-3xl">
      <p class="label-micro m-0 mb-3">Leaderboard</p>
      <h1 class="m-0 font-mono text-3xl sm:text-4xl font-medium tracking-tight">Countries</h1>
      <p class="mt-3 mb-0 text-fg-muted text-base sm:text-lg">
        Countries ranked by the developers we track there, over the last 12 months.
      </p>
      <p v-if="data" class="mt-2 mb-0 text-sm text-fg-subtle">
        <span class="tabular text-fg-muted">{{ formatNumber(totals.developers) }}</span> developers across
        <span class="tabular text-fg-muted">{{ totals.countries }}</span> countries ·
        <span class="tabular text-fg-muted">{{ formatCompact(totals.commits) }}</span> commits
      </p>
    </header>

    <div
      class="sm:sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6 bg-bg/85 backdrop-blur-md flex flex-col gap-3"
    >
      <nav aria-label="Rank countries by" class="min-w-0 overflow-x-auto no-scrollbar scroll-fade -mx-4 px-4 sm:mx-0 sm:px-0">
        <ul class="inline-flex gap-0.5 p-1 list-none m-0 rounded-[10px] border border-border bg-bg-subtle">
          <li v-for="t in TABS" :key="t.key">
            <NuxtLink
              :to="{ query: { ...route.query, by: t.key === 'commits' ? undefined : t.key } }"
              replace
              :aria-current="metric === t.key ? 'page' : undefined"
              class="flex items-center gap-1.5 h-9 whitespace-nowrap rounded-md px-3 font-mono text-sm transition-[color,background-color] duration-150 focus-ring"
              :class="metric === t.key ? 'bg-bg-elevated text-fg shadow-[0_1px_2px_oklch(0_0_0/0.2)]' : 'text-fg-subtle hover:(text-fg bg-bg-muted)'"
            >
              <span :class="[t.icon, metric === t.key ? 'text-accent' : '']" class="size-4 max-sm:hidden" aria-hidden="true" />
              <span class="sm:hidden capitalize">{{ t.short }}</span>
              <span class="max-sm:hidden">{{ t.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div role="group" aria-label="Region" class="flex gap-1.5 overflow-x-auto no-scrollbar scroll-fade -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          v-for="r in regions"
          :key="r"
          type="button"
          class="chip shrink-0"
          :class="region === r ? 'chip-on' : 'chip-off'"
          :aria-pressed="region === r"
          @click="region = r"
        >
          {{ r }}
        </button>
      </div>
    </div>

    <div v-if="error" class="card px-6 py-12 text-center">
      <span class="i-lucide:cloud-alert size-8 text-fg-subtle" aria-hidden="true" />
      <h2 class="font-mono text-lg mt-4 mb-2">Couldn't load countries</h2>
      <p class="text-fg-muted m-0 mb-6">The rankings service didn't answer. It usually recovers in a moment.</p>
      <button type="button" class="btn" @click="() => refresh()">
        <span class="i-lucide:rotate-cw size-4" aria-hidden="true" /> Try again
      </button>
    </div>

    <ul v-else-if="!data" class="list-none m-0 p-0 flex flex-col gap-1" aria-busy="true" aria-label="Loading countries">
      <li v-for="i in 10" :key="i" class="min-h-16 px-2 sm:px-4 flex items-center gap-3 sm:gap-4">
        <div class="skeleton h-3.5 w-6" />
        <div class="skeleton size-8 rounded-full!" />
        <div class="flex-1 flex flex-col gap-2">
          <div class="skeleton h-3.5 w-36 max-w-full" />
          <div class="skeleton h-3 w-20" />
        </div>
        <div class="skeleton h-6 w-16" />
      </li>
    </ul>

    <div v-else-if="!shown.length" class="card px-6 py-12 text-center">
      <span class="i-lucide:radar size-8 text-fg-subtle" aria-hidden="true" />
      <h2 class="font-mono text-lg mt-4 mb-2">Still indexing</h2>
      <p class="text-fg-muted m-0 max-w-md mx-auto">
        No developers tracked {{ region === 'All' ? 'yet' : `in ${region} yet` }}. The crawler fills this in continuously.
      </p>
    </div>

    <ol v-else class="list-none m-0 p-0 flex flex-col gap-1">
      <li v-for="row in shown" :key="row.country.slug" class="cv-row">
        <NuxtLink
          :to="`/rank/${row.country.slug}`"
          class="group relative flex items-center gap-3 sm:gap-4 min-h-16 rounded-xl border border-transparent px-2 py-2.5 sm:px-4 overflow-hidden transition-[background-color,border-color] duration-150 hover:(bg-bg-subtle border-border) focus-ring"
        >
          <span
            class="absolute inset-y-0 start-0 bg-accent/[0.05] pointer-events-none"
            :style="{ width: `${max ? Math.max((row.value / max) * 100, 1) : 0}%` }"
            aria-hidden="true"
          />
          <span
            class="relative w-8 sm:w-10 shrink-0 text-end font-mono text-sm tabular"
            :class="medal[row.rank] ?? 'text-fg-subtle'"
          >
            <span class="sr-only">Rank </span>{{ row.rank }}
          </span>
          <span class="relative text-2xl leading-none shrink-0" aria-hidden="true">{{ row.country.flag }}</span>
          <div class="relative min-w-0 flex-1">
            <p class="m-0 truncate font-medium leading-snug">{{ row.country.name }}</p>
            <p class="m-0 text-sm text-fg-subtle truncate leading-snug">
              <span class="tabular">{{ formatNumber(row.country.developers) }}</span> devs
              <span class="max-sm:hidden"> · {{ row.country.region }}</span>
            </p>
          </div>
          <span
            v-if="row.country.top"
            class="relative hidden md:flex items-center gap-2 min-w-0 w-48 text-sm text-fg-muted"
          >
            <UserAvatar :id="row.country.top.id" :login="row.country.top.login" :size="24" class="size-6" />
            <span class="min-w-0 truncate">
              <span class="label-micro block leading-tight">Top committer</span>
              <span class="font-mono truncate">@{{ row.country.top.login }}</span>
            </span>
          </span>
          <div class="relative shrink-0 text-end min-w-18 sm:min-w-24">
            <p class="m-0 font-mono text-base sm:text-xl leading-none tabular tracking-tight transition-colors duration-150 group-hover:text-accent">
              {{ metric === 'developers' || metric === 'average' ? formatNumber(row.value) : formatCompact(row.value) }}
            </p>
            <p class="m-0 mt-1 label-micro">{{ tab.short }}</p>
          </div>
        </NuxtLink>
      </li>
    </ol>

    <p v-if="data" class="mt-8 mb-0 text-sm text-fg-subtle max-w-[70ch]">
      Totals cover tracked developers only: each country's most-followed developers plus anyone
      who opened their profile here. Bigger countries are still being indexed, so compare
      <span class="text-fg-muted">commits per dev</span> for a fairer view.
      Updated <time :datetime="new Date(data.generatedAt).toISOString()">{{ formatAgo(data.generatedAt) }}</time>.
    </p>
  </main>
</template>
