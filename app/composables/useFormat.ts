const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en')
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export const formatCompact = (n: number) => compact.format(n)
export const formatNumber = (n: number) => full.format(n)
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso))
export const formatDayMonth = (iso: string) => dayMonth.format(new Date(iso))

export function formatAgo(input: number | string) {
  const seconds = Math.round((new Date(input).getTime() - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
