import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useState } from 'react'
import type { Habit } from './data/types'
import { EmptyState } from './components/EmptyState'
import { HabitCard } from './components/HabitCard'
import { HabitDialog, type HabitDialogState } from './components/HabitDialog'
import { Header } from './components/Header'
import { SettingsDialog } from './components/SettingsDialog'
import { getHabits, getSetting, getYearBounds } from './data/repo'
import { useTheme } from './hooks/useTheme'
import { useToday } from './hooks/useToday'
import { nextUnusedPreset } from './lib/colors'
import { yearOf } from './lib/dates'

export default function App() {
  const today = useToday()
  const currentYear = yearOf(today)
  const [year, setYear] = useState(currentYear)
  const [dialog, setDialog] = useState<HabitDialogState>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { theme, isDark, setTheme } = useTheme()

  const habits = useLiveQuery(getHabits)
  const weekStart = useLiveQuery(() => getSetting('weekStart')) ?? 'mon'
  const bounds = useLiveQuery(getYearBounds)

  // One year below the earliest data stays reachable so history can be
  // backfilled — logging there extends the range another year back.
  const minYear = Math.min(bounds?.minYear ?? currentYear, currentYear) - 1
  const maxYear = Math.max(bounds?.maxYear ?? currentYear, currentYear)

  // Stable identity keeps memo(HabitCard) effective across entries writes.
  const openEdit = useCallback((habit: Habit) => setDialog({ mode: 'edit', habit }), [])

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header
        year={year}
        minYear={minYear}
        maxYear={maxYear}
        onYearChange={setYear}
        isDark={isDark}
        onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewHabit={() => setDialog({ mode: 'create' })}
      />

      <main className="mx-auto max-w-4xl px-4 py-6">
        {habits !== undefined &&
          (habits.length === 0 ? (
            <EmptyState onCreate={() => setDialog({ mode: 'create' })} />
          ) : (
            <div className="flex flex-col gap-4">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  year={year}
                  weekStart={weekStart}
                  today={today}
                  onEdit={openEdit}
                />
              ))}
            </div>
          ))}
      </main>

      <HabitDialog
        state={dialog}
        defaultColor={nextUnusedPreset((habits ?? []).map((h) => h.color))}
        onClose={() => setDialog(null)}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        weekStart={weekStart}
      />
    </div>
  )
}
