import { HARDWARE_TYPE_CONFIG } from './config'
import { parseDdMmYyyy } from './dateFormat'
import type { FieldErrors, HardwareType, ReceivingStockFormValues } from './types'

function trim(s: string): string {
  return s.trim()
}

export function validateReceivingStockForReview(values: ReceivingStockFormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.hardwareType) {
    errors.hardwareType = 'Select a hardware type.'
  }

  if (!trim(values.modelName)) {
    errors.modelName = 'Model name is required.'
  }

  if (values.quantity === '' || values.quantity < 1) {
    errors.quantity = 'Enter a quantity greater than zero.'
  }

  if (!trim(values.dateReceived)) {
    errors.dateReceived = 'Date received is required.'
  } else if (!parseDdMmYyyy(values.dateReceived)) {
    errors.dateReceived = 'Use the format dd/mm/yyyy.'
  }

  if (!trim(values.status)) {
    errors.status = 'Status is required.'
  }

  const ht = values.hardwareType
  if (ht) {
    const cfg = HARDWARE_TYPE_CONFIG[ht]
    for (const key of cfg.conditionalFields) {
      if (key === 'warrantyExpiry') {
        if (!trim(values.warrantyExpiry)) {
          errors.warrantyExpiry = 'Warranty expiry is required for this type.'
        } else if (!parseDdMmYyyy(values.warrantyExpiry)) {
          errors.warrantyExpiry = 'Use the format dd/mm/yyyy.'
        }
      }
      if (key === 'operatingSystem' && !values.operatingSystem) {
        errors.operatingSystem = 'Operating system is required for phones.'
      }
      if (key === 'monitorType' && !values.monitorType) {
        errors.monitorType = 'Monitor type is required.'
      }
      if (key === 'keyboardType' && !values.keyboardType) {
        errors.keyboardType = 'Keyboard type is required.'
      }
      if (key === 'mouseType' && !values.mouseType) {
        errors.mouseType = 'Mouse type is required.'
      }
    }

    const qty = values.quantity === '' ? 0 : values.quantity
    if (cfg.requiresSerial && qty > 0) {
      const rowErrors: NonNullable<FieldErrors['rows']> = {}
      for (let i = 0; i < qty; i++) {
        const row = values.rows[i]
        const serial = trim(row?.serialNumber ?? '')
        const imei = trim(row?.imei ?? '')
        if (!serial || (cfg.requiresImei && !imei)) {
          rowErrors[row?.id ?? `idx-${i}`] = {
            ...(!serial ? { serialNumber: 'Serial number is required.' } : {}),
            ...(cfg.requiresImei && !imei ? { imei: 'IMEI is required.' } : {}),
          }
        }
      }
      if (Object.keys(rowErrors).length) errors.rows = rowErrors
    }

    if (cfg.requiresSerial && qty > 0) {
      const serials = new Map<string, number[]>()
      const imeis = new Map<string, number[]>()
      for (let i = 0; i < qty; i++) {
        const row = values.rows[i]
        const s = trim(row?.serialNumber ?? '').toLowerCase()
        const im = trim(row?.imei ?? '').toLowerCase()
        if (s) {
          const arr = serials.get(s) ?? []
          arr.push(i)
          serials.set(s, arr)
        }
        if (im) {
          const arr = imeis.get(im) ?? []
          arr.push(i)
          imeis.set(im, arr)
        }
      }
      const dupSn = [...serials.entries()].filter(([, idx]) => idx.length > 1)
      const dupIm = [...imeis.entries()].filter(([, idx]) => idx.length > 1)
      if (dupSn.length || dupIm.length) {
        const parts: string[] = []
        if (dupSn.length) parts.push('Duplicate serial numbers in this batch.')
        if (dupIm.length) parts.push('Duplicate IMEIs in this batch.')
        errors.duplicates = parts.join(' ')
      }
    }
  }

  return errors
}

export function hasValidationErrors(e: FieldErrors): boolean {
  if (e.hardwareType || e.modelName || e.quantity || e.dateReceived || e.status) return true
  if (e.warrantyExpiry || e.operatingSystem || e.monitorType || e.keyboardType || e.mouseType) return true
  if (e.duplicates || e.form) return true
  if (e.rows && Object.keys(e.rows).length > 0) return true
  return false
}

/** Pick the Jira Status option that best matches the form value (case-insensitive). */
export function resolveStatusForJira(formStatus: string, jiraOptions: string[]): string {
  const t = trim(formStatus)
  if (!t) return t
  const exact = jiraOptions.find((o) => o === t)
  if (exact) return exact
  const lower = t.toLowerCase()
  const ci = jiraOptions.find((o) => o.toLowerCase() === lower)
  if (ci) return ci
  return t
}

