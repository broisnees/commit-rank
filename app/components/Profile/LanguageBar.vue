<script setup lang="ts">
const props = defineProps<{ languages: Profile['languages'] }>()
const total = computed(() => props.languages.reduce((sum, l) => sum + l.count, 0))
const pct = (n: number) => (total.value ? (n / total.value) * 100 : 0)
</script>

<template>
  <div v-if="languages.length">
    <div class="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-bg-muted">
      <span
        v-for="lang in languages"
        :key="lang.name"
        :style="{ width: `${pct(lang.count)}%`, background: lang.color ?? 'var(--fg-subtle)' }"
        :title="`${lang.name} ${pct(lang.count).toFixed(1)}%`"
      />
    </div>
    <ul class="list-none m-0 p-0 mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <li v-for="lang in languages" :key="lang.name" class="flex items-center gap-2 min-w-0">
        <span class="size-2.5 rounded-full shrink-0" :style="{ background: lang.color ?? 'var(--fg-subtle)' }" aria-hidden="true" />
        <span class="truncate">{{ lang.name }}</span>
        <span class="ms-auto font-mono text-xs text-fg-subtle tabular">{{ pct(lang.count).toFixed(0) }}%</span>
      </li>
    </ul>
  </div>
  <p v-else class="text-sm text-fg-subtle m-0">No public repositories with a detected language.</p>
</template>
