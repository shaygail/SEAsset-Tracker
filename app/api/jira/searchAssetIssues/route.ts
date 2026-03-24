import { NextRequest, NextResponse } from 'next/server'
import { searchAssetIssues } from '@/lib/jira'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const assetKey = searchParams.get('assetKey')

  if (!assetKey || typeof assetKey !== 'string') {
    return NextResponse.json({ error: 'Missing required parameter: assetKey' }, { status: 400 })
  }

  try {
    const issues = await searchAssetIssues(assetKey.trim().toUpperCase())
    return NextResponse.json({ issues })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[searchAssetIssues] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
