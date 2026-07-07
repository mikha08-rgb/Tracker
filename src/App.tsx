import { useMemo } from 'react'
import { Heatmap, type DayInfo } from './components/Heatmap'
import { todayISO, yearOf } from './lib/dates'
import { buildYearGrid, computeThresholds } from './lib/heatmap'

// Temporary M3 harness: renders the heatmap from deterministic fake data.
// Becomes the empty-state demo once real habits exist.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function App() {
  const today = todayISO()
  const year = yearOf(today)

  const { grid, days, thresholds } = useMemo(() => {
    const grid = buildYearGrid(year, 'mon')
    const rand = mulberry32(42)
    const days = new Map<string, DayInfo>()
    for (const date of grid.weeks.flat()) {
      if (date === null || date > today) continue
      const r = rand()
      if (r < 0.35) continue
      days.set(date, { count: Math.ceil(r * 6), hasNote: rand() < 0.08 })
    }
    const thresholds = computeThresholds([...days.values()].map((d) => d.count))
    return { grid, days, thresholds }
  }, [year, today])

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight">Tessera</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Heatmap preview with demo data.
        </p>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Heatmap
            grid={grid}
            days={days}
            color="#22c55e"
            targetPerDay={null}
            thresholds={thresholds}
            today={today}
            onSelectDay={(date) => console.log('selected', date)}
          />
        </div>
      </div>
    </main>
  )
}
