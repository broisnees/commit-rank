<script setup lang="ts">
import type { RepoList, TrendingSince } from '#shared/types/repos'
import { findRepoLanguage } from '#shared/types/repos'

const route = useRoute()
const since = computed<TrendingSince>(() =>
  route.query.since === 'day' || route.query.since === 'month' ? route.query.since : 'week',
)
const lang = computed(() => findRepoLanguage(route.query.lang)?.slug ?? null)
const langLabel = computed(() => findRepoLanguage(lang.value)?.label)

const tabs = computed(() => [
  { key: 'day', label: 'Today', icon: 'i-lucide:sunrise', to: { query: { ...route.query, since: 'day' } } },
  { key: 'week', label: 'This week', short: 'Week', icon: 'i-lucide:calendar-days', to: { query: { ...route.query, since: undefined } } },
  { key: 'month', label: 'This month', short: 'Month', icon: 'i-lucide:calendar-range', to: { query: { ...route.query, since: 'month' } } },
])

const { data, error, status, refresh } = await useAsyncData(
  () => `repos:trending:${since.value}:${lang.value ?? 'all'}`,
  () => $fetch<RepoList>('/api/repos/trending', { query: { since: since.value, lang: lang.value ?? undefined } }),
  { lazy: true },
)

const items = computed(() => data.value?.items ?? [])
const max = computed(() => Math.max(0, ...items.value.map(r => r.stars)))
const windowLabel = computed(() => ({ day: 'the last 24 hours', week: 'the last 7 days', month: 'the last 30 days' })[since.value])

useSeoMeta({
  title: () => `Trending repositories${langLabel.value ? ` · ${langLabel.value}` : ''}`,
  description: 'New GitHub repositories gaining stars fastest, today, this week and this month.',
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12 overflow-x-clip">
    <header class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
      <div class="min-w-0">
        <p class="label-micro m-0 mb-3">Repositories</p>
        <h1 class="m-0 font-mono text-3xl sm:text-4xl font-medium tracking-tight flex items-center gap-3">
          <span class="i-lucide:flame text-accent size-[0.85em]" aria-hidden="true" />
          Trending
        </h1>
        <p class="mt-3 mb-0 text-fg-muted text-base sm:text-lg max-w-2xl">
          New repositories gaining stars fastest: created in {{ windowLabel }}{{ langLabel ? `, written in ${langLabel}` : '' }}, sorted by stars.
        </p>
      </div>
      <NuxtLink to="/repos" class="btn shrink-0 self-start md:self-auto">
        <span class="i-lucide:star size-4" aria-hidden="true" /> All-time top
      </NuxtLink>
    </header>

    <div class="sm:sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6 bg-bg/85 backdrop-blur-md flex flex-col gap-3">
      <RepoTabs label="Time window" :active="since" :items="tabs" />
      <RepoLanguageChips :active="lang" />
    </div>

    <RepoListSkeleton v-if="!data && !error" />
    <RepoErrorCard v-else-if="error && !data" :error="error" @retry="refresh()" />
    <section v-else-if="data" aria-label="Trending repositories" :class="status === 'pending' ? 'opacity-60 transition-opacity' : ''">
      <ol v-if="items.length" class="list-none m-0 p-0 flex flex-col gap-1">
        <RepoRow
          v-for="(repo, i) in items"
          :key="repo.name"
          :repo="repo"
          :rank="i + 1"
          metric="stars"
          :max="max"
          :note="`created ${formatAgo(repo.createdAt)}`"
        />
      </ol>
      <div v-else class="card px-6 py-12 text-center">
        <span class="i-lucide:telescope size-8 text-fg-subtle" aria-hidden="true" />
        <h2 class="font-mono text-lg mt-4 mb-2">Quiet so far</h2>
        <p class="text-fg-muted m-0 max-w-md mx-auto">No new repositories have picked up stars in this window yet.</p>
      </div>
      <p class="mt-8 mb-0 pt-4 border-t border-border text-sm text-fg-subtle flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span>
          GitHub has no official trending API; this ranks
          <span class="tabular text-fg-muted">{{ formatNumber(data.total) }}</span> new repositories by stars.
        </span>
        <span class="font-mono">Updated {{ formatAgo(data.generatedAt) }}</span>
      </p>
    </section>
  </main>
</template>
