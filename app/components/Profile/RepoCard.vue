<script setup lang="ts">
defineProps<{ repo: RepoSummary; showOwner?: boolean }>()
</script>

<template>
  <!-- the title link stretches over the card; the GitHub link sits above it -->
  <article class="relative flex flex-col h-full card card-hover p-4 group focus-within:border-border-hover">
    <div class="flex items-center gap-2 min-w-0">
      <span class="i-lucide:book-marked size-4 text-fg-subtle shrink-0" aria-hidden="true" />
      <NuxtLink
        :to="`/repos/${repo.name}`"
        class="min-w-0 flex-1 truncate font-mono text-sm transition-colors duration-150 group-hover:text-accent outline-none after:(content-empty absolute inset-0 rounded-xl) focus-visible:after:(outline-2 outline-solid outline-accent outline-offset-2)"
      >
        {{ showOwner ? repo.name : repo.name.split('/')[1] }}
      </NuxtLink>
      <a
        :href="repo.url"
        target="_blank"
        rel="noopener"
        class="relative z-1 grid place-items-center size-8 -me-1.5 -my-1.5 shrink-0 rounded-md text-fg-subtle transition-colors duration-150 hover:(text-fg bg-bg-elevated) focus-ring"
        :title="`Open ${repo.name} on GitHub`"
      >
        <span class="i-simple-icons:github size-3.5" aria-hidden="true" />
        <span class="sr-only">Open {{ repo.name }} on GitHub</span>
      </a>
    </div>
    <p class="mt-2 mb-3 text-sm text-fg-muted line-clamp-2 flex-1">
      {{ repo.description || 'No description' }}
    </p>
    <p class="m-0 flex items-center gap-4 text-xs font-mono text-fg-subtle tabular">
      <span v-if="repo.language" class="inline-flex items-center gap-1.5 min-w-0">
        <span class="size-2.5 rounded-full shrink-0" :style="{ background: repo.language.color ?? 'var(--fg-subtle)' }" aria-hidden="true" />
        <span class="truncate">{{ repo.language.name }}</span>
      </span>
      <span class="inline-flex items-center gap-1">
        <span class="i-lucide:star size-3.5" aria-hidden="true" /><span class="sr-only">Stars</span>{{ formatCompact(repo.stars) }}
      </span>
      <span class="inline-flex items-center gap-1">
        <span class="i-lucide:git-fork size-3.5" aria-hidden="true" /><span class="sr-only">Forks</span>{{ formatCompact(repo.forks) }}
      </span>
    </p>
  </article>
</template>
