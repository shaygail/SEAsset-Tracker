'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import type { AssetListItem } from '@/lib/jira'
import PendingRequestsSection from '@/components/PendingRequestsSection'

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'In Stock', value: 'In Stock' },
  { label: 'Issued', value: 'Issued' },
  { label: 'Ready to Deploy', value: 'Ready to Deploy' },
  { label: 'Returned', value: 'Returned' },
  { label: 'Faulty', value: 'Faulty' },
]

const ASSET_TYPES = [
  { label: 'All Assets', value: '' },
  { label: 'Keyboard', value: 'Keyboard' },
  { label: 'Mouse', value: 'Mouse' },
  { label: 'Monitor', value: 'Monitor' },
  { label: 'Laptop', value: 'Laptop' },
  { label: 'Desktop', value: 'Desktop' },
  { label: 'Docking Station', value: 'Docking Station' },
  { label: 'Headset', value: 'Headset' },
]

const STATUS_COLOURS: Record<string, string> = {
  'In Stock': 'bg-green-100 text-green-700',
  'Ready to Deploy': 'bg-blue-100 text-blue-700',
  'Issued': 'bg-orange-100 text-orange-700',
  'Returned': 'bg-yellow-100 text-yellow-700',
  'Faulty': 'bg-red-100 text-red-700',
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<AssetListItem[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [selectedAssetType, setSelectedAssetType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Export state — default to current month/year
  const now = new Date()
  const [exportYear, setExportYear] = useState(now.getFullYear())
  const [exportMonth, setExportMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    const url = `/api/export?year=${exportYear}&month=${exportMonth}`
    // Trigger file download via hidden anchor
    const a = document.createElement('a')
    a.href = url
    a.download = `asset-changes-${exportYear}-${String(exportMonth).padStart(2, '0')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setExporting(false), 1500)
  }

  const fetchAssets = useCallback(async (status: string, assetType: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (assetType) params.append('type', assetType)
      const url = `/api/jira/listAssets${params.size > 0 ? `?${params.toString()}` : ''}`
      const resp = await fetch(url)
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? 'Failed to load assets')
      setAssets(data.assets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets(activeTab, selectedAssetType)
  }, [activeTab, selectedAssetType, fetchAssets])

  return (
    <div className="flex flex-col gap-8 px-2 w-full max-w-2xl mx-auto">
      {/* Pending Equipment Requests Section */}
      <PendingRequestsSection />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Scan a QR code to view and assign any asset</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-900 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M9 21h6v-6H9v6z" />
            </svg>
            Print QR Codes
          </button>
          <a
            href={`/print${activeTab ? `?status=${encodeURIComponent(activeTab)}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Print Stickers{activeTab ? ` (${activeTab})` : ''}
          </a>
          <button
            onClick={() => fetchAssets(activeTab, selectedAssetType)}
            className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 font-semibold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 104.582 9H4" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Print-only heading */}
      <div className="hidden print:block mb-2">
        <h1 className="text-2xl font-bold text-gray-900">⚡ SE Asset Tracker — QR Codes</h1>
        <p className="text-sm text-gray-500 mt-1">Printed {new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Export section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-5 sm:px-6 print:hidden">
        <h2 className="text-base font-bold text-gray-800 mb-3">Export Monthly Change Log</h2>
        <p className="text-sm text-gray-500 mb-4">
          Download a CSV of all asset creates, updates, and deletes recorded this month.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</label>
            <select
              value={exportMonth}
              onChange={(e) => setExportMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('en-NZ', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</label>
            <select
              value={exportYear}
              onChange={(e) => setExportYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            {exporting ? 'Downloading…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap print:hidden mt-2 mb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(activeTab === tab.value ? '' : tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === tab.value
                ? 'bg-blue-700 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Asset Type filter */}
      <div className="flex gap-2 flex-wrap print:hidden mb-2">
        {(() => {
          // Get unique asset types from loaded assets
          const uniqueTypes = Array.from(new Set(assets.map(a => a.objectTypeName)))
            .filter(Boolean)
            .sort()
          
          // Map to label + value pairs and prepend "All Assets"
          const availableTypes = [
            { label: 'All Assets', value: '' },
            ...uniqueTypes.map(type => ({ label: type, value: type }))
          ]
          
          return availableTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedAssetType(selectedAssetType === type.value ? '' : type.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedAssetType === type.value
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:border-green-400 hover:text-green-700'
              }`}
            >
              {type.label}
            </button>
          ))
        })()}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400 print:hidden">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm font-medium">Loading assets…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm print:hidden">
          <p className="font-semibold">✗ Failed to load assets</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assets.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No assets found</p>
          {(activeTab || selectedAssetType) && <p className="text-sm mt-1">Try a different filter</p>}
        </div>
      )}

      {/* Asset grid */}
      {!loading && !error && assets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 print:grid-cols-3 print:gap-4">
          {assets.map((asset) => {
            const jiraUrl = `${process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? 'https://powerco.atlassian.net'}/jira/assets/object/${asset.objectId}`
            const statusCls = STATUS_COLOURS[asset.status] ?? 'bg-gray-100 text-gray-600'
            return (
              <div
                key={asset.objectKey}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4 hover:shadow-md transition-shadow print:shadow-none print:border print:border-gray-300 print:rounded-xl print:break-inside-avoid"
              >
                {/* Asset info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{asset.objectKey}</p>
                    <p className="text-base font-bold text-gray-900 leading-tight mt-0.5">{asset.model || asset.label}</p>
                    {asset.serialNumber && (
                      <p className="text-xs text-gray-400 mt-1">S/N: {asset.serialNumber}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls}`}>
                    {asset.status}
                  </span>
                </div>

                {asset.assignedTo && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Assigned:</span> {asset.assignedTo}
                  </p>
                )}
                {asset.location && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">Location:</span> {asset.location}
                  </p>
                )}

                {/* QR Code — scans open Jira Assets directly */}
                {asset.objectId && (
                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-gray-100">
                    <QRCodeSVG
                      value={jiraUrl}
                      size={140}
                      level="M"
                      className="rounded"
                    />
                    <p className="text-xs text-gray-400 text-center">{asset.objectKey}</p>
                  </div>
                )}

                {/* View button — hidden when printing */}
                <Link
                  href={`/asset/${asset.objectKey}`}
                  className="block text-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm rounded-lg py-2 transition-colors print:hidden"
                >
                  View &amp; Assign →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
