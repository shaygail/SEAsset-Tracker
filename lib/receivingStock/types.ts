export type HardwareType =
  | 'laptop'
  | 'desktop'
  | 'monitor'
  | 'phone'
  | 'keyboard'
  | 'mouse'
  | 'headset'
  | 'dock'

export type AssetStatus = 'In stock' | 'In use' | 'In repair' | 'Retired'

export type MonitorType = 'Curved' | '24"' | 'Portable'
export type KeyboardType = 'Keyboard Only' | 'Keyboard/Mouse combo'
export type MouseType = 'Standard' | 'Vertical'
export type PhoneOS = 'iOS' | 'Android' | 'Other'

export type ConditionalFieldKey =
  | 'warrantyExpiry'
  | 'operatingSystem'
  | 'monitorType'
  | 'keyboardType'
  | 'mouseType'

export type AssetRow = {
  id: string
  serialNumber?: string
  imei?: string
}

export type ReceivingStockStep = 1 | 2 | 3

export type ReceivingStockFormValues = {
  hardwareType: HardwareType | null
  modelName: string
  quantity: number | ''
  manufacturer: string
  dateReceived: string
  status: string
  poNumber: string
  notes: string

  warrantyExpiry: string
  operatingSystem: PhoneOS | ''
  monitorType: MonitorType | ''
  keyboardType: KeyboardType | ''
  mouseType: MouseType | ''

  rows: AssetRow[]
}

/** Client/API DTO aligned with `CreateAssetPayload` (server maps in route). */
export type ReceivingStockJiraRowPayload = {
  objectTypeName: string
  assetTag?: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  locationName?: string
  status?: string
  dateAdded?: string
  category?: string
  imei?: string
  warrantyExpiry?: string
  operatingSystem?: string
  poNumber?: string
  notes?: string
  /** Tries Name / Label / Asset name in Jira schema */
  assetLabel?: string
}

export type FieldErrors = {
  hardwareType?: string
  modelName?: string
  quantity?: string
  dateReceived?: string
  status?: string
  warrantyExpiry?: string
  operatingSystem?: string
  monitorType?: string
  keyboardType?: string
  mouseType?: string
  rows?: Record<string, { serialNumber?: string; imei?: string }>
  duplicates?: string
  form?: string
}
