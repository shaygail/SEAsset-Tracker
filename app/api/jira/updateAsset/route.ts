import { NextRequest, NextResponse } from 'next/server'
import { updateAsset } from '@/lib/jira'
import { logChange } from '@/lib/changelog'

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { objectKey, assignedToAccountId, assignedToDisplay, status, locationKey, dateIssued } = body as Record<string, unknown>

  if (!objectKey || typeof objectKey !== 'string') {
    return NextResponse.json({ error: 'Missing required field: objectKey' }, { status: 400 })
  }

  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'Missing required field: status' }, { status: 400 })
  }

  try {
    await updateAsset({
      objectKey: objectKey.trim().toUpperCase(),
      assignedToAccountId: typeof assignedToAccountId === 'string' ? assignedToAccountId.trim() : '',
      assignedToDisplay: typeof assignedToDisplay === 'string' ? assignedToDisplay.trim() : '',
      status: status.trim(),
      locationKey: typeof locationKey === 'string' ? locationKey.trim() : '',
      dateIssued: typeof dateIssued === 'string' ? dateIssued.trim() : '',
    })

    // Record change in audit log
    logChange({
      timestamp: new Date().toISOString(),
      action: 'UPDATE',
      objectKey: objectKey.trim().toUpperCase(),
      status: status.trim(),
      assignedTo: typeof assignedToDisplay === 'string' ? assignedToDisplay.trim() : undefined,
      dateIssued: typeof dateIssued === 'string' ? dateIssued.trim() || undefined : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[updateAsset] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
