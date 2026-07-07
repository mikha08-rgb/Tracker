import { useEffect, useRef } from 'react'
import { setSetting } from '../data/repo'
import type { WeekStart } from '../lib/dates'
import type { Theme } from '../hooks/useTheme'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  weekStart: WeekStart
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
]

const WEEK_STARTS: { value: WeekStart; label: string }[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'sun', label: 'Sunday' },
]

export function SettingsDialog({
  open,
  onClose,
  theme,
  onThemeChange,
  weekStart,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      className="m-auto w-[24rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="p-5">
        <h2 className="text-base font-semibold">Settings</h2>

        <SettingRow label="Theme">
          <Segmented options={THEMES} value={theme} onChange={onThemeChange} />
        </SettingRow>

        <SettingRow label="Weeks start on">
          <Segmented
            options={WEEK_STARTS}
            value={weekStart}
            onChange={(ws) => void setSetting('weekStart', ws)}
          />
        </SettingRow>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  )
}

export function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
