'use client'

import { useState, useRef, useEffect } from 'react'
import { addRecentlyImported } from '@/lib/recentlyImported'
import { enrichImportRowsForJira, type ClientImportRow } from '@/lib/importPayloadEnrich'
import { DEFAULT_OBJECT_TYPE } from '@/lib/jira'

// ─── Types ────────────────────────────────────────────────────────────────────

/** CSV row shape; aligned with Receiving Stock via {@link enrichImportRowsForJira}. */
type ImportRow = ClientImportRow

interface ImportResult {
  rowIndex: number
  success: boolean
  objectKey?: string
  assetTag?: string
  error?: string
  /** Populated when asset was created but some fields were skipped (e.g. invalid Select value) */
  warning?: string
}

// ─── CSV Template Definitions ─────────────────────────────────────────────────

const TEMPLATES = {
  peripherals: {
    label: 'Peripherals (Keyboards, Mice, Monitors, etc.)',
    headers: [
      'Model name',
      'Serial number',
      'Type',
      'Category',
      'Status',
      'Location',
      'Building',
      'Date Received',
      'PO number',
    ],
    sampleRows: [
      'Kensington Pro Fit Ergo Wired,,Keyboard,Wired Keyboard,In Stock,New Plymouth,,,',
      'Logitech Signature MK650,,Keyboard/Mouse Combo,Keyboard/Mouse Combo,In Stock,New Plymouth,,,',
    ],
  },
  phones: {
    label: 'Mobile Phones',
    headers: [
      'Model name',
      'Manufacturer',
      'Serial number',
      'Operating System',
      'IMEI',
      'Category',
      'Status',
      'Location',
      'Building',
      'Date Received',
      'PO number',
    ],
    sampleRows: [
      'Samsung S25 FE,Samsung,R5GYB3DVTCF,Android,350833930813399,Smartphone,In Stock,New Plymouth,,,',
      'Samsung S25 FE,Samsung,R5GYB3DVTEE,Android,350833930813415,Smartphone,In Stock,New Plymouth,,,',
    ],
  },
}

type TemplateKey = keyof typeof TEMPLATES

function inferMonitorCategory(modelName: string, providedCategory?: string): string | undefined {
  const category = (providedCategory || '').trim()
  const modelLower = modelName.toLowerCase()
  const categoryLower = category.toLowerCase()

  if (categoryLower.includes('curved') || categoryLower.includes('34')) return 'Monitor Curved 34"'
  if (categoryLower.includes('43')) return 'Monitor 43"'
  if (categoryLower.includes('24')) return 'Monitor 24"'

  // Known 24" model currently imported without category.
  if (modelLower.includes('philips 243b1') || modelLower.includes('243b1')) return 'Monitor 24"'

  if (modelLower.includes('curved') || modelLower.includes('34')) return 'Monitor Curved 34"'
  if (modelLower.includes('43')) return 'Monitor 43"'
  if (modelLower.includes('24')) return 'Monitor 24"'

  return undefined
}

function normalizeObjectTypeName(providedType?: string): string | undefined {
  const raw = (providedType || '').trim()
  if (!raw) return undefined
  const lower = raw.toLowerCase()

  if (
    lower === 'monitor' ||
    lower.startsWith('monitor 24') ||
    lower.startsWith('monitor curved 34') ||
    lower.startsWith('monitor 43')
  ) {
    return 'Monitor'
  }

  return raw
}

