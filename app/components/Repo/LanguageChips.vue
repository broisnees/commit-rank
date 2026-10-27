<script setup lang="ts">
import { REPO_LANGUAGES } from '#shared/types/repos'

defineProps<{ active: string | null }>()
const route = useRoute()
</script>

<template>
  <nav aria-label="Language" class="min-w-0 overflow-x-auto no-scrollbar scroll-fade -mx-4 px-4 sm:mx-0 sm:px-0 lg:overflow-visible">
    <ul class="flex gap-1.5 list-none m-0 p-0 w-max lg:(w-auto flex-wrap)">
      <li>
        <NuxtLink
          :to="{ query: { ...route.query, lang: undefined } }"
          replace
          :aria-current="!active ? 'page' : undefined"
          class="chip"
          :class="!active ? 'chip-on' : 'chip-off'"
        >
          All languages
        </NuxtLink>
      </li>
      <li v-for="lang in REPO_LANGUAGES" :key="lang.slug">
        <NuxtLink
          :to="{ query: { ...route.query, lang: lang.slug } }"
          replace
          :aria-current="active === lang.slug ? 'page' : undefined"
          class="chip"
          :class="active === lang.slug ? 'chip-on' : 'chip-off'"
        >
          {{ lang.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
