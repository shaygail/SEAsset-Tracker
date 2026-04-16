import { NextResponse } from 'next/server'
import { getReceivingStockHistory } from '@/lib/importHistory'

export async function GET() {
  try {
    const history = getReceivingStockHistory()
    return NextResponse.json({ history })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[receivingStockHistory] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
