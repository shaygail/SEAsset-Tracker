'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const [objectKey, setObjectKey] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const deletedKey = searchParams.get('deleted')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = objectKey.trim()
    if (!trimmed) {
      setError('Please enter an asset tag or object key (e.g. 1234 or TA-575)')
      return
    }
    setError('')
    // Object keys are uppercased; asset tags (numeric) are passed as-is
    const formatted = /^[A-Za-z]+-\d+$/.test(trimmed) ? trimmed.toUpperCase() : trimmed
    router.push(`/asset/${formatted}`)
  }

  return (
    <div className="flex flex-col items-center justify-center mt-6 sm:mt-10 gap-8 w-full max-w-xl mx-auto px-1">
      <div className="text-center w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">Asset Lookup</h1>
        <p className="text-slate-500 text-base">Enter an asset tag or object key to jump straight to an asset</p>
      </div>

      {/* Deleted success notice */}
      {deletedKey && (
        <div className="w-full bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-green-800 text-sm flex items-center gap-2 shadow-sm">
          <span className="text-lg">✅</span>
          <span>Asset <span className="font-semibold">{decodeURIComponent(deletedKey)}</span> was successfully deleted from Jira Assets.</span>
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-md p-6 w-full flex flex-col gap-5 border border-slate-200/80"
      >
        <label htmlFor="objectKey" className="text-sm font-semibold text-gray-700">
          Asset Tag or Object Key
        </label>
        <input
          id="objectKey"
          type="text"
          placeholder="e.g. 1234 or TA-575"
          value={objectKey}
          onChange={(e) => setObjectKey(e.target.value)}
          className="border border-slate-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 placeholder:normal-case bg-slate-50/80"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        <button
          type="submit"
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl py-3 transition-colors shadow-sm"
        >
          View Asset →
        </button>
      </form>

      {/* Dashboard shortcut */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-gray-400 text-sm">or</p>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-800 text-slate-700 font-semibold rounded-xl px-6 py-3 shadow-sm transition-colors text-sm"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          View Asset Dashboard with QR Codes
        </Link>
        <p className="text-gray-400 text-xs">Browse all assets &amp; scan their QR codes</p>
      </div>
    </div>
  )
}
