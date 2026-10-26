import {
  defineConfig,
  presetIcons,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import { METRICS } from './shared/utils/metrics'

export default defineConfig({
  // metric icons live in shared TS, outside the Vue pipeline
  safelist: Object.values(METRICS).map(m => m.icon),
  presets: [
    presetWind4(),
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: { 'display': 'inline-block', 'vertical-align': 'middle' },
    }),
  ],
  transformers: [transformerDirectives({ enforce: 'pre' }), transformerVariantGroup()],
  theme: {
    spacing: { DEFAULT: '4px' },
    font: {
      mono: "'Geist Mono', ui-monospace, monospace",
      sans: "'Geist', system-ui, -apple-system, sans-serif",
    },
    text: {
      '2xs': { fontSize: '0.6875rem' },
      '3xs': { fontSize: '0.625rem' },
    },
    colors: {
      bg: {
        DEFAULT: 'var(--bg)',
        subtle: 'var(--bg-subtle)',
        muted: 'var(--bg-muted)',
        elevated: 'var(--bg-elevated)',
      },
      fg: {
        DEFAULT: 'var(--fg)',
        muted: 'var(--fg-muted)',
        subtle: 'var(--fg-subtle)',
      },
      border: {
        DEFAULT: 'var(--border)',
        subtle: 'var(--border-subtle)',
        hover: 'var(--border-hover)',
      },
      accent: { DEFAULT: 'var(--accent)' },
      badge: {
        orange: 'var(--badge-orange)',
        green: 'var(--badge-green)',
        purple: 'var(--badge-purple)',
        red: 'var(--badge-red)',
        blue: 'var(--badge-blue)',
      },
      gold: 'var(--medal-gold)',
      silver: 'var(--medal-silver)',
      bronze: 'var(--medal-bronze)',
    },
    animation: {
      keyframes: {
        'skeleton-pulse': '{0%, 100% { opacity: 0.4 } 50% { opacity: 0.7 }}',
        'fade-in': '{from { opacity: 0 } to { opacity: 1 }}',
        'slide-up':
          '{from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) }}',
      },
      durations: { 'skeleton-pulse': '2s', 'fade-in': '0.3s', 'slide-up': '0.4s' },
      timingFns: {
        'skeleton-pulse': 'ease-in-out',
        'fade-in': 'ease-out',
        'slide-up': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      counts: { 'skeleton-pulse': 'infinite' },
    },
  },
  shortcuts: [
    ['container', 'max-w-6xl mx-auto px-4 sm:px-6 w-full'],
    // one focus treatment everywhere: the accent outline from main.css
    ['focus-ring', 'focus-visible:(outline-2 outline-solid outline-accent outline-offset-2)'],
    ['link-subtle', 'text-fg-muted hover:text-fg transition-colors duration-150'],
    ['card', 'bg-bg-subtle border border-border rounded-xl shadow-[var(--shadow-card)]'],
    [
      'card-hover',
      'transition-[border-color,background-color] duration-150 hover:(border-border-hover bg-bg-muted)',
    ],
    ['skeleton', 'bg-bg-elevated rounded-md motion-safe:animate-skeleton-pulse'],
    ['kbd', 'inline-flex items-center justify-center min-w-5 h-5 rounded border border-border bg-bg-muted px-1.5 font-mono text-2xs text-fg-muted'],
    // type roles
    ['label-micro', 'text-2xs font-medium uppercase tracking-[0.08em] text-fg-subtle'],
    ['section-title', 'm-0 font-mono text-base sm:text-lg font-medium tracking-tight'],
    // controls: 40px minimum hit area, press scale lives in main.css
    [
      'btn-base',
      'inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 rounded-lg border font-mono text-sm cursor-pointer select-none [transition-property:color,background-color,border-color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)] focus-ring disabled:(opacity-50 cursor-not-allowed)',
    ],
    ['btn', 'btn-base border-border bg-bg-subtle text-fg hover:(bg-bg-muted border-border-hover)'],
    ['btn-primary', 'btn-base border-fg bg-fg text-bg hover:(bg-fg/85 border-fg/85)'],
    ['btn-ghost', 'btn-base border-transparent bg-transparent text-fg-muted hover:(bg-bg-muted text-fg)'],
    // filter chips: one selected treatment everywhere (matches the segmented tabs)
    [
      'chip',
      'inline-flex items-center gap-1.5 h-9 px-3 rounded-full border font-mono text-sm whitespace-nowrap cursor-pointer transition-[color,background-color,border-color] duration-150 focus-ring',
    ],
    ['chip-on', 'border-border-hover bg-bg-muted text-fg'],
    ['chip-off', 'border-border text-fg-muted hover:(text-fg border-border-hover bg-bg-muted)'],
    [
      'field',
      'w-full min-h-11 rounded-lg bg-bg-subtle border border-border px-3 font-mono text-sm text-fg placeholder:text-fg-subtle outline-none transition-[border-color,background-color] duration-150 hover:border-border-hover focus:(border-accent bg-bg)',
    ],
  ],
  rules: [['animate-fill-both', { 'animation-fill-mode': 'both' }]],
})
