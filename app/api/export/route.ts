import { NextRequest } from 'next/server'
import { readChanges, entriesToCsv } from '@/lib/changelog'

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get('year')
  const monthParam = req.nextUrl.searchParams.get('month')

  const year = yearParam ? parseInt(yearParam) : undefined
  const month = monthParam ? parseInt(monthParam) : undefined

  const entries = readChanges(
    year !== undefined && !isNaN(year) ? year : undefined,
    month !== undefined && !isNaN(month) ? month : undefined,
  )

  const csv = entriesToCsv(entries)

  // Build descriptive filename: asset-changes-2026-03.csv
  const yearStr = year && !isNaN(year) ? `-${year}` : ''
  const monthStr = month && !isNaN(month) ? `-${String(month).padStart(2, '0')}` : ''
  const filename = `asset-changes${yearStr}${monthStr}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
