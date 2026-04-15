'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { addRecentlyImported } from '@/lib/recentlyImported'
import { buildReceivingStockPayload } from '@/lib/receivingStock/buildReceivingStockPayload'
import { HARDWARE_TYPE_CONFIG } from '@/lib/receivingStock/config'
import { syncAssetRows } from '@/lib/receivingStock/rows'
import type { HardwareType, ReceivingStockFormValues } from '@/lib/receivingStock/types'
import type { FieldErrors } from '@/lib/receivingStock/types'
import {
  hasValidationErrors,
  validateReceivingStockForReview,
} from '@/lib/receivingStock/validation'
import AssetRowsSection from './AssetRowsSection'
import HardwareTypeSelector from './HardwareTypeSelector'
import ReceivingStockDetailsForm from './ReceivingStockDetailsForm'
import ReceivingStockReview from './ReceivingStockReview'
import ReceivingStockStepper from './ReceivingStockStepper'
import ReceivingStockSuccessBanner from './ReceivingStockSuccessBanner'

type Step = 1 | 2 | 3

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function initialForm(): ReceivingStockFormValues {
  return {
    hardwareType: null,
    modelName: '',
    quantity: 1,
    manufacturer: '',
    dateReceived: '',
    status: 'In stock',
    poNumber: '',
    notes: '',
    warrantyExpiry: '',
    operatingSystem: '',
    monitorType: '',
    keyboardType: '',
    mouseType: '',
    rows: [{ id: newId() }],
  }
}

type RowResult = {
  rowIndex: number
  success: boolean
  objectKey?: string
  objectId?: string
  error?: string
  warning?: string
}

function rsFieldKey(rowIndex: number, field: 'serial' | 'imei') {
  return `${rowIndex}-${field}`
}

