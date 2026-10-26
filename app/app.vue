<script setup lang="ts">
const route = useRoute()
const isHome = computed(() => route.name === 'index')

useHead({
  titleTemplate: chunk => (chunk ? `${chunk} · commitrank` : 'commitrank · GitHub leaderboards'),
  script: [{ innerHTML: ACCENT_PREHYDRATE, tagPosition: 'head' }],
})

useSeoMeta({
  description:
    'Fast GitHub leaderboards. Rank developers by commits, pull requests, reviews and contributions, by country or worldwide.',
  ogSiteName: 'commitrank',
  twitterCard: 'summary',
})

// "/" focuses the search box from anywhere
function onKeydown(e: KeyboardEvent) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  const input = document.querySelector<HTMLInputElement>('input[data-user-search]')
  if (!input) return
  e.preventDefault()
  input.focus()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-fg">
    <a
      href="#main-content"
      class="fixed -top-full focus:top-2 left-2 z-100 btn-primary"
    >
      Skip to content
    </a>
    <NuxtLoadingIndicator color="var(--accent)" :height="2" />
    <AppHeader :show-logo="!isHome" />
    <div id="main-content" class="flex-1 flex flex-col">
      <NuxtPage />
    </div>
    <AppFooter />
    <KonamiBurst />
  </div>
</template>
