import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { adjustCount, getEntry, setNote } from '../data/repo'
import type { Habit } from '../data/types'
import { formatDate, type ISODate } from '../lib/dates'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { CloseIcon, MinusIcon, PlusIcon } from './icons'

interface DayPopoverProps {
  habit: Habit
  date: ISODate
  /** The heatmap cell that opened this popover (desktop anchoring). */
  anchor: HTMLElement
  onClose: () => void
}

const POPOVER_WIDTH = 272

export function DayPopover({ habit, date, anchor, onClose }: DayPopoverProps) {
  const isSheet = useMediaQuery('(max-width: 639px)')
  const entry = useLiveQuery(() => getEntry(habit.id, date), [habit.id, date])
  const count = entry?.count ?? 0

  // The note is edited locally and autosaved (debounced); the entry's
  // stored note only seeds the field, so a slow liveQuery can't clobber
  // what the user is typing.
  const [draft, setDraft] = useState<string | null>(null)
  const note = draft ?? entry?.note ?? ''
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; value: string } | null>(null)

  function handleNoteChange(value: string) {
    setDraft(value)
    if (pending.current) clearTimeout(pending.current.timer)
    pending.current = {
      value,
      timer: setTimeout(() => {
        pending.current = null
        void setNote(habit.id, date, value)
      }, 400),
    }
  }

  // Flush an unsaved draft when the popover closes.
  useEffect(() => {
    return () => {
      if (pending.current) {
        clearTimeout(pending.current.timer)
        void setNote(habit.id, date, pending.current.value)
      }
    }
  }, [habit.id, date])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const position = useMemo(() => {
    if (isSheet) return null
    const rect = anchor.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2 + window.scrollX
    const margin = POPOVER_WIDTH / 2 + 8
    const left = Math.min(Math.max(centerX, margin), window.innerWidth - margin + window.scrollX)
    // Prefer above the cell; flip below when it would leave the viewport.
    const flip = rect.top < 230
    return {
      left,
      top: flip ? rect.bottom + window.scrollY + 8 : rect.top + window.scrollY - 8,
      flip,
    }
  }, [anchor, isSheet])

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">
          {formatDate(date, { weekday: 'short', month: 'long', day: 'numeric' })}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => void adjustCount(habit.id, date, -1)}
          disabled={count === 0}
          aria-label="Decrease count"
          className="flex size-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <MinusIcon />
        </button>
        <span
          aria-live="polite"
          className="min-w-10 text-center text-2xl font-semibold tabular-nums"
        >
          {count}
        </span>
        <button
          type="button"
          onClick={() => void adjustCount(habit.id, date, 1)}
          aria-label="Increase count"
          className="flex size-10 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95"
          style={{ backgroundColor: habit.color }}
        >
          <PlusIcon />
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="mt-4 w-full resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400"
      />
    </>
  )

  if (isSheet) {
    return createPortal(
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
        <div
          role="dialog"
          aria-label={`${habit.name} on ${formatDate(date)}`}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-zinc-200 bg-white p-5 pb-8 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {body}
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <>
      {/* Click-catcher: closing on click (not mousedown) keeps the release
          from falling through to whatever sits under the pointer. */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="dialog"
        aria-label={`${habit.name} on ${formatDate(date)}`}
        className={`absolute z-50 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 ${
          position?.flip ? '' : '-translate-y-full'
        }`}
        style={{ left: position?.left, top: position?.top, width: POPOVER_WIDTH }}
      >
        {body}
      </div>
    </>,
    document.body,
  )
}
