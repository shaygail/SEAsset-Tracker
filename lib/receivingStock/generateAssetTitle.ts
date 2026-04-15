import { HARDWARE_TYPE_CONFIG } from './config'
import type { HardwareType } from './types'

const PLACEHOLDER = '...'

export function generateAssetTitle(params: {
  hardwareType: HardwareType
  modelName: string
  serialNumber?: string
  imei?: string
}): string {
  const model = (params.modelName || '').trim() || PLACEHOLDER
  const { requiresSerial, requiresImei } = HARDWARE_TYPE_CONFIG[params.hardwareType]

  if (requiresImei) {
    const imei = (params.imei || '').trim()
    return imei ? `${model} - ${imei}` : `${model} - ${PLACEHOLDER}`
  }

  if (requiresSerial) {
    const sn = (params.serialNumber || '').trim()
    return sn ? `${model} - ${sn}` : `${model} - ${PLACEHOLDER}`
  }

  return model
}

const TITLE_PLACEHOLDER = '...'

/**
 * Same naming rules as {@link generateAssetTitle}, keyed by Jira object type name
 * (CSV import / bulk import) so labels match Receiving Stock.
 */
export function generateAssetTitleForObjectType(params: {
  objectTypeName: string
  modelName: string
  serialNumber?: string
  imei?: string
}): string {
  const model = (params.modelName || '').trim() || TITLE_PLACEHOLDER
  const t = params.objectTypeName.trim().toLowerCase()
  const sn = (params.serialNumber || '').trim()
  const imei = (params.imei || '').trim()

  if (t === 'phones' || t === 'mobile') {
    return imei ? `${model} - ${imei}` : `${model} - ${TITLE_PLACEHOLDER}`
  }
  if (t === 'keyboard' || t === 'mouse' || t === 'headset') {
    return model
  }
  if (sn) return `${model} - ${sn}`
  return `${model} - ${TITLE_PLACEHOLDER}`
}
