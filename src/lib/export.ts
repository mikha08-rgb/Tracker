/**
 * Versioned, human-readable backup format. Pure functions only — the
 * component layer glues these to the database and the file system.
 */

import type { Snapshot } from '../data/repo'
import type { DayEntry, Habit } from '../data/types'
import type { Theme } from '../hooks/useTheme'
import { isValidISODate, type WeekStart } from './dates'

export const SCHEMA_VERSION = 1

export interface ExportFile {
  app: 'tessera'
  schemaVersion: number
  exportedAt: string
  settings: { weekStart?: WeekStart; theme?: Theme }
  habits: Habit[]
  entries: DayEntry[]
}

export interface ImportResult {
  file: ExportFile
  snapshot: Snapshot
  warnings: string[]
}

export function serialize(snapshot: Snapshot, theme: Theme, exportedAt: string): ExportFile {
  const settings: ExportFile['settings'] = { theme }
  for (const row of snapshot.settings) {
    if (row.key === 'weekStart' && (row.value === 'mon' || row.value === 'sun')) {
      settings.weekStart = row.value
    }
  }
  return {
    app: 'tessera',
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    settings,
    habits: [...snapshot.habits].sort((a, b) => a.sortOrder - b.sortOrder),
    entries: [...snapshot.entries].sort(
      (a, b) => a.habitId.localeCompare(b.habitId) || a.date.localeCompare(b.date),
    ),
  }
}

/**
 * Ordered migrations: index N upgrades a version-(N+1) file to version
 * N+2. Empty today; grows when the schema version bumps.
 */
const MIGRATIONS: ((raw: Record<string, unknown>) => Record<string, unknown>)[] = []

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseHabit(raw: unknown, path: string): Habit {
  if (!isRecord(raw)) fail(`${path} is not an object`)
  const { id, name, emoji, color, targetPerDay, createdAt, sortOrder } = raw
  if (typeof id !== 'string' || id === '') fail(`${path}.id must be a non-empty string`)
  if (typeof name !== 'string' || name.trim() === '')
    fail(`${path}.name must be a non-empty string`)
  if (emoji !== null && emoji !== undefined && typeof emoji !== 'string')
    fail(`${path}.emoji must be a string or null`)
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
    fail(`${path}.color must be '#rrggbb'`)
  if (
    targetPerDay !== null &&
    targetPerDay !== undefined &&
    (typeof targetPerDay !== 'number' || !Number.isInteger(targetPerDay) || targetPerDay <= 0)
  )
    fail(`${path}.targetPerDay must be a positive integer or null`)
  if (typeof sortOrder !== 'number' || !Number.isFinite(sortOrder))
    fail(`${path}.sortOrder must be a number`)
  return {
    id,
    name: name.trim(),
    emoji: typeof emoji === 'string' && emoji !== '' ? emoji : null,
    color: color.toLowerCase(),
    targetPerDay: typeof targetPerDay === 'number' ? targetPerDay : null,
    createdAt: typeof createdAt === 'string' ? createdAt : '',
    sortOrder,
  }
}

function parseEntry(raw: unknown, path: string): DayEntry {
  if (!isRecord(raw)) fail(`${path} is not an object`)
  const { habitId, date, count, note } = raw
  if (typeof habitId !== 'string' || habitId === '')
    fail(`${path}.habitId must be a non-empty string`)
  if (typeof date !== 'string' || !isValidISODate(date))
    fail(`${path}.date must be a real 'YYYY-MM-DD' date`)
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0)
    fail(`${path}.count must be a non-negative integer`)
  if (note !== undefined && typeof note !== 'string') fail(`${path}.note must be a string`)
  return { habitId, date, count, note: note ?? '' }
}

/**
 * Validates an untrusted parsed-JSON value and normalizes it into a
 * database snapshot. Unknown fields are dropped; recoverable problems
 * (orphaned/duplicate/empty entries) become warnings instead of errors.
 */
export function validateImport(input: unknown): ImportResult | { error: string } {
  try {
    if (!isRecord(input)) fail('the file is not a JSON object')
    if (input.app !== 'tessera')
      fail("this doesn't look like a Tessera backup (missing app: 'tessera')")
    const version = input.schemaVersion
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
      fail('schemaVersion must be a positive integer')
    if (version > SCHEMA_VERSION)
      fail(
        `this backup is from a newer Tessera (schema v${version}, this app reads up to v${SCHEMA_VERSION}) — update the app first`,
      )

    let raw: Record<string, unknown> = input
    for (let v = version; v < SCHEMA_VERSION; v++) {
      raw = MIGRATIONS[v - 1](raw)
    }

    if (!Array.isArray(raw.habits)) fail('habits must be an array')
    if (!Array.isArray(raw.entries)) fail('entries must be an array')

    const warnings: string[] = []
    const habits = raw.habits.map((h, i) => parseHabit(h, `habits[${i}]`))

    const habitIds = new Set(habits.map((h) => h.id))
    if (habitIds.size !== habits.length) fail('habits contain duplicate ids')

    const byKey = new Map<string, DayEntry>()
    let orphaned = 0
    let empty = 0
    let duplicates = 0
    raw.entries.forEach((e, i) => {
      const entry = parseEntry(e, `entries[${i}]`)
      if (!habitIds.has(entry.habitId)) {
        orphaned++
        return
      }
      if (entry.count === 0 && entry.note === '') {
        empty++
        return
      }
      const key = `${entry.habitId}\n${entry.date}`
      if (byKey.has(key)) duplicates++
      byKey.set(key, entry)
    })
    if (orphaned > 0) warnings.push(`dropped ${orphaned} entries that reference missing habits`)
    if (duplicates > 0) warnings.push(`merged ${duplicates} duplicate day entries (kept the last)`)
    if (empty > 0) warnings.push(`dropped ${empty} empty entries`)

    // exportedAt feeds relative-time rendering in the UI, where a date
    // string Date can't parse would throw during render — drop it instead.
    const exportedAt =
      typeof raw.exportedAt === 'string' && Number.isFinite(new Date(raw.exportedAt).getTime())
        ? raw.exportedAt
        : ''
    if (exportedAt === '' && raw.exportedAt !== undefined && raw.exportedAt !== '') {
      warnings.push("ignored the file's export date (unreadable)")
    }

    const settings: Snapshot['settings'] = []
    const file: ExportFile = {
      app: 'tessera',
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      settings: {},
      habits,
      entries: [...byKey.values()],
    }
    if (isRecord(raw.settings)) {
      const { weekStart, theme } = raw.settings
      if (weekStart === 'mon' || weekStart === 'sun') {
        file.settings.weekStart = weekStart
        settings.push({ key: 'weekStart', value: weekStart })
      }
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        file.settings.theme = theme
      }
    }

    return {
      file,
      snapshot: { habits: file.habits, entries: file.entries, settings },
      warnings,
    }
  } catch (err) {
    if (err instanceof ImportError) return { error: err.message }
    throw err
  }
}
