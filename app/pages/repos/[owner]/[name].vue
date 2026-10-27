<script setup lang="ts">
import type { RepoDetail } from '#shared/types/repos'

const route = useRoute('repos-owner-name')
const owner = computed(() => String(route.params.owner))
const name = computed(() => String(route.params.name))

// Hover-prefetched repos render instantly on client navigation.
const nuxtApp = useNuxtApp()
const key = () => repoKey(`${owner.value}/${name.value}`)
const { data: repo, error, refresh } = await useAsyncData(
  key,
  () =>
    import.meta.server
      ? $fetch<RepoDetail>(`/api/repos/${owner.value}/${name.value}`)
      : loadClientData<RepoDetail>(key(), `/api/repos/${owner.value}/${name.value}`),
  {
    getCachedData: k => (nuxtApp.isHydrating ? nuxtApp.payload.data[k] : peekClientData<RepoDetail>(k)),
  },
)
onMounted(() => primeClientData(key(), repo.value))
if (error.value?.statusCode === 404 || error.value?.statusCode === 400) {
  throw createError({ statusCode: 404, statusMessage: error.value.statusMessage, fatal: true })
}

const stats = computed(() => {
  const r = repo.value
  if (!r) return []
  return [
    { label: 'Stars', value: r.stars, icon: 'i-lucide:star' },
    { label: 'Forks', value: r.forks, icon: 'i-lucide:git-fork' },
    { label: 'Watchers', value: r.watchers, icon: 'i-lucide:eye' },
    { label: 'Commits', value: r.commits, icon: 'i-lucide:git-commit-horizontal', hint: r.defaultBranch ? `on ${r.defaultBranch}` : undefined },
    { label: 'Open issues', value: r.openIssues, icon: 'i-lucide:circle-dot' },
    { label: 'Closed issues', value: r.closedIssues, icon: 'i-lucide:circle-check' },
    { label: 'Open PRs', value: r.openPrs, icon: 'i-lucide:git-pull-request' },
    { label: 'Merged PRs', value: r.mergedPrs, icon: 'i-lucide:git-merge' },
  ]
})

