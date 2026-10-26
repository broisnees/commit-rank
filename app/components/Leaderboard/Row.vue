<script setup lang="ts">
const props = defineProps<{ user: RankedUser & { rank: number }; metric: MetricKey; max: number }>()
// two other metrics, plus active days once the crawler has them (else a third metric)
const secondary = computed(() => {
  const others = METRIC_KEYS.filter(k => k !== props.metric)
  const cells: { key: string; unit: string; value: number }[] = others
    .slice(0, props.user.activeDays != null ? 2 : 3)
    .map(key => ({ key, unit: METRICS[key].unit, value: props.user[key] }))
  if (props.user.activeDays != null) {
    cells.push({ key: 'activeDays', unit: 'active days', value: props.user.activeDays })
  }
  return cells
})
const share = computed(() => (props.max ? Math.max((props.user[props.metric] / props.max) * 100, 1) : 0))
</script>

<template>
  <li class="cv-row">
    <NuxtLink
      :to="`/u/${user.login}`"
      class="group relative flex items-center gap-3 sm:gap-4 min-h-16 rounded-xl border border-transparent px-2 py-2.5 sm:px-4 overflow-hidden transition-[background-color,border-color] duration-150 hover:(bg-bg-subtle border-border) focus-ring"
    >
      <!-- relative magnitude of this metric vs #1 -->
      <span
        class="absolute inset-y-0 start-0 bg-accent/[0.05] pointer-events-none"
        :style="{ width: `${share}%` }"
        aria-hidden="true"
      />
      <span class="relative w-8 sm:w-10 shrink-0 text-end font-mono text-sm text-fg-subtle tabular">
        <span class="sr-only">Rank </span>{{ user.rank }}
      </span>
      <UserAvatar :id="user.id" :login="user.login" :size="40" class="relative size-9 sm:size-10" />
      <div class="relative min-w-0 flex-1">
        <p class="m-0 truncate leading-snug">
          <span class="font-medium">{{ user.name ?? user.login }}</span>
          <span v-if="user.name" class="ms-2 font-mono text-sm text-fg-subtle max-sm:hidden">@{{ user.login }}</span>
        </p>
        <p class="m-0 text-sm text-fg-subtle truncate leading-snug">
          <span v-if="user.name" class="font-mono sm:hidden">@{{ user.login }}</span>
          <span class="max-sm:hidden">{{ [user.company, user.location].filter(Boolean).join(' · ') }}</span>
        </p>
      </div>
      <dl class="relative hidden lg:flex gap-6 m-0 text-end">
        <div v-for="cell in secondary" :key="cell.key" class="w-18">
          <dt class="label-micro whitespace-nowrap">{{ cell.unit }}</dt>
          <dd class="m-0 font-mono text-sm text-fg-muted tabular">{{ formatCompact(cell.value) }}</dd>
        </div>
      </dl>
      <div class="relative shrink-0 text-end min-w-18 sm:min-w-24">
        <p class="m-0 font-mono text-base sm:text-xl leading-none tabular tracking-tight transition-colors duration-150 group-hover:text-accent">
          {{ formatNumber(user[metric]) }}
        </p>
        <p class="m-0 mt-1 label-micro">{{ METRICS[metric].unit }}</p>
      </div>
    </NuxtLink>
  </li>
</template>
