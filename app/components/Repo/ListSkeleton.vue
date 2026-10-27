<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 10 })
</script>

<template>
  <ul class="list-none m-0 p-0 flex flex-col gap-1" aria-busy="true" aria-label="Loading repositories">
    <li v-for="i in rows" :key="i" class="flex items-center gap-4 min-h-16 px-2 sm:px-4">
      <span class="skeleton h-3 w-6 sm:w-8" />
      <span class="skeleton size-9 sm:size-10 rounded-lg!" />
      <span class="flex-1 flex flex-col gap-2">
        <span class="skeleton h-3.5 w-48 max-w-full" />
        <span class="skeleton h-3 w-72 max-w-full" />
      </span>
      <span class="skeleton h-5 w-14" />
    </li>
  </ul>
</template>
