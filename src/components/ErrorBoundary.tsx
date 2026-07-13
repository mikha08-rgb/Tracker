import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort catch: useLiveQuery rethrows querier errors during render,
 * and without a boundary a single failed query would unmount the whole
 * app. Data in IndexedDB is untouched — reloading recovers.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Your data is safe in this browser. Reloading usually fixes it.
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Reload
          </button>
        </div>
      </main>
    )
  }
}
