import Dexie, { type Table } from 'dexie'
import type { DayEntry, Habit } from './types'

export interface SettingRow {
  key: string
  value: unknown
}

export const db = new Dexie('tessera') as Dexie & {
  habits: Table<Habit, string>
  entries: Table<DayEntry, [string, string]>
  settings: Table<SettingRow, string>
}

db.version(1).stores({
  habits: 'id, sortOrder',
  entries: '[habitId+date], habitId, date',
  settings: 'key',
})
