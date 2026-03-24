import { NextRequest, NextResponse } from 'next/server'
import { listAssets } from '@/lib/jira'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const type = searchParams.get('type') ?? undefined

  try {
    const assets = await listAssets(status, type)
    return NextResponse.json({ assets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[listAssets] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
