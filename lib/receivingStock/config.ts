import type { ConditionalFieldKey, HardwareType } from './types'

export type HardwareTypeConfig = {
  label: string
  /** Short label for compact tiles */
  tileLabel: string
  requiresSerial: boolean
  requiresImei: boolean
  conditionalFields: ConditionalFieldKey[]
  /** Jira Assets object type name passed to `createAsset` */
  jiraObjectTypeName: string
}

export const HARDWARE_TYPE_CONFIG: Record<HardwareType, HardwareTypeConfig> = {
  laptop: {
    label: 'Laptop',
    tileLabel: 'Laptop',
    requiresSerial: true,
    requiresImei: false,
    conditionalFields: ['warrantyExpiry'],
    jiraObjectTypeName: 'Computer',
  },
  desktop: {
    label: 'Desktop',
    tileLabel: 'Desktop',
    requiresSerial: true,
    requiresImei: false,
    conditionalFields: ['warrantyExpiry'],
    jiraObjectTypeName: 'Computer',
  },
  monitor: {
    label: 'Monitor',
    tileLabel: 'Monitor',
    requiresSerial: true,
    requiresImei: false,
    conditionalFields: ['monitorType'],
    jiraObjectTypeName: 'Monitor',
  },
  phone: {
    label: 'Phone',
    tileLabel: 'Phone',
    requiresSerial: true,
    requiresImei: true,
    conditionalFields: ['operatingSystem'],
    jiraObjectTypeName: 'Phones',
  },
  keyboard: {
    label: 'Keyboard',
    tileLabel: 'Keyboard',
    requiresSerial: false,
    requiresImei: false,
    conditionalFields: ['keyboardType'],
    jiraObjectTypeName: 'Keyboard',
  },
  mouse: {
    label: 'Mouse',
    tileLabel: 'Mouse',
    requiresSerial: false,
    requiresImei: false,
    conditionalFields: ['mouseType'],
    jiraObjectTypeName: 'Mouse',
  },
  headset: {
    label: 'Headset',
    tileLabel: 'Headset',
    requiresSerial: false,
    requiresImei: false,
    conditionalFields: [],
    jiraObjectTypeName: 'Headset',
  },
  dock: {
    label: 'Docking Station',
    tileLabel: 'Docking stn',
    requiresSerial: true,
    requiresImei: false,
    conditionalFields: [],
    jiraObjectTypeName: 'Docking Station',
  },
}

export const HARDWARE_TYPE_ORDER: HardwareType[] = [
  'laptop',
  'desktop',
  'monitor',
  'phone',
  'keyboard',
  'mouse',
  'headset',
  'dock',
]

/** Manufacturer datalist — same spirit as CSV import; extend as needed. */
export const COMMON_MANUFACTURERS: string[] = [
  'Dell',
  'HP',
  'Lenovo',
  'Apple',
  'Microsoft',
  'Samsung',
  'Logitech',
  'Cisco',
  'Jabra',
  'Philips',
  'Neat',
  'Other',
]
