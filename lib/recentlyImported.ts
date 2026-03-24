/**
 * Track recently imported assets in localStorage.
 * Stored as an array of { objectKey, objectType, importedAt: ISO timestamp }
 */

export interface RecentlyImportedAsset {
  objectKey: string
  objectType?: string // e.g. "Keyboard", "Mouse", "Laptop"
  importedAt: string // ISO timestamp
}

const STORAGE_KEY = 'seasset_recently_imported'
const RETENTION_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Add asset keys to the recently imported list.
 */
export function addRecentlyImported(assets: Array<{ objectKey: string; objectType?: string }>): void {
  const now = new Date().toISOString()
  const existing = getRecentlyImported()
  
  const newAssets: RecentlyImportedAsset[] = assets.map((a) => ({
    objectKey: a.objectKey,
    objectType: a.objectType,
    importedAt: now,
  }))
  
  // Combine, removing old duplicates
  const combined = [...existing, ...newAssets]
  const unique = Array.from(
    new Map(combined.map((a) => [a.objectKey, a])).values()
  )
  
  // Remove entries older than 24 hours
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString()
  const filtered = unique.filter((a) => a.importedAt >= cutoff)
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get all recently imported assets (last 24 hours).
 */
export function getRecentlyImported(): RecentlyImportedAsset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const assets: RecentlyImportedAsset[] = JSON.parse(stored)
    
    // Filter to only last 24 hours
    const cutoff = new Date(Date.now() - RETENTION_MS).toISOString()
    return assets.filter((a) => a.importedAt >= cutoff)
  } catch {
    return []
  }
}

/**
 * Clear all recently imported assets from localStorage.
 */
export function clearRecentlyImported(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get count of recently imported assets currently in storage.
 */
export function getRecentlyImportedCount(): number {
  return getRecentlyImported().length
}
