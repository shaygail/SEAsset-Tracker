import { NextRequest, NextResponse } from 'next/server'
import { listAssets } from '@/lib/jira'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const type = searchParams.get('type') ?? undefined
  const category = searchParams.get('category') ?? undefined

  try {
    const assets = await listAssets(status, type, category)
    return NextResponse.json({ assets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[listAssets] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
