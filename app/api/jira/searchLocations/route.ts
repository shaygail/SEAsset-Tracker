import { NextRequest, NextResponse } from 'next/server'

function getAuthHeaders(): HeadersInit {
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  if (!email || !token) throw new Error('Missing JIRA credentials')
  const credentials = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function getAssetsApiBase(): string {
  const id = process.env.JIRA_ASSETS_WORKSPACE_ID
  if (!id) throw new Error('Missing JIRA_ASSETS_WORKSPACE_ID')
  return `https://api.atlassian.com/jsm/assets/workspace/${id}/v1`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim() ?? ''
  const all = searchParams.get('all') === 'true'

  if (!all && query.length < 1) {
    return NextResponse.json({ locations: [] })
  }

  try {
    const assetsBase = getAssetsApiBase()
    const headers = getAuthHeaders()

    // When fetching all, just filter by objectType; otherwise add label filter
    const qlQuery = all
      ? `objectType = "Location"`
      : `objectType = "Location" AND label like "%${query}%"`
    const params = new URLSearchParams({
      qlQuery,
      resultPerPage: '100',
      includeAttributes: 'false',
    })

    const resp = await fetch(`${assetsBase}/aql/objects?${params.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!resp.ok) {
      // If objectType filter fails, fall back to a broad label search
      const fallbackParams = new URLSearchParams({
        qlQuery: `label like "%${query}%"`,
        resultPerPage: '15',
        includeAttributes: 'false',
      })
      const fallbackResp = await fetch(`${assetsBase}/aql/objects?${fallbackParams.toString()}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      })
      if (!fallbackResp.ok) {
        const text = await fallbackResp.text()
        return NextResponse.json({ error: text }, { status: 500 })
      }
      const fallbackData = await fallbackResp.json()
      const locations = (fallbackData.objectEntries ?? []).map((obj: { id: string; objectKey: string; label: string }) => ({
        objectId: obj.id,
        objectKey: obj.objectKey,
        label: obj.label,
      }))
      return NextResponse.json({ locations })
    }

    const data = await resp.json()
    const locations = (data.objectEntries ?? []).map((obj: { id: string; objectKey: string; label: string }) => ({
      objectId: obj.id,
      objectKey: obj.objectKey,
      label: obj.label,
    }))

    return NextResponse.json({ locations })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[searchLocations] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
