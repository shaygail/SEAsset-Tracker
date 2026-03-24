/**
 * Append-only change log.
 * Every update, create, and delete performed through the app is recorded here.
 * The log is stored as newline-delimited JSON (JSONL) in /logs/changes.jsonl
 * relative to the project root (the directory where Next.js runs).
 *
 * Server-side only — never import in client components.
 */

import fs from 'fs'
import path from 'path'

export type ChangeAction = 'UPDATE' | 'CREATE' | 'DELETE'

export interface ChangeEntry {
  timestamp: string       // ISO 8601, e.g. "2026-03-04T09:12:00.000Z"
  action: ChangeAction
  objectKey: string       // e.g. "TA-575"
  assetTag?: string
  model?: string
  objectTypeName?: string // for CREATE
  status?: string
  assignedTo?: string     // display name
  location?: string       // display name
  dateIssued?: string     // YYYY-MM-DD
  reason?: string         // for DELETE
  notes?: string          // extra info (e.g. skipped fields on import)
}

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'changes.jsonl')

/**
 * Appends a single change entry to the log file.
 * Creates the directory and file if they don't exist.
 * Errors are caught and printed to stderr — never thrown, so they
 * never interrupt the main API response.
 */
export function logChange(entry: ChangeEntry): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const line = JSON.stringify({ ...entry, timestamp: entry.timestamp ?? new Date().toISOString() }) + '\n'
    fs.appendFileSync(LOG_FILE, line, 'utf8')
  } catch (err) {
    console.error('[changelog] Failed to write log entry:', err)
  }
}

/**
 * Reads all change entries, optionally filtered by year and/or month (1-12).
 */
export function readChanges(year?: number, month?: number): ChangeEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return []
    const raw = fs.readFileSync(LOG_FILE, 'utf8')
    const entries: ChangeEntry[] = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line) as ChangeEntry }
        catch { return null }
      })
      .filter(Boolean) as ChangeEntry[]

    if (!year && !month) return entries

    return entries.filter((e) => {
      const d = new Date(e.timestamp)
      if (year && d.getFullYear() !== year) return false
      if (month && d.getMonth() + 1 !== month) return false
      return true
    })
  } catch (err) {
    console.error('[changelog] Failed to read log:', err)
    return []
  }
}

/**
 * Converts a list of ChangeEntry objects to CSV text.
 * Handles values that contain commas or quotes.
 */
export function entriesToCsv(entries: ChangeEntry[]): string {
  const HEADERS = [
    'Timestamp (NZT)',
    'Action',
    'Object Key',
    'Asset Tag',
    'Object Type',
    'Model',
    'Status',
    'Assigned To',
    'Location',
    'Date Issued',
    'Reason / Notes',
  ]

  function escape(val: string | undefined): string {
    const s = val ?? ''
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  function toNZT(iso: string): string {
    try {
      return new Date(iso).toLocaleString('en-NZ', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
    } catch { return iso }
  }

  const rows = entries.map((e) =>
    [
      escape(toNZT(e.timestamp)),
      escape(e.action),
      escape(e.objectKey),
      escape(e.assetTag),
      escape(e.objectTypeName),
      escape(e.model),
      escape(e.status),
      escape(e.assignedTo),
      escape(e.location),
      escape(e.dateIssued),
      escape(e.reason ?? e.notes),
    ].join(',')
  )

  return [HEADERS.join(','), ...rows].join('\r\n')
}
