import { NextRequest, NextResponse } from 'next/server'
import { assignToRequest, updateAsset } from '@/lib/jira'

// Helper: Check if webhook event is a new Starter Kit assigned
function isNewStarterKitAssigned(event: any) {
  // Adjust these checks to match your Jira project/issue type/fields
  const issue = event.issue
  if (!issue) return false
  const isNewStarterKit = issue.fields?.issuetype?.name === 'New Starter Kit'
  const isAssigned = !!issue.fields?.assignee
  return isNewStarterKit && isAssigned
}

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    console.log('[Jira Webhook] Incoming event:', JSON.stringify(event, null, 2));
    if (!isNewStarterKitAssigned(event)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const issue = event.issue;
    const ticketKey = issue.key;
    const assignedUser = issue.fields.assignee.emailAddress || issue.fields.assignee.name;

    // TODO: Query Jira Assets for available assets matching the request (e.g., laptops In Stock)
    // For now, just log and skip assignment
    console.log(`[Jira Webhook] Would assign asset to ticket ${ticketKey} for user ${assignedUser}`);

    // Example placeholder for asset assignment logic:
    // const assetKey = await findAvailableAssetKey('Laptop');
    // if (assetKey) {
    //   const result = await assignToRequest({ assetKey, ticketKey, assignedTo: assignedUser });
    //   await updateAsset({ ... });
    //   return NextResponse.json({ ok: true, result });
    // }

    return NextResponse.json({ ok: true, message: 'Webhook received and logged. Asset assignment logic not yet implemented.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Jira Webhook] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
