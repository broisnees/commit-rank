<script setup lang="ts">
const props = withDefaults(
  defineProps<{ id: number; login: string; size?: number; eager?: boolean }>(),
  { size: 40 },
)
// 2x for retina, rounded up to a size GitHub serves from cache
const src = computed(() => avatarUrl(props.id, Math.min(props.size * 2, 460)))
</script>

<template>
  <img
    :src="src"
    :alt="`${login}'s avatar`"
    :width="size"
    :height="size"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
    class="img-outline shrink-0 rounded-full bg-bg-muted object-cover"
  />
</template>
