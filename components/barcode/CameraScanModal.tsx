'use client'

import { useEffect, useId, useState } from 'react'
import BarcodeScanner from './BarcodeScanner'

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default function CameraScanModal({
  open,
  title,
  onClose,
  onDecoded,
}: {
  open: boolean
  title: string
  onClose: () => void
  onDecoded: (value: string) => void
}) {
  const titleId = useId()
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (open) {
      setLocalError('')
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 max-h-[95dvh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <CameraIcon className="w-6 h-6 text-blue-600 shrink-0" />
            <h2 id={titleId} className="text-lg font-semibold text-slate-900 leading-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close scanner"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          <p className="text-sm text-slate-600">
            Allow camera access when prompted. Point at a barcode or QR code; the value is read automatically. Works
            best on your phone over HTTPS.
          </p>
          <BarcodeScanner
            onDetected={(code) => {
              onDecoded(code.trim())
              onClose()
            }}
            onError={() => setLocalError('Camera or decoding error. Check permissions and try again.')}
          />
          {localError && (
            <p className="text-sm text-red-600" role="alert">
              {localError}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-lg border-2 border-slate-300 text-slate-800 font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export { CameraIcon }
