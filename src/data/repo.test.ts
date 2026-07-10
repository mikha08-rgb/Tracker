import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  adjustCount,
  applyImport,
  createHabit,
  deleteHabit,
  getEntriesForHabit,
  getEntriesForYear,
  getHabits,
  getSetting,
  getSnapshot,
  getYearBounds,
  replaceAll,
  setNote,
  setSetting,
  updateHabit,
  wipeAll,
} from './repo'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const input = { name: 'Read', emoji: '📚', color: '#22c55e', targetPerDay: null }

describe('habits', () => {
  it('creates habits with incrementing sortOrder', async () => {
    const a = await createHabit(input)
    const b = await createHabit({ ...input, name: 'Run' })
    expect(a.sortOrder).toBe(0)
    expect(b.sortOrder).toBe(1)
    expect(a.id).not.toBe(b.id)

    const habits = await getHabits()
    expect(habits.map((h) => h.name)).toEqual(['Read', 'Run'])
  })

  it('updates habit fields', async () => {
    const habit = await createHabit(input)
    await updateHabit(habit.id, { name: 'Read books', color: '#3b82f6' })
    const habits = await getHabits()
    expect(habits[0].name).toBe('Read books')
    expect(habits[0].color).toBe('#3b82f6')
    expect(habits[0].emoji).toBe('📚')
  })

  it('deleteHabit cascades to its entries only', async () => {
    const a = await createHabit(input)
    const b = await createHabit({ ...input, name: 'Run' })
    await adjustCount(a.id, '2026-07-01', 1)
    await adjustCount(a.id, '2026-07-02', 1)
    await adjustCount(b.id, '2026-07-01', 1)

    await deleteHabit(a.id)

    expect(await getHabits()).toHaveLength(1)
    expect(await getEntriesForHabit(a.id)).toHaveLength(0)
    expect(await getEntriesForHabit(b.id)).toHaveLength(1)
  })
})

describe('adjustCount', () => {
  it('creates, increments, and decrements a day entry', async () => {
    const habit = await createHabit(input)
    await adjustCount(habit.id, '2026-07-06', 1)
    await adjustCount(habit.id, '2026-07-06', 1)
    await adjustCount(habit.id, '2026-07-06', 1)
    await adjustCount(habit.id, '2026-07-06', -1)

    const entries = await getEntriesForHabit(habit.id)
    expect(entries).toEqual([{ habitId: habit.id, date: '2026-07-06', count: 2, note: '' }])
  })

  it('clamps at zero and deletes the empty row', async () => {
    const habit = await createHabit(input)
    await adjustCount(habit.id, '2026-07-06', 1)
    await adjustCount(habit.id, '2026-07-06', -5)
    expect(await getEntriesForHabit(habit.id)).toHaveLength(0)
  })

  it('resolves to the count it wrote', async () => {
    const habit = await createHabit(input)
    expect(await adjustCount(habit.id, '2026-07-06', 1)).toBe(1)
    expect(await adjustCount(habit.id, '2026-07-06', 1)).toBe(2)
    expect(await adjustCount(habit.id, '2026-07-06', -5)).toBe(0)
  })

  it('decrementing to zero keeps the row when a note exists', async () => {
    const habit = await createHabit(input)
    await adjustCount(habit.id, '2026-07-06', 1)
    await setNote(habit.id, '2026-07-06', 'was sick today')
    await adjustCount(habit.id, '2026-07-06', -1)

    const entries = await getEntriesForHabit(habit.id)
    expect(entries).toEqual([
      { habitId: habit.id, date: '2026-07-06', count: 0, note: 'was sick today' },
    ])
  })
})

