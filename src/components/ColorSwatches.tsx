import { PRESET_NAMES, PRESETS } from '../lib/colors'

interface ColorSwatchesProps {
  value: string
  onChange: (color: string) => void
}

export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  const isCustom = !PRESETS.includes(value)
  const selectedRing =
    'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-zinc-900'

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {PRESETS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={PRESET_NAMES[color]}
          title={PRESET_NAMES[color]}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={`size-7 rounded-full transition-transform hover:scale-110 ${
            value === color ? selectedRing : ''
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
      <label
        className={`relative size-7 cursor-pointer rounded-full transition-transform hover:scale-110 ${
          isCustom ? selectedRing : ''
        }`}
        style={
          isCustom
            ? { backgroundColor: value }
            : { background: 'conic-gradient(#f43f5e, #f59e0b, #22c55e, #0ea5e9, #8b5cf6, #f43f5e)' }
        }
        title="Custom color"
      >
        <input
          type="color"
          aria-label="Custom color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
