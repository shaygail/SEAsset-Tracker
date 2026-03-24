import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint — list all issue types in ISSD project
 * Access via: GET /api/debug/listIssueTypes
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
    // Get project metadata
    const projectUrl = `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/project/${projectKey}`
    
    console.log('[listIssueTypes] Fetching project:', projectKey)

    const projectResponse = await fetch(projectUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text()
      return NextResponse.json({
        error: `Project API Error ${projectResponse.status}`,
        details: errorText.substring(0, 500),
      }, { status: projectResponse.status })
    }

    const projectData = await projectResponse.json()
    const issueTypes = projectData.issueTypes ?? []

    console.log(`[listIssueTypes] Found ${issueTypes.length} issue types`)

    // Also try searching for any ISSD tickets to see what types exist
    const searchUrl = `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/search/jql`
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        jql: `project = "${projectKey}"`,
        fields: ['issuetype'],
        maxResults: 100,
      }),
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      return NextResponse.json({
        error: `Search API Error ${searchResponse.status}`,
        details: errorText.substring(0, 500),
      }, { status: searchResponse.status })
    }

    const searchData = await searchResponse.json()
    const usedTypes = new Set<string>()
    
    for (const issue of searchData.issues ?? []) {
      usedTypes.add(issue.fields.issuetype?.name)
    }

    return NextResponse.json({
      projectKey,
      sandboxUrl,
      availableIssueTypes: issueTypes.map((t: any) => ({ name: t.name, id: t.id })),
      issueTypesInUse: Array.from(usedTypes),
      totalIssuesChecked: (searchData.issues ?? []).length,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
