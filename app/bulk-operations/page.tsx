'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRecentlyImported, clearRecentlyImported } from '@/lib/recentlyImported'

interface RecentAsset {
  objectKey: string
  objectType?: string
  importedAt: string
}

export default function BulkOperationsPage() {
  const router = useRouter()
  const [assets, setAssets] = useState<RecentAsset[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [buildings, setBuildings] = useState<Array<{ id: string; label: string }>>([])
  const [buildingsLoading, setBuildingsLoading] = useState(true)

  // Update fields
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [building, setBuilding] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [objectTypeFilter, setObjectTypeFilter] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Load recently imported assets and buildings on mount
  useEffect(() => {
    const recent = getRecentlyImported()
    setAssets(recent)
    // Auto-expand first type
    if (recent.length > 0) {
      const firstType = recent[0].objectType || 'Other'
      setExpandedTypes(new Set([firstType]))
    }

    // Fetch buildings
    const fetchBuildings = async () => {
      try {
        const resp = await fetch('/api/jira/searchBuildings?all=true')
        const data = await resp.json()
        if (data.buildings) {
          setBuildings(data.buildings.map((b: any) => ({ id: b.objectKey, label: b.label })))
        }
      } catch (err) {
        console.error('Failed to fetch buildings:', err)
      } finally {
        setBuildingsLoading(false)
      }
    }
    fetchBuildings()
  }, [])

  // Group assets by type
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.objectType || 'Other'
    if (!acc[type]) acc[type] = []
    acc[type].push(asset)
    return acc
  }, {} as Record<string, RecentAsset[]>)

  const sortedTypes = Object.keys(assetsByType).sort()

  // Get all available types for filter dropdown
  const availableTypes = sortedTypes

  // Filter assets by selected type if filter is active
  const filteredAssetsByType = objectTypeFilter
    ? { [objectTypeFilter]: assetsByType[objectTypeFilter] || [] }
    : assetsByType
  
  const filteredSortedTypes = Object.keys(filteredAssetsByType).sort()

  // Toggle type expansion
  const toggleTypeExpansion = (type: string) => {
    const newSet = new Set(expandedTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    setExpandedTypes(newSet)
  }

  // Toggle selection
  const toggleSelect = (key: string) => {
    const newSet = new Set(selectedKeys)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setSelectedKeys(newSet)
  }

  // Select all / none in a type
  const toggleTypeSelection = (type: string) => {
    const typeAssets = assetsByType[type]
    const allSelected = typeAssets.every((a) => selectedKeys.has(a.objectKey))
    
    const newSet = new Set(selectedKeys)
    if (allSelected) {
      typeAssets.forEach((a) => newSet.delete(a.objectKey))
    } else {
      typeAssets.forEach((a) => newSet.add(a.objectKey))
    }
    setSelectedKeys(newSet)
  }

  // Select all overall
  const toggleAll = () => {
    if (selectedKeys.size === assets.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(assets.map((a) => a.objectKey)))
    }
  }

  // Bulk update
  async function handleBulkUpdate() {
    if (selectedKeys.size === 0) {
      setError('Please select at least one asset')
      return
    }
    if (!status && !location && !building && !assignedTo) {
      setError('Please select at least one field to update')
      return
    }

    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const resp = await fetch('/api/jira/bulkUpdate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKeys: Array.from(selectedKeys),
          status: status || undefined,
          locationName: location || undefined,
          building: building || undefined,
          assignedToDisplay: assignedTo || undefined,
        }),
      })

      const results = await resp.json()
      if (!resp.ok) throw new Error(results.error || 'Update failed')

      const successCount = results.filter((r: any) => r.success).length
      setSuccess(`✓ Updated ${successCount}/${selectedKeys.size} assets`)
      setSelectedKeys(new Set())
      
      // Refresh the list
      const recent = getRecentlyImported()
      setAssets(recent)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  // Bulk delete
  async function handleBulkDelete() {
    if (selectedKeys.size === 0) {
      setError('Please select at least one asset')
      return
    }

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      const resp = await fetch('/api/jira/bulkDelete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKeys: Array.from(selectedKeys),
        }),
      })

      const results = await resp.json()
      if (!resp.ok) throw new Error(results.error || 'Delete failed')

      const successCount = results.filter((r: any) => r.success).length
      setSuccess(`✓ Deleted ${successCount}/${selectedKeys.size} assets`)
      setShowDeleteConfirm(false)
      setSelectedKeys(new Set())

      // Remove from recent list
      const remaining = assets.filter((a) => !selectedKeys.has(a.objectKey))
      setAssets(remaining)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  if (!assets.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="mt-1 text-sm text-gray-500">Update or delete recently imported assets in bulk</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-sm text-blue-800">ℹ No recently imported assets found.</p>
          <p className="text-xs text-blue-700 mt-1">Import some assets first, then you can bulk update or delete them here.</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
        <p className="mt-1 text-sm text-gray-500">
          {assets.length} recently imported asset{assets.length !== 1 ? 's' : ''} available for updating or deletion
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          <p className="font-semibold">✗ Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 text-sm">
          <p className="font-semibold">✓ Success</p>
          <p className="mt-1">{success}</p>
        </div>
      )}

      {/* Update section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Bulk Update Fields</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type (Filter)</label>
            <select
              value={objectTypeFilter}
              onChange={(e) => {
                setObjectTypeFilter(e.target.value)
                setSelectedKeys(new Set()) // Clear selection when filter changes
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— Show all types —</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type} ({(assetsByType[type] || []).length})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Select a type to filter the assets below</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— No change —</option>
              <option value="In Stock">In Stock</option>
              <option value="Ready to Deploy">Ready to Deploy</option>
              <option value="Issued">Issued</option>
              <option value="Returned">Returned</option>
              <option value="Faulty">Faulty</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New Plymouth, Auckland"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              disabled={buildingsLoading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">— No change —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {buildingsLoading && <p className="text-xs text-gray-400 mt-1">Loading buildings...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Email)</label>
            <input
              type="email"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <button
          onClick={handleBulkUpdate}
          disabled={updating || selectedKeys.size === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {updating ? 'Updating…' : `Update ${selectedKeys.size > 0 ? selectedKeys.size : 0} selected`}
        </button>
      </section>

      {/* Asset sections by type */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Assets {objectTypeFilter ? `— ${objectTypeFilter}` : 'by Type'} ({selectedKeys.size}/{Object.values(filteredAssetsByType).flat().length} selected)
          </h2>
          <button
            onClick={toggleAll}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            {selectedKeys.size === Object.values(filteredAssetsByType).flat().length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {filteredSortedTypes.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-gray-300 p-4 text-center text-sm text-gray-600">
            No assets found for this type
          </div>
        ) : (
          filteredSortedTypes.map((type) => {
            const typeAssets = filteredAssetsByType[type]
            const typeSelected = typeAssets.filter((a) => selectedKeys.has(a.objectKey)).length
            const isExpanded = expandedTypes.has(type)

            return (
              <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Type header */}
                <button
                  onClick={() => toggleTypeExpansion(type)}
                  className="w-full flex items-center justify-between gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">{type}</p>
                    <p className="text-xs text-gray-500">
                      {typeAssets.length} asset{typeAssets.length !== 1 ? 's' : ''} ({typeSelected} selected)
                    </p>
                  </div>
                </div>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
                >
                  <input
                    type="checkbox"
                    checked={typeSelected === typeAssets.length && typeAssets.length > 0}
                    onChange={() => toggleTypeSelection(type)}
                    className="h-4 w-4"
                  />
                  <span>
                    {typeSelected === 0
                      ? 'Select'
                      : typeSelected === typeAssets.length
                        ? 'All'
                        : `${typeSelected}`}
                  </span>
                </label>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 divide-y divide-gray-200">
                  {typeAssets.map((asset) => (
                    <label
                      key={asset.objectKey}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-white cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(asset.objectKey)}
                        onChange={() => toggleSelect(asset.objectKey)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{asset.objectKey}</p>
                        <p className="text-xs text-gray-500">
                          Imported {new Date(asset.importedAt).toLocaleString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })
        )}
      </section>

      {/* Delete section */}
      <section className="bg-red-50 rounded-xl border border-red-200 p-6 space-y-4">
        <h2 className="font-semibold text-red-900">Danger Zone — Bulk Delete</h2>
        <p className="text-sm text-red-700">
          Permanently delete {selectedKeys.size > 0 ? selectedKeys.size : 'selected'} asset{selectedKeys.size !== 1 ? 's' : ''} from Jira Assets. This cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedKeys.size === 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Delete {selectedKeys.size > 0 ? selectedKeys.size : 0} Selected Assets
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-white rounded-lg border border-red-200">
            <p className="text-sm font-semibold text-gray-900">Are you sure?</p>
            <p className="text-xs text-gray-600">
              {selectedKeys.size} asset{selectedKeys.size !== 1 ? 's' : ''} will be permanently deleted. This action cannot be reversed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-900 font-semibold py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