function mapColumns(headers: string[], row: string[]): {
  modelName?: string
  serialNumber?: string
  assetTag?: string
  type?: string
  category?: string
  status?: string
  location?: string
  building?: string
  dateReceived?: string
  poNumber?: string
  manufacturer?: string
  operatingSystem?: string
  imei?: string
} {
  const lowerHeaders = headers.map((h) => h.toLowerCase())
  const result: Record<string, string> = {}

  // Flexible mapping for each field
  const modelIdx = lowerHeaders.findIndex(
    (h) => h.includes('model') || h === 'device' || h === 'item'
  )
  const serialIdx = lowerHeaders.findIndex(
    (h) => h.includes('serial') || h.includes('s/n') || h === 'sn'
  )
  const assetTagIdx = lowerHeaders.findIndex(
    (h) => h.includes('asset tag') || h === 'asset'
  )
  const typeIdx = lowerHeaders.findIndex(
    (h) => h === 'type' || h === 'object type' || h === 'asset type'
  )
  const statusIdx = lowerHeaders.findIndex(
    (h) => h === 'status' || h === 'state'
  )
  const locationIdx = lowerHeaders.findIndex(
    (h) => h === 'location' || h === 'site' || h === 'office'
  )
  const buildingIdx = lowerHeaders.findIndex((h) => h === 'building')
  const dateIdx = lowerHeaders.findIndex(
    (h) => h.includes('date received') || h.includes('date added') || h.includes('received') || h === 'date'
  )
  const poIdx = lowerHeaders.findIndex((h) => h === 'po number' || h === 'po' || h === 'purchase order')
  const manufacturerIdx = lowerHeaders.findIndex((h) => h === 'manufacturer' || h === 'brand')
  const osIdx = lowerHeaders.findIndex((h) => h.includes('operating system') || h === 'os')
  const imeiIdx = lowerHeaders.findIndex((h) => h === 'imei')
  const categoryIdx = lowerHeaders.findIndex(
    (h) => h === 'category' || h.includes('asset category') || h === 'subcategory' || h === 'device category'
  )

  return {
    modelName: row[modelIdx]?.trim(),
    serialNumber: row[serialIdx]?.trim(),
    assetTag: row[assetTagIdx]?.trim(),
    type: row[typeIdx]?.trim(),
    category: categoryIdx >= 0 ? row[categoryIdx]?.trim() : undefined,
    status: row[statusIdx]?.trim(),
    location: row[locationIdx]?.trim(),
    building: row[buildingIdx]?.trim(),
    dateReceived: row[dateIdx]?.trim(),
    poNumber: row[poIdx]?.trim(),
    manufacturer: row[manufacturerIdx]?.trim(),
    operatingSystem: row[osIdx]?.trim(),
    imei: row[imeiIdx]?.trim(),
  }
}

