export const TIME_ZONE = 'America/New_York'
export const LAUNCH_DATE = '2026-06-01'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function etDate(now: Date = new Date()): string {
  return dateFormatter.format(now)
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function dayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function daysBetween(a: string, b: string): number {
  return dayIndex(b) - dayIndex(a)
}

export function addDays(date: string, delta: number): string {
  const ms = (dayIndex(date) + delta) * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

export function puzzleNumber(date: string): number {
  return daysBetween(LAUNCH_DATE, date) + 1
}

let cachedReset: { day: string; at: number } | null = null
export function msUntilNextReset(now: Date = new Date()): number {
  const time = now.getTime()
  const day = etDate(now)
  if (!cachedReset || cachedReset.day !== day || cachedReset.at <= time) {
    // Locate the next Eastern calendar boundary, including 23/25-hour DST days.
    let lo = time; let hi = time + 27 * 3_600_000
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      if (etDate(new Date(mid)) === day) lo = mid
      else hi = mid
    }
    cachedReset = { day, at: hi }
  }
  return cachedReset.at - time
}

export function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
