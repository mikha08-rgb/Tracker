/**
 * The single read/write surface over the database. Components never touch
 * `db` directly: queries run through these functions inside `useLiveQuery`,
 * and every mutation lives here — which is also the seam where optional
 * sync could be added later without touching the UI.
 */

import type { ISODate } from '../lib/dates'
import { yearOf } from '../lib/dates'
import { db, type SettingRow } from './db'
import type { DayEntry, Habit, SettingsMap } from './types'

export interface HabitInput {
  name: string
  emoji: string | null
  color: string
  targetPerDay: number | null
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  return db.transaction('rw', db.habits, async () => {
    const last = await db.habits.orderBy('sortOrder').last()
    const habit: Habit = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
      sortOrder: last ? last.sortOrder + 1 : 0,
    }
    await db.habits.add(habit)
    return habit
  })
}

export async function updateHabit(
  id: string,
  changes: Partial<Omit<Habit, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.habits.update(id, changes)
}

/** Deletes the habit and all of its entries atomically. */
export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.entries.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

/**
 * Adds `delta` to the day's count (clamped at 0). Creates the row when
 * needed and deletes it when count and note are both empty.
 */
export async function adjustCount(habitId: string, date: ISODate, delta: number): Promise<void> {
  await db.transaction('rw', db.entries, async () => {
    const key: [string, string] = [habitId, date]
    const existing = await db.entries.get(key)
    const count = Math.max(0, (existing?.count ?? 0) + delta)
    const note = existing?.note ?? ''
    if (count === 0 && note === '') {
      if (existing) await db.entries.delete(key)
    } else {
      await db.entries.put({ habitId, date, count, note })
    }
  })
}

/** Sets the day's note (trimmed). Same row lifecycle as adjustCount. */
export async function setNote(habitId: string, date: ISODate, rawNote: string): Promise<void> {
  const note = rawNote.trim()
  await db.transaction('rw', db.entries, async () => {
    const key: [string, string] = [habitId, date]
    const existing = await db.entries.get(key)
    const count = existing?.count ?? 0
    if (count === 0 && note === '') {
      if (existing) await db.entries.delete(key)
    } else {
      await db.entries.put({ habitId, date, count, note })
    }
  })
}

export function getHabits(): Promise<Habit[]> {
  return db.habits.orderBy('sortOrder').toArray()
}

export function getHabit(id: string): Promise<Habit | undefined> {
  return db.habits.get(id)
}

export function getEntriesForYear(habitId: string, year: number): Promise<DayEntry[]> {
  return db.entries
    .where('[habitId+date]')
    .between([habitId, `${year}-01-01`], [habitId, `${year}-12-31`], true, true)
    .toArray()
}

/** Every entry of one habit, for history-wide stats and intensity thresholds. */
export function getEntriesForHabit(habitId: string): Promise<DayEntry[]> {
  return db.entries.where('habitId').equals(habitId).toArray()
}

/** Earliest and latest years that hold any data, for bounding the year switcher. */
export async function getYearBounds(): Promise<{ minYear: number; maxYear: number } | null> {
  const first = await db.entries.orderBy('date').first()
  if (!first) return null
  const last = await db.entries.orderBy('date').last()
  return { minYear: yearOf(first.date), maxYear: yearOf(last!.date) }
}

export async function getSetting<K extends keyof SettingsMap>(
  key: K,
): Promise<SettingsMap[K] | undefined> {
  const row = await db.settings.get(key)
  return row?.value as SettingsMap[K] | undefined
}

export async function setSetting<K extends keyof SettingsMap>(
  key: K,
  value: SettingsMap[K],
): Promise<void> {
  await db.settings.put({ key, value })
}

export interface Snapshot {
  habits: Habit[]
  entries: DayEntry[]
  settings: SettingRow[]
}

/** A consistent full copy of the database, for export. */
export function getSnapshot(): Promise<Snapshot> {
  return db.transaction('r', db.habits, db.entries, db.settings, async () => ({
    habits: await db.habits.orderBy('sortOrder').toArray(),
    entries: await db.entries.orderBy('[habitId+date]').toArray(),
    settings: await db.settings.toArray(),
  }))
}

/**
 * Replaces the entire database with the snapshot in one transaction —
 * a failure mid-import rolls everything back.
 */
export async function replaceAll(snapshot: Snapshot): Promise<void> {
  await db.transaction('rw', db.habits, db.entries, db.settings, async () => {
    await Promise.all([db.habits.clear(), db.entries.clear(), db.settings.clear()])
    await db.habits.bulkAdd(snapshot.habits)
    await db.entries.bulkAdd(snapshot.entries)
    await db.settings.bulkPut(snapshot.settings)
  })
}

export function wipeAll(): Promise<void> {
  return replaceAll({ habits: [], entries: [], settings: [] })
}
