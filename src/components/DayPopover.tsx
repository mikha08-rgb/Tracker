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
  const boxRef = useRef<HTMLDivElement>(null)
  // Sheet-only: a drag that starts in the note textarea and releases on
  // the dimmed backdrop retargets its click to the backdrop, which would
  // dismiss mid-edit — same press-must-start-here rule as the dialogs.
  const pressedOnBackdrop = useRef(false)
  // null = loaded-but-no-row; undefined = still loading. The distinction
  // gates the note field: editing before the stored note arrives would
  // seed the draft from the empty placeholder and overwrite it.
  const entry = useLiveQuery(async () => (await getEntry(habit.id, date)) ?? null, [habit.id, date])
  const loaded = entry !== undefined
  const count = entry?.count ?? 0

  // Hand-rolled dialog, so it must do what <dialog> does for free: focus
  // moves in on open and returns to the opening cell on close.
  useEffect(() => {
    boxRef.current?.focus()
    return () => anchor.focus()
  }, [anchor])

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return
    const focusables = boxRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), textarea:not(:disabled)',
    )
    if (!focusables?.length) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === boxRef.current)
    ) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

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

  // Flush an unsaved draft when the popover closes — and on pagehide /
  // app-switch, since React runs no cleanup when the tab or PWA is killed.
  useEffect(() => {
    function flush() {
      if (pending.current) {
        clearTimeout(pending.current.timer)
        void setNote(habit.id, date, pending.current.value)
        pending.current = null
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
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
    const flip = rect.top < 250
    return {
      left,
      top: flip ? rect.bottom + window.scrollY + 8 : rect.top + window.scrollY - 8,
      flip,
    }
  }, [anchor, isSheet])

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            {habit.emoji ? `${habit.emoji} ` : ''}
            {habit.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {formatDate(date, { weekday: 'short', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-2 shrink-0 rounded-md p-3 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 sm:m-0 sm:p-1 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-5">
        <button
          type="button"
          // aria-disabled, not disabled: hard-disabling at 0 while this
          // button holds focus would kick focus to <body>, out of the trap.
          onClick={() => {
            if (count > 0) void adjustCount(habit.id, date, -1)
          }}
          aria-disabled={count === 0 || undefined}
          aria-label="Decrease count"
          className="flex size-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 hover:bg-zinc-100 aria-disabled:opacity-30 aria-disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
        disabled={!loaded}
        placeholder="Add a note…"
        rows={2}
        className="mt-4 w-full resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400"
      />
    </>
  )

  if (isSheet) {
    return createPortal(
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onMouseDown={(e) => {
          pressedOnBackdrop.current = e.target === e.currentTarget
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose()
        }}
      >
        <div
          ref={boxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${habit.name} on ${formatDate(date)}`}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={trapTab}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-zinc-200 bg-white p-5 pb-[max(2rem,env(safe-area-inset-bottom))] outline-none dark:border-zinc-800 dark:bg-zinc-900"
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
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${habit.name} on ${formatDate(date)}`}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={`absolute z-50 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg outline-none dark:border-zinc-700 dark:bg-zinc-900 ${
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
