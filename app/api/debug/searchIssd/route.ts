import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint — test New Starter Kit search to troubleshoot pending requests
 * Access via: GET /api/debug/searchIssd
 */
export async function GET(request: NextRequest) {
  const sandboxUrl = process.env.JIRA_SANDBOX_BASE_URL
  const projectKey = process.env.JIRA_SANDBOX_PROJECT_KEY ?? 'ISSD'
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!sandboxUrl || !email || !token) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
  }

  const credentials = Buffer.from(`${email}:${token}`).toString('base64')
  const headers = {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  try {
    // Test the New Starter Kit search (all statuses)
    const jql = `project = "${projectKey}" AND type = "New Starter Kit" ORDER BY created DESC`

    console.log('[searchIssd] Testing JQL:', jql)

    const url = `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/search/jql`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        jql,
        fields: ['key', 'summary', 'description', 'created', 'status', 'reporter', 'assignee', 'issuetype'],
        maxResults: 50,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        error: `API Error ${response.status}`,
        details: errorText.substring(0, 500),
      }, { status: response.status })
    }

    const data = await response.json()
    const issues = data.issues ?? []

    console.log(`[searchIssd] Found ${issues.length} tickets`)

    // Return detailed info about each ticket
    const results = issues.map((issue: any) => {
      const description = issue.fields.description?.content
        ?.map((c: any) => c.content?.map((t: any) => t.text).join(''))
        .join('\n') || issue.fields.description || ''

      // Extract equipment items
      const equipmentItems: string[] = []
      const itemRegex = /(?:^|\n|-|\*)\s*\d+\s*x\s+([^(\n]*?)(?:\(|$|\n)/gim
      let match
      while ((match = itemRegex.exec(description)) !== null) {
        const item = match[1].trim()
        if (item && !item.toLowerCase().includes('please') && !item.toLowerCase().includes('setup')) {
          equipmentItems.push(item)
        }
      }

      return {
        key: issue.key,
        summary: issue.fields.summary,
        type: issue.fields.issuetype?.name,
        status: issue.fields.status?.name,
        reporter: issue.fields.reporter?.displayName,
        description: description.substring(0, 200),
        equipmentItems,
      }
    })

    return NextResponse.json({
      jql,
      projectKey,
      sandboxUrl,
      totalFound: issues.length,
      tickets: results,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

