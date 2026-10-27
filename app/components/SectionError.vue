<script setup lang="ts">
defineProps<{ title: string }>()
defineEmits<{ retry: [] }>()
</script>

<!-- Fallback for a page section wrapped in <NuxtErrorBoundary>: the rest of the page keeps working. -->
<template>
  <div class="card flex items-center justify-between gap-4 px-5 min-h-16 py-3">
    <p class="m-0 flex items-center gap-2.5 text-sm text-fg-muted min-w-0">
      <span class="i-lucide:triangle-alert size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      <span class="truncate">{{ title }} couldn't load.</span>
    </p>
    <button type="button" class="btn shrink-0" @click="$emit('retry')">
      <span class="i-lucide:rotate-cw size-4" aria-hidden="true" />
      Retry
    </button>
  </div>
</template>
