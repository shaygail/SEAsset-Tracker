'use client'

import { HARDWARE_TYPE_CONFIG } from '@/lib/receivingStock/config'
import { generateAssetTitle } from '@/lib/receivingStock/generateAssetTitle'
import type { HardwareType, ReceivingStockFormValues } from '@/lib/receivingStock/types'

function labelForConditional(ht: HardwareType, values: ReceivingStockFormValues): { label: string; value: string }[] {
  const cfg = HARDWARE_TYPE_CONFIG[ht]
  const out: { label: string; value: string }[] = []
  for (const k of cfg.conditionalFields) {
    if (k === 'warrantyExpiry' && values.warrantyExpiry) out.push({ label: 'Warranty expiry', value: values.warrantyExpiry })
    if (k === 'operatingSystem' && values.operatingSystem) out.push({ label: 'Operating system', value: values.operatingSystem })
    if (k === 'monitorType' && values.monitorType) out.push({ label: 'Monitor type', value: values.monitorType })
    if (k === 'keyboardType' && values.keyboardType) out.push({ label: 'Keyboard type', value: values.keyboardType })
    if (k === 'mouseType' && values.mouseType) out.push({ label: 'Mouse type', value: values.mouseType })
  }
  return out
}

export default function ReceivingStockReview({
  values,
}: {
  values: ReceivingStockFormValues
}) {
  const ht = values.hardwareType as HardwareType
  const cfg = HARDWARE_TYPE_CONFIG[ht]
  const qty = values.quantity === '' ? 0 : values.quantity
  const extras = labelForConditional(ht, values)

  const titles = Array.from({ length: qty }, (_, i) =>
    generateAssetTitle({
      hardwareType: ht,
      modelName: values.modelName,
      serialNumber: values.rows[i]?.serialNumber,
      imei: values.rows[i]?.imei,
    })
  )

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Review</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border border-slate-200 rounded-xl p-4 bg-white">
        <div>
          <dt className="text-slate-500">Hardware type</dt>
          <dd className="font-medium text-slate-900">{cfg.label}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Quantity</dt>
          <dd className="font-medium text-slate-900">{qty}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Model name</dt>
          <dd className="font-medium text-slate-900">{values.modelName.trim() || '—'}</dd>
        </div>
        {values.manufacturer.trim() && (
          <div>
            <dt className="text-slate-500">Manufacturer</dt>
            <dd className="font-medium text-slate-900">{values.manufacturer.trim()}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">Date received</dt>
          <dd className="font-medium text-slate-900">{values.dateReceived.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="font-medium text-slate-900">{values.status}</dd>
        </div>
        {values.poNumber.trim() && (
          <div>
            <dt className="text-slate-500">PO number</dt>
            <dd className="font-medium text-slate-900">{values.poNumber.trim()}</dd>
          </div>
        )}
        {values.notes.trim() && (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Notes</dt>
            <dd className="font-medium text-slate-900 whitespace-pre-wrap">{values.notes.trim()}</dd>
          </div>
        )}
        {extras.map((e) => (
          <div key={e.label}>
            <dt className="text-slate-500">{e.label}</dt>
            <dd className="font-medium text-slate-900">{e.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Assets to create ({qty})</h3>
        <ol className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/80 max-h-[24rem] overflow-y-auto">
          {titles.map((t, i) => (
            <li key={i} className="text-sm font-mono text-slate-800 flex gap-2">
              <span className="text-slate-400 shrink-0 w-6 text-right">{i + 1}.</span>
              <span className="break-all">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
