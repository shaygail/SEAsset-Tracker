import { NextRequest, NextResponse } from 'next/server'
import type { CreateAssetPayload } from '@/lib/jira'
import { createAssetWithDetails } from '@/lib/jira'
import { logChange } from '@/lib/changelog'
import { logImport } from '@/lib/importHistory'

export interface ReceivingStockApiRowResult {
  rowIndex: number
  success: boolean
  objectKey?: string
  objectId?: string
  error?: string
  warning?: string
}

export async function POST(req: NextRequest) {
  let rows: CreateAssetPayload[]
  try {
    rows = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const results: ReceivingStockApiRowResult[] = []

  for (let i = 0; i < rows.length; i++) {
    const payload = rows[i]
    try {
      const detail = await createAssetWithDetails(payload)
      let warning: string | undefined
      if (detail.skippedFieldNotes) {
        warning = `Some fields were not set in Jira: ${detail.skippedFieldNotes}`
      }
      results.push({
        rowIndex: i,
        success: true,
        objectKey: detail.objectKey,
        objectId: detail.objectId,
        warning,
      })
      logChange({
        timestamp: new Date().toISOString(),
        action: 'CREATE',
        objectKey: detail.objectKey,
        objectTypeName: payload.objectTypeName,
        model: payload.model,
        category: payload.category,
        status: payload.status,
        location: payload.locationName,
        dateIssued: payload.dateAdded,
        notes: warning ? `[Receiving Stock] ${warning}` : '[Receiving Stock]',
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[receivingStock] row ${i}:`, errorMsg)
      results.push({
        rowIndex: i,
        success: false,
        error: errorMsg,
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failedCount = results.filter((r) => !r.success).length
  const objectKeys = results.filter((r) => r.success && r.objectKey).map((r) => r.objectKey as string)

  const assetTypeCount: Record<string, number> = {}
  rows.forEach((row) => {
    const t = row.objectTypeName || 'Unknown'
    assetTypeCount[t] = (assetTypeCount[t] || 0) + 1
  })

  logImport({
    timestamp: new Date().toISOString(),
    assetCount: rows.length,
    successCount,
    failedCount,
    objectKeys,
    assetTypes: assetTypeCount,
    source: 'receiving-stock',
    failedAssets:
      failedCount > 0
        ? results
            .filter((r) => !r.success)
            .map((r) => ({ assetTag: `Row ${r.rowIndex}`, error: r.error || 'Unknown' }))
        : undefined,
  })

  return NextResponse.json(results)
}
