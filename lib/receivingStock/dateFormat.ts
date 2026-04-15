/**
 * Validates `dd/mm/yyyy` and returns a `Date` in local calendar, or null if invalid.
 */
export function parseDdMmYyyy(input: string): Date | null {
  const trimmed = input.trim()
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const d = new Date(yyyy, mm - 1, dd)
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null
  return d
}

/** Converts a valid `dd/mm/yyyy` string to `YYYY-MM-DD` for Jira date attributes. */
export function ddMmYyyyToIsoDate(input: string): string | null {
  const d = parseDdMmYyyy(input)
  if (!d) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/**
 * Normalises intake dates from CSV or Receiving Stock to `YYYY-MM-DD` for Jira.
 * Accepts: `dd/mm/yyyy`, `yyyy-mm-dd`, or ISO datetime strings.
 */
export function normalizeIntakeDateToIso(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined
  const s = raw.trim()
  if (!s) return undefined
  const fromDdMm = ddMmYyyyToIsoDate(s)
  if (fromDdMm) return fromDdMm
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (ymd) return ymd[1]
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return undefined
}
