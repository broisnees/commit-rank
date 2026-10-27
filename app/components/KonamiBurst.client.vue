<script setup lang="ts">
// ↑ ↑ ↓ ↓ ← → ← → B A, anywhere outside a text field
const SEQUENCE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
// GitHub's classic contribution greens, lightest to darkest
const GREENS = ['oklch(0.89 0.1 150)', 'oklch(0.74 0.17 148)', 'oklch(0.63 0.15 148)', 'oklch(0.48 0.12 150)']

interface Square {
  id: number
  x: number
  y: number
  size: number
  color: string
  delay: number
}

const squares = ref<Square[]>([])
const toast = ref(false)
let progress = 0
let timer: ReturnType<typeof setTimeout> | undefined

function burst() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  squares.value = reduced
    ? []
    : Array.from({ length: 72 }, (_, id) => ({
        id,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 10 + Math.round(Math.random() * 16),
        color: GREENS[Math.floor(Math.random() * GREENS.length)]!,
        delay: Math.round(Math.random() * 450),
      }))
  toast.value = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    squares.value = []
    toast.value = false
  }, 2600)
}

function onKeydown(event: KeyboardEvent) {
  if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return
  const key = event.key.toLowerCase()
  if (key === SEQUENCE[progress]) {
    progress++
    if (progress === SEQUENCE.length) {
      progress = 0
      burst()
    }
  } else {
    progress = key === SEQUENCE[0] ? 1 : 0
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  clearTimeout(timer)
})
</script>

<template>
  <div v-if="squares.length" class="fixed inset-0 z-90 pointer-events-none overflow-hidden" aria-hidden="true">
    <span
      v-for="s in squares"
      :key="s.id"
      class="konami-square absolute rounded-[3px]"
      :style="{
        left: `${s.x}%`,
        top: `${s.y}%`,
        width: `${s.size}px`,
        height: `${s.size}px`,
        background: s.color,
        animationDelay: `${s.delay}ms`,
      }"
    />
  </div>
  <p
    v-if="toast"
    role="status"
    class="konami-toast fixed bottom-6 inset-x-0 mx-auto w-fit max-w-[calc(100vw-2rem)] z-91 m-0 flex items-center gap-2.5 px-4 min-h-11 rounded-full border border-border bg-bg-subtle shadow-[var(--shadow-pop)] font-mono text-sm"
  >
    <span class="grid grid-cols-2 gap-0.5" aria-hidden="true">
      <span v-for="c in GREENS" :key="c" class="size-1.5 rounded-[1px]" :style="{ background: c }" />
    </span>
    Konami unlocked: +365 green squares
  </p>
</template>

<style scoped>
.konami-square {
  opacity: 0;
  animation: konami-pop 1.6s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes konami-pop {
  0% {
    opacity: 0;
    scale: 0.25;
  }
  25% {
    opacity: 1;
    scale: 1;
  }
  100% {
    opacity: 0;
    scale: 0.9;
    translate: 0 48px;
  }
}

.konami-toast {
  animation: toast-in 0.2s cubic-bezier(0.2, 0, 0, 1);
}

@keyframes toast-in {
  from {
    opacity: 0;
    translate: 0 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .konami-toast {
    animation: none;
  }
}
</style>
