<script setup lang="ts">
/**
 * Weekly commit bars for the last 52 weeks. One series fills the bar; two series sit
 * side by side per week (compare page). Pure SVG, no chart library.
 */
const props = defineProps<{
  series: { label: string; values: number[] | null; color: string }[]
  height?: number
}>()

const WEEKS = 52
const h = computed(() => props.height ?? 96)
const visible = computed(() => props.series.filter(s => s.values?.length))
const max = computed(() => Math.max(1, ...visible.value.flatMap(s => s.values!.slice(-WEEKS))))
const totals = computed(() =>
  props.series.map(s => (s.values ? s.values.slice(-WEEKS).reduce((a, b) => a + b, 0) : null)),
)

const slot = 10 // viewBox units per week
const bars = computed(() => {
  const n = Math.max(visible.value.length, 1)
  const width = (slot - 2) / n
  return visible.value.flatMap((s, si) =>
    s.values!.slice(-WEEKS).map((v, week) => {
      const bh = v ? Math.max((v / max.value) * (h.value - 4), 2) : 1
      return {
        key: `${si}-${week}`,
        x: week * slot + 1 + si * width,
        y: h.value - bh,
        w: Math.max(width - 0.6, 1),
        h: bh,
        fill: v ? s.color : 'var(--border)',
        title: `${s.label}: ${v} commit${v === 1 ? '' : 's'}, ${WEEKS - week} week${WEEKS - week === 1 ? '' : 's'} ago`,
      }
    }),
  )
})
</script>

<template>
  <div>
    <svg
      v-if="visible.length"
      :viewBox="`0 0 ${WEEKS * slot} ${h}`"
      preserveAspectRatio="none"
      class="block w-full"
      :style="{ height: `${h}px` }"
      role="img"
      :aria-label="series.map((s, i) => `${s.label}: ${totals[i] ?? 'no data'} commits in 52 weeks`).join('; ')"
    >
      <rect v-for="b in bars" :key="b.key" :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="b.fill" rx="1">
        <title>{{ b.title }}</title>
      </rect>
    </svg>
    <p v-else class="m-0 text-sm text-fg-subtle py-6 text-center">
      GitHub is still computing commit activity for this repository. Check back in a minute.
    </p>
    <div class="flex flex-wrap items-center justify-between gap-2 mt-2 text-2xs font-mono text-fg-subtle">
      <span>52 weeks ago</span>
      <span class="flex flex-wrap gap-4">
        <span v-for="(s, i) in series" :key="s.label" class="inline-flex items-center gap-1.5">
          <span class="size-2 rounded-sm" :style="{ background: s.color }" aria-hidden="true" />
          {{ s.label }} · <span class="tabular">{{ totals[i] == null ? '—' : formatNumber(totals[i]!) }}</span>
        </span>
      </span>
      <span>this week</span>
    </div>
  </div>
</template>
