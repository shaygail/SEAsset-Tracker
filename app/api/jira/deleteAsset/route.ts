import { NextRequest, NextResponse } from 'next/server'
import { logChange } from '@/lib/changelog'

function getAssetsApiBase() {
  const id = process.env.JIRA_ASSETS_WORKSPACE_ID
  if (!id) throw new Error('Missing JIRA_ASSETS_WORKSPACE_ID')
  return `https://api.atlassian.com/jsm/assets/workspace/${id}/v1`
}

function getAuthHeaders(): HeadersInit {
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  if (!email || !token) throw new Error('Missing JIRA_EMAIL or JIRA_API_TOKEN')
  const creds = Buffer.from(`${email}:${token}`).toString('base64')
  return { Authorization: `Basic ${creds}`, Accept: 'application/json' }
}

export async function POST(req: NextRequest) {
  const { objectId, objectKey, reason, pin } = await req.json()

  // Verify approval PIN server-side — never expose this to the client
  const approvalPin = process.env.APPROVAL_PIN
  if (!approvalPin) {
    return NextResponse.json(
      { error: 'APPROVAL_PIN is not configured. Add it to .env.local.' },
      { status: 500 }
    )
  }
  if (pin !== approvalPin) {
    return NextResponse.json({ error: 'Incorrect approval PIN.' }, { status: 403 })
  }

  if (!objectId) {
    return NextResponse.json({ error: 'Missing objectId' }, { status: 400 })
  }

  try {
    const assetsBase = getAssetsApiBase()
    const headers = getAuthHeaders()

    const resp = await fetch(`${assetsBase}/object/${objectId}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json(
        { error: `Jira Assets delete failed (${resp.status}): ${text}` },
        { status: resp.status }
      )
    }

    // Log deletion to changelog file and console
    logChange({
      timestamp: new Date().toISOString(),
      action: 'DELETE',
      objectKey: objectKey ?? '',
      reason: reason ?? undefined,
    })
    console.log(`[DELETED] ${objectKey} (id: ${objectId}) — Reason: ${reason ?? 'none'} — ${new Date().toISOString()}`)

    return NextResponse.json({ success: true, objectKey })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
