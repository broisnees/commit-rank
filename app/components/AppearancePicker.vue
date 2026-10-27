<script setup lang="ts">
import {
  PopoverRoot,
  PopoverTrigger,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import type { Accent } from '~/composables/useAccent'

withDefaults(
  defineProps<{
    /** icon: 40px header button; button: labelled footer control */
    variant?: 'icon' | 'button'
    side?: 'top' | 'bottom'
  }>(),
  { variant: 'icon', side: 'bottom' },
)

const colorMode = useColorMode()
const { accent, setAccent } = useAccent()

const themes = [
  { value: 'system', label: 'System', icon: 'i-lucide:monitor' },
  { value: 'light', label: 'Light', icon: 'i-lucide:sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide:moon' },
] as const
const themeIcon = computed(
  () => themes.find(t => t.value === colorMode.preference)?.icon ?? 'i-lucide:monitor',
)

const titleCase = (s: string) => s[0]!.toUpperCase() + s.slice(1)

// A theme flip recolors everything at once; suppress transitions for that frame
// so the swap snaps instead of smearing.
function setTheme(value: unknown) {
  if (typeof value !== 'string' || !value) return
  const style = document.createElement('style')
  style.append('*,*::before,*::after{transition:none!important}')
  document.head.append(style)
  colorMode.preference = value
  void document.body.offsetHeight
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()))
}

function pickAccent(value: unknown) {
  if (typeof value === 'string' && (ACCENTS as readonly string[]).includes(value)) {
    setAccent(value as Accent)
  }
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button
        v-if="variant === 'icon'"
        type="button"
        class="btn-ghost relative size-10 px-0"
        aria-label="Appearance: theme and accent color"
      >
        <ClientOnly>
          <span :class="themeIcon" class="size-4.5" aria-hidden="true" />
          <template #fallback>
            <span class="i-lucide:monitor size-4.5" aria-hidden="true" />
          </template>
        </ClientOnly>
        <!-- the current accent, as a small badge on the icon -->
        <span
          class="absolute top-2 end-2 size-2 rounded-full bg-accent ring-2 ring-bg"
          aria-hidden="true"
        />
      </button>
      <button v-else type="button" class="btn gap-2.5">
        <span class="size-3.5 rounded-full bg-accent img-outline" aria-hidden="true" />
        Appearance
        <span class="i-lucide:chevron-up size-4 text-fg-subtle" aria-hidden="true" />
      </button>
    </PopoverTrigger>

    <UiPopoverContent :side="side" align="end" class="w-68 p-3">
      <p id="appearance-theme" class="label-micro m-0 mb-2">Theme</p>
      <ToggleGroupRoot
        type="single"
        :model-value="colorMode.preference"
        aria-labelledby="appearance-theme"
        class="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg border border-border bg-bg"
        @update:model-value="setTheme"
      >
        <ToggleGroupItem
          v-for="t in themes"
          :key="t.value"
          :value="t.value"
          class="flex flex-col items-center justify-center gap-1 h-14 rounded-md text-xs text-fg-subtle cursor-pointer transition-colors duration-150 hover:text-fg data-[state=on]:(bg-bg-muted text-fg shadow-[var(--shadow-card)]) focus-ring"
        >
          <span :class="t.icon" class="size-4" aria-hidden="true" />
          {{ t.label }}
        </ToggleGroupItem>
      </ToggleGroupRoot>

      <p id="appearance-accent" class="label-micro m-0 mt-4 mb-2 flex items-baseline justify-between">
        Accent
        <span class="normal-case tracking-normal font-normal text-xs text-fg-muted">{{ titleCase(accent) }}</span>
      </p>
      <RadioGroupRoot
        :model-value="accent"
        orientation="horizontal"
        aria-labelledby="appearance-accent"
        class="flex items-center justify-between"
        @update:model-value="pickAccent"
      >
        <RadioGroupItem
          v-for="name in ACCENTS"
          :key="name"
          :value="name"
          :aria-label="titleCase(name)"
          :title="titleCase(name)"
          class="swatch grid place-items-center size-8 rounded-full cursor-pointer focus-ring"
          :style="{ '--swatch': `var(--swatch-${name})` }"
        >
          <span class="swatch-dot grid place-items-center size-6 rounded-full img-outline" aria-hidden="true">
            <RadioGroupIndicator class="i-lucide:check size-3.5 text-bg" />
          </span>
        </RadioGroupItem>
      </RadioGroupRoot>
    </UiPopoverContent>
  </PopoverRoot>
</template>

<style scoped>
.swatch-dot {
  background: var(--swatch);
  transition: scale 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms cubic-bezier(0.2, 0, 0, 1);
}

.swatch:hover .swatch-dot {
  scale: 1.08;
}

/* selected: a gap the color of the panel, then a ring in the swatch's own color */
.swatch[data-state='checked'] .swatch-dot {
  box-shadow:
    0 0 0 2px var(--bg-subtle),
    0 0 0 4px var(--swatch);
}
</style>
