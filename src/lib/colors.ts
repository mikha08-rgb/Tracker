/**
 * The curated habit-color palette shown as swatches in the habit dialog,
 * with human names for the swatches' accessible labels.
 */
export const PRESET_NAMES: Record<string, string> = {
  '#22c55e': 'Green',
  '#14b8a6': 'Teal',
  '#0ea5e9': 'Sky',
  '#3b82f6': 'Blue',
  '#8b5cf6': 'Violet',
  '#ec4899': 'Pink',
  '#f43f5e': 'Rose',
  '#f97316': 'Orange',
  '#f59e0b': 'Amber',
  '#84cc16': 'Lime',
}

export const PRESETS = Object.keys(PRESET_NAMES)

/**
 * The first preset no existing habit uses — so new habits start visually
 * distinct without the user thinking about color. Cycles when all are taken.
 */
export function nextUnusedPreset(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()))
  return PRESETS.find((c) => !used.has(c)) ?? PRESETS[usedColors.length % PRESETS.length]
}
