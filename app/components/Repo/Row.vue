<script setup lang="ts">
import type { RepoListItem } from '#shared/types/repos'

const props = defineProps<{
  repo: RepoListItem
  rank: number
  metric: 'stars' | 'forks'
  max: number
  /** small trailing note, e.g. "created 3 days ago" */
  note?: string
}>()
const share = computed(() => (props.max ? Math.max((props.repo[props.metric] / props.max) * 100, 1) : 0))
const shortName = computed(() => props.repo.name.split('/')[1] ?? props.repo.name)
</script>

<template>
  <li class="cv-row">
    <NuxtLink
      :to="`/repos/${repo.name}`"
      class="group relative flex items-center gap-3 sm:gap-4 min-h-16 rounded-xl border border-transparent px-2 py-2.5 sm:px-4 overflow-hidden transition-[background-color,border-color] duration-150 hover:(bg-bg-subtle border-border) focus-ring"
    >
      <span
        class="absolute inset-y-0 start-0 bg-accent/[0.05] pointer-events-none"
        :style="{ width: `${share}%` }"
        aria-hidden="true"
      />
      <span class="relative w-8 sm:w-10 shrink-0 text-end font-mono text-sm text-fg-subtle tabular">
        <span class="sr-only">Rank </span>{{ rank }}
      </span>
      <RepoOwnerAvatar :src="repo.ownerAvatar" :owner="repo.owner" :size="40" class="relative size-9 sm:size-10" />
      <div class="relative min-w-0 flex-1">
        <p class="m-0 truncate leading-snug font-mono text-sm sm:text-base">
          <span class="text-fg-subtle max-sm:hidden">{{ repo.owner }}/</span><span class="font-medium text-fg">{{ shortName }}</span>
        </p>
        <p class="m-0 flex items-center min-w-0 text-sm text-fg-subtle leading-snug">
          <span class="font-mono me-3 truncate min-w-0 sm:hidden">{{ repo.owner }}</span>
          <span v-if="repo.language" class="inline-flex shrink-0 items-center gap-1.5 me-3">
            <span class="size-2 rounded-full" :style="{ background: repo.language.color ?? 'var(--fg-subtle)' }" aria-hidden="true" />
            {{ repo.language.name }}
          </span>
          <span v-if="note" class="me-3 shrink-0 font-mono text-xs">{{ note }}</span>
          <span class="truncate min-w-0 max-sm:hidden">{{ repo.description }}</span>
        </p>
      </div>
      <dl class="relative hidden md:flex gap-6 m-0 text-end">
        <div class="w-16">
          <dt class="label-micro">{{ metric === 'stars' ? 'forks' : 'stars' }}</dt>
          <dd class="m-0 font-mono text-sm text-fg-muted tabular">
            {{ formatCompact(metric === 'stars' ? repo.forks : repo.stars) }}
          </dd>
        </div>
      </dl>
      <div class="relative shrink-0 text-end min-w-18 sm:min-w-24">
        <p class="m-0 font-mono text-base sm:text-xl leading-none tabular tracking-tight transition-colors duration-150 group-hover:text-accent">
          {{ formatCompact(repo[metric]) }}
        </p>
        <p class="m-0 mt-1 label-micro">{{ metric }}</p>
      </div>
    </NuxtLink>
  </li>
</template>
