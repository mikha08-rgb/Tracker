import { LogoIcon, PlusIcon } from './icons'

interface HeaderProps {
  onNewHabit: () => void
}

export function Header({ onNewHabit }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <LogoIcon />
        <span className="text-base font-semibold tracking-tight">Tessera</span>
        <div className="grow" />
        <button
          type="button"
          onClick={onNewHabit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <PlusIcon />
          <span className="hidden sm:inline">New habit</span>
        </button>
      </div>
    </header>
  )
}
