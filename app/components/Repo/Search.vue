<script setup lang="ts">
import type { RepoSearchItem } from '#shared/types/repos'

const props = defineProps<{ label: string; placeholder?: string; modelValue?: string | null }>()
const emit = defineEmits<{ pick: [name: string] }>()

const query = ref(props.modelValue ?? '')
const results = ref<RepoSearchItem[]>([])
const active = ref(-1)
const open = ref(false)
const loading = ref(false)
const id = useId()

watch(
  () => props.modelValue,
  value => {
    if (value && value !== query.value) query.value = value
  },
)

let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

watch(query, value => {
  clearTimeout(timer)
  controller?.abort()
  const q = value.trim()
  if (q.length < 2 || q === props.modelValue) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    controller = new AbortController()
    try {
      results.value = await $fetch<RepoSearchItem[]>('/api/repos/search', {
        query: { q },
        signal: controller.signal,
      })
      active.value = results.value.length ? 0 : -1
      open.value = true
    } catch {
      // aborted or failed: keep the last results
    } finally {
      loading.value = false
    }
  }, 250)
})

function pick(name: string) {
  open.value = false
  results.value = []
  query.value = name
  emit('pick', name)
}

function submit() {
  const choice = results.value[active.value]
  if (choice) return pick(choice.name)
  const typed = query.value.trim()
  if (/^[\w.-]+\/[\w.-]+$/.test(typed)) pick(typed)
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
  <form role="search" class="relative w-full" @submit.prevent="submit">
    <label :for="`${id}-input`" class="label-micro block mb-1.5">{{ label }}</label>
    <div class="relative">
      <span class="i-lucide:book-marked absolute start-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle pointer-events-none" aria-hidden="true" />
      <input
        :id="`${id}-input`"
        v-model="query"
        type="search"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        :placeholder="placeholder ?? 'owner/name or keyword'"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="showList"
        :aria-controls="`${id}-list`"
        :aria-activedescendant="showList && active >= 0 ? `${id}-opt-${active}` : undefined"
        class="field ps-9 pe-9"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="open = false"
        @focus="open = true"
        @blur="open = false"
      />
      <span
        v-if="loading"
        class="i-lucide:loader-circle absolute end-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-fg-subtle"
        aria-hidden="true"
      />
    </div>
    <ul
      v-show="showList"
      :id="`${id}-list`"
      role="listbox"
      class="absolute z-40 mt-2 w-full list-none m-0 p-1 rounded-xl border border-border bg-bg-subtle shadow-[var(--shadow-pop)] motion-safe:animate-fade-in"
    >
      <li
        v-for="(repo, i) in results"
        :id="`${id}-opt-${i}`"
        :key="repo.name"
        role="option"
        :aria-selected="i === active"
        class="flex items-center gap-3 min-h-11 px-3 py-2 rounded-lg cursor-pointer"
        :class="i === active ? 'bg-bg-elevated' : 'hover:bg-bg-muted'"
        @mousedown.prevent="pick(repo.name)"
        @mouseenter="active = i"
      >
        <RepoOwnerAvatar :src="repo.ownerAvatar" :owner="repo.name.split('/')[0]!" :size="28" class="size-7" />
        <span class="min-w-0 flex-1">
          <span class="block font-mono text-sm truncate">{{ repo.name }}</span>
          <span v-if="repo.description" class="block text-xs text-fg-subtle truncate">{{ repo.description }}</span>
        </span>
        <span class="inline-flex items-center gap-1 text-xs font-mono text-fg-subtle tabular shrink-0">
          <span class="i-lucide:star size-3.5" aria-hidden="true" />{{ formatCompact(repo.stars) }}
        </span>
      </li>
    </ul>
  </form>
</template>
