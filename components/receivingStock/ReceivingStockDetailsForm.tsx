'use client'

import { COMMON_MANUFACTURERS } from '@/lib/receivingStock/config'
import type { FieldErrors, HardwareType, ReceivingStockFormValues } from '@/lib/receivingStock/types'
import ConditionalFields from './ConditionalFields'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const errClass = 'text-xs text-red-600 mt-1'

export default function ReceivingStockDetailsForm({
  hardwareType,
  values,
  onPatch,
  errors,
  statusOptions,
}: {
  hardwareType: HardwareType
  values: ReceivingStockFormValues
  onPatch: (p: Partial<ReceivingStockFormValues>) => void
  errors: FieldErrors
  statusOptions: string[]
}) {
  const datalistId = 'rs-manufacturers'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Asset details</h2>
        <span className="text-xs font-medium rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 border border-slate-200">
          Required fields marked •
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rs-model" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Model name
          </label>
          <input
            id="rs-model"
            className={inputClass}
            value={values.modelName}
            onChange={(e) => onPatch({ modelName: e.target.value })}
            aria-invalid={!!errors.modelName}
            autoComplete="off"
          />
          {errors.modelName && (
            <p className={errClass} role="alert">
              {errors.modelName}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="rs-qty" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Quantity
          </label>
          <input
            id="rs-qty"
            type="number"
            min={1}
            className={inputClass}
            value={values.quantity === '' ? '' : values.quantity}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                onPatch({ quantity: '' })
                return
              }
              const n = parseInt(raw, 10)
              if (!Number.isNaN(n) && n > 0) {
                onPatch({ quantity: n })
              }
            }}
            aria-invalid={!!errors.quantity}
          />
          {errors.quantity && (
            <p className={errClass} role="alert">
              {errors.quantity}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="rs-mfr" className={labelClass}>
            Manufacturer
          </label>
          <input
            id="rs-mfr"
            className={inputClass}
            list={datalistId}
            value={values.manufacturer}
            onChange={(e) => onPatch({ manufacturer: e.target.value })}
            placeholder="Select or type…"
            autoComplete="off"
          />
          <datalist id={datalistId}>
            {COMMON_MANUFACTURERS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="rs-date" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Date received
          </label>
          <input
            id="rs-date"
            className={inputClass}
            placeholder="dd/mm/yyyy"
            value={values.dateReceived}
            onChange={(e) => onPatch({ dateReceived: e.target.value })}
            aria-invalid={!!errors.dateReceived}
          />
          {errors.dateReceived && (
            <p className={errClass} role="alert">
              {errors.dateReceived}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="rs-status" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Status
          </label>
          <select
            id="rs-status"
            className={inputClass}
            value={values.status}
            onChange={(e) => onPatch({ status: e.target.value })}
            aria-invalid={!!errors.status}
          >
            {statusOptions.length === 0 ? (
              <>
                <option value="In stock">In stock</option>
                <option value="In use">In use</option>
                <option value="In repair">In repair</option>
                <option value="Retired">Retired</option>
              </>
            ) : (
              statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))
            )}
          </select>
          {errors.status && (
            <p className={errClass} role="alert">
              {errors.status}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="rs-po" className={labelClass}>
            PO number
          </label>
          <input
            id="rs-po"
            className={inputClass}
            placeholder="PO-2026-…"
            value={values.poNumber}
            onChange={(e) => onPatch({ poNumber: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rs-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="rs-notes"
            rows={2}
            className={inputClass}
            value={values.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
          />
        </div>
      </div>

      <ConditionalFields hardwareType={hardwareType} values={values} onPatch={onPatch} errors={errors} />
    </div>
  )
}
