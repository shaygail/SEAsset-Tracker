import { NextRequest, NextResponse } from 'next/server'
import { getRequestDetails } from '@/lib/jira'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const ticketKey = decodeURIComponent(key)
    
    const requestDetails = await getRequestDetails(ticketKey)
    
    if (!requestDetails) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    return NextResponse.json({ request: requestDetails })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[getRequest] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
