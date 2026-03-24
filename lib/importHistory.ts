import fs from 'fs'
import path from 'path'

interface ImportHistoryEntry {
  timestamp: string
  assetCount: number
  successCount: number
  failedCount: number
  objectKeys: string[]
  assetTypes: Record<string, number>
  /** Failed assets with their error messages */
  failedAssets?: Array<{ assetTag: string; error: string }>
  notes?: string
}

const LOG_FILE = path.join(process.cwd(), 'logs', 'imports.jsonl')

/**
 * Ensure the logs directory exists.
 */
function ensureLogDir() {
  const dir = path.dirname(LOG_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Append an import history entry to the log file.
 */
export function logImport(entry: ImportHistoryEntry): void {
  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8')
  } catch (err) {
    console.error('[importHistory] Failed to write log:', err)
    // Don't throw — silently fail to avoid disrupting the app
  }
}

/**
 * Read all import history entries from the log file.
 */
export function getImportHistory(): ImportHistoryEntry[] {
  try {
    ensureLogDir()
    if (!fs.existsSync(LOG_FILE)) {
      return []
    }
    const content = fs.readFileSync(LOG_FILE, 'utf-8')
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as ImportHistoryEntry)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  } catch (err) {
    console.error('[importHistory] Failed to read log:', err)
    return []
  }
}

/**
 * Clear all import history (useful for testing).
 */
export function clearImportHistory(): void {
  try {
    ensureLogDir()
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE)
    }
  } catch (err) {
    console.error('[importHistory] Failed to clear log:', err)
  }
}
