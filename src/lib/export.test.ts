import { describe, expect, it } from 'vitest'
import type { Snapshot } from '../data/repo'
import { serialize, validateImport, SCHEMA_VERSION } from './export'

const habit = {
  id: 'h1',
  name: 'Read',
  emoji: null,
  color: '#22c55e',
  targetPerDay: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  sortOrder: 0,
}

const snapshot: Snapshot = {
  habits: [habit, { ...habit, id: 'h2', name: 'Run', sortOrder: 1 }],
  entries: [
    { habitId: 'h1', date: '2026-07-01', count: 3, note: '' },
    { habitId: 'h1', date: '2026-07-02', count: 0, note: 'sick day' },
    { habitId: 'h2', date: '2026-07-01', count: 1, note: '' },
  ],
  settings: [{ key: 'weekStart', value: 'sun' }],
}

describe('serialize', () => {
  it('produces a versioned, sorted, self-describing file', () => {
    const file = serialize(snapshot, 'dark', '2026-07-06T12:00:00.000Z')
    expect(file.app).toBe('tessera')
    expect(file.schemaVersion).toBe(SCHEMA_VERSION)
    expect(file.exportedAt).toBe('2026-07-06T12:00:00.000Z')
    expect(file.settings).toEqual({ theme: 'dark', weekStart: 'sun' })
    expect(file.habits.map((h) => h.id)).toEqual(['h1', 'h2'])
    expect(file.entries.map((e) => `${e.habitId} ${e.date}`)).toEqual([
      'h1 2026-07-01',
      'h1 2026-07-02',
      'h2 2026-07-01',
    ])
  })
})

describe('validateImport', () => {
  function roundTrip() {
    return JSON.parse(JSON.stringify(serialize(snapshot, 'system', '2026-07-06T12:00:00.000Z')))
  }

  it('round-trips a serialized snapshot', () => {
    const result = validateImport(roundTrip())
    if ('error' in result) throw new Error(result.error)
    expect(result.warnings).toEqual([])
    expect(result.snapshot.habits).toEqual(snapshot.habits)
    expect(result.snapshot.entries).toEqual(snapshot.entries)
    expect(result.snapshot.settings).toEqual([{ key: 'weekStart', value: 'sun' }])
    expect(result.file.settings.theme).toBe('system')
  })

  it('rejects non-backup files with a clear message', () => {
    expect(validateImport(null)).toEqual({ error: 'the file is not a JSON object' })
    expect(validateImport([1, 2])).toEqual({ error: 'the file is not a JSON object' })
    expect(validateImport({ hello: 'world' })).toMatchObject({
      error: expect.stringContaining("doesn't look like a Tessera backup"),
    })
  })

  it('rejects files from a newer schema', () => {
    const file = { ...roundTrip(), schemaVersion: SCHEMA_VERSION + 1 }
    expect(validateImport(file)).toMatchObject({
      error: expect.stringContaining('newer Tessera'),
    })
  })

  it('pinpoints invalid fields by path', () => {
    const badColor = roundTrip()
    badColor.habits[1].color = 'green'
    expect(validateImport(badColor)).toEqual({ error: "habits[1].color must be '#rrggbb'" })

    const badDate = roundTrip()
    badDate.entries[2].date = '2026-02-30'
    expect(validateImport(badDate)).toEqual({
      error: "entries[2].date must be a real 'YYYY-MM-DD' date",
    })

    const badCount = roundTrip()
    badCount.entries[0].count = -1
    expect(validateImport(badCount)).toEqual({
      error: 'entries[0].count must be a non-negative integer',
    })
  })

  it('drops orphaned, duplicate, and empty entries with warnings', () => {
    const file = roundTrip()
    file.entries.push(
      { habitId: 'missing', date: '2026-07-01', count: 1, note: '' },
      { habitId: 'h1', date: '2026-07-01', count: 9, note: '' },
      { habitId: 'h2', date: '2026-07-03', count: 0, note: '' },
    )
    const result = validateImport(file)
    if ('error' in result) throw new Error(result.error)
    expect(result.warnings).toHaveLength(3)
    expect(
      result.snapshot.entries.find((e) => e.habitId === 'h1' && e.date === '2026-07-01'),
    ).toEqual({ habitId: 'h1', date: '2026-07-01', count: 9, note: '' })
    expect(result.snapshot.entries.some((e) => e.habitId === 'missing')).toBe(false)
    expect(result.snapshot.entries.some((e) => e.date === '2026-07-03')).toBe(false)
  })

  it('rejects duplicate habit ids', () => {
    const file = roundTrip()
    file.habits.push({ ...file.habits[0] })
    expect(validateImport(file)).toEqual({ error: 'habits contain duplicate ids' })
  })

  it('drops an unreadable exportedAt with a warning instead of keeping it', () => {
    // Kept as-is it would reach relative-time rendering and throw mid-render.
    const file = { ...roundTrip(), exportedAt: 'yesterday' }
    const result = validateImport(file)
    if ('error' in result) throw new Error(result.error)
    expect(result.file.exportedAt).toBe('')
    expect(result.warnings).toEqual(["ignored the file's export date (unreadable)"])
  })

  it('tolerates a missing exportedAt silently', () => {
    const file = roundTrip()
    delete file.exportedAt
    const result = validateImport(file)
    if ('error' in result) throw new Error(result.error)
    expect(result.file.exportedAt).toBe('')
    expect(result.warnings).toEqual([])
  })

  it('ignores unknown settings values', () => {
    const file = roundTrip()
    file.settings = { weekStart: 'someday', theme: 'neon', extra: true }
    const result = validateImport(file)
    if ('error' in result) throw new Error(result.error)
    expect(result.snapshot.settings).toEqual([])
    expect(result.file.settings).toEqual({})
  })

  it('normalizes shorthand values', () => {
    const file = roundTrip()
    file.habits[0].color = '#ABCDEF'
    file.habits[0].emoji = ''
    delete file.entries[0].note
    const result = validateImport(file)
    if ('error' in result) throw new Error(result.error)
    expect(result.snapshot.habits[0].color).toBe('#abcdef')
    expect(result.snapshot.habits[0].emoji).toBeNull()
    expect(result.snapshot.entries[0].note).toBe('')
  })
})
