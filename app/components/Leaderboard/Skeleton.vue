<template>
  <div aria-busy="true" aria-label="Loading leaderboard">
    <div class="grid grid-cols-3 items-end gap-2 sm:gap-4 lg:gap-6 mb-8 sm:pt-6">
      <div v-for="i in [2, 1, 3]" :key="i" class="card flex flex-col items-center gap-3 px-2 py-5 sm:py-8" :class="i === 1 ? 'sm:-translate-y-5' : ''">
        <div class="skeleton size-12 sm:size-18 rounded-full!" />
        <div class="skeleton h-3.5 w-3/4 max-w-32" />
        <div class="skeleton h-6 w-1/2 max-w-24 mt-2" />
      </div>
    </div>
    <ul class="list-none m-0 p-0 flex flex-col gap-1">
      <li v-for="i in 8" :key="i" class="min-h-16 px-2 sm:px-4 flex items-center gap-3 sm:gap-4">
        <div class="skeleton h-3.5 w-6 ms-2" />
        <div class="skeleton size-10 rounded-full!" />
        <div class="flex-1 flex flex-col gap-2">
          <div class="skeleton h-3.5 w-40 max-w-full" />
          <div class="skeleton h-3 w-24" />
        </div>
        <div class="skeleton h-6 w-16" />
      </li>
    </ul>
    <p class="mt-8 text-center text-sm text-fg-subtle font-mono">Loading developers…</p>
  </div>
</template>
