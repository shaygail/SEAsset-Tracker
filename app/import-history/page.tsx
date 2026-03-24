'use client'

import { useEffect, useState } from 'react'

interface ImportHistoryEntry {
  timestamp: string
  assetCount: number
  successCount: number
  failedCount: number
  objectKeys: string[]
  assetTypes: Record<string, number>
  /** Failed assets with their error messages */
  failedAssets?: Array<{ assetTag: string; error: string }>
  notes?: string
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchHistory() {
      try {
        const resp = await fetch('/api/importHistory')
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Failed to load history')
        setHistory(data.history || [])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const toggleExpanded = (timestamp: string) => {
    const newSet = new Set(expandedRows)
    if (newSet.has(timestamp)) {
      newSet.delete(timestamp)
    } else {
      newSet.add(timestamp)
    }
    setExpandedRows(newSet)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-sm font-medium">Loading import history…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
        <p className="font-semibold">✗ Failed to load history</p>
        <p className="mt-1">{error}</p>
      </div>
    )
  }

  if (!history.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
          <p className="mt-1 text-sm text-gray-500">Track all asset imports</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-sm text-blue-800">ℹ No imports yet.</p>
          <p className="text-xs text-blue-700 mt-1">Start by importing assets from the Import page.</p>
          <a
            href="/import"
            className="inline-block mt-3 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Go to Import →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
        <p className="mt-1 text-sm text-gray-500">
          {history.length} import batch{history.length !== 1 ? 'es' : ''} recorded
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Imports</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{history.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Assets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {history.reduce((sum, h) => sum + h.assetCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Success Rate</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {(
              (history.reduce((sum, h) => sum + h.successCount, 0) /
                history.reduce((sum, h) => sum + h.assetCount, 0)) *
              100
            ).toFixed(0)}
            %
          </p>
        </div>
      </div>

      {/* Import batches */}
      <div className="space-y-3">
        {history.map((entry) => {
          const isExpanded = expandedRows.has(entry.timestamp)
          const date = new Date(entry.timestamp)
          const typesList = Object.entries(entry.assetTypes)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `${count}× ${type}`)
            .join(', ')

          return (
            <div key={entry.timestamp} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleExpanded(entry.timestamp)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {date.toLocaleDateString('en-NZ', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {date.toLocaleTimeString('en-NZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{typesList}</p>
                </div>

                <div className="flex items-center gap-4 pr-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{entry.assetCount} assets</p>
                    <p className="text-xs text-gray-500">
                      {' '}
                      <span className="text-green-600">✓ {entry.successCount}</span>
                      {entry.failedCount > 0 && <span className="text-red-600 ml-2">✗ {entry.failedCount}</span>}
                    </p>
                  </div>

                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 space-y-4">
                  {/* Asset type breakdown */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Asset Types</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(entry.assetTypes)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                          >
                            {type} <span className="text-gray-500">({count})</span>
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Asset keys list */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Imported Assets ({entry.objectKeys.length})
                    </p>
                    <div className="bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                      <div className="flex flex-wrap gap-2 p-3">
                        {entry.objectKeys.map((key) => (
                          <a
                            key={key}
                            href={`/asset/${key}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                          >
                            {key}
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Failed assets with errors */}
                  {entry.failedAssets && entry.failedAssets.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 uppercase mb-2">
                        Failed Assets ({entry.failedAssets.length})
                      </p>
                      <div className="bg-white rounded-lg border border-red-200 max-h-48 overflow-y-auto">
                        <div className="divide-y divide-red-100">
                          {entry.failedAssets.map((failed, idx) => (
                            <div key={idx} className="p-3">
                              <p className="text-xs font-semibold text-gray-900">{failed.assetTag}</p>
                              <p className="text-xs text-red-600 mt-1">{failed.error}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Asset keys list */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Imported Assets ({entry.objectKeys.length})
                    </p>
                    <div className="bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                      <div className="flex flex-wrap gap-2 p-3">
                        {entry.objectKeys.map((key) => (
                          <a
                            key={key}
                            href={`/asset/${key}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                          >
                            {key}
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {entry.notes && (
                    <div className="text-xs text-gray-600 bg-white rounded-lg border border-gray-200 p-3">
                      <p className="font-semibold text-gray-700 mb-1">Notes</p>
                      {entry.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
