import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LogoIcon,
  MoonIcon,
  PlusIcon,
  SlidersIcon,
  SunIcon,
} from './icons'

interface HeaderProps {
  year: number
  minYear: number
  maxYear: number
  onYearChange: (year: number) => void
  isDark: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onNewHabit: () => void
}

const iconButton =
  'flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

export function Header({
  year,
  minYear,
  maxYear,
  onYearChange,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onNewHabit,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-1 px-4">
        <LogoIcon />
        <span className="ml-2 hidden text-base font-semibold tracking-tight sm:inline">
          Tessera
        </span>

        <div className="grow" />

        <nav aria-label="Year" className="flex items-center">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            disabled={year <= minYear}
            aria-label="Previous year"
            className={iconButton}
          >
            <ChevronLeftIcon />
          </button>
          <span className="min-w-12 text-center text-sm font-medium tabular-nums">{year}</span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            disabled={year >= maxYear}
            aria-label="Next year"
            className={iconButton}
          >
            <ChevronRightIcon />
          </button>
        </nav>

        <div className="grow" />

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className={iconButton}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button type="button" onClick={onOpenSettings} aria-label="Settings" className={iconButton}>
          <SlidersIcon />
        </button>
        <button
          type="button"
          onClick={onNewHabit}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlusIcon />
          <span className="hidden sm:inline">New habit</span>
        </button>
      </div>
    </header>
  )
}
