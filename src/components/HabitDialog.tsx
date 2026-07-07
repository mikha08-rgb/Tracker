import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { createHabit, deleteHabit, getEntriesForHabit, updateHabit } from '../data/repo'
import type { Habit } from '../data/types'
import { ColorSwatches } from './ColorSwatches'

export type HabitDialogState = { mode: 'create' } | { mode: 'edit'; habit: Habit } | null

interface HabitDialogProps {
  state: HabitDialogState
  /** Preselected color for a new habit (first swatch no other habit uses). */
  defaultColor: string
  onClose: () => void
}

export function HabitDialog({ state, defaultColor, onClose }: HabitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = state !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      className="m-auto w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {state && (
        <HabitForm
          key={state.mode === 'edit' ? state.habit.id : 'create'}
          habit={state.mode === 'edit' ? state.habit : null}
          defaultColor={defaultColor}
          onClose={onClose}
        />
      )}
    </dialog>
  )
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400'

const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400'

function HabitForm({
  habit,
  defaultColor,
  onClose,
}: {
  habit: Habit | null
  defaultColor: string
  onClose: () => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '')
  const [color, setColor] = useState(habit?.color ?? defaultColor)
  const [target, setTarget] = useState(habit?.targetPerDay?.toString() ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const entryCount = useLiveQuery(
    async () => (habit ? (await getEntriesForHabit(habit.id)).length : 0),
    [habit?.id],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTarget = Number.parseInt(target, 10)
    const fields = {
      name: name.trim(),
      emoji: emoji.trim() || null,
      color,
      targetPerDay: Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : null,
    }
    if (fields.name === '') return
    if (habit) {
      await updateHabit(habit.id, fields)
    } else {
      await createHabit(fields)
      // Best moment to ask for durable storage: a user gesture, right as
      // the first real data appears. No-op where unsupported or denied.
      void navigator.storage?.persist?.().catch(() => {})
    }
    onClose()
  }

  async function handleDelete() {
    if (!habit) return
    await deleteHabit(habit.id)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="p-5">
      <h2 className="text-base font-semibold">{habit ? 'Edit habit' : 'New habit'}</h2>

      <div className="mt-4 flex gap-3">
        <div className="grow">
          <label className={labelClass} htmlFor="habit-name">
            Name
          </label>
          <input
            id="habit-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Read, run, meditate…"
            required
            autoFocus
            maxLength={80}
          />
        </div>
        <div className="w-20">
          <label className={labelClass} htmlFor="habit-emoji">
            Emoji
          </label>
          <input
            id="habit-emoji"
            className={`${inputClass} text-center`}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🏃"
            maxLength={8}
          />
        </div>
      </div>

      <div className="mt-4">
        <span className={labelClass}>Color</span>
        <ColorSwatches value={color} onChange={setColor} />
      </div>

      <div className="mt-4">
        <label className={labelClass} htmlFor="habit-target">
          Daily target <span className="font-normal">(optional)</span>
        </label>
        <input
          id="habit-target"
          className={inputClass}
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="auto"
        />
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Cell colors fill up toward this number per day. Leave empty to auto-scale to your own
          history.
        </p>
      </div>

      {confirmingDelete && habit ? (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Delete “{habit.name}” and {entryCount ?? 0} logged {entryCount === 1 ? 'day' : 'days'}?
          </span>
          <div className="grow" />
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2">
          {habit && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete…
            </button>
          )}
          <div className="grow" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {habit ? 'Save' : 'Create'}
          </button>
        </div>
      )}
    </form>
  )
}
