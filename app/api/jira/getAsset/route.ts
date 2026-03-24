import { NextRequest, NextResponse } from 'next/server'
import { fetchAsset } from '@/lib/jira'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const objectKey = searchParams.get('objectKey')

  if (!objectKey) {
    return NextResponse.json(
      { error: 'Missing required parameter: objectKey' },
      { status: 400 }
    )
  }

  try {
    const asset = await fetchAsset(objectKey.trim())
    return NextResponse.json(asset)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error('[getAsset] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
