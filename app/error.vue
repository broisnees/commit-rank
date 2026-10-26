<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)

useSeoMeta({ title: () => (notFound.value ? 'Not found' : 'Error') })
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-fg">
    <AppHeader show-logo />
    <main class="container flex-1 flex flex-col items-center justify-center text-center py-24">
      <p class="font-mono text-7xl sm:text-8xl font-medium m-0 text-fg-subtle/40 tabular">{{ error.statusCode }}</p>
      <h1 class="font-mono text-2xl mt-4 mb-2">{{ notFound ? 'Nothing here' : 'Something broke' }}</h1>
      <p class="text-fg-muted m-0 mb-8 max-w-md">
        {{ error.statusMessage || (notFound ? "That page or GitHub user doesn't exist." : 'Please try again in a moment.') }}
      </p>
      <div class="flex gap-3">
        <button type="button" class="btn-primary" @click="clearError({ redirect: '/' })">Go home</button>
        <NuxtLink to="/rank/global" class="btn" @click="clearError()">Leaderboards</NuxtLink>
      </div>
    </main>
    <AppFooter />
  </div>
</template>
