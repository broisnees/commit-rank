<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: 'md' | 'lg'; autofocus?: boolean }>(), {
  size: 'md',
})

const query = ref('')
const results = ref<SearchUser[]>([])
const active = ref(-1)
const open = ref(false)
const loading = ref(false)
const listId = useId()

let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

watch(query, value => {
  clearTimeout(timer)
  controller?.abort()
  const q = value.trim()
  if (q.length < 2) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    controller = new AbortController()
    try {
      results.value = await $fetch<SearchUser[]>('/api/search', {
        query: { q },
        signal: controller.signal,
      })
      active.value = -1
      open.value = true
    } catch {
      // aborted or failed; keep whatever we had
    } finally {
      loading.value = false
    }
  }, 220)
})

function go(login: string) {
  open.value = false
  query.value = ''
  results.value = []
  return navigateTo(`/u/${login}`)
}

function submit() {
  const pick = results.value[active.value]
  if (pick) return go(pick.login)
  const login = query.value.trim().replace(/^@/, '')
  if (/^[a-z\d-]{1,39}$/i.test(login)) return go(login)
}

function move(delta: number) {
  if (!results.value.length) return
  open.value = true
  const n = results.value.length
  active.value = (active.value + delta + n) % n
}

const showList = computed(() => open.value && results.value.length > 0)
</script>

<template>
  <form
    role="search"
    class="relative w-full group"
    :class="size === 'lg' ? 'max-w-xl' : 'max-w-sm'"
    @submit.prevent="submit"
  >
    <label :for="`${listId}-input`" class="sr-only">Search GitHub users</label>
    <div
      v-if="size === 'lg'"
      class="absolute -inset-px rounded-xl bg-gradient-to-r from-fg/0 to-accent/15 opacity-0 blur-md transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none"
      aria-hidden="true"
    />
    <div class="search-box relative flex items-center">
      <kbd
        class="absolute font-mono text-fg-subtle pointer-events-none transition-colors duration-150 group-focus-within:text-accent"
        :class="size === 'lg' ? 'text-lg start-4.5' : 'text-sm start-3'"
        aria-hidden="true"
      >/</kbd>
      <input
        :id="`${listId}-input`"
        v-model="query"
        data-user-search
        type="search"
        name="q"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        :autofocus="autofocus"
        :placeholder="size === 'lg' ? 'Search a GitHub username…' : 'Search developers…'"
        role="combobox"
        :aria-expanded="showList"
        :aria-controls="`${listId}-list`"
        :aria-activedescendant="active >= 0 ? `${listId}-opt-${active}` : undefined"
        class="w-full bg-bg-subtle border border-border font-mono text-fg placeholder:text-fg-subtle outline-none shadow-[var(--shadow-card)] transition-[border-color,background-color] duration-150 hover:border-border-hover focus:(border-accent bg-bg)"
        :class="size === 'lg' ? 'h-14 rounded-xl ps-10 pe-16 sm:pe-32 text-base' : 'h-10 rounded-lg ps-8 pe-9 text-sm'"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="open = false"
        @focus="open = true"
        @blur="open = false"
      />
      <span
        v-if="loading"
        class="i-lucide:loader-circle absolute animate-spin text-fg-subtle"
        :class="size === 'lg' ? 'end-16 sm:end-32' : 'end-3'"
        aria-hidden="true"
      />
      <!-- inset 6px inside a 12px-radius field, so the button takes a 6px radius -->
      <button v-if="size === 'lg'" type="submit" class="btn-primary absolute end-1.5 h-11 rounded-md! px-4">
        <span class="i-lucide:search" aria-hidden="true" />
        <span class="max-sm:sr-only">Search</span>
      </button>
    </div>

    <ul
      v-show="showList"
      :id="`${listId}-list`"
      role="listbox"
      class="absolute z-40 mt-2 w-full list-none m-0 p-1.5 rounded-xl border border-border bg-bg-subtle shadow-[var(--shadow-pop)] text-start motion-safe:animate-fade-in"
    >
      <li
        v-for="(user, i) in results"
        :id="`${listId}-opt-${i}`"
        :key="user.id"
        role="option"
        :aria-selected="i === active"
        class="flex items-center gap-3 min-h-11 px-2.5 py-1.5 rounded-md cursor-pointer"
        :class="i === active ? 'bg-bg-elevated' : 'hover:bg-bg-muted'"
        @mousedown.prevent="go(user.login)"
        @mouseenter="active = i"
      >
        <UserAvatar :id="user.id" :login="user.login" :size="28" />
        <span class="min-w-0 flex-1 truncate">
          <span class="font-mono text-sm">{{ user.login }}</span>
          <span v-if="user.name" class="text-sm text-fg-subtle ms-2">{{ user.name }}</span>
        </span>
        <span class="text-xs font-mono text-fg-subtle tabular shrink-0">
          {{ formatCompact(user.followers) }} followers
        </span>
      </li>
    </ul>
  </form>
</template>
