import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { getEntriesForHabit, getEntriesForYear } from '../data/repo'
import type { Habit } from '../data/types'
import type { ISODate, WeekStart } from '../lib/dates'
import { buildYearGrid, computeThresholds } from '../lib/heatmap'
import { Heatmap, type DayInfo } from './Heatmap'
import { PencilIcon } from './icons'

interface HabitCardProps {
  habit: Habit
  year: number
  weekStart: WeekStart
  today: ISODate
  onEdit: (habit: Habit) => void
}

export function HabitCard({ habit, year, weekStart, today, onEdit }: HabitCardProps) {
  const entries = useLiveQuery(() => getEntriesForYear(habit.id, year), [habit.id, year])
  const history = useLiveQuery(() => getEntriesForHabit(habit.id), [habit.id])

  const grid = useMemo(() => buildYearGrid(year, weekStart), [year, weekStart])

  const days = useMemo(() => {
    const map = new Map<string, DayInfo>()
    for (const e of entries ?? []) {
      map.set(e.date, { count: e.count, hasNote: e.note !== '' })
    }
    return map
  }, [entries])

  const thresholds = useMemo(
    () => computeThresholds((history ?? []).map((e) => e.count).filter((c) => c > 0)),
    [history],
  )

  const yearTotal = useMemo(() => (entries ?? []).reduce((sum, e) => sum + e.count, 0), [entries])

  return (
    <section
      aria-label={habit.name}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-3 flex items-center gap-2.5">
        {habit.emoji ? (
          <span className="text-lg leading-none">{habit.emoji}</span>
        ) : (
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
        )}
        <h2 className="truncate text-sm font-semibold">{habit.name}</h2>
        <span className="shrink-0 text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
          {yearTotal} in {year}
        </span>
        <div className="grow" />
        <button
          type="button"
          onClick={() => onEdit(habit)}
          aria-label={`Edit ${habit.name}`}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <PencilIcon />
        </button>
      </div>

      <Heatmap
        grid={grid}
        days={days}
        color={habit.color}
        targetPerDay={habit.targetPerDay}
        thresholds={thresholds}
        today={today}
      />
    </section>
  )
}
