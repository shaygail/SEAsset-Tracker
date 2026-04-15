import type { CreateAssetPayload } from '@/lib/jira'
import { normalizeIntakeDateToIso } from '@/lib/receivingStock/dateFormat'
import { generateAssetTitleForObjectType } from '@/lib/receivingStock/generateAssetTitle'
import { resolveStatusForJira } from '@/lib/receivingStock/validation'

/**
 * Client-side import row (CSV) before stripping metadata for the API.
 * Aligns with {@link CreateAssetPayload} plus import-only audit fields.
 */
export type ClientImportRow = CreateAssetPayload & {
  rowIndex: number
  usedDefaultType?: boolean
  detectedOS?: string
}

/**
 * Normalises CSV rows the same way as Receiving Stock before `createAsset`:
 * Jira status casing, date → `YYYY-MM-DD`, and display title / label.
 */
export function enrichImportRowsForJira(
  rows: ClientImportRow[],
  jiraStatusOptions: string[]
): ClientImportRow[] {
  return rows.map((row) => {
    const dateNorm = normalizeIntakeDateToIso(row.dateAdded)
    return {
      ...row,
      status: resolveStatusForJira(row.status || '', jiraStatusOptions),
      dateAdded: dateNorm ?? (row.dateAdded?.trim() || undefined),
      assetLabel: generateAssetTitleForObjectType({
        objectTypeName: row.objectTypeName,
        modelName: row.model || '',
        serialNumber: row.serialNumber,
        imei: row.imei,
      }),
    }
  })
}
