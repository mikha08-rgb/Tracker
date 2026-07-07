import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Must stay in sync with the pre-paint script in index.html, which applies
// the saved theme before React loads so the page never flashes.
const STORAGE_KEY = 'tessera-theme'

const LIGHT_BG = '#fafafa' // zinc-50
const DARK_BG = '#09090b' // zinc-950

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [isDark, setIsDark] = useState(
    () => theme === 'dark' || (theme === 'system' && systemPrefersDark()),
  )

  useEffect(() => {
    const mql = matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches)
      document.documentElement.classList.toggle('dark', dark)
      setIsDark(dark)

      // Keep the browser chrome color in sync. In system mode the two
      // media-scoped metas do the work; a forced theme overrides both.
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        if (theme === 'system') {
          meta.content = meta.media.includes('dark') ? DARK_BG : LIGHT_BG
        } else {
          meta.content = theme === 'dark' ? DARK_BG : LIGHT_BG
        }
      }
    }

    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])

  function setTheme(next: Theme) {
    try {
      if (next === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, next)
      }
    } catch {
      // Storage unavailable — the theme still applies for this session.
    }
    setThemeState(next)
  }

  return { theme, isDark, setTheme }
}