function downloadTemplate(templateKey: TemplateKey) {
  const template = TEMPLATES[templateKey]
  const csv = [template.headers.join(','), ...template.sampleRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `asset-import-template-${templateKey}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Minimal CSV parser — handles quoted fields. */
function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    return cols
  })
}

function parseRows(text: string, templateHeaders: string[]): { rows: ImportRow[]; errors: string[] } {
  const all = parseCsv(text)
  if (all.length === 0) return { rows: [], errors: ['No data found in CSV.'] }

  // Detect if first row is a header
  const firstLower = all[0].map((h) => h.toLowerCase())
  const hasHeader = firstLower.some((h) =>
    ['model', 'serial', 'type', 'status', 'location', 'date'].some((k) => h.includes(k))
  )
  const headers = hasHeader ? all[0] : templateHeaders
  const dataRows = hasHeader ? all.slice(1) : all

  const errors: string[] = []
  const rows: ImportRow[] = []
  let assetTagCounter = 1

  dataRows.forEach((cols, i) => {
    const rowNum = i + (hasHeader ? 2 : 1)
    if (cols.every((c) => !c.trim())) return // Skip empty rows
    if (cols.length < 2) { errors.push(`Row ${rowNum}: too few columns`); return }

    const mapped = mapColumns(headers, cols)

    // Auto-detect asset type based on column presence and model name
    const providedType = mapped.type?.trim()
    let objectTypeName = normalizeObjectTypeName(providedType)
    let usedDefaultType = false

    if (!objectTypeName) {
      const modelLower = (mapped.modelName || '').toLowerCase()
      const manufacturerLower = (mapped.manufacturer || '').toLowerCase()
      const osLower = (mapped.operatingSystem || '').toLowerCase()
      const inferredMonitorCategory = inferMonitorCategory(mapped.modelName || '', mapped.category)
      
      // Check for phone-specific fields (Operating System, IMEI)
      if (mapped.operatingSystem || mapped.imei || manufacturerLower.includes('apple') || manufacturerLower.includes('samsung')) {
        objectTypeName = 'Phones'
      }
      // Check for monitor signals in model/category text
      else if (
        inferredMonitorCategory ||
        modelLower.includes('monitor') ||
        modelLower.includes('display') ||
        modelLower.includes('screen')
      ) {
        objectTypeName = 'Monitor'
      }
      // Check for docking station keywords in model name or manufacturer
      else if (
        modelLower.includes('dock') || 
        modelLower.includes('docking') ||
        (manufacturerLower.includes('lenovo') && modelLower.includes('usb')) ||
        (manufacturerLower.includes('lenovo') && modelLower.includes('thunderbolt'))
      ) {
        objectTypeName = 'Docking Station'
      }
      // Default to Accessories
      else {
        objectTypeName = DEFAULT_OBJECT_TYPE
      }
      usedDefaultType = true
    }
    
    const model = mapped.modelName?.trim() || ''
    const serialNumber = mapped.serialNumber?.trim() || ''
    const locationName = mapped.location?.trim() || ''
    // Default to 'In Stock' if not provided
    const status = mapped.status?.trim() || 'In Stock'
    const dateAdded = mapped.dateReceived?.trim() || ''
    const manufacturer = mapped.manufacturer?.trim() || ''
    const category = mapped.category?.trim() || ''
    const typeAsMonitorCategory = inferMonitorCategory('', providedType)
    const inferredMonitorCategory = inferMonitorCategory(model, category)
    const finalCategory =
      objectTypeName === 'Monitor'
        ? (inferredMonitorCategory || typeAsMonitorCategory || category)
        : category
    
    // Asset tag: prefer explicit asset tag, then serial number, then auto-generate
    const assetTag = mapped.assetTag?.trim() || mapped.serialNumber?.trim() || `TA-IMPORT-${String(assetTagCounter++).padStart(3, '0')}`

    rows.push({
      rowIndex: rowNum,
      objectTypeName,
      assetTag,
      model,
      manufacturer,
      serialNumber,
      category: finalCategory || undefined,
      locationName,
      status,
      dateAdded,
      imei: mapped.imei?.trim() || undefined,
      operatingSystem: mapped.operatingSystem?.trim() || undefined,
      poNumber: mapped.poNumber?.trim() || undefined,
      usedDefaultType,
      // Track detected OS if this is a phone for better feedback
      detectedOS: objectTypeName === 'Phones' ? (mapped.operatingSystem?.trim() || undefined) : undefined,
    })
  })

  return { rows, errors }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'In Stock': 'bg-green-100 text-green-800',
    'Ready to Deploy': 'bg-blue-100 text-blue-800',
    'Issued': 'bg-yellow-100 text-yellow-800',
    'Returned': 'bg-purple-100 text-purple-800',
    'Faulty': 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status || '—'}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  { label: 'Phones', value: 'Phones' },
  { label: 'Mobile', value: 'Mobile' },
]

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('peripherals')
  const [csvText, setCsvText] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssetType, setFilterAssetType] = useState('')
  const [jiraStatusOptions, setJiraStatusOptions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/jira/statusOptions')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setJiraStatusOptions(Array.isArray(data.options) ? data.options : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? ''
      setCsvText(text)
      processText(text)
    }
    reader.readAsText(file)
  }

  function processText(text: string) {
    const { rows: parsed, errors } = parseRows(text, TEMPLATES[selectedTemplate].headers)
    setRows(parsed)
    setParseErrors(errors)
    setResults([])
    setDone(false)
    setProgress(0)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)
    setResults([])
    setDone(false)
    setProgress(0)

    const allResults: ImportResult[] = []

    const rowsForApi = enrichImportRowsForJira(rows, jiraStatusOptions)

    // Send in batches of 5 to avoid hammering the API
    const BATCH = 5
    for (let i = 0; i < rowsForApi.length; i += BATCH) {
      const batch = rowsForApi.slice(i, i + BATCH)
      const resp = await fetch('/api/jira/importAssets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      const batchResults: ImportResult[] = await resp.json()
      allResults.push(...batchResults)
      setResults([...allResults])
      setProgress(Math.min(i + BATCH, rowsForApi.length))
    }

    setImporting(false)
    setDone(true)
    
    // Track successfully imported assets with their types
    const successfulAssets = allResults
      .filter((r) => r.success && r.objectKey)
      .map((r) => {
        const Row = rows.find((row) => row.rowIndex === r.rowIndex)
        return {
          objectKey: r.objectKey as string,
          objectType: Row?.objectTypeName,
        }
      })
    if (successfulAssets.length > 0) {
      addRecentlyImported(successfulAssets)
    }
  }

  const successCount = results.filter((r) => r.success && !r.warning).length
  const warnCount = results.filter((r) => r.success && r.warning).length
  const failCount = results.filter((r) => !r.success).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Asset Import</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file to create multiple new asset records in Jira Assets at once. Dates, status, titles, and
          phone fields (IMEI, OS, PO) are sent the same way as{' '}
          <a href="/receiving-stock" className="text-blue-700 underline font-medium hover:text-blue-900">
            Receive stock
          </a>
          .
        </p>
      </div>

      {/* Step 1 — Template */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Step 1 — Select template & download</h2>
        
        {/* Template selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value as TemplateKey)
              setCsvText('')
              setRows([])
              setParseErrors([])
              setResults([])
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {(Object.entries(TEMPLATES) as Array<[TemplateKey, typeof TEMPLATES.peripherals]>).map(([key, template]) => (
              <option key={key} value={key}>
                {template.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500">
          Upload your stock intake data using this simple format. Asset tags & status are optional (auto-generated & default to In Stock):
        </p>
        
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="text-xs text-left border-collapse min-w-full">
            <thead>
              <tr>
                {TEMPLATES[selectedTemplate].headers.map((h) => (
                  <th key={h} className="border border-gray-300 bg-gray-50 px-3 py-1.5 font-semibold text-gray-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEMPLATES[selectedTemplate].sampleRows.map((sampleRow, idx) => (
                <tr key={idx}>
                  {sampleRow.split(',').map((cell, colIdx) => (
                    <td key={colIdx} className="border border-gray-200 px-3 py-1.5 text-gray-500 italic">
                      {cell || '(optional)'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => downloadTemplate(selectedTemplate)}
            className="text-sm px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ↓ Download CSV template
          </button>
          <div className="text-xs text-gray-400 space-y-1">
            {selectedTemplate === 'phones' ? (
              <>
                <div><span className="font-semibold text-gray-600">Fields:</span> Model, Manufacturer, Serial number, OS, IMEI, optional Category</div>
                <div><span className="font-semibold text-gray-600">Notes:</span> IMEI or serial can be used for auto-tagging. Status defaults to "In Stock" if blank.</div>
              </>
            ) : (
              <>
                <div><span className="font-semibold text-gray-600">Supported Types:</span> Keyboard · Mouse · Monitor · Laptop · Desktop · Docking Station · Headset · Keyboard/Mouse Combo</div>
                <div><span className="font-semibold text-gray-600">Category (optional):</span> e.g. Wired Keyboard, Wireless Mouse, Monitor 24&quot;, Monitor Curved 34&quot;, Monitor 43&quot; — stored in Jira as Asset Category when that field exists.</div>
                <div><span className="font-semibold text-gray-600">Notes:</span> Serial number or asset tag will be used for auto-tagging. Status defaults to "In Stock" if blank.</div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Step 2 — Upload */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Step 2 — Upload your CSV</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* File picker */}
          <label className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
            <span className="text-2xl">📁</span>
            <span className="text-sm font-medium text-gray-700">Click to pick a CSV file</span>
            <span className="text-xs text-gray-400">.csv files only</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFilePick} />
          </label>

          <div className="flex items-center text-gray-400 text-sm font-medium">or</div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">📷</span>
            <a
              href="/import/scan"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Scan Barcode
            </a>
            <span className="text-xs text-gray-400">Scan with camera or enter manually</span>
          </div>

          {/* Paste area */}
          <div className="flex-1">
            <textarea
              rows={7}
              placeholder={`Paste CSV data here...\n\n${TEMPLATES[selectedTemplate].headers.join(',')}\n${TEMPLATES[selectedTemplate].sampleRows.join('\n')}`}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value)
                processText(e.target.value)
              }}
            />
          </div>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            {parseErrors.map((e, i) => <div key={i}>⚠ {e}</div>)}
          </div>
        )}
      </section>

      {/* Step 3 — Preview */}
      {rows.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Step 3 — Preview ({rows.length} row{rows.length !== 1 ? 's' : ''})
            </h2>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? `Importing… (${progress}/${rows.length})` : `Import ${rows.length} asset${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Progress bar */}
          {importing && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress / rows.length) * 100}%` }}
              />
            </div>
          )}

          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(filterStatus === tab.value ? '' : tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  filterStatus === tab.value
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Asset type filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {ASSET_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setFilterAssetType(filterAssetType === type.value ? '' : type.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  filterAssetType === type.value
                    ? 'bg-green-700 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-green-400 hover:text-green-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Asset Tag</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Serial #</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Location</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date Received</th>
                      {results.length > 0 && <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Result</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows
                  .filter((row) => {
                    if (filterStatus && (row.status ?? '') !== filterStatus) return false
                    if (filterAssetType && row.objectTypeName !== filterAssetType) return false
                    return true
                  })
                  .map((row) => {
                  const result = results.find((r) => r.rowIndex === row.rowIndex)
                  return (
                    <tr
                      key={row.rowIndex}
                      className={
                        result
                          ? result.success
                            ? result.warning ? 'bg-yellow-50' : 'bg-green-50'
                            : 'bg-red-50'
                          : 'hover:bg-gray-50'
                      }
                    >
                      <td className="px-3 py-2 text-gray-400 text-xs">{row.rowIndex}</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">{row.objectTypeName}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{row.category || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{row.assetTag || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{row.model || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{row.serialNumber || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{row.locationName || '—'}</td>
                      <td className="px-3 py-2"><StatusBadge status={row.status ?? ''} /></td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{row.dateAdded || '—'}</td>
                      {results.length > 0 && (
                        <td className="px-3 py-2 text-xs">
                          {result ? (
                            result.success ? (
                              result.warning ? (
                                <span className="text-yellow-700 font-semibold" title={result.warning}>⚠ {result.objectKey}</span>
                              ) : (
                                <span className="text-green-700 font-semibold">✓ {result.objectKey}</span>
                              )
                            ) : (
                              <span className="text-red-600" title={result.error}>✗ Error</span>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Summary */}
      {done && (() => {
        const importedKeys = results
          .filter((r) => r.success && r.objectKey)
          .map((r) => r.objectKey as string)
        const printUrl = `/print?keys=${importedKeys.join(',')}`
        return (
          <div className={`rounded-xl p-5 space-y-3 ${
            failCount === 0 && warnCount === 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-sm font-medium ${failCount === 0 && warnCount === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
              {failCount === 0 && warnCount === 0 ? (
                <>✅ All {successCount} asset{successCount !== 1 ? 's' : ''} imported successfully!</>
              ) : (
                <>
                  {successCount > 0 && <>✅ {successCount} imported </>}
                  {warnCount > 0 && <>⚠ {warnCount} imported with skipped fields (hover ⚠ cells for details) </>}
                  {failCount > 0 && <>❌ {failCount} failed</>}
                </>
              )}
            </p>
            {importedKeys.length > 0 && (
              <div className="flex items-center gap-2">
                <a
                  href={printUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M9 21h6v-6H9v6z" />
                  </svg>
                  Print Stickers for {importedKeys.length} Imported Asset{importedKeys.length !== 1 ? 's' : ''}
                </a>
                <a
                  href="/bulk-operations"
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Bulk Update/Delete →
                </a>
              </div>
            )}
          </div>
        )
      })()}

      {/* Warning detail */}
      {done && warnCount > 0 && (
        <section className="bg-white rounded-xl border border-yellow-200 p-5 space-y-2">
          <h3 className="font-semibold text-yellow-800 text-sm">⚠ Rows with skipped fields</h3>
          <p className="text-xs text-yellow-700">These assets were created successfully but some fields were not set because the value wasn’t in the allowed options list. You can edit them directly in Jira Assets.</p>
          {results.filter((r) => r.success && r.warning).map((r) => (
            <div key={r.rowIndex} className="text-xs text-yellow-800 bg-yellow-50 rounded-lg p-3">
              <span className="font-semibold">Row {r.rowIndex} → {r.objectKey}:</span> {r.warning}
            </div>
          ))}
        </section>
      )}

      {/* Errors detail */}
      {done && failCount > 0 && (
        <section className="bg-white rounded-xl border border-red-200 p-5 space-y-2">
          <h3 className="font-semibold text-red-800 text-sm">Failed rows</h3>
          {results.filter((r) => !r.success).map((r) => (
            <div key={r.rowIndex} className="text-xs text-red-700 bg-red-50 rounded-lg p-3">
              <span className="font-semibold">Row {r.rowIndex} (Asset Tag: {r.assetTag || '?'}):</span> {r.error}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
