<script setup lang="ts">
withDefaults(defineProps<{ src: string; owner: string; size?: number; eager?: boolean }>(), {
  size: 40,
})
</script>

<template>
  <img
    :src="src"
    :alt="`${owner}'s avatar`"
    :width="size"
    :height="size"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    class="img-outline shrink-0 rounded-lg bg-bg-muted object-cover"
  />
</template>
