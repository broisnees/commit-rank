<script setup lang="ts">
defineProps<{ error: { statusCode?: number; statusMessage?: string } | null | undefined; title?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="card px-6 py-12 text-center">
    <span class="i-lucide:cloud-alert size-8 text-fg-subtle" aria-hidden="true" />
    <h2 class="font-mono text-lg mt-4 mb-2">{{ title ?? "Couldn't load repositories" }}</h2>
    <p class="text-fg-muted m-0 mb-6 max-w-md mx-auto">
      {{
        error?.statusCode === 429
          ? 'GitHub rate limit hit. Try again in a few minutes.'
          : error?.statusMessage || 'GitHub is not responding right now.'
      }}
    </p>
    <button type="button" class="btn" @click="$emit('retry')">
      <span class="i-lucide:rotate-cw size-4" aria-hidden="true" /> Try again
    </button>
  </div>
</template>
