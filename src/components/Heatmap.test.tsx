import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildYearGrid, computeThresholds } from '../lib/heatmap'
import { Heatmap, type DayInfo } from './Heatmap'

function renderHeatmap(overrides: Partial<Parameters<typeof Heatmap>[0]> = {}) {
  const grid = buildYearGrid(2026, 'mon')
  const days = new Map<string, DayInfo>([
    ['2026-07-01', { count: 3, hasNote: false }],
    ['2026-07-02', { count: 1, hasNote: true }],
  ])
  return render(
    <Heatmap
      grid={grid}
      days={days}
      color="#22c55e"
      targetPerDay={null}
      thresholds={computeThresholds([3, 1])}
      today="2026-07-06"
      {...overrides}
    />,
  )
}

describe('Heatmap', () => {
  it('renders one button per day of the year', () => {
    renderHeatmap()
    expect(screen.getAllByRole('button')).toHaveLength(365)
  })

  it('describes logged days and notes in the accessible name', () => {
    renderHeatmap()
    expect(screen.getByRole('button', { name: 'Wed, Jul 1: logged 3×' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thu, Jul 2: logged 1×, has note' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Mon, Jul 6: nothing logged' })).toBeDefined()
  })

  it('colors logged cells with the habit color and leaves empty cells alone', () => {
    renderHeatmap()
    const logged = screen.getByRole('button', { name: /Jul 1:/ })
    const empty = screen.getByRole('button', { name: /Jul 6:/ })
    expect(logged.style.backgroundColor).not.toBe('')
    expect(empty.style.backgroundColor).toBe('')
  })

  it('disables future days', () => {
    renderHeatmap()
    const future = screen.getByRole('button', { name: /Dec 31:/ })
    expect(future).toHaveProperty('disabled', true)
  })

  it('only today is in the tab order', () => {
    renderHeatmap()
    const tabbable = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].getAttribute('data-date')).toBe('2026-07-06')
  })

  it('reports the clicked day', async () => {
    const onSelectDay = vi.fn()
    renderHeatmap({ onSelectDay })
    await userEvent.click(screen.getByRole('button', { name: /Jul 1:/ }))
    expect(onSelectDay).toHaveBeenCalledWith('2026-07-01', expect.anything())
  })
})
