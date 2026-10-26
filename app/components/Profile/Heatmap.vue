<script setup lang="ts">
const props = defineProps<{ calendar: Profile['calendar'] }>()

const DAY = 86_400_000
const start = computed(() => new Date(`${props.calendar.start}T00:00:00Z`))
// GitHub weeks start on Sunday; pad the first column so rows line up with weekdays
const offset = computed(() => start.value.getUTCDay())

const cells = computed(() =>
  props.calendar.counts.map((count, i) => ({
    count,
    level: props.calendar.levels[i] ?? 0,
    date: new Date(start.value.getTime() + i * DAY).toISOString().slice(0, 10),
  })),
)

const weeks = computed(() => Math.ceil((offset.value + cells.value.length) / 7))
const columns = computed(() => `repeat(${weeks.value}, minmax(0, 1fr))`)

// On narrow screens the calendar scrolls; start at the most recent weeks.
const scroller = useTemplateRef('scroller')
onMounted(() => {
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
})

const months = computed(() => {
  const labels: { col: number; label: string }[] = []
  let last = -1
  cells.value.forEach((cell, i) => {
    const d = new Date(`${cell.date}T00:00:00Z`)
    const col = Math.floor((offset.value + i) / 7)
    if (d.getUTCDate() <= 7 && d.getUTCMonth() !== last && col < weeks.value - 1) {
      last = d.getUTCMonth()
      labels.push({ col, label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) })
    }
  })
  return labels
})
</script>

<template>
  <div ref="scroller" class="overflow-x-auto -mx-1 px-1 pb-1">
    <div :style="{ minWidth: `${weeks * 13}px` }">
      <div
        class="grid text-3xs font-mono text-fg-subtle mb-1.5"
        :style="{ gridTemplateColumns: columns, columnGap: '3px' }"
        aria-hidden="true"
      >
        <span v-for="m in months" :key="m.col" :style="{ gridColumnStart: m.col + 1 }">{{ m.label }}</span>
      </div>
      <div
        class="grid grid-flow-col"
        :style="{ gridTemplateRows: 'repeat(7, auto)', gridTemplateColumns: columns, gap: '3px' }"
        role="img"
        :aria-label="`Contribution calendar, ${calendar.counts.reduce((a, b) => a + b, 0)} contributions`"
      >
        <span v-for="i in offset" :key="`pad-${i}`" class="aspect-square" />
        <!-- ~370 cells: keep each one tiny (class + data attr) so the SSR HTML stays light -->
        <span
          v-for="cell in cells"
          :key="cell.date"
          class="heat"
          :data-l="cell.level"
          :title="`${cell.count || 'No'} contribution${cell.count === 1 ? '' : 's'} on ${formatDayMonth(cell.date)}`"
        />
      </div>
    </div>
  </div>
  <div class="flex items-center justify-end gap-1.5 mt-3 text-3xs font-mono text-fg-subtle" aria-hidden="true">
    Less
    <span v-for="l in 5" :key="l" class="heat size-[11px]" :data-l="l - 1" />
    More
  </div>
</template>

<style>
.heat {
  aspect-ratio: 1;
  border-radius: 3px;
  background: var(--heat-0);
  outline: 1px solid color-mix(in oklab, var(--fg) 5%, transparent);
  outline-offset: -1px;
  transition: outline-color 0.1s;
}
.heat:hover {
  outline-color: color-mix(in oklab, var(--fg) 60%, transparent);
}
.heat[data-l='1'] {
  background: var(--heat-1);
}
.heat[data-l='2'] {
  background: var(--heat-2);
}
.heat[data-l='3'] {
  background: var(--heat-3);
}
.heat[data-l='4'] {
  background: var(--heat-4);
}
</style>
