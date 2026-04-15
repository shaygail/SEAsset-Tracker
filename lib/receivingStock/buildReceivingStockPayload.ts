import { HARDWARE_TYPE_CONFIG } from './config'
import { normalizeIntakeDateToIso } from './dateFormat'
import { generateAssetTitle } from './generateAssetTitle'
import { resolveStatusForJira } from './validation'
import type { HardwareType, ReceivingStockFormValues, ReceivingStockJiraRowPayload } from './types'

function trim(s: string): string {
  return s.trim()
}

function categoryForType(ht: HardwareType, values: ReceivingStockFormValues): string | undefined {
  switch (ht) {
    case 'keyboard':
      return values.keyboardType || undefined
    case 'mouse':
      return values.mouseType || undefined
    case 'monitor':
      return values.monitorType || undefined
    default:
      return undefined
  }
}

/**
 * Builds one Jira create payload per asset row.
 * TODO: If your Jira schema uses different attribute names, adjust `createAsset` in `lib/jira.ts`
 * (IMEI, Operating system, Warranty, PO number, Notes, Name/Label) rather than this function.
 */
export function buildReceivingStockPayload(
  values: ReceivingStockFormValues,
  jiraStatusOptions: string[]
): ReceivingStockJiraRowPayload[] {
  const ht = values.hardwareType
  if (!ht) return []

  const cfg = HARDWARE_TYPE_CONFIG[ht]
  const qty = values.quantity === '' ? 0 : values.quantity
  const model = trim(values.modelName)
  const manufacturer = trim(values.manufacturer)
  const status = resolveStatusForJira(values.status, jiraStatusOptions)
  const dateAdded = normalizeIntakeDateToIso(values.dateReceived)
  const category = categoryForType(ht, values)
  const po = trim(values.poNumber)
  const notes = trim(values.notes)
  const warrantyIso = values.warrantyExpiry.trim() ? normalizeIntakeDateToIso(values.warrantyExpiry) : undefined
  const os = values.operatingSystem || undefined

  const base: Omit<ReceivingStockJiraRowPayload, 'serialNumber' | 'imei' | 'assetTag' | 'assetLabel'> = {
    objectTypeName: cfg.jiraObjectTypeName,
    model,
    manufacturer: manufacturer || undefined,
    status,
    dateAdded,
    category,
    poNumber: po || undefined,
    notes: notes || undefined,
    warrantyExpiry: warrantyIso,
    operatingSystem: os,
  }

  const out: ReceivingStockJiraRowPayload[] = []

  for (let i = 0; i < qty; i++) {
    const row = values.rows[i]
    const serial = trim(row?.serialNumber ?? '')
    const imei = trim(row?.imei ?? '')

    const title = generateAssetTitle({
      hardwareType: ht,
      modelName: model,
      serialNumber: serial || undefined,
      imei: imei || undefined,
    })

    const payload: ReceivingStockJiraRowPayload = {
      ...base,
      serialNumber: serial || undefined,
      imei: imei || undefined,
      /** Asset tag helps satisfy Jira when serial is absent; scanners often use serial as tag. */
      assetTag: serial || (cfg.requiresImei ? imei : undefined) || undefined,
      /** Best-effort display label — mapped in Jira helper if a matching attribute exists. */
      assetLabel: title,
    }

    out.push(payload)
  }

  return out
}
