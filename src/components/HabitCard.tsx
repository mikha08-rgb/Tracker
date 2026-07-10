import { useLiveQuery } from 'dexie-react-hooks'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
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

// memo matters here: an entries write anywhere re-renders App (the year
// bounds re-emit), and without it every card would rebuild its ~366-cell
// grid. All props are stable across unrelated writes.
export const HabitCard = memo(function HabitCard({
  habit,
  year,
  weekStart,
  today,
  onEdit,
}: HabitCardProps) {
  const [selected, setSelected] = useState<{ date: ISODate; anchor: HTMLElement } | null>(null)
  // Screen-reader echo of card-button logs; aria-label changes alone are silent.
  const [announcement, setAnnouncement] = useState('')
  const lastAnnounced = useRef('')
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

  // Stable identity so Heatmap's memo isn't defeated by a fresh closure.
  const handleSelectDay = useCallback(
    (date: ISODate, anchor: HTMLElement) => setSelected({ date, anchor }),
    [],
  )
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
            // Announce the count the write actually produced — todayCount
            // lags the database by one liveQuery emit on rapid taps.
            void adjustCount(habit.id, today, 1).then((count) => {
              // aria-live fires only when the text mutates; re-logging after
              // an undo recomputes the same string, so nudge it apart
              // invisibly.
              let message = `${habit.name}: ${count} logged today`
              if (message === lastAnnounced.current) message += '​'
              lastAnnounced.current = message
              setAnnouncement(message)
            })
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
          {/* A check against a daily target would overstate one tap — the
              count is the honest state for target habits. */}
          {todayCount === 0 ? (
            <PlusIcon />
          ) : todayCount === 1 && habit.targetPerDay === null ? (
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
        onSelectDay={handleSelectDay}
      />

      {selected && (
        <DayPopover
          // Keyed by date so a date change always remounts: draft note
          // state must never carry over from one day to another.
          key={selected.date}
          habit={habit}
          date={selected.date}
          anchor={selected.anchor}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
})
