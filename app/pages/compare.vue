<script setup lang="ts">
import type { RepoDetail } from '#shared/types/repos'

const route = useRoute()
const router = useRouter()

const asRepo = (value: unknown) =>
  typeof value === 'string' && /^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(value) ? value : null
const a = computed(() => asRepo(route.query.a))
const b = computed(() => asRepo(route.query.b))

// Same keys as the repo page, so a repo opened there compares instantly.
const keyFor = (name: string | null, side: string) => (name ? `repo:${name.toLowerCase()}` : `compare:none:${side}`)
const load = (name: string | null) => (name ? $fetch<RepoDetail>(`/api/repos/${name}`) : Promise.resolve(null))

const left = await useAsyncData(() => keyFor(a.value, 'a'), () => load(a.value), { lazy: true })
const right = await useAsyncData(() => keyFor(b.value, 'b'), () => load(b.value), { lazy: true })
const repoA = computed(() => left.data.value ?? null)
const repoB = computed(() => right.data.value ?? null)

function pick(side: 'a' | 'b', name: string) {
  router.replace({ query: { ...route.query, [side]: name } })
}
function swap() {
  router.replace({ query: { ...route.query, a: b.value ?? undefined, b: a.value ?? undefined } })
}

type Row = {
  label: string
  icon: string
  get: (r: RepoDetail) => number | null
  /** higher wins unless false; null = no winner (e.g. open issues) */
  higherWins: boolean | null
  format?: (n: number) => string
}

const ROWS: Row[] = [
  { label: 'Stars', icon: 'i-lucide:star', get: r => r.stars, higherWins: true },
  { label: 'Forks', icon: 'i-lucide:git-fork', get: r => r.forks, higherWins: true },
  { label: 'Watchers', icon: 'i-lucide:eye', get: r => r.watchers, higherWins: true },
  { label: 'Commits', icon: 'i-lucide:git-commit-horizontal', get: r => r.commits, higherWins: true },
  { label: 'Commits, last 52 weeks', icon: 'i-lucide:activity', get: r => (r.activity ? r.activity.reduce((s, n) => s + n, 0) : null), higherWins: true },
  { label: 'Merged PRs', icon: 'i-lucide:git-merge', get: r => r.mergedPrs, higherWins: true },
  { label: 'Open PRs', icon: 'i-lucide:git-pull-request', get: r => r.openPrs, higherWins: null },
  { label: 'Open issues', icon: 'i-lucide:circle-dot', get: r => r.openIssues, higherWins: null },
  { label: 'Closed issues', icon: 'i-lucide:circle-check', get: r => r.closedIssues, higherWins: true },
  { label: 'Releases', icon: 'i-lucide:tag', get: r => r.releases, higherWins: true },
]

const rows = computed(() =>
  ROWS.map(row => {
    const va = repoA.value ? row.get(repoA.value) : null
    const vb = repoB.value ? row.get(repoB.value) : null
    let winner: 'a' | 'b' | null = null
    if (row.higherWins !== null && va != null && vb != null && va !== vb) {
      winner = (va > vb) === row.higherWins ? 'a' : 'b'
    }
    const ratio = va && vb ? Math.max(va, vb) / Math.min(va, vb) : null
    return { ...row, va, vb, winner, ratio }
  }),
)

const wins = computed(() => ({
  a: rows.value.filter(r => r.winner === 'a').length,
  b: rows.value.filter(r => r.winner === 'b').length,
}))

const SUGGESTIONS = [
  ['vuejs/core', 'facebook/react'],
  ['nuxt/nuxt', 'vercel/next.js'],
  ['sveltejs/svelte', 'solidjs/solid'],
  ['golang/go', 'rust-lang/rust'],
  ['vitejs/vite', 'webpack/webpack'],
  ['denoland/deno', 'oven-sh/bun'],
] as const

