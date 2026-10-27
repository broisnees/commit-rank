<script setup lang="ts">
const { data, error, refresh } = await useAsyncData(
  'github-firsts',
  () => $fetch<GitHubFirsts>('/api/firsts'),
  { lazy: true },
)

const fullDate = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatDate = (iso: string) => fullDate.format(new Date(iso))

useSeoMeta({
  title: 'GitHub firsts',
  description: "GitHub's very first accounts and repository #1, straight from the GitHub API.",
})
</script>

<template>
  <main class="container flex-1 pt-8 pb-16 sm:pt-12">
    <header class="mb-10 max-w-2xl">
      <p class="label-micro m-0 mb-3 inline-flex items-center gap-1.5">
        <span class="i-lucide:sparkles size-3.5" aria-hidden="true" /> Easter egg
      </p>
      <h1 class="m-0 font-mono text-3xl sm:text-4xl font-medium tracking-tight">GitHub firsts</h1>
      <p class="mt-3 mb-0 text-fg-muted text-base sm:text-lg">
        Where it all started: the very first accounts on GitHub and repository #1, read live from the
        GitHub API. Your own account number is on your profile's Firsts card.
      </p>
    </header>

    <div v-if="error" class="card px-6 py-12 text-center max-w-2xl">
      <span class="i-lucide:cloud-alert size-8 text-fg-subtle" aria-hidden="true" />
      <h2 class="font-mono text-lg mt-4 mb-2">The museum is closed for a moment</h2>
      <p class="text-fg-muted m-0 mb-6">GitHub didn't answer. Try again shortly.</p>
      <button type="button" class="btn" @click="() => refresh()">
        <span class="i-lucide:rotate-cw size-4" aria-hidden="true" /> Try again
      </button>
    </div>

    <div v-else class="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <section aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" class="section-title mb-6">The first accounts</h2>

        <ol v-if="!data" class="list-none m-0 p-0 flex flex-col gap-6" aria-busy="true">
          <li v-for="i in 5" :key="i" class="flex gap-4 items-center">
            <div class="skeleton size-12 rounded-full!" />
            <div class="flex-1 flex flex-col gap-2">
              <div class="skeleton h-3.5 w-40" />
              <div class="skeleton h-3 w-24" />
            </div>
          </li>
        </ol>

        <!-- timeline: one rail, a node per account, oldest first -->
        <ol v-else class="relative list-none m-0 p-0 flex flex-col gap-2 before:(content-empty absolute top-6 bottom-6 start-[23px] w-px bg-border)">
          <li v-for="(u, i) in data.users" :key="u.id" class="relative motion-safe:animate-slide-up motion-safe:animate-fill-both" :style="{ animationDelay: `${Math.min(i, 8) * 70}ms` }">
            <NuxtLink
              :to="`/u/${u.login}`"
              class="group flex items-start gap-4 rounded-xl px-0 py-3 pe-3 transition-colors duration-150 hover:bg-bg-subtle focus-ring"
            >
              <span class="relative shrink-0">
                <UserAvatar :id="u.id" :login="u.login" :size="48" class="size-12 ring-4 ring-bg" />
                <span
                  class="absolute -bottom-1 -end-1 grid place-items-center min-w-6 h-6 px-1 rounded-full border border-border bg-bg-subtle font-mono text-2xs tabular"
                  :class="u.id === 1 ? 'text-gold border-gold/40' : 'text-fg-muted'"
                >#{{ u.id }}</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-baseline gap-x-2">
                  <span class="font-medium group-hover:text-accent transition-colors duration-150">{{ u.name ?? u.login }}</span>
                  <span v-if="u.name" class="font-mono text-sm text-fg-subtle">@{{ u.login }}</span>
                </span>
                <span class="block text-sm font-mono text-fg-subtle">
                  Joined <time :datetime="u.createdAt">{{ formatDate(u.createdAt) }}</time>
                </span>
                <span v-if="u.bio" class="block mt-1 text-sm text-fg-muted line-clamp-2">{{ u.bio }}</span>
              </span>
            </NuxtLink>
          </li>
        </ol>
      </section>

      <section aria-labelledby="repo-heading" class="lg:sticky lg:top-20">
        <h2 id="repo-heading" class="section-title mb-6">Repository #1</h2>
        <div v-if="!data" class="card p-6 flex flex-col gap-3" aria-busy="true">
          <div class="skeleton h-4 w-40" />
          <div class="skeleton h-3 w-full" />
          <div class="skeleton h-3 w-2/3" />
        </div>
        <article v-else-if="data.repo" class="relative card p-6 overflow-hidden group">
          <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gold/12 to-transparent pointer-events-none" aria-hidden="true" />
          <p class="relative label-micro m-0 mb-3">id {{ data.repo.id }} · created {{ formatDate(data.repo.createdAt) }}</p>
          <NuxtLink
            :to="`/repos/${data.repo.name}`"
            class="relative block font-mono text-xl font-medium tracking-tight hover:text-accent transition-colors duration-150 rounded focus-ring"
          >
            {{ data.repo.name }}
          </NuxtLink>
          <p v-if="data.repo.description" class="relative mt-2 mb-4 text-fg-muted">{{ data.repo.description }}</p>
          <p class="relative m-0 flex items-center gap-4 text-sm font-mono text-fg-subtle tabular">
            <span class="inline-flex items-center gap-1.5">
              <span class="i-lucide:star size-4" aria-hidden="true" />{{ formatNumber(data.repo.stars) }} stars
            </span>
            <a :href="data.repo.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 link-subtle rounded focus-ring">
              GitHub <span class="i-lucide:arrow-up-right size-3.5" aria-hidden="true" />
            </a>
          </p>
        </article>

        <aside class="mt-6 rounded-xl border border-dashed border-border px-5 py-4 text-sm text-fg-muted">
          <p class="m-0">
            <span class="text-fg font-medium">Psst.</span> There's another egg hidden somewhere on this
            site. Old-school gamers will find it: <kbd class="kbd">↑</kbd> <kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> <kbd class="kbd">↓</kbd> …
          </p>
        </aside>
      </section>
    </div>
  </main>
</template>
