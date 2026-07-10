import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HabitDialog } from './HabitDialog'

describe('HabitDialog backdrop', () => {
  it('closes only when the press starts and ends on the backdrop', () => {
    const onClose = vi.fn()
    render(<HabitDialog state={{ mode: 'create' }} defaultColor="#22c55e" onClose={onClose} />)
    const dialog = screen.getByRole('dialog')

    // A drag that starts in the form and releases outside dispatches its
    // click on the <dialog>; it must not discard the half-filled form.
    fireEvent.mouseDown(screen.getByLabelText('Name'))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