const homepage = computed(() => {
  const url = repo.value?.homepage
  if (!url) return null
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`
  return { href, label: url.replace(/^https?:\/\//, '').replace(/\/$/, '') }
})

const maxContrib = computed(() => repo.value?.contributors?.[0]?.contributions ?? 0)

useSeoMeta({
  title: () => repo.value?.name ?? `${owner.value}/${name.value}`,
  description: () =>
    repo.value
      ? `${repo.value.description ?? repo.value.name}. ${formatNumber(repo.value.stars)} stars, ${formatNumber(repo.value.forks)} forks.`
      : undefined,
  ogImage: () => repo.value?.ownerAvatar,
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <RepoErrorCard v-if="!repo" :error="error" title="Couldn't load this repository" @retry="refresh()" />

    <article v-else class="max-w-5xl mx-auto flex flex-col gap-6">
      <header class="flex flex-col sm:flex-row gap-5 sm:items-start motion-safe:animate-fade-in">
        <RepoOwnerAvatar :src="repo.ownerAvatar" :owner="repo.owner" :size="80" eager class="size-16 sm:size-20 rounded-2xl!" />
        <div class="min-w-0 flex-1">
          <p class="label-micro m-0 mb-2 flex items-center gap-2">
            {{ repo.ownerType === 'Organization' ? 'Organization repository' : 'Repository' }}
            <span v-if="repo.archived" class="rounded-full border border-badge-orange/40 px-2 py-0.5 text-badge-orange normal-case tracking-normal">Archived</span>
            <span v-if="repo.fork" class="rounded-full border border-border px-2 py-0.5 normal-case tracking-normal">Fork</span>
          </p>
          <h1 class="m-0 font-mono text-2xl sm:text-4xl font-medium tracking-tight break-words">
            <NuxtLink
              v-if="repo.ownerType === 'User'"
              :to="`/u/${repo.owner}`"
              class="text-fg-subtle hover:text-accent transition-colors duration-150 rounded focus-ring"
            >{{ repo.owner }}</NuxtLink>
            <span v-else class="text-fg-subtle">{{ repo.owner }}</span><span class="text-fg-subtle">/</span>{{ repo.name.split('/')[1] }}
          </h1>
          <p v-if="repo.description" class="mt-3 mb-0 text-fg-muted text-base sm:text-lg max-w-[65ch]">{{ repo.description }}</p>
          <ul class="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 mb-0 p-0 list-none text-sm text-fg-subtle">
            <li v-if="repo.license" class="inline-flex items-center gap-1.5">
              <span class="i-lucide:scale size-4" aria-hidden="true" />{{ repo.license }}
            </li>
            <li v-if="homepage" class="inline-flex items-center gap-1.5 min-w-0">
              <span class="i-lucide:link size-4" aria-hidden="true" />
              <a :href="homepage.href" target="_blank" rel="noopener nofollow" class="truncate max-w-56 hover:text-accent transition-colors duration-150">{{ homepage.label }}</a>
            </li>
            <li class="inline-flex items-center gap-1.5">
              <span class="i-lucide:calendar size-4" aria-hidden="true" />Created {{ formatMonthYear(repo.createdAt) }}
            </li>
            <li class="inline-flex items-center gap-1.5">
              <span class="i-lucide:upload size-4" aria-hidden="true" />Pushed {{ formatAgo(repo.pushedAt) }}
            </li>
          </ul>
          <ul v-if="repo.topics.length" class="flex flex-wrap gap-1.5 mt-4 mb-0 p-0 list-none">
            <li v-for="topic in repo.topics" :key="topic" class="rounded-full bg-accent/10 text-accent px-2.5 py-0.5 font-mono text-xs">{{ topic }}</li>
          </ul>
        </div>
        <div class="flex sm:flex-col gap-2 shrink-0">
          <a :href="repo.url" target="_blank" rel="noopener" class="btn">
            <span class="i-simple-icons:github size-4" aria-hidden="true" /> GitHub
          </a>
          <NuxtLink :to="{ path: '/compare', query: { a: repo.name } }" class="btn">
            <span class="i-lucide:git-compare size-4" aria-hidden="true" /> Compare
          </NuxtLink>
        </div>
      </header>

      <section aria-label="Repository stats" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="stat in stats" :key="stat.label" class="card p-4 sm:p-5">
          <p class="m-0 flex items-center gap-1.5 label-micro">
            <span :class="stat.icon" class="size-4 text-accent" aria-hidden="true" />{{ stat.label }}
          </p>
          <p class="m-0 mt-2 font-mono text-2xl sm:text-3xl tabular tracking-tight">
            {{ stat.value == null ? '—' : formatNumber(stat.value) }}
          </p>
          <p v-if="stat.hint" class="m-0 mt-0.5 text-xs text-fg-subtle font-mono truncate">{{ stat.hint }}</p>
        </div>
      </section>

      <section class="card p-4 sm:p-6" aria-labelledby="activity-heading">
        <h2 id="activity-heading" class="section-title mb-5">Commit activity</h2>
        <RepoActivity :series="[{ label: 'Commits', values: repo.activity, color: 'var(--accent)' }]" />
      </section>

      <div class="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section class="card p-4 sm:p-6" aria-labelledby="lang-heading">
          <h2 id="lang-heading" class="section-title mb-5">Languages</h2>
          <RepoLanguageBar :languages="repo.languages" />
        </section>

        <section class="card p-4 sm:p-6" aria-labelledby="contrib-heading">
          <h2 id="contrib-heading" class="section-title mb-5">Top contributors</h2>
          <ol v-if="repo.contributors?.length" class="list-none m-0 p-0 grid gap-2.5">
            <li v-for="c in repo.contributors" :key="c.login">
              <NuxtLink :to="`/u/${c.login}`" class="group flex items-center gap-3 rounded-lg focus-ring">
                <img :src="`${c.avatarUrl}${c.avatarUrl.includes('?') ? '&' : '?'}s=56`" :alt="`${c.login}'s avatar`" width="28" height="28" loading="lazy" decoding="async" class="img-outline size-7 rounded-full bg-bg-muted shrink-0" />
                <span class="min-w-0 flex-1">
                  <span class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-mono truncate group-hover:text-accent transition-colors duration-150">{{ c.login }}</span>
                    <span class="font-mono text-fg-subtle tabular shrink-0">{{ formatNumber(c.contributions) }}</span>
                  </span>
                  <span class="block mt-1 h-1 rounded-full bg-bg-muted overflow-hidden">
                    <span class="block h-full rounded-full bg-accent/70" :style="{ width: `${Math.max((c.contributions / maxContrib) * 100, 2)}%` }" />
                  </span>
                </span>
              </NuxtLink>
            </li>
          </ol>
          <p v-else class="m-0 text-sm text-fg-subtle">GitHub doesn't list contributors for this repository.</p>
        </section>
      </div>

      <section v-if="repo.recentReleases.length" aria-labelledby="releases-heading">
        <div class="flex items-baseline justify-between mt-2 mb-4">
          <h2 id="releases-heading" class="section-title">Recent releases</h2>
          <a :href="`${repo.url}/releases`" target="_blank" rel="noopener" class="text-sm font-mono link-subtle">
            {{ formatNumber(repo.releases) }} total
          </a>
        </div>
        <ul class="list-none m-0 p-0 card divide-y divide-border overflow-hidden">
          <li v-for="release in repo.recentReleases" :key="release.url">
            <a :href="release.url" target="_blank" rel="noopener" class="flex items-center gap-3 min-h-12 px-4 py-3 hover:bg-bg-muted transition-colors duration-150 focus-ring group">
              <span class="i-lucide:tag size-4 text-fg-subtle shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate group-hover:text-accent transition-colors duration-150">{{ release.name }}</span>
              <span class="font-mono text-xs text-fg-subtle shrink-0">{{ release.tag }}</span>
              <span v-if="release.publishedAt" class="font-mono text-xs text-fg-subtle shrink-0 max-sm:hidden">{{ formatAgo(release.publishedAt) }}</span>
            </a>
          </li>
        </ul>
      </section>

      <p class="text-xs font-mono text-fg-subtle text-end m-0">Updated {{ formatAgo(repo.generatedAt) }}</p>
    </article>
  </main>
</template>
