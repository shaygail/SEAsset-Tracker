import { NextRequest, NextResponse } from 'next/server'
import { assignToRequest, updateAsset } from '@/lib/jira'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    const { assetKey, ticketKey, assignedTo } = payload
    
    if (!assetKey || !ticketKey || !assignedTo) {
      return NextResponse.json(
        {
          error: 'Missing required fields: assetKey, ticketKey, assignedTo',
        },
        { status: 400 }
      )
    }

    // Step 1: Link the asset to the request ticket
    console.log('[assignToRequest] Assigning:', { assetKey, ticketKey, assignedTo })
    
    const result = await assignToRequest({
      assetKey,
      ticketKey,
      assignedTo,
    })

    // Step 2: Update the asset status in Jira Assets
    try {
      // Note: This is simplified - in production you'd fetch the account ID for the user
      await updateAsset({
        objectKey: assetKey,
        assignedToAccountId: '', // Would be populated from user search in production
        assignedToDisplay: assignedTo,
        status: 'Issued',
        locationKey: '',
        dateIssued: new Date().toISOString().split('T')[0],
      })
    } catch (err) {
      // Log but don't fail - ticket was linked even if asset update failed
      console.warn('[assignToRequest] Warning: Could not update asset status:', err)
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assignToRequest] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
