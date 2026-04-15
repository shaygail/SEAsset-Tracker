import { NextRequest, NextResponse } from 'next/server'
import { createAsset, CreateAssetPayload, DEFAULT_OBJECT_TYPE } from '@/lib/jira'
import { logChange } from '@/lib/changelog'
import { logImport } from '@/lib/importHistory'

interface ImportRow extends CreateAssetPayload {
  rowIndex?: number
  /** Track if the row didn't have a type (used default) */
  usedDefaultType?: boolean
  /** Detected OS for phones (iPhone/Android) - for better feedback */
  detectedOS?: string
}

export async function POST(req: NextRequest) {
  let rows: ImportRow[]
  try {
    rows = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const results = []

  for (const row of rows) {
    const { rowIndex, usedDefaultType, detectedOS, ...payload } = row
    
    // Debug: Log the actual payload we're about to process
    console.log(`Processing row ${rowIndex}:`, JSON.stringify(payload, null, 2))
    
    try {
      // Validate that at least one meaningful field is provided
      const hasContent = !!(
        payload.model ||
        payload.serialNumber ||
        payload.assetTag ||
        payload.manufacturer ||
        payload.locationName ||
        payload.dateAdded
      )
      
      if (!hasContent) {
        throw new Error(
          `Row contains no asset data. At least one of: Model name, Serial Number, Asset Tag, or Manufacturer is required.`
        )
      }

      const raw = await createAsset(payload)
      // createAsset may return "TA-123 (note: skipped fields — ...)" for partial success
      const noteMatch = raw.match(/^(.+?)\s*\(note:\s*(.+)\)$/)
      const createdKey = noteMatch ? noteMatch[1].trim() : raw
      
      // If default type was used, include that in the warning
      let warning = noteMatch ? noteMatch[2].trim() : undefined
      if (usedDefaultType) {
        const osLabel = detectedOS ? ` (${detectedOS})` : ''
        warning = warning 
          ? `Auto-assigned type to ${DEFAULT_OBJECT_TYPE}${osLabel}; ${warning}`
          : `Auto-assigned type to ${DEFAULT_OBJECT_TYPE}${osLabel}`
      }
      
      results.push({
        rowIndex,
        success: true,
        objectKey: createdKey,
        warning,
        assetTag: payload.assetTag ?? '',
      })
      // Record creation in audit log
      logChange({
        timestamp: new Date().toISOString(),
        action: 'CREATE',
        objectKey: createdKey,
        assetTag: payload.assetTag,
        objectTypeName: payload.objectTypeName,
        model: payload.model,
        category: payload.category,
        status: payload.status,
        location: payload.locationName,
        dateIssued: payload.dateAdded,
        notes: warning ? `[Auto-import] ${warning}` : undefined,
      })
    } catch (err) {
      const errorMsg = (err as Error).message
      console.error(`Failed to create asset for row ${rowIndex}:`, errorMsg)
      results.push({
        rowIndex,
        success: false,
        error: errorMsg,
        assetTag: payload.assetTag ?? '',
      })
    }
  }

  // Log the import batch
  const successCount = results.filter((r) => r.success).length
  const failedCount = results.filter((r) => !r.success).length
  const objectKeys = results
    .filter((r) => r.success && r.objectKey)
    .map((r) => r.objectKey as string)
  
  const failedAssets = results
    .filter((r) => !r.success)
    .map((r) => ({
      assetTag: r.assetTag || `Row ${r.rowIndex}`,
      error: r.error || 'Unknown error',
    }))
  
  const assetTypeCount: Record<string, number> = {}
  rows.forEach((row) => {
    const type = row.objectTypeName || 'Unknown'
    assetTypeCount[type] = (assetTypeCount[type] || 0) + 1
  })

  logImport({
    timestamp: new Date().toISOString(),
    assetCount: rows.length,
    successCount,
    failedCount,
    objectKeys,
    assetTypes: assetTypeCount,
    failedAssets: failedAssets.length > 0 ? failedAssets : undefined,
  })

  return NextResponse.json(results)
}
