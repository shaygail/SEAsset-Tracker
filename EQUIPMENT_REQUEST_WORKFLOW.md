# Equipment Request Workflow Implementation Plan

**Document Date:** March 19, 2026  
**Project:** SE Asset Tracker - Equipment Assignment Feature  
**Status:** Planning / Development  
**Priority:** High

---

## Overview

**Goal:** Allow SE team to scan asset QR codes and assign them to pending equipment requests from ISSD, with automatic sync back to Jira.

**User Story:**
> "As an SE team member, I want to scan a QR code for an asset, see pending equipment requests from ISSD, and assign the asset to a request—which automatically updates the ticket in Jira."

### Current Workflow
1. Equipment request sits in ISSD as a ticket
2. SE team manually searches for assets in the dashboard
3. SE team navigates to asset detail page
4. SE team manually assigns via form (no ticket context)
5. No automatic ticket updates

### Desired Workflow
1. New equipment request created in ISSD (e.g., `ISSD-98500: New Starter - John Doe needs laptop`)
2. Request appears in SE Asset Tracker dashboard as pending
3. SE team scans **asset QR code** (e.g., `TA-798`) 
4. Asset details page loads with **"Pending Requests"** section showing linked tickets
5. SE team selects the request and clicks **"Assign to This Request"**
6. Asset assigned to user + ticket automatically closed/resolved
7. ISSD ticket updated with asset key (e.g., "Assigned: TA-798")

---

## Architecture & Components

### New/Modified Pages

#### 1. Dashboard Enhancement: "Pending Equipment Requests" Section
- **Location:** `/dashboard` (new tab or section)
- **Shows:** Unassigned ISSD tickets with type = "New Starter" or "Equipment Request"
- **Fields:**
  - Ticket key (ISSD-98500)
  - Requester name
  - Equipment needed (extracted from description or custom field)
  - Date requested
  - Status
- **Actions:**
  - Click to view ticket details
  - "Scan Asset" button (opens camera to scan QR code)
  - Jump to asset after assignment

#### 2. Asset Detail Page Enhancement
- **New Section:** "Pending Requests" (if any)
  - Shows ISSD tickets linked to this asset
  - Shows if asset is awaiting assignment to a specific request
- **Enhanced Assignment Form:**
  - New field: **"Link to Equipment Request"** (dropdown/search)
  - Fetches pending ISSD tickets
  - Auto-populates if scanning from request
  - When assigned, automatically close/resolve the ticket

#### 3. Request Detail Modal (New)
- **Triggered by:** Dashboard "Pending Requests" section or URL
- **URL:** `/request/ISSD-98500` (new route)
- **Shows:**
  - Ticket summary (e.g., "New Starter: John Doe needs laptop")
  - Requester email/name
  - Equipment type needed
  - Status in Jira
- **Actions:**
  - "Scan Asset to Assign" button
  - "Manual Asset Selection" dropdown
  - Assignment history

---

### New API Endpoints

#### 1. Fetch Pending Equipment Requests
```
GET /api/jira/pendingRequests
Query params:
  - projectKey: "ISSD" (default)
  - issueType: "New Starter" or "Equipment Request" (configurable)
  - status: "Open,In Progress,To Do" (exclude "Done", "Closed")

Response:
[
  {
    "key": "ISSD-98500",
    "summary": "New Starter: John Doe needs laptop",
    "requester": "manager@powerco.co.nz",
    "requesterName": "Jane Manager",
    "description": "New starter John Doe needs laptop, monitor, keyboard",
    "equipmentType": "Laptop",  // extracted from description or custom field
    "createdDate": "2026-03-19T08:00:00Z",
    "status": "Open",
    "assignedAssetKey": null  // null if not yet assigned
  }
]
```

#### 2. Assign Asset to Request
```
POST /api/jira/assignToRequest
Body:
{
  "assetKey": "TA-798",
  "ticketKey": "ISSD-98500",
  "assignedTo": "john.doe@powerco.co.nz"  // auto-filled from ticket
}

Response:
{
  "success": true,
  "assetKey": "TA-798",
  "ticketKey": "ISSD-98500",
  "ticketUpdated": true,
  "ticketStatus": "Resolved",
  "message": "Asset TA-798 assigned to John Doe (ISSD-98500)"
}
```

