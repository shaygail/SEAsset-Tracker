import { NextResponse } from 'next/server'
import { getImportHistory } from '@/lib/importHistory'

export async function GET() {
  try {
    const history = getImportHistory()
    return NextResponse.json({ history })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[importHistory] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
