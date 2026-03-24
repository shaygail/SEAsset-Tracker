'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import type { AssetListItem } from '@/lib/jira'

// ─── Size presets ──────────────────────────────────────────────────────────────
const SIZES = [
  {
    id: 'xs',
    label: 'XS',
    desc: '38 × 21 mm',
    hint: 'Tiny — key tag',
    cols: 4,
    w: '38mm',
    h: '21mm',
    pad: '1.5mm',
    gap: '1.5mm',
    qr: 50,
    fontKey: '7pt',
    fontModel: '5.5pt',
    fontSn: '5pt',
    fontBrand: '4.5pt',
  },
  {
    id: 'sm',
    label: 'Small',
    desc: '63 × 38 mm',
    hint: 'Standard label',
    cols: 3,
    w: '63mm',
    h: '38mm',
    pad: '2mm 2.5mm',
    gap: '3mm',
    qr: 86,
    fontKey: '9pt',
    fontModel: '7pt',
    fontSn: '6pt',
    fontBrand: '5.5pt',
  },
  {
    id: 'md',
    label: 'Medium',
    desc: '85 × 54 mm',
    hint: 'Business card',
    cols: 2,
    w: '85mm',
    h: '54mm',
    pad: '3mm',
    gap: '4mm',
    qr: 120,
    fontKey: '11pt',
    fontModel: '8.5pt',
    fontSn: '7pt',
    fontBrand: '6pt',
  },
  {
    id: 'lg',
    label: 'Large',
    desc: '105 × 74 mm',
    hint: 'Full label',
    cols: 2,
    w: '105mm',
    h: '74mm',
    pad: '4mm',
    gap: '5mm',
    qr: 160,
    fontKey: '13pt',
    fontModel: '10pt',
    fontSn: '8pt',
    fontBrand: '7pt',
  },
] as const

type SizeId = typeof SIZES[number]['id']

export default function PrintPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const keysParam = searchParams.get('keys') ?? ''
  const defaultSize = (searchParams.get('size') as SizeId) ?? 'sm'

  const [assets, setAssets] = useState<AssetListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sizeId, setSizeId] = useState<SizeId>(
    SIZES.find((s) => s.id === defaultSize) ? defaultSize : 'sm'
  )
  const hasPrinted = useRef(false)

  const jiraBase = process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? 'https://powerco.atlassian.net'
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[1]

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const url = status
          ? `/api/jira/listAssets?status=${encodeURIComponent(status)}`
          : '/api/jira/listAssets'
        const resp = await fetch(url)
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error ?? 'Failed to load')

        let list: AssetListItem[] = data.assets ?? []
        if (keysParam) {
          const keys = keysParam.split(',').map((k) => k.trim().toUpperCase())
          list = list.filter((a) => keys.includes(a.objectKey.toUpperCase()))
        }
        setAssets(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [status, keysParam])

  // Auto-print once on first load
  useEffect(() => {
    if (!loading && assets.length > 0 && !hasPrinted.current) {
      hasPrinted.current = true
      setTimeout(() => window.print(), 500)
    }
  }, [loading, assets])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400 print:hidden">
        <p className="text-sm">Loading assets…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 print:hidden">
        <p className="text-sm">Error: {error}</p>
      </div>
    )
  }

  return (
    <>
      <style>{`@media print { @page { margin: 5mm; } }`}</style>

      {/* Screen-only toolbar */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-2.5 flex items-center gap-4 shadow-lg flex-wrap">

        {/* Label count */}
        <span className="font-semibold text-sm shrink-0">
          ⚡ {assets.length} label{assets.length !== 1 ? 's' : ''}
          {status && <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded-full">{status}</span>}
        </span>

        {/* Size picker */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-gray-400 shrink-0">Size:</span>
          {SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSizeId(s.id)}
              title={`${s.desc} — ${s.hint}`}
              className={`flex flex-col items-center px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                sizeId === s.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{s.label}</span>
              <span className={`font-normal text-[10px] ${sizeId === s.id ? 'text-blue-200' : 'text-gray-500'}`}>
                {s.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-white text-gray-900 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M9 21h6v-6H9v6z" />
            </svg>
            Print
          </button>
          <button onClick={() => window.close()} className="text-gray-400 hover:text-white text-sm">
            ✕
          </button>
        </div>
      </div>

      {/* Sticker sheet */}
      <div className="pt-16 print:pt-0 px-4 print:px-0 pb-8 print:pb-0 bg-white min-h-screen">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size.cols}, max-content)`,
            gap: size.gap,
            padding: '0',
          }}
        >
          {assets.map((asset) => {
            const jiraUrl = `${jiraBase}/jira/assets/object/${asset.objectId}`
            return (
              <div
                key={asset.objectKey}
                style={{
                  width: size.w,
                  height: size.h,
                  boxSizing: 'border-box',
                  padding: size.pad,
                  border: '0.4pt dashed #bbb',
                  borderRadius: '2mm',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2mm',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                  background: 'white',
                  overflow: 'hidden',
                }}
              >
                {/* QR code */}
                {asset.objectId ? (
                  <div style={{ flexShrink: 0 }}>
                    <QRCodeSVG value={jiraUrl} size={size.qr} level="M" />
                  </div>
                ) : (
                  <div style={{ width: size.qr, height: size.qr, background: '#f3f4f6', flexShrink: 0 }} />
                )}

                {/* Text */}
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: size.fontKey, fontWeight: 700, color: '#1e3a5f', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.02em' }}>
                    {asset.objectKey}
                  </p>
                  <p style={{ fontSize: size.fontModel, fontWeight: 600, color: '#111', margin: '0.8mm 0 0.4mm', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.model || asset.label}
                  </p>
                  {asset.serialNumber && (
                    <p style={{ fontSize: size.fontSn, color: '#555', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      S/N: {asset.serialNumber}
                    </p>
                  )}
                  <p style={{ fontSize: size.fontBrand, color: '#aaa', margin: '1.2mm 0 0', whiteSpace: 'nowrap' }}>
                    ⚡ Powerco SE
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
