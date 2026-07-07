import { useEffect, useState } from 'react'
import { todayISO, type ISODate } from '../lib/dates'

/**
 * Today's local date as state. An installed PWA can stay open for days,
 * so the value re-checks every minute and whenever the tab becomes
 * visible — otherwise the "+ today" button would quietly log onto
 * yesterday after midnight.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const check = () => {
      setToday((prev) => {
        const now = todayISO()
        return now === prev ? prev : now
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check()
    }
    const interval = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return today
}
