'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import CameraScanModal, { CameraIcon } from '@/components/barcode/CameraScanModal'
import { HARDWARE_TYPE_CONFIG } from '@/lib/receivingStock/config'
import { generateAssetTitle } from '@/lib/receivingStock/generateAssetTitle'
import { getNextFocusableField } from '@/lib/receivingStock/scannerFocus'
import type { FieldErrors, HardwareType, ReceivingStockFormValues } from '@/lib/receivingStock/types'
import AssetTitlePreview from './AssetTitlePreview'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

function fieldKey(rowIndex: number, field: 'serial' | 'imei') {
  return `${rowIndex}-${field}`
}

export default function AssetRowsSection({
  hardwareType,
  values,
  onPatchRow,
  errors,
  onJumpNextEmpty,
  reviewButtonRef,
}: {
  hardwareType: HardwareType
  values: ReceivingStockFormValues
  onPatchRow: (rowId: string, patch: { serialNumber?: string; imei?: string }) => void
  errors: FieldErrors
  onJumpNextEmpty: () => void
  reviewButtonRef: React.RefObject<HTMLButtonElement | null>
}) {
  const cfg = HARDWARE_TYPE_CONFIG[hardwareType]
  const qty = values.quantity === '' ? 0 : values.quantity

  const [cameraTarget, setCameraTarget] = useState<{
    rowId: string
    rowIndex: number
    field: 'serial' | 'imei'
  } | null>(null)
  const cameraTargetRef = useRef(cameraTarget)
  useEffect(() => {
    cameraTargetRef.current = cameraTarget
  }, [cameraTarget])

  const cameraTitle = cameraTarget
    ? cameraTarget.field === 'imei'
      ? `Scan IMEI (row ${cameraTarget.rowIndex + 1})`
      : `Scan serial number (row ${cameraTarget.rowIndex + 1})`
    : ''

  const moveFocus = useCallback(
    (rowIndex: number, field: 'serial' | 'imei') => {
      const next = getNextFocusableField({
        hardwareType,
        rowIndex,
        field,
        rowCount: qty,
      })
      if (next) {
        const el = document.querySelector(
          `[data-rs-field="${fieldKey(next.rowIndex, next.field)}"]`
        ) as HTMLInputElement | null
        el?.focus()
        el?.select()
      } else {
        reviewButtonRef.current?.focus()
      }
    },
    [hardwareType, qty, reviewButtonRef]
  )

  const handleKeyDown = useCallback(
    (rowIndex: number, field: 'serial' | 'imei', e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' && e.key !== 'Tab') return
      const v = e.currentTarget.value.trim()
      if (e.key === 'Enter') {
        e.preventDefault()
        if (v) moveFocus(rowIndex, field)
        return
      }
      if (e.key === 'Tab' && !e.shiftKey && v) {
        const next = getNextFocusableField({ hardwareType, rowIndex, field, rowCount: qty })
        if (next) {
          e.preventDefault()
          moveFocus(rowIndex, field)
        }
      }
    },
    [hardwareType, moveFocus, qty]
  )

  if (!cfg.requiresSerial) {
    const titles = Array.from({ length: qty }, (_, i) =>
      generateAssetTitle({
        hardwareType,
        modelName: values.modelName,
        serialNumber: values.rows[i]?.serialNumber,
        imei: values.rows[i]?.imei,
      })
    )
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-gray-900">Assets to create</h3>
          <span className="text-xs text-slate-600">
            {qty} unit{qty !== 1 ? 's' : ''} — no serial numbers required
          </span>
        </div>
        <ul className="space-y-3 text-sm text-slate-800 list-none p-0 m-0">
          {titles.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-400 font-medium tabular-nums w-6 shrink-0 text-right">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <AssetTitlePreview title={t} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const needed = qty
  const rowErr = errors.rows ?? {}

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-gray-900">Serial numbers</h3>
          <span className="text-sm text-amber-800 font-medium">Required — {needed} needed</span>
        </div>
        <span className="text-xs font-semibold rounded-full bg-sky-100 text-sky-800 px-3 py-1 border border-sky-200">
          USB scanner or camera
        </span>
      </div>

      <p className="text-xs text-slate-600 -mt-2">
        On a phone or tablet, use the camera button beside each field to capture barcodes or QR codes (HTTPS
        required).
      </p>

      <div className="space-y-5">
        {values.rows.slice(0, qty).map((row, i) => {
          const rErr = rowErr[row.id]
          return (
            <div key={row.id} className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">Row {i + 1}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="sr-only" htmlFor={`serial-${row.id}`}>
                    Serial number row {i + 1}
                  </label>
                  <div className="flex gap-2 items-stretch">
                    <input
                      id={`serial-${row.id}`}
                      data-rs-field={fieldKey(i, 'serial')}
                      className={`${inputClass} flex-1 min-w-0`}
                      placeholder="Scan or type serial…"
                      value={row.serialNumber ?? ''}
                      onChange={(e) => onPatchRow(row.id, { serialNumber: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(i, 'serial', e)}
                      aria-invalid={!!rErr?.serialNumber}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="shrink-0 w-12 inline-flex items-center justify-center rounded-lg border-2 border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Open camera to scan serial number, row ${i + 1}`}
                      title="Scan with camera"
                      onClick={() => setCameraTarget({ rowId: row.id, rowIndex: i, field: 'serial' })}
                    >
                      <CameraIcon className="w-6 h-6" />
                    </button>
                  </div>
                  {rErr?.serialNumber && (
                    <p className="text-xs text-red-600 mt-1" role="alert">
                      {rErr.serialNumber}
                    </p>
                  )}
                </div>
                {cfg.requiresImei && (
                  <div>
                    <label className="sr-only" htmlFor={`imei-${row.id}`}>
                      IMEI row {i + 1}
                    </label>
                    <div className="flex gap-2 items-stretch">
                      <input
                        id={`imei-${row.id}`}
                        data-rs-field={fieldKey(i, 'imei')}
                        className={`${inputClass} flex-1 min-w-0`}
                        placeholder="Scan or type IMEI…"
                        value={row.imei ?? ''}
                        onChange={(e) => onPatchRow(row.id, { imei: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(i, 'imei', e)}
                        aria-invalid={!!rErr?.imei}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="shrink-0 w-12 inline-flex items-center justify-center rounded-lg border-2 border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Open camera to scan IMEI, row ${i + 1}`}
                        title="Scan with camera"
                        onClick={() => setCameraTarget({ rowId: row.id, rowIndex: i, field: 'imei' })}
                      >
                        <CameraIcon className="w-6 h-6" />
                      </button>
                    </div>
                    {rErr?.imei && (
                      <p className="text-xs text-red-600 mt-1" role="alert">
                        {rErr.imei}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <AssetTitlePreview
                title={generateAssetTitle({
                  hardwareType,
                  modelName: values.modelName,
                  serialNumber: row.serialNumber,
                  imei: row.imei,
                })}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onJumpNextEmpty}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-800 hover:bg-slate-50"
          aria-label="Jump to next empty serial or IMEI field"
          title="Next empty field"
        >
          ↓
        </button>
      </div>

      <CameraScanModal
        open={cameraTarget !== null}
        title={cameraTitle}
        onClose={() => setCameraTarget(null)}
        onDecoded={(value) => {
          const t = cameraTargetRef.current
          if (!t) return
          const { rowId, rowIndex, field } = t
          if (field === 'serial') {
            onPatchRow(rowId, { serialNumber: value })
          } else {
            onPatchRow(rowId, { imei: value })
          }
          setCameraTarget(null)
          window.setTimeout(() => moveFocus(rowIndex, field), 0)
        }}
      />
    </section>
  )
}
