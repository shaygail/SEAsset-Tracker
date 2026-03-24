import { NextRequest, NextResponse } from 'next/server'
import { searchPendingRequests } from '@/lib/jira'

export async function GET(request: NextRequest) {
  try {
    const requests = await searchPendingRequests()
    return NextResponse.json({ requests })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[pendingRequests] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
