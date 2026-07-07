/**
 * Pure heatmap logic: year-grid layout and count → intensity mapping.
 * No React in here — everything is unit-testable data-in/data-out.
 */

import {
  addDays,
  formatDate,
  monthOf,
  startOfWeek,
  yearOf,
  type ISODate,
  type WeekStart,
} from './dates'

export interface MonthLabel {
  /** Column index where this month first appears. */
  weekIndex: number
  label: string
}

export interface YearGrid {
  year: number
  weekStart: WeekStart
  /**
   * Columns of exactly 7 rows (row 0 = the week-start day). null cells pad
   * the days before Jan 1 and after Dec 31. 53 or 54 columns depending on
   * the year and week start — never assume 53.
   */
  weeks: (ISODate | null)[][]
  monthLabels: MonthLabel[]
}

/** Calendar-year grid (Jan 1 – Dec 31), one column per week. */
export function buildYearGrid(year: number, weekStart: WeekStart): YearGrid {
  const dec31 = `${year}-12-31` as ISODate
  const weeks: (ISODate | null)[][] = []
  const monthLabels: MonthLabel[] = []
  let cursor = startOfWeek(`${year}-01-01` as ISODate, weekStart)
  let lastLabeledMonth = 0

  while (cursor <= dec31) {
    const week: (ISODate | null)[] = []
    for (let row = 0; row < 7; row++) {
      if (yearOf(cursor) === year) {
        week.push(cursor)
        const month = monthOf(cursor)
        if (month !== lastLabeledMonth) {
          lastLabeledMonth = month
          monthLabels.push({
            weekIndex: weeks.length,
            label: formatDate(cursor, { month: 'short' }),
          })
        }
      } else {
        week.push(null)
      }
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }

  return { year, weekStart, weeks, monthLabels }
}

/** Intensity levels: 0 = nothing, 1–4 = shades of the habit color. */
export type Level = 0 | 1 | 2 | 3 | 4

/** [p25, p50, p75] of the habit's non-zero history. */
export type Thresholds = [number, number, number]

export function computeThresholds(nonZeroCounts: number[]): Thresholds {
  if (nonZeroCounts.length === 0) return [1, 1, 1]
  const sorted = [...nonZeroCounts].sort((a, b) => a - b)
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
  return [at(0.25), at(0.5), at(0.75)]
}

/**
 * Quantile scaling relative to the habit's own history. A boolean-style
 * habit (every count 1) gets thresholds [1,1,1], so every done-day is a
 * full-strength 4.
 */
export function bucketFor(count: number, thresholds: Thresholds): Level {
  if (count <= 0) return 0
  let level = 1
  if (count >= thresholds[0]) level++
  if (count >= thresholds[1]) level++
  if (count >= thresholds[2]) level++
  return Math.min(level, 4) as Level
}

/** Scaling toward an explicit daily target: reach it and the cell is full. */
export function bucketForTarget(count: number, target: number): Level {
  if (count <= 0) return 0
  if (target <= 0) return 4
  return Math.max(1, Math.min(4, Math.ceil((4 * count) / target))) as Level
}

export function levelFor(
  count: number,
  targetPerDay: number | null,
  thresholds: Thresholds,
): Level {
  return targetPerDay !== null ? bucketForTarget(count, targetPerDay) : bucketFor(count, thresholds)
}

/**
 * Levels 1–4 as the habit color with increasing alpha. Like GitHub's
 * graph, translucent shades read correctly on light and dark backgrounds.
 */
const LEVEL_ALPHA = ['00', '4d', '8c', 'c7', 'ff'] as const // 0 / 30 / 55 / 78 / 100 %

export function cellColor(hexColor: string, level: 1 | 2 | 3 | 4): string {
  return hexColor + LEVEL_ALPHA[level]
}
