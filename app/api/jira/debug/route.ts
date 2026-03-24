import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint — returns raw Jira Assets data for a given object key.
 * Use this to discover the real attribute names in your Jira schema.
 * Access via: GET /api/jira/debug?objectKey=TA-1
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const objectKey = searchParams.get('objectKey')

  const workspaceId = process.env.JIRA_ASSETS_WORKSPACE_ID
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!workspaceId || !email || !token) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
  }

  const credentials = Buffer.from(`${email}:${token}`).toString('base64')
  const headers = {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const assetsBase = `https://api.atlassian.com/jsm/assets/workspace/${workspaceId}/v1`

  try {
    const qlQuery = objectKey ? `Key = "${objectKey.toUpperCase()}"` : 'Key is not empty'
    const params = new URLSearchParams({ qlQuery, resultPerPage: '3', includeAttributes: 'true' })
    const url = `${assetsBase}/aql/objects?${params.toString()}`

    const resp = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    const text = await resp.text()

    if (!resp.ok) {
      return NextResponse.json({ error: `API error (${resp.status})`, raw: text }, { status: resp.status })
    }

    const data = JSON.parse(text)

    // Extract attribute names from each returned object
    const summary = (data.objectEntries ?? []).map((obj: Record<string, unknown>) => {
      const attrs = (obj.attributes as Array<{ objectTypeAttribute?: { name?: string }; objectAttributeValues?: Array<{ value?: string; displayValue?: string }> }>) ?? []
      return {
        objectKey: obj.objectKey,
        label: obj.label,
        id: obj.id,
        objectType: (obj.objectType as { name?: string })?.name,
        attributes: attrs.map((a) => ({
          name: a.objectTypeAttribute?.name,
          value: a.objectAttributeValues?.[0]?.value,
          displayValue: a.objectAttributeValues?.[0]?.displayValue,
        })),
      }
    })

    return NextResponse.json({ total: data.totalFilterCount, objects: summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
