import { useMemo } from 'react'
import { todayISO, yearOf } from '../lib/dates'
import { buildYearGrid, computeThresholds } from '../lib/heatmap'
import { Heatmap, type DayInfo } from './Heatmap'
import { PlusIcon } from './icons'

/** Deterministic PRNG so the demo mosaic looks the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface EmptyStateProps {
  onCreate: () => void
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  const today = todayISO()

  const { grid, days, thresholds } = useMemo(() => {
    const grid = buildYearGrid(yearOf(today), 'mon')
    const rand = mulberry32(42)
    const days = new Map<string, DayInfo>()
    for (const date of grid.weeks.flat()) {
      if (date === null || date > today) continue
      const r = rand()
      if (r < 0.35) continue
      days.set(date, { count: Math.ceil(r * 6), hasNote: false })
    }
    const thresholds = computeThresholds([...days.values()].map((d) => d.count))
    return { grid, days, thresholds }
  }, [today])

  return (
    <div className="mx-auto mt-10 max-w-xl text-center">
      <h2 className="text-xl font-semibold tracking-tight">Every day is a tile.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Log a habit each day and watch the year come together, one small square at a time. No
        account, no streaks, no cloud — your data never leaves this device.
      </p>

      <div className="pointer-events-none mt-8 select-none rounded-xl border border-zinc-200 bg-white p-4 opacity-80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Heatmap
          grid={grid}
          days={days}
          color="#22c55e"
          targetPerDay={null}
          thresholds={thresholds}
          today={today}
        />
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <PlusIcon />
        Create your first habit
      </button>
    </div>
  )
}
