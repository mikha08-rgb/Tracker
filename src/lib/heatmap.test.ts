import { describe, expect, it } from 'vitest'
import { dayOfWeek, yearOf, type ISODate, type WeekStart } from './dates'
import {
  bucketFor,
  bucketForTarget,
  buildYearGrid,
  cellColor,
  computeThresholds,
  levelFor,
  type Thresholds,
} from './heatmap'

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]
const WEEK_STARTS: WeekStart[] = ['mon', 'sun']

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

describe('buildYearGrid', () => {
  it('contains every day of the year exactly once, in order', () => {
    for (const year of YEARS) {
      for (const weekStart of WEEK_STARTS) {
        const grid = buildYearGrid(year, weekStart)
        const dates = grid.weeks.flat().filter((d): d is ISODate => d !== null)

        expect(dates).toHaveLength(isLeap(year) ? 366 : 365)
        expect(dates[0]).toBe(`${year}-01-01`)
        expect(dates[dates.length - 1]).toBe(`${year}-12-31`)
        expect(new Set(dates).size).toBe(dates.length)
        expect([...dates].sort()).toEqual(dates)
        expect(dates.every((d) => yearOf(d) === year)).toBe(true)
      }
    }
  })

  it('has 53 or 54 columns of exactly 7 rows', () => {
    for (const year of YEARS) {
      for (const weekStart of WEEK_STARTS) {
        const grid = buildYearGrid(year, weekStart)
        expect(grid.weeks.length).toBeGreaterThanOrEqual(53)
        expect(grid.weeks.length).toBeLessThanOrEqual(54)
        for (const week of grid.weeks) {
          expect(week).toHaveLength(7)
        }
      }
    }
  })

  it('places each date in the weekday row matching the week start', () => {
    for (const weekStart of WEEK_STARTS) {
      const grid = buildYearGrid(2026, weekStart)
      for (const week of grid.weeks) {
        week.forEach((date, row) => {
          if (date === null) return
          const expectedRow = weekStart === 'sun' ? dayOfWeek(date) : (dayOfWeek(date) + 6) % 7
          expect(row).toBe(expectedRow)
        })
      }
    }
  })

  it('pads only the edges with nulls', () => {
    const grid = buildYearGrid(2026, 'mon')
    const flat = grid.weeks.flat()
    const firstDate = flat.findIndex((d) => d !== null)
    const lastDate = flat.length - 1 - [...flat].reverse().findIndex((d) => d !== null)
    // Jan 1 2026 is a Thursday → 3 leading pads in Monday mode.
    expect(firstDate).toBe(3)
    expect(flat.slice(firstDate, lastDate + 1).every((d) => d !== null)).toBe(true)
  })

  it('labels all 12 months at the column containing the 1st', () => {
    for (const year of YEARS) {
      for (const weekStart of WEEK_STARTS) {
        const grid = buildYearGrid(year, weekStart)
        expect(grid.monthLabels).toHaveLength(12)
        expect(grid.monthLabels[0].weekIndex).toBe(0)

        const indices = grid.monthLabels.map((m) => m.weekIndex)
        expect([...indices].sort((a, b) => a - b)).toEqual(indices)

        grid.monthLabels.forEach((m, i) => {
          const first = `${year}-${String(i + 1).padStart(2, '0')}-01` as ISODate
          expect(grid.weeks[m.weekIndex]).toContain(first)
        })
      }
    }
  })
})

describe('computeThresholds', () => {
  it('defaults to [1,1,1] for empty history', () => {
    expect(computeThresholds([])).toEqual([1, 1, 1])
  })

  it('collapses for uniform boolean-style habits', () => {
    expect(computeThresholds([1, 1, 1, 1])).toEqual([1, 1, 1])
  })

  it('returns quartiles of varied history', () => {
    expect(computeThresholds([1, 2, 3, 4])).toEqual([2, 3, 4])
    expect(computeThresholds([4, 1, 3, 2])).toEqual([2, 3, 4]) // order-independent
  })
})

describe('bucketFor', () => {
  const t: Thresholds = [2, 4, 8]

  it('maps zero to level 0', () => {
    expect(bucketFor(0, t)).toBe(0)
    expect(bucketFor(-1, t)).toBe(0)
  })

  it('is monotonic in count', () => {
    let prev = 0
    for (let count = 0; count <= 12; count++) {
      const level = bucketFor(count, t)
      expect(level).toBeGreaterThanOrEqual(prev)
      prev = level
    }
  })

  it('hits all four levels across the thresholds', () => {
    expect(bucketFor(1, t)).toBe(1)
    expect(bucketFor(2, t)).toBe(2)
    expect(bucketFor(4, t)).toBe(3)
    expect(bucketFor(8, t)).toBe(4)
    expect(bucketFor(100, t)).toBe(4)
  })

  it('gives boolean-style habits full strength', () => {
    expect(bucketFor(1, computeThresholds([1, 1, 1]))).toBe(4)
  })
})

describe('bucketForTarget', () => {
  it('maps zero to 0 and the target (or more) to 4', () => {
    expect(bucketForTarget(0, 4)).toBe(0)
    expect(bucketForTarget(4, 4)).toBe(4)
    expect(bucketForTarget(9, 4)).toBe(4)
  })

  it('scales linearly up to the target', () => {
    expect(bucketForTarget(1, 4)).toBe(1)
    expect(bucketForTarget(2, 4)).toBe(2)
    expect(bucketForTarget(3, 4)).toBe(3)
    expect(bucketForTarget(1, 8)).toBe(1)
    expect(bucketForTarget(1, 100)).toBe(1) // any progress is visible
  })
})

describe('levelFor', () => {
  it('uses the target when set, quantiles otherwise', () => {
    const t: Thresholds = [2, 4, 8]
    expect(levelFor(2, null, t)).toBe(2)
    expect(levelFor(2, 8, t)).toBe(1)
  })
})

describe('cellColor', () => {
  it('appends the alpha for each level', () => {
    expect(cellColor('#22c55e', 1)).toBe('#22c55e4d')
    expect(cellColor('#22c55e', 2)).toBe('#22c55e8c')
    expect(cellColor('#22c55e', 3)).toBe('#22c55ec7')
    expect(cellColor('#22c55e', 4)).toBe('#22c55eff')
  })
})
