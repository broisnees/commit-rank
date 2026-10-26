<script setup lang="ts">
defineProps<{ showLogo?: boolean }>()

const route = useRoute()

const links = [
  { to: '/rank/global', label: 'Leaderboards', icon: 'i-lucide:trophy', active: (p: string) => p.startsWith('/rank') },
  { to: '/countries', label: 'Countries', icon: 'i-lucide:earth', active: (p: string) => p.startsWith('/countries') },
  {
    to: '/repos',
    label: 'Repos',
    icon: 'i-lucide:book-marked',
    active: (p: string) => p.startsWith('/repos') && !p.startsWith('/repos/trending'),
  },
  { to: '/repos/trending', label: 'Trending', icon: 'i-lucide:flame', active: (p: string) => p.startsWith('/repos/trending') },
  { to: '/compare', label: 'Compare', icon: 'i-lucide:git-compare', active: (p: string) => p.startsWith('/compare') },
]

// Mobile: the search collapses to an icon and expands over the header row
const searchOpen = ref(false)
const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    searchOpen.value = false
    menuOpen.value = false
  },
)

async function openSearch() {
  menuOpen.value = false
  searchOpen.value = true
  await nextTick()
  document.querySelector<HTMLInputElement>('header input[data-user-search]')?.focus()
}

const menu = useTemplateRef('menu')
function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && !menu.value?.contains(event.target as Node)) menuOpen.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border">
    <div class="absolute inset-0 bg-bg/80 backdrop-blur-md" aria-hidden="true" />
    <nav aria-label="Main" class="relative container h-14 flex items-center gap-2 lg:gap-4">
      <!-- expanded mobile search replaces the whole row -->
      <div v-if="searchOpen" class="flex flex-1 items-center gap-2 md:hidden" @keydown.esc="searchOpen = false">
        <UserSearch class="max-w-none!" />
        <button type="button" class="btn-ghost size-10 px-0 shrink-0" @click="searchOpen = false">
          <span class="i-lucide:x size-4.5" aria-hidden="true" />
          <span class="sr-only">Close search</span>
        </button>
      </div>

      <template v-else>
        <NuxtLink
          to="/"
          aria-label="commitrank home"
          class="shrink-0 inline-flex items-center h-10 text-lg text-fg rounded-md focus-ring transition-opacity duration-150 hover:opacity-80"
          :class="showLogo ? '' : 'lg:invisible'"
        >
          <AppLogo class="max-sm:hidden" />
          <AppMark class="sm:hidden h-6 w-auto" />
        </NuxtLink>

        <div class="flex-1 min-w-0 flex justify-center">
          <UserSearch v-if="showLogo" class="max-md:hidden" />
        </div>

        <ul class="flex items-center gap-0.5 list-none m-0 p-0">
          <li v-if="showLogo" class="md:hidden">
            <button type="button" class="btn-ghost size-10 px-0" @click="openSearch">
              <span class="i-lucide:search size-4.5" aria-hidden="true" />
              <span class="sr-only">Search developers</span>
            </button>
          </li>
          <li v-for="link in links" :key="link.to" class="max-lg:hidden">
            <NuxtLink
              :to="link.to"
              class="btn-ghost px-3"
              :aria-current="link.active(route.path) ? 'page' : undefined"
              :class="link.active(route.path) ? 'bg-bg-muted text-fg!' : ''"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
          <li><AppearancePicker /></li>

          <!-- below lg: everything lives in one menu -->
          <li ref="menu" class="lg:hidden relative">
            <button
              type="button"
              class="btn-ghost size-10 px-0"
              :aria-expanded="menuOpen"
              aria-controls="site-menu"
              @click.stop="menuOpen = !menuOpen"
            >
              <span class="relative size-4.5" aria-hidden="true">
                <span
                  class="i-lucide:menu absolute inset-0 size-4.5 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                  :class="menuOpen ? 'opacity-0 scale-25 blur-[4px]' : 'opacity-100 scale-100 blur-0'"
                />
                <span
                  class="i-lucide:x absolute inset-0 size-4.5 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                  :class="menuOpen ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-25 blur-[4px]'"
                />
              </span>
              <span class="sr-only">{{ menuOpen ? 'Close menu' : 'Open menu' }}</span>
            </button>

            <div
              v-if="menuOpen"
              id="site-menu"
              class="menu-pop absolute end-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] p-1.5 rounded-xl border border-border bg-bg-subtle shadow-[var(--shadow-pop)]"
            >
              <ul class="list-none m-0 p-0 flex flex-col">
                <li v-for="link in links" :key="link.to">
                  <NuxtLink
                    :to="link.to"
                    class="flex items-center gap-3 min-h-11 px-3 rounded-lg font-mono text-sm transition-colors duration-150 focus-ring"
                    :aria-current="link.active(route.path) ? 'page' : undefined"
                    :class="link.active(route.path) ? 'bg-bg-muted text-fg' : 'text-fg-muted hover:(bg-bg-muted text-fg)'"
                  >
                    <span :class="link.icon" class="size-4.5 text-fg-subtle" aria-hidden="true" />
                    {{ link.label }}
                  </NuxtLink>
                </li>
                <li class="mt-1.5 pt-1.5 border-t border-border">
                  <NuxtLink
                    to="/about"
                    class="flex items-center gap-3 min-h-11 px-3 rounded-lg font-mono text-sm text-fg-muted transition-colors duration-150 hover:(bg-bg-muted text-fg) focus-ring"
                  >
                    <span class="i-lucide:info size-4.5 text-fg-subtle" aria-hidden="true" />
                    How ranking works
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.menu-pop {
  animation: menu-in 0.18s cubic-bezier(0.2, 0, 0, 1);
  transform-origin: top right;
}

@keyframes menu-in {
  from {
    opacity: 0;
    translate: 0 -4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-pop {
    animation: none;
  }
}
</style>
