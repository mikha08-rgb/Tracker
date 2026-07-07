import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { adjustCount } from '../data/repo'
import type { Habit } from '../data/types'
import { HabitCard } from './HabitCard'

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

function renderCard(overrides: Partial<Parameters<typeof HabitCard>[0]> = {}) {
  return render(
    <HabitCard
      habit={habit}
      year={2026}
      weekStart="mon"
      today="2026-07-06"
      onEdit={vi.fn()}
      {...overrides}
    />,
  )
}

describe('HabitCard today button', () => {
  it('offers to log today when nothing is logged yet', async () => {
    renderCard()
    const button = await screen.findByRole('button', { name: 'Log Read today' })
    expect(button).toHaveProperty('disabled', false)
  })

  it('reflects a logged day and keeps counting on further taps', async () => {
    renderCard()
    await userEvent.click(await screen.findByRole('button', { name: 'Log Read today' }))
    const logged = await screen.findByRole('button', { name: 'Log Read again today (1 so far)' })
    await userEvent.click(logged)
    const twice = await screen.findByRole('button', { name: 'Log Read again today (2 so far)' })
    expect(twice.textContent).toBe('2')
  })

  it('shows the count even while browsing another year', async () => {
    await adjustCount('h1', '2026-07-06', 1)
    renderCard({ year: 2025 })
    await screen.findByRole('button', {
      name: 'Log Read again today (1 so far) — today is in 2026',
    })
  })

  it('is disabled when the viewed year is not the current one, and says why', async () => {
    renderCard({ year: 2025 })
    const button = await screen.findByRole('button', {
      name: 'Log Read today — today is in 2026',
    })
    expect(button).toHaveProperty('disabled', true)
  })

  it('announces card-button logs for screen readers', async () => {
    const { container } = renderCard()
    await userEvent.click(await screen.findByRole('button', { name: 'Log Read today' }))
    const live = container.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toBe('Read: 1 logged today')
  })
})
