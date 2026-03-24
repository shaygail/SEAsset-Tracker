import { NextRequest, NextResponse } from 'next/server'
import { createSandboxTicket } from '@/lib/jira'

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { objectKey, assignedTo, status, location, summary, description, vendorSupportId } = body as Record<string, unknown>

  if (!objectKey || typeof objectKey !== 'string') {
    return NextResponse.json({ error: 'Missing required field: objectKey' }, { status: 400 })
  }

  try {
    const issueKey = await createSandboxTicket({
      objectKey: objectKey.trim().toUpperCase(),
      assignedTo: typeof assignedTo === 'string' ? assignedTo.trim() : '',
      status: typeof status === 'string' ? status.trim() : '',
      location: typeof location === 'string' ? location.trim() : '',
      summary: typeof summary === 'string' ? summary.trim() : undefined,
      description: typeof description === 'string' ? description.trim() : undefined,
      vendorSupportId: typeof vendorSupportId === 'string' ? vendorSupportId.trim() : undefined,
    })

    return NextResponse.json({ issueKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[createTicket] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
