import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  dayOfWeek,
  formatDate,
  fromEpochDay,
  isValidISODate,
  monthOf,
  startOfWeek,
  toEpochDay,
  toISODate,
  todayISO,
  yearOf,
  type ISODate,
} from './dates'

// These tests must pass in ANY host timezone — CI runs them under
// TZ=UTC, TZ=America/New_York, and TZ=Pacific/Kiritimati (UTC+14).

describe('toISODate', () => {
  it('uses local date parts, not UTC', () => {
    // 23:30 local on Jul 6 — in most timezones the UTC date differs,
    // but the local calendar date must win.
    expect(toISODate(new Date(2026, 6, 6, 23, 30))).toBe('2026-07-06')
    expect(toISODate(new Date(2026, 0, 1, 0, 0, 1))).toBe('2026-01-01')
    expect(toISODate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31')
  })

  it('zero-pads months and days', () => {
    expect(toISODate(new Date(2026, 2, 5))).toBe('2026-03-05')
  })
})

describe('todayISO', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the local calendar date even moments before/after midnight', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date(2026, 6, 6, 23, 59, 59))
    expect(todayISO()).toBe('2026-07-06')

    vi.setSystemTime(new Date(2026, 6, 7, 0, 0, 1))
    expect(todayISO()).toBe('2026-07-07')
  })
})

describe('isValidISODate', () => {
  it('accepts real dates', () => {
    expect(isValidISODate('2026-07-06')).toBe(true)
    expect(isValidISODate('2028-02-29')).toBe(true) // leap year
    expect(isValidISODate('1999-12-31')).toBe(true)
  })

  it('rejects impossible dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2027-02-29')).toBe(false) // not a leap year
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('2026-00-10')).toBe(false)
    expect(isValidISODate('2026-01-32')).toBe(false)
  })

  it('rejects malformed strings', () => {
    expect(isValidISODate('')).toBe(false)
    expect(isValidISODate('2026-1-1')).toBe(false)
    expect(isValidISODate('20260706')).toBe(false)
    expect(isValidISODate('2026-07-06T00:00:00Z')).toBe(false)
    expect(isValidISODate('not a date')).toBe(false)
  })
})

describe('epoch days', () => {
  it('day 0 is 1970-01-01', () => {
    expect(toEpochDay('1970-01-01')).toBe(0)
    expect(fromEpochDay(0)).toBe('1970-01-01')
  })

  it('round-trips across a wide range', () => {
    const dates: ISODate[] = ['1970-01-01', '1999-12-31', '2000-02-29', '2026-07-06', '2100-01-01']
    for (const d of dates) {
      expect(fromEpochDay(toEpochDay(d))).toBe(d)
    }
  })

  it('round-trips every day of a leap year and a regular year', () => {
    for (const year of [2027, 2028]) {
      let d: ISODate = `${year}-01-01` as ISODate
      while (yearOf(d) === year) {
        expect(fromEpochDay(toEpochDay(d))).toBe(d)
        d = addDays(d, 1)
      }
      expect(d).toBe(`${year + 1}-01-01`)
    }
  })
})

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-02-01', -1)).toBe('2026-01-31')
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01')
  })

  it('crosses year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('is unaffected by DST transitions', () => {
    // US spring-forward (Mar 8 2026) and fall-back (Nov 1 2026): with
    // millisecond math these days are 23/25 hours long and naive code
    // lands on the wrong date.
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
  })

  it('handles zero and large offsets', () => {
    expect(addDays('2026-07-06', 0)).toBe('2026-07-06')
    expect(addDays('2026-07-06', 365)).toBe('2027-07-06')
    expect(addDays('2026-07-06', -365)).toBe('2025-07-06')
  })
})

describe('dayOfWeek', () => {
  it('matches known weekdays', () => {
    expect(dayOfWeek('1970-01-01')).toBe(4) // Thursday
    expect(dayOfWeek('2026-07-06')).toBe(1) // Monday
    expect(dayOfWeek('2026-07-05')).toBe(0) // Sunday
    expect(dayOfWeek('2026-07-11')).toBe(6) // Saturday
    expect(dayOfWeek('2026-01-01')).toBe(4) // Thursday
  })

  it('works before 1970', () => {
    expect(dayOfWeek('1969-12-31')).toBe(3) // Wednesday
    expect(dayOfWeek('1969-12-28')).toBe(0) // Sunday
  })
})

describe('startOfWeek', () => {
  it('snaps to Monday when weeks start on Monday', () => {
    expect(startOfWeek('2026-07-06', 'mon')).toBe('2026-07-06') // Monday stays
    expect(startOfWeek('2026-07-08', 'mon')).toBe('2026-07-06') // Wednesday
    expect(startOfWeek('2026-07-12', 'mon')).toBe('2026-07-06') // Sunday belongs to previous Monday
  })

  it('snaps to Sunday when weeks start on Sunday', () => {
    expect(startOfWeek('2026-07-05', 'sun')).toBe('2026-07-05') // Sunday stays
    expect(startOfWeek('2026-07-06', 'sun')).toBe('2026-07-05') // Monday
    expect(startOfWeek('2026-07-11', 'sun')).toBe('2026-07-05') // Saturday
  })
})

describe('yearOf / monthOf', () => {
  it('extracts numeric parts', () => {
    expect(yearOf('2026-07-06')).toBe(2026)
    expect(monthOf('2026-07-06')).toBe(7)
    expect(monthOf('2026-12-31')).toBe(12)
  })
})

describe('formatDate', () => {
  it('renders the written calendar date in any host timezone', () => {
    expect(
      formatDate('2026-07-06', { weekday: 'short', month: 'short', day: 'numeric' }, 'en-US'),
    ).toBe('Mon, Jul 6')
    expect(formatDate('2026-01-01', { month: 'short' }, 'en-US')).toBe('Jan')
  })
})

describe('string ordering', () => {
  it('sorts chronologically', () => {
    const shuffled: ISODate[] = ['2026-02-01', '2025-12-31', '2026-01-15', '2026-01-02']
    expect([...shuffled].sort()).toEqual(['2025-12-31', '2026-01-02', '2026-01-15', '2026-02-01'])
  })
})
