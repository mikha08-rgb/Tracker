import type { ISODate, WeekStart } from '../lib/dates'

export interface Habit {
  id: string
  name: string
  /** A single emoji, or null for a plain color dot. */
  emoji: string | null
  /** '#rrggbb' — drives the heatmap and card accent. */
  color: string
  /**
   * Optional daily target. When set, cell intensity scales toward it;
   * when null, intensity auto-scales to the habit's own history.
   */
  targetPerDay: number | null
  /** ISO datetime. Creation metadata only — never treated as a calendar day. */
  createdAt: string
  sortOrder: number
}

/**
 * One habit-day. A row exists only while `count > 0 || note !== ''` —
 * the repo deletes it when both are empty. Note-only rows (count 0)
 * are legal: journaling on a day the habit didn't happen.
 */
export interface DayEntry {
  habitId: string
  /** Local calendar date. The core invariant of the whole app. */
  date: ISODate
  count: number
  note: string
}

/** Theme lives in localStorage (needed before first paint), not here. */
export interface SettingsMap {
  weekStart: WeekStart
  /** ISO datetime of the last JSON export, for the backup nudge. */
  lastExportAt: string
}
