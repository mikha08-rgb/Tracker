import { memo, useEffect, useRef, useState } from 'react'
import { addDays, formatDate, yearOf, type ISODate } from '../lib/dates'
import { cellColor, levelFor, type Thresholds, type YearGrid } from '../lib/heatmap'

export interface DayInfo {
  count: number
  hasNote: boolean
}

export interface HeatmapProps {
  grid: YearGrid
  days: ReadonlyMap<string, DayInfo>
  color: string
  targetPerDay: number | null
  thresholds: Thresholds
  today: ISODate
  onSelectDay?: (date: ISODate, cell: HTMLButtonElement) => void
}

const CELL = 12
const GAP = 3
const PITCH = CELL + GAP
const GUTTER = 32

const EMPTY: DayInfo = { count: 0, hasNote: false }

const A_SUNDAY: ISODate = '2026-07-05'

function rowLabels(weekStart: 'mon' | 'sun'): (string | null)[] {
  return Array.from({ length: 7 }, (_, row) => {
    const weekday = weekStart === 'mon' ? (row + 1) % 7 : row
    // Label Mon/Wed/Fri like GitHub, whatever the week start.
    if (weekday !== 1 && weekday !== 3 && weekday !== 5) return null
    return formatDate(addDays(A_SUNDAY, weekday), { weekday: 'short' })
  })
}

export const Heatmap = memo(function Heatmap({
  grid,
  days,
  color,
  targetPerDay,
  thresholds,
  today,
  onSelectDay,
}: HeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ date: ISODate; left: number; top: number } | null>(null)

  // Bring today into view (it sits at the right edge on narrow screens).
  // Other years just start at January.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (yearOf(today) !== grid.year) {
      el.scrollLeft = 0
      return
    }
    const col = grid.weeks.findIndex((week) => week.includes(today))
    if (col === -1) return
    el.scrollLeft = Math.max(0, GUTTER + col * PITCH + CELL - el.clientWidth + 16)
  }, [grid, today])

  function showTooltip(e: React.MouseEvent) {
    const cell = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-date]')
    if (!cell) {
      setTooltip(null)
      return
    }
    const date = cell.dataset.date as ISODate
    const width = contentRef.current?.offsetWidth ?? Number.MAX_SAFE_INTEGER
    setTooltip({
      date,
      left: Math.min(Math.max(cell.offsetLeft + CELL / 2, 72), width - 72),
      top: cell.offsetTop,
    })
  }

  // Arrow keys walk the calendar: the grid is column-major, so a week
  // is one column over and a day is one row down.
  function handleKeyDown(e: React.KeyboardEvent) {
    const deltas: Record<string, number> = {
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
      ArrowDown: 1,
    }
    const delta = deltas[e.key]
    if (delta === undefined) return
    const cell = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-date]')
    if (!cell) return
    e.preventDefault()
    const target = addDays(cell.dataset.date as ISODate, delta)
    contentRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${target}"]`)?.focus()
  }

  const tooltipInfo = tooltip ? (days.get(tooltip.date) ?? EMPTY) : EMPTY

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <div
        ref={contentRef}
        className="relative flex w-max"
        onMouseOver={showTooltip}
        onMouseLeave={() => setTooltip(null)}
      >
        <div
          className="sticky left-0 z-10 bg-white dark:bg-zinc-900"
          style={{ width: GUTTER, minWidth: GUTTER }}
        >
          <div className="h-4" />
          <div className="grid" style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}>
            {rowLabels(grid.weekStart).map((label, row) => (
              <span key={row} className="text-[9px] leading-3 text-zinc-400 dark:text-zinc-500">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="relative h-4">
            {grid.monthLabels.map((m) => (
              <span
                key={m.weekIndex}
                className="absolute top-0 text-[10px] leading-3 text-zinc-400 dark:text-zinc-500"
                style={{ left: m.weekIndex * PITCH }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div
            className="grid grid-flow-col"
            onKeyDown={handleKeyDown}
            style={{
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridAutoColumns: CELL,
              gap: GAP,
            }}
          >
            {grid.weeks.map((week, w) =>
              week.map((date, row) => {
                if (date === null) return <span key={`pad-${w}-${row}`} />
                const info = days.get(date) ?? EMPTY
                const level = levelFor(info.count, targetPerDay, thresholds)
                const isToday = date === today
                const isFuture = date > today
                return (
                  <button
                    key={date}
                    type="button"
                    data-date={date}
                    tabIndex={isToday ? 0 : -1}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={isFuture}
                    onClick={onSelectDay ? (e) => onSelectDay(date, e.currentTarget) : undefined}
                    aria-label={`${formatDate(date)}: ${
                      info.count === 0 ? 'nothing logged' : `logged ${info.count}×`
                    }${info.hasNote ? ', has note' : ''}`}
                    className={[
                      'flex rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500',
                      level === 0 ? 'bg-zinc-200/70 dark:bg-zinc-800' : '',
                      isFuture ? 'opacity-30' : '',
                      isToday
                        ? 'outline-1 outline-offset-1 outline-zinc-500 dark:outline-zinc-400'
                        : '',
                    ].join(' ')}
                    style={
                      level > 0
                        ? { backgroundColor: cellColor(color, level as 1 | 2 | 3 | 4) }
                        : undefined
                    }
                  >
                    {info.hasNote && (
                      <span
                        className={`m-auto size-1 rounded-full ${
                          level >= 2 ? 'bg-white/90' : 'bg-zinc-500 dark:bg-zinc-400'
                        }`}
                      />
                    )}
                  </button>
                )
              }),
            )}
          </div>
        </div>

        {tooltip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] leading-4 text-zinc-100 shadow-md dark:bg-zinc-700"
            style={{ left: tooltip.left, top: tooltip.top - 4 }}
          >
            <span className="font-medium">
              {tooltipInfo.count === 0 ? 'Nothing' : `${tooltipInfo.count}×`}
            </span>{' '}
            on {formatDate(tooltip.date)}
            {tooltipInfo.hasNote ? ' · note' : ''}
          </div>
        )}
      </div>
    </div>
  )
})