describe('setNote', () => {
  it('creates a note-only row on a day with no count', async () => {
    const habit = await createHabit(input)
    await setNote(habit.id, '2026-07-06', 'travel day')
    const entries = await getEntriesForHabit(habit.id)
    expect(entries).toEqual([
      { habitId: habit.id, date: '2026-07-06', count: 0, note: 'travel day' },
    ])
  })

  it('trims whitespace and deletes the row when note and count are both empty', async () => {
    const habit = await createHabit(input)
    await setNote(habit.id, '2026-07-06', '  hello  ')
    let entries = await getEntriesForHabit(habit.id)
    expect(entries[0].note).toBe('hello')

    await setNote(habit.id, '2026-07-06', '   ')
    entries = await getEntriesForHabit(habit.id)
    expect(entries).toHaveLength(0)
  })

  it('keeps the count when the note is cleared', async () => {
    const habit = await createHabit(input)
    await adjustCount(habit.id, '2026-07-06', 2)
    await setNote(habit.id, '2026-07-06', 'note')
    await setNote(habit.id, '2026-07-06', '')

    const entries = await getEntriesForHabit(habit.id)
    expect(entries).toEqual([{ habitId: habit.id, date: '2026-07-06', count: 2, note: '' }])
  })
})

describe('queries', () => {
  it('getEntriesForYear returns only that habit and year, boundaries inclusive', async () => {
    const a = await createHabit(input)
    const b = await createHabit({ ...input, name: 'Run' })
    await adjustCount(a.id, '2025-12-31', 1)
    await adjustCount(a.id, '2026-01-01', 1)
    await adjustCount(a.id, '2026-06-15', 1)
    await adjustCount(a.id, '2026-12-31', 1)
    await adjustCount(a.id, '2027-01-01', 1)
    await adjustCount(b.id, '2026-06-15', 1)

    const entries = await getEntriesForYear(a.id, 2026)
    expect(entries.map((e) => e.date)).toEqual(['2026-01-01', '2026-06-15', '2026-12-31'])
  })

  it('getYearBounds spans all habits, null when empty', async () => {
    expect(await getYearBounds()).toBeNull()

    const a = await createHabit(input)
    const b = await createHabit({ ...input, name: 'Run' })
    await adjustCount(a.id, '2024-03-01', 1)
    await adjustCount(b.id, '2026-07-06', 1)

    expect(await getYearBounds()).toEqual({ minYear: 2024, maxYear: 2026 })
  })
})

describe('settings', () => {
  it('round-trips typed settings', async () => {
    expect(await getSetting('weekStart')).toBeUndefined()
    await setSetting('weekStart', 'sun')
    expect(await getSetting('weekStart')).toBe('sun')
    await setSetting('weekStart', 'mon')
    expect(await getSetting('weekStart')).toBe('mon')
  })
})

describe('snapshot / replaceAll', () => {
  it('round-trips the full database', async () => {
    const habit = await createHabit(input)
    await adjustCount(habit.id, '2026-07-06', 3)
    await setNote(habit.id, '2026-07-05', 'note-only day')
    await setSetting('weekStart', 'sun')

    const snapshot = await getSnapshot()
    await wipeAll()
    expect(await getHabits()).toHaveLength(0)
    expect(await getSnapshot()).toEqual({ habits: [], entries: [], settings: [] })

    await replaceAll(snapshot)
    expect(await getSnapshot()).toEqual(snapshot)
  })

  it('replaceAll overwrites existing data', async () => {
    const old = await createHabit({ ...input, name: 'Old' })
    await adjustCount(old.id, '2026-01-01', 1)
    const snapshot = await getSnapshot()

    await wipeAll()
    const fresh = await createHabit({ ...input, name: 'Fresh' })
    await adjustCount(fresh.id, '2026-02-02', 2)

    await replaceAll(snapshot)
    const habits = await getHabits()
    expect(habits.map((h) => h.name)).toEqual(['Old'])
    expect(await getEntriesForHabit(fresh.id)).toHaveLength(0)
  })
})

describe('applyImport', () => {
  it('replaces the database and records the backup file’s export time', async () => {
    await createHabit(input)
    const snapshot = await getSnapshot()

    await applyImport(snapshot, '2026-07-01T00:00:00.000Z')

    expect((await getHabits()).map((h) => h.name)).toEqual(['Read'])
    expect(await getSetting('lastExportAt')).toBe('2026-07-01T00:00:00.000Z')
  })

  it('leaves lastExportAt unset when the file carries no export time', async () => {
    await setSetting('lastExportAt', '2026-01-01T00:00:00.000Z')
    await applyImport({ habits: [], entries: [], settings: [] }, '')
    expect(await getSetting('lastExportAt')).toBeUndefined()
  })
})
