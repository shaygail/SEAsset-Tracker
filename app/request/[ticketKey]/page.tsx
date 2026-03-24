'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-semibold text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value || <span className="text-gray-400 italic">—</span>}</span>
    </div>
  )
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketKey = (params.ticketKey as string) || ''

  const [request, setRequest] = useState<EquipmentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAsset, setSelectedAsset] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    async function fetchRequest() {
      try {
        const resp = await fetch(`/api/jira/request/${encodeURIComponent(ticketKey)}`)
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Failed to load request')
        setRequest(data.request)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    if (ticketKey) {
      fetchRequest()
    }
  }, [ticketKey])

  const handleAssignAsset = async () => {
    if (!selectedAsset || !request) return

    setAssigning(true)
    try {
      const resp = await fetch('/api/jira/assignToRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetKey: selectedAsset,
          ticketKey: request.key,
          assignedTo: request.requesterEmail,
        }),
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Failed to assign asset')

      // Success! Redirect to asset page
      router.push(`/asset/${selectedAsset}`)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-gray-500">Loading request…</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h2 className="font-bold text-lg mb-1">Failed to load request</h2>
        <p className="text-sm mb-4">{error || 'Request not found'}</p>
        <Link href="/dashboard" className="text-red-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const createdDate = new Date(request.createdDate).toLocaleString()

  return (
    <div className="space-y-6">
      {/* Request Details Card */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Equipment Request</p>
            <h1 className="text-3xl font-bold text-gray-900">{request.key}</h1>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
            {request.status}
          </span>
        </div>

        <div className="mt-4">
          <DetailRow label="Summary" value={request.summary} />
          <DetailRow label="Requester" value={`${request.requesterName} (${request.requesterEmail})`} />
          <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-500 w-40 shrink-0">Equipment Needed</span>
            <div className="flex flex-wrap gap-2">
              {request.equipmentItems.length > 0 ? (
                request.equipmentItems.map((item, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 italic">—</span>
              )}
            </div>
          </div>
          <DetailRow label="Created" value={createdDate} />
          <DetailRow label="Status" value={request.status} />
        </div>

        {request.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-500 mb-2">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">{request.description}</p>
          </div>
        )}
      </div>

      {/* Asset Assignment Card */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Equipment Checklist</h2>

        {/* Equipment items checklist */}
        <div className="space-y-2 mb-6">
          {request.equipmentItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <input type="checkbox" disabled className="w-5 h-5" />
              <span className="text-sm text-gray-700">{item}</span>
              <span className="text-xs text-gray-400 ml-auto">Assign this item below</span>
            </div>
          ))}
        </div>

        <hr className="my-6" />

        <h2 className="text-lg font-bold text-gray-800 mb-4">Assign Asset to Request</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="asset" className="block text-sm font-medium text-gray-700 mb-2">
              Asset Key (or scan QR code)
            </label>
            <input
              id="asset"
              type="text"
              placeholder="e.g., TA-798"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the asset key or scan a QR code with your device camera
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAssignAsset}
              disabled={!selectedAsset || assigning}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {assigning ? 'Assigning…' : 'Assign Asset'}
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>

        {request.assignedAssetKey && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✓ Asset {request.assignedAssetKey} already assigned to this request
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
        <p className="font-semibold mb-3">🎯 Assignment Instructions:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <strong>For Laptop:</strong> Scan the laptop asset QR code, enter key (e.g., TA-798), click "Assign Asset"
          </li>
          <li>
            <strong>For Mouse:</strong> Repeat: scan mouse asset QR, enter key, click "Assign Asset"
          </li>
          <li>
            <strong>For Keyboard:</strong> Repeat the same process for keyboard asset
          </li>
          <li>
            <strong>For Headset:</strong> Repeat for headset asset
          </li>
          <li>
            <strong>For Backpack:</strong> Repeat for backpack asset (if in Asset Tracker)
          </li>
        </ol>
        <p className="text-xs text-green-800 mt-3 italic">
          💡 After each assignment, you'll be redirected to the asset page. Use the browser back button to return here to assign the next item.
        </p>
      </div>
    </div>
  )
}
