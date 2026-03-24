import { NextRequest, NextResponse } from 'next/server'

/**
 * Search for Jira users by email or name.
 * GET /api/jira/searchUsers?query=someone@powerco.co.nz
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  const base = process.env.JIRA_BASE_URL?.replace(/\/$/, '')

  if (!email || !token || !base) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
  }

  const credentials = Buffer.from(`${email}:${token}`).toString('base64')
  const headers = {
    Authorization: `Basic ${credentials}`,
    Accept: 'application/json',
  }

  try {
    const url = `${base}/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=10`
    const resp = await fetch(url, { headers, cache: 'no-store' })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ error: `Jira API error: ${text}` }, { status: resp.status })
    }

    const data = await resp.json()

    const users = (data as Array<{ accountId: string; displayName: string; emailAddress?: string }>)
      .filter((u) => u.accountId && u.displayName)
      .map((u) => ({
        accountId: u.accountId,
        displayName: u.displayName,
        email: u.emailAddress ?? '',
      }))

    return NextResponse.json({ users })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
