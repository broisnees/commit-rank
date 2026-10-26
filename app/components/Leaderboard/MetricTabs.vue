<script setup lang="ts">
defineProps<{ modelValue: MetricKey }>()
const route = useRoute()
</script>

<template>
  <nav aria-label="Rank by" class="min-w-0 overflow-x-auto no-scrollbar scroll-fade -mx-4 px-4 sm:mx-0 sm:px-0">
    <!-- 10px outer radius = 6px tab radius + 4px padding -->
    <ul class="inline-flex gap-0.5 p-1 list-none m-0 rounded-[10px] border border-border bg-bg-subtle">
      <li v-for="key in METRIC_KEYS" :key="key">
        <NuxtLink
          :to="{ query: { ...route.query, by: key === 'commits' ? undefined : key } }"
          replace
          :aria-current="modelValue === key ? 'page' : undefined"
          class="flex items-center gap-1.5 h-9 whitespace-nowrap rounded-md px-3 font-mono text-sm transition-[color,background-color] duration-150 focus-ring"
          :class="
            modelValue === key
              ? 'bg-bg-elevated text-fg shadow-[0_1px_2px_oklch(0_0_0/0.2)]'
              : 'text-fg-subtle hover:(text-fg bg-bg-muted)'
          "
        >
          <span
            :class="[METRICS[key].icon, modelValue === key ? 'text-accent' : '']"
            class="size-4 max-sm:hidden"
            aria-hidden="true"
          />
          <span class="sm:hidden capitalize">{{ METRICS[key].unit }}</span>
          <span class="max-sm:hidden">{{ METRICS[key].label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
