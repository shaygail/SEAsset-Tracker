'use client'

import type { HardwareType, ReceivingStockFormValues } from '@/lib/receivingStock/types'
import { HARDWARE_TYPE_CONFIG } from '@/lib/receivingStock/config'
import type { FieldErrors } from '@/lib/receivingStock/types'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const errClass = 'text-xs text-red-600 mt-1'

export default function ConditionalFields({
  hardwareType,
  values,
  onPatch,
  errors,
}: {
  hardwareType: HardwareType
  values: ReceivingStockFormValues
  onPatch: (p: Partial<ReceivingStockFormValues>) => void
  errors: FieldErrors
}) {
  const keys = HARDWARE_TYPE_CONFIG[hardwareType].conditionalFields
  if (keys.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
      {keys.includes('warrantyExpiry') && (
        <div>
          <label htmlFor="rs-warranty" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Warranty expiry
          </label>
          <input
            id="rs-warranty"
            className={inputClass}
            placeholder="dd/mm/yyyy"
            value={values.warrantyExpiry}
            onChange={(e) => onPatch({ warrantyExpiry: e.target.value })}
            aria-invalid={!!errors.warrantyExpiry}
            aria-describedby={errors.warrantyExpiry ? 'rs-warranty-err' : undefined}
          />
          {errors.warrantyExpiry && (
            <p id="rs-warranty-err" className={errClass} role="alert">
              {errors.warrantyExpiry}
            </p>
          )}
        </div>
      )}
      {keys.includes('operatingSystem') && (
        <div>
          <label htmlFor="rs-os" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Operating system
          </label>
          <select
            id="rs-os"
            className={inputClass}
            value={values.operatingSystem}
            onChange={(e) =>
              onPatch({
                operatingSystem: e.target.value as ReceivingStockFormValues['operatingSystem'],
              })
            }
            aria-invalid={!!errors.operatingSystem}
          >
            <option value="">Select…</option>
            <option value="iOS">iOS</option>
            <option value="Android">Android</option>
            <option value="Other">Other</option>
          </select>
          {errors.operatingSystem && (
            <p className={errClass} role="alert">
              {errors.operatingSystem}
            </p>
          )}
        </div>
      )}
      {keys.includes('monitorType') && (
        <div>
          <label htmlFor="rs-monitor-type" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Monitor type
          </label>
          <select
            id="rs-monitor-type"
            className={inputClass}
            value={values.monitorType}
            onChange={(e) =>
              onPatch({ monitorType: e.target.value as ReceivingStockFormValues['monitorType'] })
            }
            aria-invalid={!!errors.monitorType}
          >
            <option value="">Select…</option>
            <option value="Curved">Curved</option>
            <option value={'24"'}>24&quot;</option>
            <option value="Portable">Portable</option>
          </select>
          {errors.monitorType && (
            <p className={errClass} role="alert">
              {errors.monitorType}
            </p>
          )}
        </div>
      )}
      {keys.includes('keyboardType') && (
        <div>
          <label htmlFor="rs-kbd-type" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Keyboard type
          </label>
          <select
            id="rs-kbd-type"
            className={inputClass}
            value={values.keyboardType}
            onChange={(e) =>
              onPatch({
                keyboardType: e.target.value as ReceivingStockFormValues['keyboardType'],
              })
            }
            aria-invalid={!!errors.keyboardType}
          >
            <option value="">Select…</option>
            <option value="Keyboard Only">Keyboard Only</option>
            <option value="Keyboard/Mouse combo">Keyboard/Mouse combo</option>
          </select>
          {errors.keyboardType && (
            <p className={errClass} role="alert">
              {errors.keyboardType}
            </p>
          )}
        </div>
      )}
      {keys.includes('mouseType') && (
        <div>
          <label htmlFor="rs-mouse-type" className={labelClass}>
            <span className="text-red-500 mr-0.5" aria-hidden>
              •
            </span>
            Mouse type
          </label>
          <select
            id="rs-mouse-type"
            className={inputClass}
            value={values.mouseType}
            onChange={(e) =>
              onPatch({ mouseType: e.target.value as ReceivingStockFormValues['mouseType'] })
            }
            aria-invalid={!!errors.mouseType}
          >
            <option value="">Select…</option>
            <option value="Standard">Standard</option>
            <option value="Vertical">Vertical</option>
          </select>
          {errors.mouseType && (
            <p className={errClass} role="alert">
              {errors.mouseType}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
