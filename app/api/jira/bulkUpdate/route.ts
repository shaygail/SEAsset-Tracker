import { NextRequest, NextResponse } from 'next/server'
import { updateAsset, UpdateAssetPayload, fetchAsset } from '@/lib/jira'

interface BulkUpdatePayload {
  objectKeys: string[]
  status?: string
  locationName?: string
  building?: string
  assignedToDisplay?: string
  category?: string
}

async function resolveLocationId(locationName: string): Promise<string> {
  // This is a simplified resolver - in production, you'd want to dedupe and batch these calls
  const response = await fetch('/api/jira/searchLocations', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  
  const locations = await response.json()
  const found = locations.find((l: any) => 
    l.label?.toLowerCase() === locationName.toLowerCase()
  )
  
  if (!found) throw new Error(`Location not found: "${locationName}"`)
  return found.id
}

async function resolveUserAccountId(email: string): Promise<string> {
  const response = await fetch(`/api/jira/searchUsers?query=${encodeURIComponent(email)}`)
  const data = await response.json()
  
  if (!data.users || data.users.length === 0) {
    throw new Error(`User not found: "${email}"`)
  }
  
  // Return the first matched user's accountId
  return data.users[0].accountId
}

export async function POST(req: NextRequest) {
  let payload: BulkUpdatePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload.objectKeys?.length) {
    return NextResponse.json({ error: 'No object keys provided' }, { status: 400 })
  }

  const results = []

  // Pre-resolve location and user once if provided
  let locationKey: string | null = null
  let userAccountId: string | null = null

  if (payload.locationName) {
    try {
      locationKey = await resolveLocationId(payload.locationName)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  }

  if (payload.assignedToDisplay) {
    try {
      userAccountId = await resolveUserAccountId(payload.assignedToDisplay)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
  }

  for (const objectKey of payload.objectKeys) {
    try {
      // Fetch current asset to get missing fields
      const current = await fetchAsset(objectKey)

      const updatePayload: UpdateAssetPayload = {
        objectKey,
        status: payload.status || current.status,
        assignedToAccountId: userAccountId || '',
        assignedToDisplay: payload.assignedToDisplay || current.assignedTo,
        locationKey: locationKey || current.locationKey,
        building: payload.building || undefined,
        dateIssued: '',
      }
      if (payload.category !== undefined) {
        updatePayload.category = payload.category
      }

      await updateAsset(updatePayload)
      results.push({
        objectKey,
        success: true,
      })
    } catch (err) {
      results.push({
        objectKey,
        success: false,
        error: (err as Error).message,
      })
    }
  }

  return NextResponse.json(results)
}

