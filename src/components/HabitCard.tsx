import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { adjustCount, getEntriesForHabit, getEntriesForYear } from '../data/repo'
import type { Habit } from '../data/types'
import { yearOf, type ISODate, type WeekStart } from '../lib/dates'
import { buildYearGrid, computeThresholds } from '../lib/heatmap'
import { DayPopover } from './DayPopover'
import { Heatmap, type DayInfo } from './Heatmap'
import { CheckIcon, PencilIcon, PlusIcon } from './icons'

interface HabitCardProps {
  habit: Habit
  year: number
  weekStart: WeekStart
  today: ISODate
  onEdit: (habit: Habit) => void
}

export function HabitCard({ habit, year, weekStart, today, onEdit }: HabitCardProps) {
  const [selected, setSelected] = useState<{ date: ISODate; anchor: HTMLElement } | null>(null)
  // Screen-reader echo of card-button logs; aria-label changes alone are silent.
  const [announcement, setAnnouncement] = useState('')
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

  const todayCount = useMemo(
    () => (history ?? []).find((e) => e.date === today)?.count ?? 0,
    [history, today],
  )
  const currentYear = yearOf(today)
  const isCurrentYear = year === currentYear
  const logLabel =
    todayCount > 0
      ? `Log ${habit.name} again today (${todayCount} so far)`
      : `Log ${habit.name} today`

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
        <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
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
        <button
          type="button"
          onClick={() => {
            void adjustCount(habit.id, today, 1)
            setAnnouncement(`${habit.name}: ${todayCount + 1} logged today`)
          }}
          disabled={!isCurrentYear}
          aria-label={isCurrentYear ? logLabel : `${logLabel} — today is in ${currentYear}`}
          title={
            !isCurrentYear
              ? `Today is in ${currentYear}`
              : todayCount > 0
                ? `${todayCount} logged today — add another`
                : 'Log today'
          }
          className="flex size-10 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:hover:brightness-100 disabled:active:scale-100 sm:size-8"
          style={{ backgroundColor: habit.color }}
        >
          {todayCount === 0 ? (
            <PlusIcon />
          ) : todayCount === 1 ? (
            <CheckIcon />
          ) : (
            <span className="text-sm font-semibold tabular-nums">{todayCount}</span>
          )}
        </button>
        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>

      <Heatmap
        grid={grid}
        days={days}
        color={habit.color}
        targetPerDay={habit.targetPerDay}
        thresholds={thresholds}
        today={today}
        onSelectDay={(date, anchor) => setSelected({ date, anchor })}
      />

      {selected && (
        <DayPopover
          habit={habit}
          date={selected.date}
          anchor={selected.anchor}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
