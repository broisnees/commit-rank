<script setup lang="ts">
const route = useRoute('u-login')
const login = computed(() => String(route.params.login))

// Hover-prefetched profiles render instantly on client navigation.
const nuxtApp = useNuxtApp()
const { data: profile, error } = await useAsyncData(
  () => profileKey(login.value),
  () =>
    import.meta.server
      ? $fetch<Profile>(`/api/users/${login.value}`)
      : loadClientData<Profile>(profileKey(login.value), `/api/users/${login.value}`),
  {
    getCachedData: key =>
      nuxtApp.isHydrating ? nuxtApp.payload.data[key] : peekClientData<Profile>(key),
  },
)
onMounted(() => primeClientData(profileKey(login.value), profile.value))
if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.statusMessage,
    fatal: true,
  })
}

const user = computed(() => profile.value!)
const matchedLocation = computed(() => matchLocation(user.value.location))

const yearStats = computed(() => [
  { key: 'commits', label: 'Commits', value: user.value.year.commits, icon: METRICS.commits.icon },
  { key: 'prs', label: 'Pull requests', value: user.value.year.prs, icon: METRICS.prs.icon },
  { key: 'reviews', label: 'Reviews', value: user.value.year.reviews, icon: METRICS.reviews.icon },
  { key: 'issues', label: 'Issues', value: user.value.year.issues, icon: 'i-lucide:circle-dot' },
])

const lifetimeStats = computed(() => [
  { label: 'Merged PRs', value: user.value.mergedPrs, icon: 'i-lucide:git-merge' },
  { label: 'Stars earned', value: user.value.stars, icon: 'i-lucide:star' },
  { label: 'Followers', value: user.value.followers, icon: 'i-lucide:users' },
  { label: 'Public repos', value: user.value.publicRepos, icon: 'i-lucide:book-marked' },
])

const maxRepoCommits = computed(() => user.value.contributedRepos[0]?.commits ?? 0)

const prState = {
  MERGED: { icon: 'i-lucide:git-merge', class: 'text-badge-purple', label: 'Merged' },
  OPEN: { icon: 'i-lucide:git-pull-request', class: 'text-badge-green', label: 'Open' },
  CLOSED: { icon: 'i-lucide:git-pull-request-closed', class: 'text-badge-red', label: 'Closed' },
}

