/**
 * Local calendar dates.
 *
 * Habit days are calendar dates in the user's local timezone, stored as
 * 'YYYY-MM-DD' strings. Three rules keep timezone bugs out of the app:
 *
 * 1. `todayISO()` is the only place the wall clock is read.
 * 2. Never `new Date(isoString)` (parses as UTC midnight) and never
 *    `toISOString()` (formats in UTC) for calendar dates — at 11pm in UTC-5
 *    both put the result on the wrong day.
 * 3. Date arithmetic happens on whole-day integers ("epoch days", computed
 *    via Date.UTC purely as a timezone-free number space), which makes it
 *    immune to DST transitions.
 *
 * ISODate strings sort chronologically with plain string comparison.
 */

export type ISODate = `${number}-${number}-${number}`

export type WeekStart = 'mon' | 'sun'

const MS_PER_DAY = 86_400_000

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0')
}

/** The calendar date of `d` in the local timezone. */
export function toISODate(d: Date): ISODate {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}` as ISODate
}

/** Today's local calendar date. The only function in the app that reads the clock. */
export function todayISO(): ISODate {
  return toISODate(new Date())
}

/** True for well-formed, real dates ('2026-02-30' is rejected). */
export function isValidISODate(s: string): s is ISODate {
  if (!ISO_DATE_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const roundTripped = new Date(Date.UTC(y, m - 1, d))
  return (
    roundTripped.getUTCFullYear() === y &&
    roundTripped.getUTCMonth() === m - 1 &&
    roundTripped.getUTCDate() === d
  )
}

/** Whole days since 1970-01-01. */
export function toEpochDay(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

export function fromEpochDay(day: number): ISODate {
  const d = new Date(day * MS_PER_DAY)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}` as ISODate
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromEpochDay(toEpochDay(iso) + days)
}

/** Day of week: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: ISODate): number {
  // Epoch day 0 (1970-01-01) was a Thursday; double modulo keeps
  // pre-1970 (negative) epoch days in range.
  return (((toEpochDay(iso) + 4) % 7) + 7) % 7
}

export function startOfWeek(iso: ISODate, weekStart: WeekStart): ISODate {
  const dow = dayOfWeek(iso)
  const offset = weekStart === 'sun' ? dow : (dow + 6) % 7
  return addDays(iso, -offset)
}

export function yearOf(iso: ISODate): number {
  return Number(iso.slice(0, 4))
}

/** Month of year: 1–12. */
export function monthOf(iso: ISODate): number {
  return Number(iso.slice(5, 7))
}

// Intl.DateTimeFormat construction is expensive (~tens of µs) and the
// heatmap formats every cell's label; the app only ever uses a handful
// of option sets, so formatters are cached for the page's lifetime.
const formatterCache = new Map<string, Intl.DateTimeFormat>()

/**
 * Locale-aware display formatting, e.g. "Mon, Jul 6". Formats in UTC on
 * purpose: the epoch-day timestamp is timezone-free, so this renders the
 * calendar date exactly as written in any host timezone.
 */
export function formatDate(
  iso: ISODate,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' },
  locale?: string,
): string {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
    formatterCache.set(key, formatter)
  }
  return formatter.format(new Date(toEpochDay(iso) * MS_PER_DAY))
}
