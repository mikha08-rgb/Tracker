import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { EmptyState } from './components/EmptyState'
import { HabitCard } from './components/HabitCard'
import { HabitDialog, type HabitDialogState } from './components/HabitDialog'
import { Header } from './components/Header'
import { getHabits, getSetting } from './data/repo'
import { todayISO, yearOf } from './lib/dates'

export default function App() {
  const today = todayISO()
  const [year] = useState(() => yearOf(today))
  const [dialog, setDialog] = useState<HabitDialogState>(null)

  const habits = useLiveQuery(getHabits)
  const weekStart = useLiveQuery(() => getSetting('weekStart')) ?? 'mon'

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header onNewHabit={() => setDialog({ mode: 'create' })} />

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
                  onEdit={(h) => setDialog({ mode: 'edit', habit: h })}
                />
              ))}
            </div>
          ))}
      </main>

      <HabitDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}
