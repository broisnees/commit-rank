<script setup lang="ts">
import { PopoverContent, PopoverPortal } from 'reka-ui'

// Shared floating surface: portalled above the sticky header, collision-aware.
withDefaults(
  defineProps<{
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    class?: string
  }>(),
  { side: 'bottom', align: 'start', sideOffset: 8 },
)
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :collision-padding="12"
      :class="[
        'ui-pop z-[60] rounded-xl border border-border bg-bg-subtle text-fg shadow-[var(--shadow-pop)] outline-none',
        $props.class,
      ]"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
