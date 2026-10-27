<script setup lang="ts">
import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** offer the worldwide board at the top */
    global?: boolean
    /** offer "Rank any city" for free-text queries */
    custom?: boolean
    label?: string
  }>(),
  { global: true, custom: true, label: 'Location' },
)
const emit = defineEmits<{ 'update:modelValue': [slug: string] }>()

const open = ref(false)
const query = ref('')
const listbox = useTemplateRef('listbox')

const current = computed(() => resolveLocation(props.modelValue))

const fold = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
const q = computed(() => fold(query.value.trim()))
const matches = (loc: LocationInfo) =>
  !q.value ||
  fold(loc.name).includes(q.value) ||
  loc.terms.some(t => fold(t).includes(q.value)) ||
  (loc.aliases ?? []).some(a => fold(a).includes(q.value))

const groups = computed(() =>
  LOCATION_REGIONS.map(region => ({
    region,
    items: LOCATIONS.filter(l => l.region === region && matches(l)),
  })).filter(g => g.items.length),
)
const showGlobal = computed(() => props.global && matches(GLOBAL_LOCATION))
// the current free-text city, so it shows as selected
const currentCustom = computed(() =>
  current.value?.region === 'Custom' && matches(current.value) ? current.value : null,
)
// "Rank any city: …" for queries that aren't a curated place
const customOption = computed(() => {
  if (!props.custom || query.value.trim().length < 3) return null
  const slug = slugifyLocation(query.value)
  const loc = resolveLocation(slug)
  return loc?.region === 'Custom' && slug !== currentCustom.value?.slug ? loc : null
})
const empty = computed(
  () => !groups.value.length && !showGlobal.value && !currentCustom.value && !customOption.value,
)

function select(value: unknown) {
  if (typeof value === 'string' && value && value !== props.modelValue) emit('update:modelValue', value)
  open.value = false
}

watch(open, async isOpen => {
  if (!isOpen) {
    query.value = ''
    return
  }
  await nextTick()
  // start on the current place, scrolled into view
  ;(listbox.value as { highlightSelected?: () => void } | null)?.highlightSelected?.()
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="field flex items-center gap-2.5 text-start cursor-pointer"
        :aria-label="`${label}: ${current?.name ?? 'choose'}`"
      >
        <span class="w-5 shrink-0 text-center text-base leading-none" aria-hidden="true">{{ current?.flag }}</span>
        <span class="flex-1 min-w-0 truncate">{{ current?.name ?? 'Choose a location' }}</span>
        <span class="i-lucide:chevrons-up-down size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      </button>
    </PopoverTrigger>

    <UiPopoverContent align="end" class="w-[max(var(--reka-popover-trigger-width),20rem)] overflow-hidden">
      <ListboxRoot
        ref="listbox"
        :model-value="modelValue"
        highlight-on-hover
        class="flex flex-col"
        @update:model-value="select"
      >
        <div class="flex items-center gap-2 ps-3 pe-2 border-b border-border">
          <span class="i-lucide:search size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <ListboxFilter
            v-model="query"
            auto-focus
            :aria-label="`Search ${label.toLowerCase()}`"
            :placeholder="custom ? 'Search countries or cities…' : 'Search countries…'"
            class="flex-1 min-w-0 h-11 bg-transparent border-none outline-none font-mono text-sm text-fg placeholder:text-fg-subtle"
          />
          <kbd class="kbd max-sm:hidden" aria-hidden="true">esc</kbd>
        </div>

        <ListboxContent
          class="max-h-[min(22rem,calc(var(--reka-popover-content-available-height,24rem)-3.5rem))] overflow-y-auto overscroll-contain p-1.5"
        >
          <ListboxGroup v-if="showGlobal || currentCustom">
            <ListboxItem v-if="showGlobal" value="global" class="loc-item">
              <span class="w-5 shrink-0 text-center" aria-hidden="true">🌍</span>
              <span class="flex-1 truncate">Global</span>
              <span class="text-xs text-fg-subtle max-sm:hidden">worldwide</span>
              <ListboxItemIndicator class="i-lucide:check size-4 shrink-0 text-accent" />
            </ListboxItem>
            <ListboxItem v-if="currentCustom" :value="currentCustom.slug" class="loc-item">
              <span class="w-5 shrink-0 text-center" aria-hidden="true">📍</span>
              <span class="flex-1 truncate">{{ currentCustom.name }}</span>
              <ListboxItemIndicator class="i-lucide:check size-4 shrink-0 text-accent" />
            </ListboxItem>
          </ListboxGroup>

          <ListboxGroup v-for="group in groups" :key="group.region">
            <ListboxGroupLabel class="sticky top-0 z-1 -mx-1.5 px-4 pt-2.5 pb-1.5 bg-bg-subtle label-micro">
              {{ group.region }}
            </ListboxGroupLabel>
            <ListboxItem v-for="loc in group.items" :key="loc.slug" :value="loc.slug" class="loc-item">
              <span class="w-5 shrink-0 text-center" aria-hidden="true">{{ loc.flag }}</span>
              <span class="flex-1 truncate">{{ loc.name }}</span>
              <ListboxItemIndicator class="i-lucide:check size-4 shrink-0 text-accent" />
            </ListboxItem>
          </ListboxGroup>

          <ListboxGroup v-if="customOption" class="mt-1 pt-1 border-t border-border">
            <ListboxItem :value="customOption.slug" class="loc-item">
              <span class="i-lucide:map-pin w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span class="flex-1 truncate">
                Rank any city: <span class="text-fg">“{{ customOption.name }}”</span>
              </span>
              <span class="i-lucide:corner-down-left size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            </ListboxItem>
          </ListboxGroup>

          <p v-if="empty" class="m-0 px-3 py-8 text-center text-sm text-fg-subtle">
            No place matches “{{ query.trim() }}”.
          </p>
        </ListboxContent>
      </ListboxRoot>
    </UiPopoverContent>
  </PopoverRoot>
</template>

<style scoped>
.loc-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding-inline: 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--fg-muted);
  cursor: pointer;
  user-select: none;
  outline: none;
  scroll-margin-block: 2.25rem 0.375rem;
}

.loc-item[data-highlighted] {
  background: var(--bg-muted);
  color: var(--fg);
}

.loc-item[aria-selected='true'] {
  color: var(--fg);
  font-weight: 500;
}
</style>
