'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  objectKey: string
  objectId: string
  model: string
}

type Step = 'closed' | 'confirm' | 'pin'
type State = 'idle' | 'loading' | 'error'

export default function DeleteAssetButton({ objectKey, objectId, model }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('closed')
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const pinRef = useRef<HTMLInputElement>(null)

  // Focus PIN input when that step opens
  useEffect(() => {
    if (step === 'pin') {
      setTimeout(() => pinRef.current?.focus(), 50)
    }
  }, [step])

  function open() {
    setStep('confirm')
    setReason('')
    setPin('')
    setState('idle')
    setErrorMsg('')
  }

  function close() {
    setStep('closed')
    setReason('')
    setPin('')
    setState('idle')
    setErrorMsg('')
  }

  async function handleDelete() {
    if (!pin.trim()) { setErrorMsg('Please enter the approval PIN.'); return }
    setState('loading')
    setErrorMsg('')

    try {
      const resp = await fetch('/api/jira/deleteAsset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, objectKey, reason, pin }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setState('error')
        setErrorMsg(data.error ?? 'Delete failed.')
        return
      }
      // Success — redirect to home with a deleted notice
      router.push(`/?deleted=${encodeURIComponent(objectKey)}`)
    } catch {
      setState('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={open}
        className="text-sm font-semibold text-red-600 hover:text-red-800 hover:underline transition-colors"
      >
        🗑 Delete Asset
      </button>

      {/* Modal backdrop */}
      {step !== 'closed' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="font-bold text-red-800 text-lg leading-tight">Delete Asset</h2>
                <p className="text-xs text-red-600">{objectKey} — {model}</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* ── Step 1: Confirm ── */}
              {step === 'confirm' && (
                <>
                  <p className="text-sm text-gray-700">
                    This will <span className="font-semibold text-red-700">permanently delete</span> this
                    asset from Jira Assets. This action cannot be undone.
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Reason for deletion <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Hardware failure — beyond repair"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={close}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setStep('pin')}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
                    >
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* ── Step 2: PIN ── */}
              {step === 'pin' && (
                <>
                  <p className="text-sm text-gray-700">
                    Enter the <span className="font-semibold">approval PIN</span> to authorise this deletion.
                    Contact your team manager if you don&apos;t have it.
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Approval PIN
                    </label>
                    <input
                      ref={pinRef}
                      type="password"
                      placeholder="••••••"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value); setErrorMsg('') }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleDelete() }}
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setStep('confirm'); setPin(''); setErrorMsg('') }}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={state === 'loading'}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                      {state === 'loading' ? 'Deleting…' : '🗑 Confirm Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
