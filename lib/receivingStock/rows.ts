import type { AssetRow } from './types'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Resize the row list to match `quantity`, preserving existing row data where indices overlap.
 */
export function syncAssetRows(prev: AssetRow[], quantity: number): AssetRow[] {
  if (quantity <= 0) return []
  const next = prev.slice(0, quantity).map((r) => ({ ...r }))
  while (next.length < quantity) {
    next.push({ id: newId() })
  }
  return next
}