const website = computed(() => {
  const url = user.value.websiteUrl
  if (!url) return null
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`
  return { href, label: url.replace(/^https?:\/\//, '').replace(/\/$/, '') }
})

const DAY = 86_400_000
const daysOnGitHub = computed(() => Math.max(Math.floor((Date.now() - Date.parse(user.value.createdAt)) / DAY), 0))

// Early-account easter egg: GitHub ids are sequential
const pioneer = computed(() => {
  const id = user.value.id
  if (id <= 10) return "One of GitHub's first 10 accounts"
  if (id <= 100) return "One of GitHub's first 100 accounts"
  if (id <= 1000) return "One of GitHub's first 1,000 accounts"
  if (id <= 10_000) return "One of GitHub's first 10,000 accounts"
  return null
})

const firsts = computed(() => {
  const f = user.value.firsts
  if (!f) return []
  return [
    f.repo && {
      icon: 'i-lucide:book-marked',
      label: 'First repository',
      title: f.repo.name.split('/')[1] ?? f.repo.name,
      meta: null as string | null,
      to: `/repos/${f.repo.name}`,
      at: f.repo.createdAt,
    },
    f.pr && { icon: 'i-lucide:git-pull-request', label: 'First pull request', title: f.pr.title, meta: f.pr.repo, to: f.pr.url, at: f.pr.createdAt },
    f.issue && { icon: 'i-lucide:circle-dot', label: 'First issue', title: f.issue.title, meta: f.issue.repo, to: f.issue.url, at: f.issue.createdAt },
  ].filter(Boolean) as { icon: string; label: string; title: string; meta: string | null; to: string; at: string }[]
})

// Manual refresh: re-fetches from GitHub, re-ranks, and updates every view of this profile.
const ranksVersion = ref(0)
const refreshing = ref(false)
const refreshNote = ref<{ ok: boolean; text: string } | null>(null)
async function refreshStats() {
  refreshing.value = true
  refreshNote.value = null
  try {
    const fresh = await $fetch<Profile>(`/api/users/${login.value}/refresh`, { method: 'POST' })
    profile.value = fresh
    primeClientData(profileKey(login.value), fresh)
    ranksVersion.value++
    refreshNote.value = { ok: true, text: 'Stats refreshed from GitHub just now.' }
  } catch (error: any) {
    const status = error?.statusCode ?? error?.response?.status
    const retryAfter = Number(error?.data?.data?.retryAfter ?? error?.data?.retryAfter) || 600
    refreshNote.value = {
      ok: false,
      text:
        status === 429
          ? `Refreshed recently. Try again in ${Math.max(Math.ceil(retryAfter / 60), 1)} min.`
          : "Couldn't reach GitHub right now. Try again in a moment.",
    }
  } finally {
    refreshing.value = false
  }
}

const copied = ref(false)
async function share() {
  const url = window.location.href
  if (navigator.share) {
    await navigator.share({ title: `${user.value.login} on commitrank`, url }).catch(() => {})
    return
  }
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

useSeoMeta({
  title: () => (user.value.name ? `${user.value.name} (@${user.value.login})` : `@${user.value.login}`),
  description: () =>
    `${formatNumber(user.value.year.commits)} commits, ${formatNumber(user.value.year.prs)} pull requests and ${formatNumber(user.value.year.contributions)} contributions in the last year.`,
  ogImage: () => avatarUrl(user.value.id, 400),
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <article class="max-w-5xl mx-auto flex flex-col gap-12">
      <!-- identity -->
      <header class="flex flex-col sm:flex-row gap-5 sm:gap-7 sm:items-start motion-safe:animate-fade-in">
        <div class="flex items-start justify-between gap-4">
          <UserAvatar :id="user.id" :login="user.login" :size="120" eager class="rounded-2xl! size-20 sm:size-30" />
          <div class="flex items-center gap-2 sm:hidden">
            <button type="button" class="btn size-10 px-0" :disabled="refreshing" @click="refreshStats">
              <span class="i-lucide:refresh-cw size-4" :class="refreshing ? 'animate-spin' : ''" aria-hidden="true" />
              <span class="sr-only">Refresh stats</span>
            </button>
            <button type="button" class="btn" @click="share">
              <span :class="copied ? 'i-lucide:check text-badge-green' : 'i-lucide:share-2'" class="size-4" aria-hidden="true" />
              {{ copied ? 'Copied' : 'Share' }}
            </button>
          </div>
        </div>
        <div class="min-w-0 flex-1 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h1 class="m-0 text-3xl sm:text-4xl font-semibold tracking-[-0.02em] truncate">
                {{ user.name ?? user.login }}
              </h1>
              <a
                :href="`https://github.com/${user.login}`"
                target="_blank"
                rel="noopener"
                class="mt-1 inline-flex items-center gap-1.5 min-h-8 font-mono text-fg-subtle hover:text-accent transition-colors duration-150 rounded focus-ring"
              >
                <span class="i-simple-icons:github size-4" aria-hidden="true" />
                {{ user.login }}
                <span class="i-lucide:arrow-up-right size-3.5 opacity-60" aria-hidden="true" />
                <span class="sr-only">(opens GitHub)</span>
              </a>
            </div>
            <div class="flex items-center gap-2 max-sm:hidden">
              <button type="button" class="btn" :disabled="refreshing" @click="refreshStats">
                <span class="i-lucide:refresh-cw size-4" :class="refreshing ? 'animate-spin' : ''" aria-hidden="true" />
                {{ refreshing ? 'Refreshing…' : 'Refresh stats' }}
              </button>
              <button type="button" class="btn" @click="share">
                <span :class="copied ? 'i-lucide:check text-badge-green' : 'i-lucide:share-2'" class="size-4" aria-hidden="true" />
                {{ copied ? 'Copied' : 'Share' }}
              </button>
            </div>
          </div>

          <p
            v-if="refreshNote"
            role="status"
            class="m-0 text-sm flex items-center gap-2"
            :class="refreshNote.ok ? 'text-badge-green' : 'text-fg-muted'"
          >
            <span :class="refreshNote.ok ? 'i-lucide:check' : 'i-lucide:clock'" class="size-4 shrink-0" aria-hidden="true" />
            {{ refreshNote.text }}
          </p>

          <div v-if="pioneer || user.automated" class="flex flex-wrap gap-2">
            <span
              v-if="pioneer"
              class="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-gold/40 bg-gold/10 text-gold text-sm font-medium"
            >
              <span class="i-lucide:sparkles size-4" aria-hidden="true" />
              {{ pioneer }}
            </span>
            <span
              v-if="user.automated"
              class="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-border bg-bg-muted text-fg-muted text-sm"
              title="Averages hundreds of commits per active day, so it's kept off leaderboards"
            >
              <span class="i-lucide:bot size-4" aria-hidden="true" />
              Automation-heavy account · not ranked
            </span>
          </div>

          <p v-if="user.bio" class="m-0 text-fg-muted max-w-[65ch]">{{ user.bio }}</p>

          <ul class="flex flex-wrap gap-x-5 gap-y-2 m-0 p-0 list-none text-sm text-fg-subtle">
            <li v-if="user.company" class="inline-flex items-center gap-1.5 min-w-0">
              <span class="i-lucide:building-2 size-4 shrink-0" aria-hidden="true" /><span class="truncate">{{ user.company }}</span>
            </li>
            <li v-if="user.location" class="inline-flex items-center gap-1.5">
              <span class="i-lucide:map-pin size-4 shrink-0" aria-hidden="true" />
              <NuxtLink
                v-if="matchedLocation"
                :to="`/rank/${matchedLocation.slug}`"
                class="underline decoration-fg/25 underline-offset-3 hover:text-accent transition-colors duration-150 rounded focus-ring"
              >{{ user.location }}</NuxtLink>
              <template v-else>{{ user.location }}</template>
            </li>
            <li v-if="website" class="inline-flex items-center gap-1.5 min-w-0">
              <span class="i-lucide:link size-4 shrink-0" aria-hidden="true" />
              <a :href="website.href" target="_blank" rel="noopener nofollow" class="truncate max-w-56 hover:text-accent transition-colors duration-150 rounded focus-ring">{{ website.label }}</a>
            </li>
            <li v-if="user.twitter" class="inline-flex items-center gap-1.5">
              <span class="i-simple-icons:x size-3.5 shrink-0" aria-hidden="true" />
              <a :href="`https://x.com/${user.twitter}`" target="_blank" rel="noopener nofollow" class="hover:text-accent transition-colors duration-150 rounded focus-ring">{{ user.twitter }}</a>
            </li>
            <li class="inline-flex items-center gap-1.5">
              <span class="i-lucide:calendar size-4 shrink-0" aria-hidden="true" />Joined {{ formatMonthYear(user.createdAt) }}
            </li>
          </ul>

          <NuxtErrorBoundary>
            <ProfileRanks :login="user.login" :version="ranksVersion" class="pt-1" />
            <template #error="{ clearError }">
              <SectionError title="Rankings" @retry="clearError" />
            </template>
          </NuxtErrorBoundary>
        </div>
      </header>

      <!-- numbers: last 12 months, then all time -->
      <section aria-labelledby="year-heading" class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-4">
          <h2 id="year-heading" class="section-title">Last 12 months</h2>
          <p class="m-0 text-sm text-fg-subtle font-mono tabular">
            {{ formatNumber(user.year.contributions) }} contributions
          </p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="(stat, i) in yearStats"
            :key="stat.key"
            class="card p-4 sm:p-5 motion-safe:animate-slide-up motion-safe:animate-fill-both"
            :style="{ animationDelay: `${i * 50}ms` }"
          >
            <p class="m-0 flex items-center gap-2 text-sm text-fg-muted">
              <span :class="stat.icon" class="size-4 text-fg-subtle" aria-hidden="true" />{{ stat.label }}
            </p>
            <p class="m-0 mt-3 font-mono text-2xl sm:text-3xl leading-none tracking-tight tabular">{{ formatNumber(stat.value) }}</p>
          </div>
        </div>
        <dl class="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-0 m-0 mt-1 rounded-xl border border-border overflow-hidden">
          <div
            v-for="(stat, i) in lifetimeStats"
            :key="stat.label"
            class="flex items-center gap-2 px-4 min-h-12 border-border"
            :class="[i % 2 === 1 ? '' : 'max-lg:border-e', i < 2 ? 'max-lg:border-b' : '', i < 3 ? 'lg:border-e' : '']"
          >
            <dt class="flex items-center gap-2 min-w-0 text-sm text-fg-muted">
              <span :class="stat.icon" class="size-4 text-fg-subtle shrink-0 max-sm:hidden" aria-hidden="true" />
              <span class="truncate">{{ stat.label }}</span><span class="sr-only"> (all time)</span>
            </dt>
            <dd class="ms-auto m-0 font-mono tabular">{{ formatCompact(stat.value) }}</dd>
          </div>
        </dl>
      </section>

      <!-- calendar -->
      <NuxtErrorBoundary>
      <section class="card p-4 sm:p-6" aria-labelledby="activity-heading">
        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-5">
          <h2 id="activity-heading" class="section-title">Activity</h2>
          <p class="m-0 text-sm font-mono text-fg-subtle tabular">
            {{ formatNumber(user.year.contributions) }} in the last year<template v-if="user.year.private"> · {{ formatNumber(user.year.private) }} private</template>
          </p>
        </div>
        <ProfileHeatmap :calendar="user.calendar" />
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-5 mt-6 mb-0 pt-5 border-t border-border">
          <div v-if="user.activeDays != null">
            <dt class="label-micro">Active days</dt>
            <dd class="m-0 mt-1 font-mono text-xl tabular">{{ user.activeDays }} <span class="text-sm text-fg-subtle">/ 365</span></dd>
          </div>
          <div>
            <dt class="label-micro">Current streak</dt>
            <dd class="m-0 mt-1 font-mono text-xl tabular">{{ user.streak.current }} <span class="text-sm text-fg-subtle">days</span></dd>
          </div>
          <div>
            <dt class="label-micro">Longest streak</dt>
            <dd class="m-0 mt-1 font-mono text-xl tabular">{{ user.streak.longest }} <span class="text-sm text-fg-subtle">days</span></dd>
          </div>
          <div>
            <dt class="label-micro">Best day</dt>
            <dd class="m-0 mt-1 font-mono text-xl tabular">
              <template v-if="user.streak.bestDay">
                {{ user.streak.bestDay.count }}
                <span class="text-sm text-fg-subtle">{{ formatDayMonth(user.streak.bestDay.date) }}</span>
              </template>
              <template v-else>—</template>
            </dd>
          </div>
        </dl>
      </section>
        <template #error="{ clearError }">
          <SectionError title="Activity" @retry="clearError" />
        </template>
      </NuxtErrorBoundary>

      <NuxtErrorBoundary>
      <div class="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section class="card p-4 sm:p-6" aria-labelledby="lang-heading">
          <h2 id="lang-heading" class="section-title mb-5">Languages</h2>
          <ProfileLanguageBar :languages="user.languages" />
        </section>

        <section class="card p-4 sm:p-6" aria-labelledby="committed-heading">
          <h2 id="committed-heading" class="section-title mb-5">Where they commit</h2>
          <ol v-if="user.contributedRepos.length" class="list-none m-0 p-0 flex flex-col gap-1">
            <li v-for="repo in user.contributedRepos" :key="repo.name">
              <NuxtLink :to="`/repos/${repo.name}`" class="group block rounded-lg -mx-2 px-2 py-1.5 hover:bg-bg-muted transition-colors duration-150 focus-ring">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <span class="font-mono truncate group-hover:text-accent transition-colors duration-150">{{ repo.name }}</span>
                  <span class="font-mono text-fg-subtle tabular shrink-0">{{ formatNumber(repo.commits) }}</span>
                </div>
                <div class="mt-1.5 h-1.5 rounded-full bg-bg-muted overflow-hidden">
                  <div class="h-full rounded-full bg-accent/70" :style="{ width: `${Math.max((repo.commits / maxRepoCommits) * 100, 2)}%` }" />
                </div>
              </NuxtLink>
            </li>
          </ol>
          <p v-else class="text-sm text-fg-subtle m-0">No public commits in the last year.</p>
        </section>
      </div>
        <template #error="{ clearError }">
          <SectionError title="Languages and repositories" @retry="clearError" />
        </template>
      </NuxtErrorBoundary>

      <!-- firsts: the easter-egg card -->
      <NuxtErrorBoundary>
        <section v-if="user.firsts" aria-labelledby="firsts-heading" class="card p-4 sm:p-6">
          <div class="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <h2 id="firsts-heading" class="section-title">Firsts</h2>
            <p class="m-0 text-sm font-mono text-fg-subtle tabular">
              Account #{{ formatNumber(user.id) }} · {{ formatNumber(daysOnGitHub) }} days on GitHub
            </p>
          </div>
          <ol class="list-none m-0 p-0 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <li class="flex gap-3 min-w-0">
              <span class="grid place-items-center size-9 shrink-0 rounded-lg bg-bg-muted text-fg-subtle">
                <span class="i-lucide:flag size-4" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="label-micro m-0">Joined GitHub</p>
                <p class="m-0 mt-0.5 text-sm font-medium">{{ formatDayMonth(user.createdAt) }}, {{ new Date(user.createdAt).getUTCFullYear() }}</p>
              </div>
            </li>
            <li v-for="item in firsts" :key="item.label" class="flex gap-3 min-w-0">
              <span class="grid place-items-center size-9 shrink-0 rounded-lg bg-bg-muted text-fg-subtle">
                <span :class="item.icon" class="size-4" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="label-micro m-0">{{ item.label }}</p>
                <NuxtLink
                  :to="item.to"
                  :target="item.to.startsWith('http') ? '_blank' : undefined"
                  :rel="item.to.startsWith('http') ? 'noopener' : undefined"
                  class="block mt-0.5 text-sm font-medium truncate hover:text-accent transition-colors duration-150 rounded focus-ring"
                  :title="item.title"
                >{{ item.title }}</NuxtLink>
                <p class="m-0 text-xs font-mono text-fg-subtle truncate">
                  <template v-if="item.meta">{{ item.meta }} · </template>{{ formatMonthYear(item.at) }}
                </p>
              </div>
            </li>
          </ol>
        </section>
        <template #error="{ clearError }">
          <SectionError title="Firsts" @retry="clearError" />
        </template>
      </NuxtErrorBoundary>

      <NuxtErrorBoundary>
      <section v-if="user.topRepos.length" aria-labelledby="repos-heading" class="flex flex-col gap-4">
        <h2 id="repos-heading" class="section-title">Top repositories</h2>
        <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none m-0 p-0">
          <li v-for="repo in user.topRepos" :key="repo.name">
            <ProfileRepoCard :repo="repo" />
          </li>
        </ul>
      </section>
        <template #error="{ clearError }">
          <SectionError title="Top repositories" @retry="clearError" />
        </template>
      </NuxtErrorBoundary>

      <NuxtErrorBoundary>
      <section v-if="user.recentPrs.length" aria-labelledby="prs-heading" class="flex flex-col gap-4">
        <div class="flex items-baseline justify-between gap-4">
          <h2 id="prs-heading" class="section-title">Recent pull requests</h2>
          <a
            :href="`https://github.com/pulls?q=author%3A${user.login}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-sm font-mono link-subtle rounded focus-ring"
          >
            <span class="tabular">{{ formatNumber(user.totalPrs) }}</span> total
            <span class="i-lucide:arrow-up-right size-3.5 opacity-60" aria-hidden="true" />
          </a>
        </div>
        <ul class="list-none m-0 p-0 card divide-y divide-border overflow-hidden">
          <li v-for="pr in user.recentPrs" :key="pr.url">
            <a :href="pr.url" target="_blank" rel="noopener" class="flex items-start gap-3 px-4 py-3 min-h-14 hover:bg-bg-muted transition-colors duration-150 focus-ring group">
              <span :class="[prState[pr.state].icon, prState[pr.state].class]" class="mt-1 size-4 shrink-0" :title="prState[pr.state].label" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block truncate group-hover:text-accent transition-colors duration-150">{{ pr.title }}</span>
                <span class="block text-xs font-mono text-fg-subtle truncate">
                  <span class="sr-only">{{ prState[pr.state].label }}, </span>{{ pr.repo }}#{{ pr.number }} · {{ formatAgo(pr.createdAt) }}
                </span>
              </span>
            </a>
          </li>
        </ul>
      </section>
        <template #error="{ clearError }">
          <SectionError title="Recent pull requests" @retry="clearError" />
        </template>
      </NuxtErrorBoundary>

      <p class="text-xs font-mono text-fg-subtle text-end m-0 -mt-6">
        Updated {{ formatAgo(user.generatedAt) }}
      </p>
    </article>
  </main>
</template>
