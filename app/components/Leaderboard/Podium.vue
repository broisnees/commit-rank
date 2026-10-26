<script setup lang="ts">
type Ranked = RankedUser & { rank: number }
defineProps<{ users: Ranked[]; metric: MetricKey }>()

const medal = {
  1: 'border-gold/40 bg-gold/10 text-gold',
  2: 'border-silver/40 bg-silver/10 text-silver',
  3: 'border-bronze/40 bg-bronze/10 text-bronze',
} as Record<number, string>

const glow = {
  1: 'from-gold/18',
  2: 'from-silver/12',
  3: 'from-bronze/12',
} as Record<number, string>

// order 2 · 1 · 3 at every width, #1 lifted from sm up
const place = {
  1: 'col-start-2 row-start-1 sm:-translate-y-5',
  2: 'col-start-1 row-start-1',
  3: 'col-start-3 row-start-1 sm:translate-y-3',
} as Record<number, string>

const secondary = (metric: MetricKey) => METRIC_KEYS.filter(k => k !== metric).slice(0, 3)
</script>

<template>
  <ol class="grid grid-cols-3 items-end gap-2 sm:gap-4 lg:gap-6 list-none m-0 p-0 sm:pt-6 sm:pb-3">
    <li
      v-for="(user, i) in users"
      :key="user.login"
      :class="place[user.rank]"
      class="podium-pop min-w-0"
      :style="{ animationDelay: `${i * 90}ms` }"
    >
      <NuxtLink :to="`/u/${user.login}`" class="group block rounded-xl focus-ring">
        <article
          class="relative overflow-hidden card card-hover"
          :class="user.rank === 1 ? 'sm:shadow-[var(--shadow-pop)]' : ''"
        >
          <div
            class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent pointer-events-none"
            :class="glow[user.rank]"
            aria-hidden="true"
          />
          <div class="relative flex flex-col items-center text-center px-2 pt-4 pb-3 sm:px-5 sm:pt-6 sm:pb-5">
            <span
              class="absolute top-2 start-2 sm:top-3 sm:start-3 inline-flex size-7 sm:size-9 items-center justify-center rounded-full border font-mono text-xs sm:text-sm font-medium tabular"
              :class="medal[user.rank]"
            >
              <span class="sr-only">Rank </span>{{ user.rank }}
            </span>
            <UserAvatar
              :id="user.id"
              :login="user.login"
              :size="user.rank === 1 ? 88 : 72"
              eager
              :class="user.rank === 1 ? 'size-14 sm:size-22' : 'size-12 sm:size-18'"
            />
            <h3 class="mt-3 mb-0 w-full text-sm sm:text-base font-medium truncate">
              {{ user.name ?? user.login }}
            </h3>
            <p class="m-0 w-full font-mono text-xs sm:text-sm text-fg-subtle truncate max-sm:hidden">@{{ user.login }}</p>

            <p class="mt-3 sm:mt-5 mb-1 label-micro max-sm:hidden">{{ METRICS[metric].label }}</p>
            <p class="m-0 font-mono text-lg sm:text-3xl leading-none tabular tracking-tight transition-colors duration-150 group-hover:text-accent max-sm:mt-2">
              {{ formatNumber(user[metric]) }}
            </p>
            <p class="sm:hidden m-0 mt-1 label-micro">{{ METRICS[metric].unit }}</p>
          </div>
          <dl class="relative max-sm:hidden grid grid-cols-3 border-t border-border m-0 divide-x divide-border text-center">
            <div v-for="key in secondary(metric)" :key="key" class="py-3 px-2 min-w-0">
              <dt class="label-micro truncate">{{ METRICS[key].unit }}</dt>
              <dd class="m-0 mt-0.5 font-mono text-sm tabular">{{ formatCompact(user[key]) }}</dd>
            </div>
          </dl>
        </article>
      </NuxtLink>
    </li>
  </ol>
</template>

<style scoped>
.podium-pop {
  animation: pop-in 0.6s cubic-bezier(0.2, 0, 0, 1) both;
}

@keyframes pop-in {
  from {
    opacity: 0;
    translate: 0 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .podium-pop {
    animation: none;
  }
}
</style>
