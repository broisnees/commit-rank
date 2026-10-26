<script setup lang="ts">
const props = defineProps<{ login: string; version?: number }>()
// `version` bumps after a manual stats refresh; the changed query re-fetches the ranks
const { data, status } = useFetch<UserRanks>(() => `/api/users/${props.login}/ranks`, {
  server: false,
  lazy: true,
  query: computed(() => (props.version ? { v: props.version } : {})),
})
</script>

<template>
  <!-- reserved height so chips arriving after hydration don't shift the page -->
  <div class="min-h-[4.5rem]">
    <!-- "idle" on the server, "pending" on the client: both render the skeleton, so hydration matches -->
    <div v-if="!data && status !== 'error'" aria-label="Loading ranks">
      <div class="skeleton h-3 w-32 mb-2.5" />
      <div class="flex flex-wrap gap-2">
        <span v-for="i in 5" :key="i" class="skeleton h-10 w-28 rounded-full!" />
      </div>
    </div>

    <template v-else-if="data?.location && data.ranks">
      <p class="label-micro m-0 mb-2.5">
        Rank in <span aria-hidden="true">{{ data.location.flag }}</span> {{ data.location.name }}
        <span v-if="data.pool" class="normal-case tracking-normal font-normal">
          · among <span class="tabular">{{ formatNumber(data.pool) }}</span> tracked developers
        </span>
      </p>
      <ul class="flex flex-wrap gap-2 list-none m-0 p-0">
        <li v-for="key in METRIC_KEYS" :key="key" class="motion-safe:animate-fade-in">
          <NuxtLink
            :to="{ path: `/rank/${data.location.slug}`, query: key === 'commits' ? {} : { by: key } }"
            class="inline-flex items-center gap-2 h-10 rounded-full border px-3.5 text-sm font-mono transition-[color,background-color,border-color] duration-150 focus-ring"
            :class="
              data.ranks[key] <= 3
                ? 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/15'
                : data.ranks[key] <= 10
                  ? 'border-border-hover bg-bg-muted text-fg hover:bg-bg-elevated'
                  : 'border-border bg-bg-subtle text-fg-muted hover:(border-border-hover text-fg)'
            "
          >
            <span :class="METRICS[key].icon" class="size-4" aria-hidden="true" />
            <span class="tabular font-medium">#{{ formatNumber(data.ranks[key]) }}</span>
            <span class="opacity-75">{{ METRICS[key].unit }}</span>
          </NuxtLink>
        </li>
      </ul>
      <template v-if="data.global && METRIC_KEYS.some(k => data!.global![k] != null)">
        <p class="label-micro m-0 mt-4 mb-2.5">Worldwide</p>
        <ul class="flex flex-wrap gap-2 list-none m-0 p-0">
          <template v-for="key in METRIC_KEYS" :key="key">
            <li v-if="data.global[key] != null">
              <NuxtLink
                :to="{ path: '/rank/global', query: key === 'commits' ? {} : { by: key } }"
                class="inline-flex items-center gap-2 h-10 rounded-full border border-gold/40 bg-gold/10 px-3.5 text-sm font-mono text-gold transition-colors duration-150 hover:bg-gold/15 focus-ring"
              >
                <span class="i-lucide:globe size-4" aria-hidden="true" />
                <span class="tabular font-medium">#{{ data.global[key] }}</span>
                <span class="opacity-75">{{ METRICS[key].unit }}</span>
              </NuxtLink>
            </li>
          </template>
        </ul>
      </template>
    </template>

    <p v-else-if="data" class="m-0 text-sm text-fg-subtle">
      Not ranked yet: set a country in your GitHub location (like “Kathmandu, Nepal”) to join a leaderboard.
    </p>
  </div>
</template>
