import { HARDWARE_TYPE_CONFIG } from './config'
import type { HardwareType } from './types'

export function getNextFocusableField(args: {
  hardwareType: HardwareType
  rowIndex: number
  field: 'serial' | 'imei'
  rowCount: number
}): { rowIndex: number; field: 'serial' | 'imei' } | null {
  const { hardwareType, rowIndex, field, rowCount } = args
  const cfg = HARDWARE_TYPE_CONFIG[hardwareType]

  if (!cfg.requiresSerial) return null

  if (cfg.requiresImei) {
    if (field === 'serial') {
      return { rowIndex, field: 'imei' }
    }
    if (rowIndex + 1 < rowCount) {
      return { rowIndex: rowIndex + 1, field: 'serial' }
    }
    return null
  }

  if (field === 'serial' && rowIndex + 1 < rowCount) {
    return { rowIndex: rowIndex + 1, field: 'serial' }
  }

  return null
}