export default function ReceivingStockPage() {
  const [step, setStep] = useState<Step>(1)
  const [values, setValues] = useState<ReceivingStockFormValues>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successCount, setSuccessCount] = useState<number | null>(null)
  const [jiraStatusOptions, setJiraStatusOptions] = useState<string[]>([])

  const reviewButtonRef = useRef<HTMLButtonElement>(null)

  const jiraBase = process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? 'https://powerco.atlassian.net'
  const jiraAssetsHome = `${jiraBase.replace(/\/$/, '')}/jira/assets`

  useEffect(() => {
    let cancelled = false
    fetch('/api/jira/statusOptions')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const opts: string[] = Array.isArray(data.options) ? data.options : []
        setJiraStatusOptions(opts)
        if (opts.length === 0) return
        setValues((v) => {
          if (opts.some((o) => o === v.status)) return v
          const prefer =
            opts.find((o) => o.toLowerCase() === 'in stock') ??
            opts.find((o) => o.toLowerCase().includes('stock')) ??
            opts[0]
          return { ...v, status: prefer }
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const onPatch = useCallback((patch: Partial<ReceivingStockFormValues>) => {
    setValues((v) => {
      const merged: ReceivingStockFormValues = { ...v, ...patch }
      if (Object.prototype.hasOwnProperty.call(patch, 'quantity')) {
        if (patch.quantity === '' || patch.quantity === 0) {
          merged.rows = []
        } else if (typeof patch.quantity === 'number' && patch.quantity > 0) {
          merged.rows = syncAssetRows(v.rows, patch.quantity)
        }
      }
      return merged
    })
  }, [])

  const setHardwareType = useCallback((ht: HardwareType) => {
    setValues((prev) => {
      const cfg = HARDWARE_TYPE_CONFIG[ht]
      const qt = typeof prev.quantity === 'number' && prev.quantity > 0 ? prev.quantity : 1
      const trimmedRows = prev.rows.map((r) => ({
        id: r.id,
        ...(cfg.requiresSerial ? { serialNumber: r.serialNumber } : { serialNumber: undefined }),
        ...(cfg.requiresImei ? { imei: r.imei } : { imei: undefined }),
      }))
      return {
        ...prev,
        hardwareType: ht,
        quantity: qt,
        warrantyExpiry: cfg.conditionalFields.includes('warrantyExpiry') ? prev.warrantyExpiry : '',
        operatingSystem: cfg.conditionalFields.includes('operatingSystem') ? prev.operatingSystem : '',
        monitorType: cfg.conditionalFields.includes('monitorType') ? prev.monitorType : '',
        keyboardType: cfg.conditionalFields.includes('keyboardType') ? prev.keyboardType : '',
        mouseType: cfg.conditionalFields.includes('mouseType') ? prev.mouseType : '',
        rows: syncAssetRows(trimmedRows, qt),
      }
    })
    setFieldErrors({})
  }, [])

  const onPatchRow = useCallback((rowId: string, patch: { serialNumber?: string; imei?: string }) => {
    setValues((v) => ({
      ...v,
      rows: v.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }))
  }, [])

  const jumpNextEmpty = useCallback(() => {
    const ht = values.hardwareType
    if (!ht) return
    const cfg = HARDWARE_TYPE_CONFIG[ht]
    const qt = values.quantity === '' ? 0 : values.quantity
    for (let i = 0; i < qt; i++) {
      const row = values.rows[i]
      if (cfg.requiresSerial && !(row?.serialNumber ?? '').trim()) {
        const el = document.querySelector(`[data-rs-field="${rsFieldKey(i, 'serial')}"]`) as HTMLInputElement | null
        el?.focus()
        return
      }
      if (cfg.requiresImei && !(row?.imei ?? '').trim()) {
        const el = document.querySelector(`[data-rs-field="${rsFieldKey(i, 'imei')}"]`) as HTMLInputElement | null
        el?.focus()
        return
      }
    }
  }, [values])

  const goStep2 = useCallback(() => {
    if (!values.hardwareType) {
      setFieldErrors({ hardwareType: 'Select a hardware type before continuing.' })
      return
    }
    const qt = typeof values.quantity === 'number' && values.quantity > 0 ? values.quantity : 1
    setValues((v) => ({
      ...v,
      quantity: qt,
      rows: syncAssetRows(v.rows, qt),
    }))
    setFieldErrors({})
    setStep(2)
  }, [values.hardwareType, values.quantity, values.rows])

  const goReview = useCallback(() => {
    const errs = validateReceivingStockForReview(values)
    setFieldErrors(errs)
    if (hasValidationErrors(errs)) return
    setSubmitError(null)
    setStep(3)
  }, [values])

  const goBackToDetails = useCallback(() => {
    setStep(2)
    setSubmitError(null)
  }, [])

  const clearForm = useCallback(() => {
    setValues(initialForm())
    setFieldErrors({})
    setSubmitError(null)
    setSuccessCount(null)
    setStep(1)
  }, [])

  const resetAfterSuccess = useCallback(() => {
    setValues(initialForm())
    setFieldErrors({})
    setSubmitError(null)
    setStep(1)
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    setSuccessCount(null)
    const errs = validateReceivingStockForReview(values)
    setFieldErrors(errs)
    if (hasValidationErrors(errs)) return

    const payloads = buildReceivingStockPayload(values, jiraStatusOptions)
    setSubmitting(true)
    try {
      const resp = await fetch('/api/jira/receivingStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloads),
      })
      const raw = await resp.json()
      if (!resp.ok) {
        setSubmitError(typeof raw.error === 'string' ? raw.error : 'Request failed.')
        return
      }
      const results = (Array.isArray(raw) ? raw : []) as RowResult[]
      const ok = results.filter((r) => r.success)
      const fail = results.filter((r) => !r.success)
      if (fail.length > 0 && ok.length === 0) {
        setSubmitError(fail.map((f) => f.error ?? 'Unknown error').join(' '))
        return
      }
      if (ok.length > 0) {
        addRecentlyImported(
          ok.filter((r) => r.objectKey).map((r) => ({
            objectKey: r.objectKey as string,
            objectType: values.hardwareType ? HARDWARE_TYPE_CONFIG[values.hardwareType].jiraObjectTypeName : undefined,
          }))
        )
      }
      if (fail.length > 0) {
        const failMsg = fail.map((f) => `row ${f.rowIndex + 1}: ${f.error ?? '?'}`).join('; ')
        setSubmitError(
          ok.length > 0
            ? `${ok.length} created, ${fail.length} failed. Failed: ${failMsg}`
            : `${fail.length} of ${results.length} failed: ${failMsg}`
        )
      }
      if (ok.length > 0 && fail.length === 0) {
        setSuccessCount(ok.length)
        resetAfterSuccess()
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }, [values, jiraStatusOptions, resetAfterSuccess])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receiving Stock</h1>
          <p className="mt-1 text-sm text-gray-500 max-w-2xl">
            Enter new hardware as it arrives, scan serials or IMEIs, review titles, and create assets in Jira Assets
            — without CSV files. Dates, status, titles, and phone fields are normalized the same way as bulk CSV import.
          </p>
        </div>
        <Link href="/import" className="text-sm text-blue-700 hover:text-blue-900 underline shrink-0">
          Prefer CSV? Bulk import →
        </Link>
      </div>

      {successCount !== null && successCount > 0 && (
        <ReceivingStockSuccessBanner count={successCount} jiraAssetsUrl={jiraAssetsHome} />
      )}

      <ReceivingStockStepper step={step} />

      {submitError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 text-sm"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-800 text-lg">Hardware type</h2>
            <p className="text-sm text-gray-500 mt-1">Choose the type of hardware you are receiving.</p>
          </div>
          <HardwareTypeSelector value={values.hardwareType} onChange={setHardwareType} />
          {fieldErrors.hardwareType && (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.hardwareType}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={clearForm}
              className="px-4 py-2 rounded-lg border-2 border-gray-800 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50"
            >
              Clear form
            </button>
            <button
              type="button"
              onClick={goStep2}
              className="px-4 py-2 rounded-lg border-2 border-gray-800 bg-white text-gray-900 text-sm font-semibold hover:bg-slate-50 ml-auto"
            >
              Continue to details →
            </button>
          </div>
        </section>
      )}

      {/* Step 2 */}
      {step === 2 && values.hardwareType && (
        <>
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-gray-800 text-lg">Hardware type</h2>
              <span className="text-xs font-medium rounded-full bg-blue-50 text-blue-800 px-2 py-0.5 border border-blue-100">
                Step 1 complete
              </span>
            </div>
            <HardwareTypeSelector value={values.hardwareType} onChange={setHardwareType} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <ReceivingStockDetailsForm
              hardwareType={values.hardwareType}
              values={values}
              onPatch={onPatch}
              errors={fieldErrors}
              statusOptions={jiraStatusOptions}
            />
          </section>

          <AssetRowsSection
            hardwareType={values.hardwareType}
            values={values}
            onPatchRow={onPatchRow}
            errors={fieldErrors}
            onJumpNextEmpty={jumpNextEmpty}
            reviewButtonRef={reviewButtonRef}
          />

          {fieldErrors.duplicates && (
            <p className="text-sm text-red-600 px-1" role="alert">
              {fieldErrors.duplicates}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearForm}
              className="px-4 py-2 rounded-lg border-2 border-gray-800 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50"
            >
              Clear form
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldErrors({})
                setStep(1)
              }}
              className="px-4 py-2 rounded-lg border-2 border-gray-800 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              ref={reviewButtonRef}
              type="button"
              onClick={goReview}
              className="px-4 py-2 rounded-lg border-2 border-gray-800 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 ml-auto"
            >
              Review &amp; submit →
            </button>
          </div>
        </>
      )}

      {/* Step 3 */}
      {step === 3 && values.hardwareType && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <ReceivingStockReview values={values} />
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 text-sm" role="alert">
              {submitError}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goBackToDetails}
              className="px-4 py-2 rounded-lg border-2 border-gray-800 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 ml-auto"
            >
              {submitting ? 'Submitting…' : 'Confirm & create in Jira'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