const title = computed(() =>
  a.value && b.value ? `${a.value} vs ${b.value}` : 'Compare repositories',
)
useSeoMeta({
  title,
  description: () =>
    a.value && b.value
      ? `${a.value} and ${b.value} side by side: stars, forks, commits, PRs, issues and activity.`
      : 'Compare two GitHub repositories side by side.',
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <div class="max-w-5xl mx-auto">
      <header class="mb-8">
        <p class="label-micro m-0 mb-3">Repositories</p>
        <h1 class="m-0 font-mono text-3xl sm:text-4xl font-medium tracking-tight">Compare</h1>
        <p class="mt-3 mb-0 text-fg-muted text-base sm:text-lg max-w-2xl">
          Two repositories side by side: popularity, activity and maintenance.
        </p>
      </header>

      <section aria-label="Pick repositories" class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end mb-8">
        <RepoSearch label="First repository" :model-value="a" @pick="name => pick('a', name)" />
        <button
          type="button"
          class="btn-ghost justify-self-center"
          :disabled="!a && !b"
          aria-label="Swap repositories"
          title="Swap"
          @click="swap"
        >
          <span class="i-lucide:arrow-left-right size-4" aria-hidden="true" />
        </button>
        <RepoSearch label="Second repository" :model-value="b" @pick="name => pick('b', name)" />
      </section>

      <section v-if="!a || !b" class="card p-5 sm:p-6" aria-labelledby="suggest-heading">
        <h2 id="suggest-heading" class="section-title mb-4">Popular match-ups</h2>
        <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 list-none m-0 p-0">
          <li v-for="[x, y] in SUGGESTIONS" :key="`${x}-${y}`">
            <NuxtLink
              :to="{ query: { a: x, b: y } }"
              class="flex items-center gap-2 min-h-11 px-3.5 rounded-lg border border-border font-mono text-sm text-fg-muted transition-[color,border-color,background-color] duration-150 hover:(text-fg border-border-hover bg-bg-muted) focus-ring"
            >
              <span class="truncate">{{ x }}</span>
              <span class="text-fg-subtle shrink-0">vs</span>
              <span class="truncate">{{ y }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <template v-if="a || b">
        <section aria-label="Comparison" class="card overflow-hidden mt-6">
          <!-- header row: [metric | A | B] -->
          <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-6 items-center px-4 sm:px-6 py-4 border-b border-border">
            <span class="label-micro">Metric</span>
            <template v-for="(side, i) in [{ repo: repoA, name: a, state: left, wins: wins.a }, { repo: repoB, name: b, state: right, wins: wins.b }]" :key="i">
              <div class="min-w-0">
                <NuxtLink
                  v-if="side.repo"
                  :to="`/repos/${side.repo.name}`"
                  class="group flex items-center gap-2.5 min-w-0 rounded-lg focus-ring"
                >
                  <RepoOwnerAvatar :src="side.repo.ownerAvatar" :owner="side.repo.owner" :size="32" class="size-8 max-sm:hidden" />
                  <span class="min-w-0">
                    <span class="block font-mono text-sm truncate group-hover:text-accent transition-colors duration-150">{{ side.repo.name }}</span>
                    <span v-if="repoA && repoB" class="block text-xs text-fg-subtle tabular">{{ side.wins }} {{ side.wins === 1 ? 'win' : 'wins' }}</span>
                  </span>
                </NuxtLink>
                <span v-else-if="side.name && side.state.error.value" class="text-sm text-badge-red">Couldn't load {{ side.name }}</span>
                <span v-else-if="side.name" class="skeleton block h-4 w-32" />
                <span v-else class="text-sm text-fg-subtle">Pick a repository</span>
              </div>
            </template>
          </div>

          <dl class="m-0">
            <div
              v-for="row in rows"
              :key="row.label"
              class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-6 items-center min-h-12 px-4 sm:px-6 py-2.5 border-b border-border last:border-b-0"
            >
              <dt class="flex items-center gap-2 text-sm text-fg-muted min-w-0">
                <span :class="row.icon" class="size-4 shrink-0 text-fg-subtle max-sm:hidden" aria-hidden="true" />
                <span class="truncate">{{ row.label }}</span>
              </dt>
              <dd
                v-for="side in (['a', 'b'] as const)"
                :key="side"
                class="m-0 font-mono text-sm sm:text-base tabular flex items-center gap-1.5 min-w-0"
                :class="row.winner === side ? 'text-accent font-medium' : 'text-fg'"
              >
                <template v-if="(side === 'a' ? row.va : row.vb) != null">
                  {{ formatNumber((side === 'a' ? row.va : row.vb)!) }}
                  <span v-if="row.winner === side" class="i-lucide:trophy size-3.5 shrink-0" aria-label="leads" />
                  <span v-if="row.winner === side && row.ratio && row.ratio >= 1.1" class="text-2xs text-fg-subtle font-normal max-sm:hidden">
                    {{ row.ratio >= 10 ? Math.round(row.ratio) : row.ratio.toFixed(1) }}×
                  </span>
                </template>
                <span v-else class="text-fg-subtle">—</span>
              </dd>
            </div>
            <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-6 items-center min-h-12 px-4 sm:px-6 py-2.5 border-b border-border">
              <dt class="flex items-center gap-2 text-sm text-fg-muted">
                <span class="i-lucide:calendar size-4 shrink-0 text-fg-subtle max-sm:hidden" aria-hidden="true" />Created
              </dt>
              <dd v-for="(r, i) in [repoA, repoB]" :key="i" class="m-0 font-mono text-sm text-fg">
                {{ r ? formatMonthYear(r.createdAt) : '—' }}
              </dd>
            </div>
            <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-6 items-center min-h-12 px-4 sm:px-6 py-2.5 border-b border-border">
              <dt class="flex items-center gap-2 text-sm text-fg-muted">
                <span class="i-lucide:upload size-4 shrink-0 text-fg-subtle max-sm:hidden" aria-hidden="true" />Last push
              </dt>
              <dd v-for="(r, i) in [repoA, repoB]" :key="i" class="m-0 font-mono text-sm text-fg">
                {{ r ? formatAgo(r.pushedAt) : '—' }}
              </dd>
            </div>
            <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-6 items-center min-h-12 px-4 sm:px-6 py-2.5">
              <dt class="flex items-center gap-2 text-sm text-fg-muted">
                <span class="i-lucide:scale size-4 shrink-0 text-fg-subtle max-sm:hidden" aria-hidden="true" />License
              </dt>
              <dd v-for="(r, i) in [repoA, repoB]" :key="i" class="m-0 font-mono text-sm text-fg truncate">
                {{ r?.license ?? '—' }}
              </dd>
            </div>
          </dl>
        </section>

        <section v-if="repoA || repoB" class="card p-4 sm:p-6 mt-6" aria-labelledby="cmp-activity">
          <h2 id="cmp-activity" class="section-title mb-5">Weekly commits</h2>
          <RepoActivity
            :series="[
              ...(repoA ? [{ label: repoA.name, values: repoA.activity, color: 'var(--accent)' }] : []),
              ...(repoB ? [{ label: repoB.name, values: repoB.activity, color: 'var(--badge-purple)' }] : []),
            ]"
          />
        </section>

        <div v-if="repoA || repoB" class="grid gap-6 sm:grid-cols-2 mt-6">
          <section v-for="r in [repoA, repoB].filter(Boolean)" :key="r!.name" class="card p-4 sm:p-6" :aria-label="`${r!.name} languages`">
            <h2 class="section-title mb-5 truncate">{{ r!.name }}</h2>
            <RepoLanguageBar :languages="r!.languages" />
          </section>
        </div>
      </template>
    </div>
  </main>
</template>
