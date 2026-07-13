import { describe, expect, it } from 'vitest'
import { nextUnusedPreset, PRESETS } from './colors'

describe('nextUnusedPreset', () => {
  it('returns the first preset when nothing is used', () => {
    expect(nextUnusedPreset([])).toBe(PRESETS[0])
  })

  it('skips presets already used by habits', () => {
    expect(nextUnusedPreset([PRESETS[0], PRESETS[1]])).toBe(PRESETS[2])
  })

  it('compares colors case-insensitively', () => {
    expect(nextUnusedPreset([PRESETS[0].toUpperCase()])).toBe(PRESETS[1])
  })

  it('ignores custom colors that are not presets', () => {
    expect(nextUnusedPreset(['#123456'])).toBe(PRESETS[0])
  })

  it('cycles when every preset is taken', () => {
    expect(nextUnusedPreset([...PRESETS])).toBe(PRESETS[0])
    expect(nextUnusedPreset([...PRESETS, '#123456'])).toBe(PRESETS[1])
  })
})
