<script setup lang="ts">
import type { CountryRepos, RepoList, RepoSort } from '#shared/types/repos'
import { findRepoLanguage } from '#shared/types/repos'

type View = RepoSort | 'country'

const route = useRoute()
const view = computed<View>(() =>
  (['forks', 'updated', 'country'] as const).includes(route.query.by as never)
    ? (route.query.by as View)
    : 'stars',
)
const lang = computed(() => findRepoLanguage(route.query.lang)?.slug ?? null)
const countrySlug = computed(() => {
  const slug = String(route.query.country ?? 'nepal').toLowerCase()
  const loc = resolveLocation(slug)
  return loc && loc.region !== 'Custom' && loc.slug !== 'global' ? loc.slug : 'nepal'
})
const country = computed(() => resolveLocation(countrySlug.value)!)

const tabs = computed(() => [
  { key: 'stars', label: 'Most starred', short: 'Stars', icon: 'i-lucide:star', to: { query: { ...route.query, by: undefined } } },
  { key: 'forks', label: 'Most forked', short: 'Forks', icon: 'i-lucide:git-fork', to: { query: { ...route.query, by: 'forks' } } },
  { key: 'updated', label: 'Recently active', short: 'Active', icon: 'i-lucide:activity', to: { query: { ...route.query, by: 'updated' } } },
  { key: 'country', label: 'By country', short: 'Country', icon: 'i-lucide:globe', to: { query: { by: 'country', country: countrySlug.value } } },
])

const { data, error, status, refresh } = await useAsyncData<RepoList | CountryRepos>(
  () => (view.value === 'country' ? `repos:country:${countrySlug.value}` : `repos:top:${view.value}:${lang.value ?? 'all'}`),
  () =>
    view.value === 'country'
      ? ($fetch(`/api/repos/country/${countrySlug.value}`) as Promise<CountryRepos>)
      : ($fetch('/api/repos/top', { query: { sort: view.value, lang: lang.value ?? undefined } }) as Promise<RepoList>),
  { lazy: true },
)
const total = computed(() => (data.value && 'total' in data.value ? data.value.total : null))
const owners = computed(() => (data.value && 'owners' in data.value ? data.value.owners.length : 0))

const metric = computed(() => (view.value === 'forks' ? 'forks' : 'stars'))
const items = computed(() => data.value?.items ?? [])
const max = computed(() => Math.max(0, ...items.value.map(r => r[metric.value])))

function switchCountry(slug: string) {
  navigateTo({ query: { by: 'country', country: slug } }, { replace: true })
}

const heading = computed(() =>
  view.value === 'country'
    ? `Top repositories from ${country.value.name}`
    : {
        stars: 'Most starred repositories',
        forks: 'Most forked repositories',
        updated: 'Recently active popular repositories',
      }[view.value],
)
const langLabel = computed(() => findRepoLanguage(lang.value)?.label)

useSeoMeta({
  title: () => (langLabel.value && view.value !== 'country' ? `${heading.value} · ${langLabel.value}` : heading.value),
  description: 'The most starred and forked repositories on GitHub, by language and by country.',
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12 overflow-x-clip">
    <header class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
      <div class="min-w-0">
        <p class="label-micro m-0 mb-3">Repositories</p>
        <h1 class="m-0 font-mono text-3xl sm:text-4xl font-medium tracking-tight">{{ heading }}</h1>
        <p class="mt-3 mb-0 text-fg-muted text-base sm:text-lg max-w-2xl">
          <template v-if="view === 'country'">
            Most starred repositories owned by the most-followed developers in {{ country.name }}.
          </template>
          <template v-else>
            The top 100 on GitHub{{ langLabel ? ` written in ${langLabel}` : '' }}, refreshed every few hours.
          </template>
        </p>
      </div>
      <NuxtLink to="/repos/trending" class="btn shrink-0 self-start md:self-auto">
        <span class="i-lucide:flame size-4 text-accent" aria-hidden="true" /> Trending now
      </NuxtLink>
    </header>

    <div class="sm:sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6 bg-bg/85 backdrop-blur-md flex flex-col gap-3">
      <RepoTabs label="Sort repositories" :active="view" :items="tabs" />
      <RepoLanguageChips v-if="view !== 'country'" :active="lang" />
      <div v-else class="flex items-center gap-3 sm:w-80">
        <span class="label-micro shrink-0" aria-hidden="true">Country</span>
        <LocationPicker
          class="flex-1"
          :model-value="countrySlug"
          :global="false"
          :custom="false"
          label="Country"
          @update:model-value="switchCountry"
        />
      </div>
    </div>

    <RepoListSkeleton v-if="!data && !error" />
    <RepoErrorCard v-else-if="error && !data" :error="error" @retry="refresh()" />
    <section v-else-if="data" :aria-label="heading" :class="status === 'pending' ? 'opacity-60 transition-opacity' : ''">
      <ol v-if="items.length" class="list-none m-0 p-0 flex flex-col gap-1">
        <RepoRow v-for="(repo, i) in items" :key="repo.name" :repo="repo" :rank="i + 1" :metric="metric" :max="max" />
      </ol>
      <div v-else class="card px-6 py-12 text-center">
        <span class="i-lucide:radar size-8 text-fg-subtle" aria-hidden="true" />
        <h2 class="font-mono text-lg mt-4 mb-2">Nothing here yet</h2>
        <p class="text-fg-muted m-0 max-w-md mx-auto">
          <template v-if="view === 'country'">We're still indexing developers in {{ country.name }}. Check back soon.</template>
          <template v-else>No repositories matched this filter.</template>
        </p>
      </div>
      <p class="mt-8 mb-0 pt-4 border-t border-border text-sm text-fg-subtle flex flex-wrap gap-x-6 gap-y-1 justify-between">
        <span v-if="total != null">
          Top {{ items.length }} of <span class="tabular text-fg-muted">{{ formatNumber(total) }}</span> matching repositories
        </span>
        <span v-else-if="owners">
          From {{ owners }} of {{ country.name }}'s most-followed developers
        </span>
        <span class="font-mono">Updated {{ formatAgo(data.generatedAt) }}</span>
      </p>
    </section>
  </main>
</template>
