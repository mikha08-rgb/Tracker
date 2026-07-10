import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { adjustCount, getEntry, setNote } from '../data/repo'
import type { Habit } from '../data/types'
import { DayPopover } from './DayPopover'

// Sheet mode: same body as the desktop popover, plus the dimmed backdrop
// whose dismissal guard is under test.
vi.mock('../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }))

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const habit: Habit = {
  id: 'h1',
  name: 'Read',
  emoji: null,
  color: '#22c55e',
  targetPerDay: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  sortOrder: 0,
}

function renderPopover(onClose = vi.fn()) {
  const anchor = document.createElement('button')
  document.body.appendChild(anchor)
  return render(<DayPopover habit={habit} date="2026-07-06" anchor={anchor} onClose={onClose} />)
}

async function findLoadedTextarea() {
  const textarea = await screen.findByPlaceholderText<HTMLTextAreaElement>('Add a note…')
  await waitFor(() => expect(textarea.disabled).toBe(false))
  return textarea
}

describe('DayPopover note field', () => {
  it('blocks editing until the stored note has loaded, then seeds it', async () => {
    await setNote('h1', '2026-07-06', 'saved')
    renderPopover()
    const textarea = screen.getByPlaceholderText<HTMLTextAreaElement>('Add a note…')
    // Editable before the entry query resolves would let a keystroke seed
    // the draft from the empty placeholder and overwrite the stored note.
    expect(textarea.disabled).toBe(true)
    await waitFor(() => expect(textarea.disabled).toBe(false))
    expect(textarea.value).toBe('saved')
  })

  it('flushes a pending draft on pagehide, ahead of the autosave debounce', async () => {
    renderPopover()
    const textarea = await findLoadedTextarea()
    await userEvent.type(textarea, 'draft')
    window.dispatchEvent(new Event('pagehide'))
    // Well inside the 400ms debounce: only the pagehide flush can have written.
    await waitFor(async () => expect((await getEntry('h1', '2026-07-06'))?.note).toBe('draft'), {
      timeout: 300,
    })
  })

  it('flushes a pending draft when the app is backgrounded', async () => {
    renderPopover()
    const textarea = await findLoadedTextarea()
    await userEvent.type(textarea, 'bg')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    Reflect.deleteProperty(document, 'visibilityState')
    await waitFor(async () => expect((await getEntry('h1', '2026-07-06'))?.note).toBe('bg'), {
      timeout: 300,
    })
  })
})

describe('DayPopover count stepper', () => {
  it('keeps focus on the minus button when the count reaches zero', async () => {
    await adjustCount('h1', '2026-07-06', 1)
    renderPopover()
    const minus = screen.getByRole('button', { name: 'Decrease count' })
    await waitFor(() => expect(minus.getAttribute('aria-disabled')).toBeNull())

    await userEvent.click(minus)

    // Hard-disabling here would kick focus to <body>, out of the trap.
    await waitFor(() => expect(minus.getAttribute('aria-disabled')).toBe('true'))
    expect(document.activeElement).toBe(minus)

    // Inert at zero: another activation must not write anything.
    await userEvent.click(minus)
    expect(await getEntry('h1', '2026-07-06')).toBeUndefined()
  })
})

describe('DayPopover sheet backdrop', () => {
  it('dismisses only when the press starts and ends on the backdrop', async () => {
    const onClose = vi.fn()
    renderPopover(onClose)
    const textarea = await findLoadedTextarea()
    const backdrop = document.querySelector('[class*="bg-black"]')!

    // A drag from the note that releases on the backdrop retargets its
    // click to the backdrop; it must not dismiss the sheet mid-edit.
    fireEvent.mouseDown(textarea)
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