#### 3. Get Request Details
```
GET /api/jira/request/ISSD-98500

Response:
{
  "key": "ISSD-98500",
  "summary": "New Starter: John Doe needs laptop",
  "requester": "manager@powerco.co.nz",
  "requesterName": "Jane Manager",
  "email": "john.doe@powerco.co.nz",
  "description": "...",
  "equipmentNeeded": ["Laptop", "Monitor", "Keyboard"],
  "createdDate": "2026-03-19T08:00:00Z",
  "status": "Open",
  "assignedAssets": [
    {
      "assetKey": "TA-798",
      "model": "ThinkPad X1",
      "assignedOn": "2026-03-19T09:15:00Z"
    }
  ]
}
```

---

### Frontend Components (React)

#### 1. PendingRequestsSection.tsx
```tsx
// Display pending requests in dashboard
// Fetch from /api/jira/pendingRequests
// Show list with scan/assign buttons
// Trigger camera for QR code scanning
```

#### 2. RequestDetailModal.tsx (New)
```tsx
// Modal showing equipment request details
// Shows: requester, equipment needed, linked assets
// Action: scan asset or manually select
```

#### 3. Enhanced AssetAssignForm.tsx
```tsx
// Add dropdown: "Link to Equipment Request" (optional)
// When selecting a request:
//   - Auto-populate assignedTo from ticket requester
//   - Show equipment context
//   - Auto-close ticket on assignment
```

#### 4. QRScanner.tsx (Reuse/Enhance)
```tsx
// Camera component to scan QR codes
// Mode 1: Scan asset → show pending requests
// Mode 2: Scan from request → link to that request
```

---

## Implementation Steps

### Phase 1: Backend APIs (Week 1)

- [ ] Create `/api/jira/pendingRequests` endpoint
  - Query ISSD for tickets with type = "New Starter" / "Equipment Request"
  - Filter by status (Open, In Progress, To Do)
  - Extract equipment type from description/custom field
  - Return list of pending requests

- [ ] Create `/api/jira/request/[key]` endpoint
  - Fetch single request details with full context
  - Include linked assets

- [ ] Create `/api/jira/assignToRequest` endpoint
  - Link asset to ticket via Jira issue link
  - Update ticket status to "Resolved" or "Assigned"
  - Update asset with assignment date and ticket reference
  - Return confirmation

### Phase 2: Frontend Components (Week 2)

- [ ] Add "Pending Requests" section to dashboard
  - Fetch `/api/jira/pendingRequests`
  - Show list with requester, equipment, date
  - "Scan Asset" button (opens QR scanner)

- [ ] Create `/request/[ticketKey]` route
  - New page showing request details
  - Display equipment needed, requester, status
  - Show "Scan Asset" or "Select Asset" actions

- [ ] Enhance AssetAssignForm
  - Add "Link to Equipment Request" dropdown
  - Auto-populate assignedTo from ticket
  - Call `/api/jira/assignToRequest` on submit

- [ ] Add QR Scanner Mode
  - Detect if scanning from request context
  - Pre-populate requestKey
  - Show confirmation before assigning

### Phase 3: Workflow Integration (Week 3)

- [ ] Test end-to-end flow in sandbox:
  1. Create ISSD ticket
  2. Dashboard shows pending request
  3. Scan asset QR
  4. Assign to request
  5. Verify ticket updates in ISSD
  6. Verify assignment persists

- [ ] Add auto-status-update logic
  - When asset assigned, change ticket status
  - Auto-close or mark as "In Progress"
  - Log who assigned, when, from where

- [ ] Add confirmation notifications
  - Success banner after assignment
  - Link to view updated ticket in Jira

### Phase 4: UX Refinements (Week 4)

- [ ] Mobile-optimized QR scanner
- [ ] Bulk assignment (multiple assets to one request)
- [ ] Assignment history in request details
- [ ] Audit trail (who assigned, when, from where)

