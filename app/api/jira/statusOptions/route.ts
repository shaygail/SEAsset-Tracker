import { NextResponse } from 'next/server'
import { getValidStatusOptions } from '@/lib/jira'

export async function GET() {
  try {
    const options = await getValidStatusOptions()
    return NextResponse.json({ options })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[statusOptions] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
