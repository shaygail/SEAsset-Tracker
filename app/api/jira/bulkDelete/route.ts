import { NextRequest, NextResponse } from 'next/server'
import { deleteAsset } from '@/lib/jira'

interface BulkDeletePayload {
  objectKeys: string[]
}

export async function POST(req: NextRequest) {
  let payload: BulkDeletePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload.objectKeys?.length) {
    return NextResponse.json({ error: 'No object keys provided' }, { status: 400 })
  }

  const results = []

  for (const objectKey of payload.objectKeys) {
    try {
      await deleteAsset(objectKey)
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