---

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# ISSD Configuration
JIRA_ISSD_PROJECT_KEY=ISSD
JIRA_ISSD_ISSUE_TYPE=New Starter,Equipment Request
JIRA_ISSD_RESOLVED_STATUS=Resolved,Done,Closed
JIRA_ISSD_CUSTOM_FIELD_EQUIPMENT=customfield_10001  # Equipment type field ID
```

### Jira Configuration

**Required Custom Fields in ISSD:**
- `Equipment Type` (Dropdown: Laptop, Monitor, Keyboard, Mouse, Headset, Docking Station)
- `Requested By` (User field - auto-populated)
- `Equipment Status` (Dropdown: Pending, Assigned, Received, Returned)

**Required Issue Type:**
- `New Starter` (or `Equipment Request`)
  - Used to identify equipment requests in dashboard

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Create ISSD Ticket                                       │
│    "New Starter: John Doe needs laptop"                     │
│    Status: Open                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Dashboard shows "Pending Equipment Requests"             │
│    → Lists ISSD-98500 with requester and equipment info     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (Click "Scan Asset" or scan QR)
┌─────────────────────────────────────────────────────────────┐
│ 3. Asset Detail Page                                        │
│    Loads TA-798 (laptop)                                    │
│    Shows "Assignment Form" with request pre-selected        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (Click "Assign to ISSD-98500")
┌─────────────────────────────────────────────────────────────┐
│ 4. API Call: /api/jira/assignToRequest                      │
│    - Link asset TA-798 to ticket ISSD-98500                 │
│    - Set asset.assignedTo = "john.doe@powerco.co.nz"        │
│    - Update ISSD-98500 status to "Resolved"                 │
│    - Add comment: "Assigned TA-798 (laptop)"                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Confirmation in App                                      │
│    ✓ "TA-798 assigned to John Doe"                          │
│    - Success banner with link to updated ticket             │
│    - Asset detail page updated                              │
│    - Assignment date recorded                               │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Jira Updates                                             │
│    - ISSD-98500 status = "Resolved"                         │
│    - Link created: ISSD-98500 "relates to" TA-798           │
│    - Comment added with assignment details                  │
│    - SE team notified (optional)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits

✅ **Faster Onboarding:** New starters get equipment quickly  
✅ **Automatic Tickets:** Equipment requests tracked in Jira  
✅ **Audit Trail:** Full history of who assigned what, when  
✅ **Mobile-Friendly:** QR scanning on duty device  
✅ **Reduced Manual Work:** Auto-close tickets on assignment  
✅ **Real-Time Sync:** Dashboard and Jira always in sync  

---

## Success Criteria

- [ ] Dashboard shows pending ISSD requests
- [ ] QR scan + assignment completes in <30 seconds
- [ ] ISSD ticket updates automatically after assignment
- [ ] Assignment persists and syncs to Jira Assets
- [ ] Audit trail recorded for all assignments
- [ ] Works on mobile (iPhone/Android scanning)

---

## Testing Plan

### Sandbox Testing
1. Create 5 ISSD tickets with type "New Starter"
2. Verify dashboard shows all pending requests
3. Scan 5 different asset QR codes
4. Assign each to a request
5. Verify ISSD tickets update in real-time
6. Check Jira Sandbox for issue links

### Load Testing
- Dashboard with 50+ pending requests
- Concurrent assignments
- Verify no race conditions

### Mobile Testing
- iOS device QR scanning
- Android device QR scanning
- Responsive form layout

---

## Documentation Needed

- [ ] User guide: "How to assign equipment via QR code"
- [ ] Admin guide: "Setting up ISSD for equipment requests"
- [ ] API documentation: New endpoints
- [ ] Video walkthrough: Complete workflow

---

## Rollout Plan

### Sandbox (Week 3-4)
- Full testing and refinement
- SE team feedback
- Bug fixes

### Production (Week 5)
- Gradual rollout to SE team
- Monitor for issues
- Gather feedback
- Scale to full team if successful

---

## Next Steps

1. **Approve this plan** with team stakeholders
2. **Create Jira story:** "Implement Equipment Request Assignment Workflow"
3. **Start Phase 1:** Backend API development
4. **Sandbox testing** in parallel
5. **Demo to SE team** at end of Week 2
6. **Production deployment** (Week 5)

---

**Questions? Contact the development team.**

