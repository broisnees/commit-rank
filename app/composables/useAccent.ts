export const ACCENTS = ['sky', 'coral', 'amber', 'emerald', 'violet', 'magenta', 'neutral'] as const
export type Accent = (typeof ACCENTS)[number]

const STORAGE_KEY = 'commitrank-accent'

/** Inline script that applies the saved accent before first paint (no flash). */
export const ACCENT_PREHYDRATE = `try{var a=localStorage.getItem('${STORAGE_KEY}');if(a&&/^[a-z]+$/.test(a))document.documentElement.style.setProperty('--accent-color','var(--swatch-'+a+')')}catch(e){}`

export function useAccent() {
  const accent = useState<Accent>('accent', () => 'sky')

  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Accent | null
      if (saved && ACCENTS.includes(saved)) accent.value = saved
    } catch {}
  })

  function setAccent(value: Accent) {
    accent.value = value
    document.documentElement.style.setProperty('--accent-color', `var(--swatch-${value})`)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {}
  }

  return { accent, setAccent }
}
