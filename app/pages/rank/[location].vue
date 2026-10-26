<script setup lang="ts">
const route = useRoute('rank-location')
const slug = computed(() => String(route.params.location).toLowerCase())
const location = computed(() => resolveLocation(slug.value))
if (!location.value) {
  throw createError({ statusCode: 404, statusMessage: 'Unknown location', fatal: true })
}

const metric = computed<MetricKey>(() => (isMetricKey(route.query.by) ? route.query.by : 'commits'))

// Boards are precomputed, so this is one D1 row read. The server never waits on GitHub
// (?cached=1); a location nobody has built yet renders a skeleton while the browser builds it.
// In the browser, data prefetched on hover is used synchronously, so navigation is instant.
const nuxtApp = useNuxtApp()
const { data, status, error, refresh } = await useAsyncData(
  () => leaderboardKey(slug.value),
  async () => {
    if (import.meta.server) {
      return $fetch<Leaderboard | null>(`/api/leaderboard/${slug.value}`, { query: { cached: 1 } })
        .then(res => res || null)
    }
    return (await loadClientData<Leaderboard | null>(leaderboardKey(slug.value), `/api/leaderboard/${slug.value}`)) || null
  },
  {
    lazy: true,
    dedupe: 'defer',
    getCachedData: key =>
      nuxtApp.isHydrating ? nuxtApp.payload.data[key] : peekClientData<Leaderboard>(key),
  },
)
onMounted(() => {
  if (data.value) primeClientData(leaderboardKey(slug.value), data.value)
  else if (status.value !== 'pending') refresh()
})

// The crawler keeps rebuilding boards; while the tab is visible, pick up a newer one quietly.
let poll: ReturnType<typeof setInterval> | undefined
async function pollBoard() {
  const current = data.value
  if (document.visibilityState !== 'visible' || !current) return
  const forSlug = slug.value
  const next = await $fetch<Leaderboard | null>(`/api/leaderboard/${forSlug}`, {
    // one request per minute bypasses the 60s browser cache on /api
    query: { t: Math.floor(Date.now() / 60_000) },
  }).catch(() => null)
  if (next && forSlug === slug.value && next.generatedAt > (data.value?.generatedAt ?? 0)) {
    data.value = next
    primeClientData(leaderboardKey(forSlug), next)
  }
}
onMounted(() => (poll = setInterval(pollBoard, 60_000)))
onBeforeUnmount(() => clearInterval(poll))

// Every metric ships in one payload (the union of each metric's top N), so switching tabs
// re-sorts locally with no request.
const ranked = computed(() => {
  const key = metric.value
  return [...(data.value?.users ?? [])]
    .sort((a, b) => b[key] - a[key] || b.followers - a.followers)
    .slice(0, data.value?.limit ?? 100)
    .map((user, i) => ({ ...user, rank: i + 1 }))
})

const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return ranked.value
  return ranked.value.filter(
    u => u.login.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q),
  )
})
const podium = computed(() => (filter.value.trim() ? [] : ranked.value.slice(0, 3)))
const rest = computed(() => (filter.value.trim() ? filtered.value : ranked.value.slice(3)))
const max = computed(() => ranked.value[0]?.[metric.value] ?? 0)
const automated = computed(() => data.value?.automated ?? [])
const isGlobal = computed(() => location.value!.slug === 'global')
const place = computed(() => (isGlobal.value ? 'worldwide' : `in ${location.value!.name}`))

function switchLocation(slug: string) {
  navigateTo({ path: `/rank/${slug}`, query: route.query })
}

