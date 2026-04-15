'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EquipmentRequest {
  key: string
  summary: string
  requester: string
  requesterName: string
  requesterEmail: string
  description: string
  equipmentItems: string[]
  createdDate: string
  status: string
  assignedAssetKey: string | null
}

export default function PendingRequestsSection() {
  const [requests, setRequests] = useState<EquipmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchRequests() {
      try {
        const resp = await fetch('/api/jira/pendingRequests')
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Failed to load requests')
        setRequests(data.requests ?? [])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Pending Equipment Requests</h2>
        <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading pending requests…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Pending Equipment Requests</h2>
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">Could not load requests: {error}</div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Pending Equipment Requests</h2>
        <div className="text-sm text-slate-500 italic">No pending equipment requests at this time.</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Pending Equipment Requests ({requests.length})</h2>
      </div>

      <div className="space-y-3">
        {requests.map((req) => {
          const createdDate = new Date(req.createdDate).toLocaleDateString()

          return (
            <Link
              key={req.key}
              href={`/request/${req.key}`}
              className="block border border-slate-200 rounded-xl p-4 hover:bg-blue-50/80 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-700 hover:underline">{req.key}</p>
                  <p className="text-sm text-slate-700 mt-1">{req.summary}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                    <span>👤 {req.requesterName}</span>
                    <span className="tabular-nums">📅 {createdDate}</span>
                  </div>
                  {req.equipmentItems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {req.equipmentItems.map((item, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-800">
                  {req.status}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        💡 Click a request to scan an asset QR code or manually select an asset to assign.
      </div>
    </div>
  )
}
