'use client'

import { HARDWARE_TYPE_CONFIG, HARDWARE_TYPE_ORDER } from '@/lib/receivingStock/config'
import type { HardwareType } from '@/lib/receivingStock/types'

const TILE_ICONS: Record<HardwareType, string> = {
  laptop: '💻',
  desktop: '🖥️',
  monitor: '📺',
  phone: '📱',
  keyboard: '⌨️',
  mouse: '🖱️',
  headset: '🎧',
  dock: '🔌',
}

export default function HardwareTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: HardwareType | null
  onChange: (t: HardwareType) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {HARDWARE_TYPE_ORDER.map((key) => {
        const cfg = HARDWARE_TYPE_CONFIG[key]
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 min-h-[5.5rem] transition-colors text-center',
              selected
                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
            aria-pressed={selected}
          >
            <span className="text-2xl" aria-hidden>
              {TILE_ICONS[key]}
            </span>
            <span className="text-sm font-medium leading-tight">{cfg.tileLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