const title = computed(() =>
  location.value!.slug === 'global'
    ? `Top GitHub developers by ${METRICS[metric.value].label.toLowerCase()}`
    : `Top GitHub developers in ${location.value!.name} by ${METRICS[metric.value].label.toLowerCase()}`,
)
useSeoMeta({
  title,
  ogTitle: title,
  description: () =>
    `${location.value!.flag} ${location.value!.name}: developers ranked by ${METRICS[metric.value].blurb}.`,
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12 overflow-x-clip">
    <header class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
      <div class="min-w-0">
        <p class="label-micro m-0 mb-3">Leaderboard</p>
        <h1 class="m-0 font-mono text-3xl sm:text-4xl font-medium tracking-tight flex items-center gap-3">
          <span aria-hidden="true" class="text-[0.85em]">{{ location!.flag }}</span>
          <span class="truncate">{{ location!.name }}</span>
        </h1>
        <p class="mt-3 mb-0 text-fg-muted text-base sm:text-lg max-w-2xl">
          {{ isGlobal ? 'Developers worldwide' : `Developers in ${location!.name}` }},
          ranked by {{ METRICS[metric].blurb }}.
        </p>
        <p v-if="data?.indexedUsers" class="mt-2 mb-0 text-sm text-fg-subtle">
          Top <span class="tabular text-fg-muted">{{ Math.min(data.limit, ranked.length) }}</span>
          of <span class="tabular text-fg-muted">{{ formatNumber(data.indexedUsers) }}</span>
          developers tracked {{ place }}
        </p>
      </div>

      <div class="flex flex-col gap-1.5 md:w-64 shrink-0">
        <span class="label-micro" aria-hidden="true">Location</span>
        <LocationPicker :model-value="location!.slug" @update:model-value="switchLocation" />
      </div>
    </header>

    <!-- toolbar: sticky under the header from sm up so the metric is always one click away -->
    <div
      class="sm:sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6 bg-bg/85 backdrop-blur-md flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <LeaderboardMetricTabs :model-value="metric" />
      <label v-if="ranked.length" class="relative sm:w-60 shrink-0">
        <span class="sr-only">Filter developers</span>
        <span class="i-lucide:search absolute start-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle pointer-events-none" aria-hidden="true" />
        <input
          v-model="filter"
          type="search"
          placeholder="Filter this list…"
          class="field ps-9"
        />
      </label>
    </div>

    <LeaderboardSkeleton v-if="!data && !error" />

    <div v-else-if="error" class="card px-6 py-12 text-center">
      <span class="i-lucide:cloud-alert size-8 text-fg-subtle" aria-hidden="true" />
      <h2 class="font-mono text-lg mt-4 mb-2">Couldn't load this leaderboard</h2>
      <p class="text-fg-muted m-0 mb-6 max-w-md mx-auto">
        {{ error.statusCode === 429 ? 'GitHub rate limit hit. Try again in a few minutes.' : error.statusMessage || 'GitHub is not responding right now.' }}
      </p>
      <button type="button" class="btn" @click="() => refresh()">
        <span class="i-lucide:rotate-cw size-4" aria-hidden="true" /> Try again
      </button>
    </div>

    <section v-else-if="data" :aria-label="`${location!.name} leaderboard`">
      <div v-if="!ranked.length" class="card px-6 py-12 text-center">
        <span class="i-lucide:radar size-8 text-fg-subtle" aria-hidden="true" />
        <h2 class="font-mono text-lg mt-4 mb-2">Indexing {{ location!.name }}</h2>
        <p class="text-fg-muted m-0 max-w-md mx-auto">
          We're still collecting developers here. Check back in a few minutes, or open a profile to add it right away.
        </p>
      </div>

      <template v-else>
        <LeaderboardPodium v-if="podium.length" :users="podium" :metric="metric" class="mb-8 sm:mb-10" />

        <ol v-if="rest.length" class="list-none m-0 p-0 flex flex-col gap-1">
          <LeaderboardRow v-for="user in rest" :key="user.login" :user="user" :metric="metric" :max="max" />
        </ol>
        <p v-else-if="filter" class="text-center text-fg-subtle font-mono py-12 m-0">
          No one matching “{{ filter }}” in this list.
        </p>
      </template>

      <details
        v-if="automated.length"
        class="group mt-10 rounded-xl border border-border bg-bg-subtle/40"
      >
        <summary
          class="flex items-center justify-between gap-4 min-h-12 px-5 cursor-pointer list-none rounded-xl text-sm focus-ring [&::-webkit-details-marker]:hidden"
        >
          <span class="flex items-center gap-2.5 min-w-0">
            <span class="i-lucide:bot size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span>
              <span class="font-medium">Excluded as likely automation</span>
              <span class="text-fg-subtle tabular"> ({{ automated.length }})</span>
            </span>
          </span>
          <span
            class="i-lucide:chevron-down size-4 shrink-0 text-fg-subtle transition-[rotate] duration-150 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div class="px-5 pb-5">
          <p class="m-0 mb-4 text-sm text-fg-muted max-w-[65ch]">
            Accounts averaging hundreds of commits per active day (auto-commit scripts, mirrors,
            bots) are kept off the ranking so it reflects people. Listed here for transparency.
          </p>
          <ul class="list-none m-0 p-0 grid gap-1 sm:grid-cols-2">
            <li v-for="user in automated" :key="user.login">
              <NuxtLink
                :to="`/u/${user.login}`"
                class="flex items-center gap-3 min-h-12 px-2 rounded-lg transition-colors duration-150 hover:bg-bg-muted focus-ring"
              >
                <UserAvatar :id="user.id" :login="user.login" :size="28" class="size-7" />
                <span class="min-w-0 flex-1 truncate text-sm">
                  {{ user.name ?? user.login }}
                  <span v-if="user.name" class="font-mono text-fg-subtle">@{{ user.login }}</span>
                </span>
                <span class="shrink-0 text-end font-mono text-sm tabular">
                  {{ formatCompact(user.commits) }}
                  <span class="label-micro">commits</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </details>

      <aside class="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-dashed border-border px-5 py-4">
        <p class="m-0 text-sm text-fg-muted">
          <span class="text-fg font-medium">Not on the list?</span>
          Open your profile and you're ranked instantly.
          <span class="max-sm:hidden">Press <kbd class="kbd">/</kbd> to search.</span>
        </p>
        <NuxtLink to="/" class="btn shrink-0">
          <span class="i-lucide:user-search size-4" aria-hidden="true" />
          Find your profile
        </NuxtLink>
      </aside>

      <footer class="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-between text-sm text-fg-subtle">
        <p class="m-0 max-w-[70ch]">
          <template v-if="data.indexedUsers">
            <span class="text-fg-muted tabular">{{ formatNumber(data.indexedUsers) }}</span>
            <template v-if="!isGlobal && data.totalUsers > data.indexedUsers">
              of <span class="tabular">{{ formatNumber(data.totalUsers) }}</span> GitHub users
              matching <span class="font-mono">{{ data.location.terms.slice(0, 3).join(', ') }}<template v-if="data.location.terms.length > 3">…</template></span>
            </template>
            <template v-else> developers</template>
            tracked {{ place }} so far, most-followed first.
          </template>
          <NuxtLink to="/about" class="link-subtle underline underline-offset-3 decoration-fg/30 rounded focus-ring">How ranking works</NuxtLink>
        </p>
        <p class="m-0 font-mono">
          Updated <time :datetime="new Date(data.generatedAt).toISOString()">{{ formatAgo(data.generatedAt) }}</time>
        </p>
      </footer>
    </section>
  </main>
</template>
