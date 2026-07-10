import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { applyImport, getSetting, getSnapshot, setSetting, wipeAll } from '../data/repo'
import type { Theme } from '../hooks/useTheme'
import { todayISO, type WeekStart } from '../lib/dates'
import { serialize, validateImport, type ImportResult } from '../lib/export'
import { DownloadIcon, UploadIcon } from './icons'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  weekStart: WeekStart
}

export function SettingsDialog({
  open,
  onClose,
  theme,
  onThemeChange,
  weekStart,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Same backdrop rule as HabitDialog: only close when the press also
  // started on the backdrop, so drags out of inputs can't discard state.
  const pressedOnBackdrop = useRef(false)

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
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === dialogRef.current
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && pressedOnBackdrop.current) onClose()
      }}
      className="m-auto w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {open && (
        <SettingsBody
          onClose={onClose}
          theme={theme}
          onThemeChange={onThemeChange}
          weekStart={weekStart}
        />
      )}
    </dialog>
  )
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

type ImportState =
  | { kind: 'preview'; fileName: string; result: ImportResult }
  | { kind: 'error'; fileName: string; error: string }
  | null

function SettingsBody({
  onClose,
  theme,
  onThemeChange,
  weekStart,
}: Omit<SettingsDialogProps, 'open'>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importState, setImportState] = useState<ImportState>(null)
  const [confirmingWipe, setConfirmingWipe] = useState(false)
  const [storage, setStorage] = useState<{ persisted: boolean; usage: number | null } | null>(null)
  const lastExportAt = useLiveQuery(() => getSetting('lastExportAt'))

  useEffect(() => {
    void refreshStorage(setStorage)
  }, [])

  async function handleExport() {
    const snapshot = await getSnapshot()
    const file = serialize(snapshot, theme, new Date().toISOString())
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tessera-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    await setSetting('lastExportAt', new Date().toISOString())
  }

  async function handleFile(file: File) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setImportState({ kind: 'error', fileName: file.name, error: 'the file is not valid JSON' })
      return
    }
    const result = validateImport(parsed)
    setImportState(
      'error' in result
        ? { kind: 'error', fileName: file.name, error: result.error }
        : { kind: 'preview', fileName: file.name, result },
    )
  }

  async function confirmImport() {
    if (importState?.kind !== 'preview') return
    await applyImport(importState.result.snapshot, importState.result.file.exportedAt)
    const importedTheme = importState.result.file.settings.theme
    if (importedTheme) onThemeChange(importedTheme)
    setImportState(null)
  }

  return (
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

      <h3 className="mt-6 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
        Your data
      </h3>

      <SettingRow label="Backup">
        <div className="flex gap-2">
          <button type="button" onClick={() => void handleExport()} className={secondaryButton}>
            <DownloadIcon />
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={secondaryButton}
          >
            <UploadIcon />
            Import…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </SettingRow>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {lastExportAt
          ? `Last export: ${relativeDays(lastExportAt)}`
          : 'No export yet — backups are plain JSON files.'}
      </p>

      {importState?.kind === 'error' && (
        <Panel tone="error">
          <p className="text-sm">
            <span className="font-medium">Can’t import {importState.fileName}</span> —{' '}
            {importState.error}. Nothing was changed.
          </p>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => setImportState(null)} className={secondaryButton}>
              OK
            </button>
          </div>
        </Panel>
      )}

      {importState?.kind === 'preview' && (
        <Panel tone="info">
          <p className="text-sm">
            <span className="font-medium">{importState.fileName}</span>:{' '}
            {importState.result.file.habits.length} habits, {importState.result.file.entries.length}{' '}
            logged days
            {importState.result.file.exportedAt
              ? `, exported ${relativeDays(importState.result.file.exportedAt)}`
              : ''}
            . <span className="font-medium">This replaces everything currently in Tessera.</span>
          </p>
          {importState.result.warnings.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc text-xs text-amber-600 dark:text-amber-400">
              {importState.result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="mt-2.5 flex justify-end gap-2">
            <button type="button" onClick={() => setImportState(null)} className={secondaryButton}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmImport()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Replace my data
            </button>
          </div>
        </Panel>
      )}

      <SettingRow label="Storage">
        {storage === null ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">unknown</span>
        ) : storage.persisted ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            persistent{storage.usage !== null ? ` · ${formatBytes(storage.usage)}` : ''}
          </span>
        ) : (
          <button
            type="button"
            onClick={() =>
              void navigator.storage
                ?.persist()
                .then(() => refreshStorage(setStorage))
                .catch(() => {})
            }
            className={secondaryButton}
            title="Ask the browser to never evict Tessera's data"
          >
            best-effort — make persistent
          </button>
        )}
      </SettingRow>

      <div className="mt-6 flex items-center gap-2">
        {confirmingWipe ? (
          <>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Erase every habit and log?{' '}
              {lastExportAt
                ? `Last export: ${relativeDays(lastExportAt)}.`
                : 'You’ve never exported a backup.'}
            </span>
            <div className="grow" />
            <button
              type="button"
              onClick={() => setConfirmingWipe(false)}
              className={secondaryButton}
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => {
                void wipeAll()
                setConfirmingWipe(false)
              }}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Erase all data
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmingWipe(true)}
              className="rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Erase all data…
            </button>
            <div className="grow" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const secondaryButton =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'

async function refreshStorage(
  set: (s: { persisted: boolean; usage: number | null } | null) => void,
) {
  if (!('storage' in navigator) || !navigator.storage?.persisted) {
    set(null)
    return
  }
  try {
    const persisted = await navigator.storage.persisted()
    let usage: number | null = null
    try {
      usage = (await navigator.storage.estimate()).usage ?? null
    } catch {
      // estimate() unsupported — persistence status alone is fine.
    }
    set({ persisted, usage })
  } catch {
    set(null)
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function relativeDays(isoDateTime: string): string {
  const days = Math.round((Date.now() - new Date(isoDateTime).getTime()) / 86_400_000)
  // validateImport drops unparseable dates, but this runs during render —
  // never let a stray stored value reach format(), which throws on NaN.
  if (!Number.isFinite(days)) return 'unknown'
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-days, 'day')
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
      {children}
    </div>
  )
}

function Panel({ tone, children }: { tone: 'info' | 'error'; children: React.ReactNode }) {
  return (
    <div
      className={`mt-3 rounded-lg border p-3 ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60'
      }`}
    >
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
