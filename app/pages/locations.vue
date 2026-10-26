<script setup lang="ts">
const query = ref('')

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return LOCATION_REGIONS.map(region => ({
    region,
    items: LOCATIONS.filter(
      l =>
        l.region === region &&
        (!q || l.name.toLowerCase().includes(q) || l.terms.some(t => t.toLowerCase().includes(q))),
    ),
  })).filter(g => g.items.length)
})

const customSlug = computed(() => slugifyLocation(query.value))
const canGoCustom = computed(() => customSlug.value.length >= 3 && resolveLocation(customSlug.value) !== null)

function submit() {
  const first = groups.value[0]?.items[0]
  if (first && groups.value.length === 1 && groups.value[0]!.items.length === 1) {
    return navigateTo(`/rank/${first.slug}`)
  }
  if (canGoCustom.value) return navigateTo(`/rank/${customSlug.value}`)
}

useSeoMeta({ title: 'Locations', description: 'GitHub leaderboards for every country and any city.' })
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <header class="mb-8 max-w-3xl">
      <p class="label-micro m-0 mb-3">Browse</p>
      <h1 class="m-0 mb-3 font-mono text-3xl sm:text-4xl font-medium tracking-tight">Locations</h1>
      <p class="m-0 text-fg-muted text-base sm:text-lg">
        Pick a country, or type any city to build a leaderboard for it on the fly.
      </p>
    </header>

    <form class="flex flex-col sm:flex-row gap-3 mb-12" @submit.prevent="submit">
      <label class="relative flex-1 max-w-md">
        <span class="sr-only">Filter countries or enter a city</span>
        <span class="i-lucide:map-pin absolute start-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle pointer-events-none" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          placeholder="Nepal, Kathmandu, Berlin…"
          class="field ps-9"
        />
      </label>
      <NuxtLink v-if="canGoCustom" :to="`/rank/${customSlug}`" class="btn-primary min-h-11 self-start">
        Rank “{{ query.trim() }}”
        <span class="i-lucide:arrow-right size-4" aria-hidden="true" />
      </NuxtLink>
    </form>

    <NuxtLink to="/rank/global" class="flex items-center gap-4 card card-hover p-5 mb-12 focus-ring group max-w-md">
      <span class="text-3xl leading-none" aria-hidden="true">🌍</span>
      <span class="flex-1 min-w-0">
        <span class="block font-mono font-medium group-hover:text-accent transition-colors duration-150">Global</span>
        <span class="block text-sm text-fg-subtle">Every tracked developer, worldwide</span>
      </span>
      <span class="i-lucide:arrow-right size-4 text-fg-subtle" aria-hidden="true" />
    </NuxtLink>

    <div class="flex flex-col gap-10">
      <section v-for="group in groups" :key="group.region" :aria-labelledby="`region-${group.region}`">
        <h2 :id="`region-${group.region}`" class="label-micro m-0 mb-4 flex items-center gap-2">
          {{ group.region }}
          <span class="tabular text-fg-subtle/70">{{ group.items.length }}</span>
        </h2>
        <ul class="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 list-none m-0 p-0">
          <li v-for="loc in group.items" :key="loc.slug">
            <NuxtLink :to="`/rank/${loc.slug}`" class="flex items-center gap-3 min-h-12 card card-hover px-4 focus-ring group">
              <span class="text-xl leading-none" aria-hidden="true">{{ loc.flag }}</span>
              <span class="truncate group-hover:text-accent transition-colors duration-150">{{ loc.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <p v-if="!groups.length" class="text-fg-subtle font-mono">
      No curated location matches. Press enter to rank “{{ query.trim() }}” anyway.
    </p>
  </main>
</template>
