# SE Asset Tracker — Project Proposal

**Project Name:** SE Asset Tracker  
**Team:** Powerco SE (Systems Engineering) Team  
**Author:** Shayenne Galiste  
**Date:** March 4, 2026  
**Status:** Active Development — v1.0  

---

## 1. Executive Summary

The SE Asset Tracker is an internal web application built for the Powerco SE team to manage, track, and assign IT hardware assets. It integrates directly with the company's existing **Jira Assets (JSM)** instance, replacing the need for manual spreadsheet tracking and eliminating the overhead of navigating the full Jira interface for day-to-day asset management tasks.

The application runs locally on the SE team's network and is accessible from any device (including via QR code scan on a mobile phone), providing a fast and simple interface tailored specifically to the SE team's workflow.

---

## 2. Problem Statement

The SE team manages a growing inventory of IT hardware including laptops, monitors, keyboards, docking stations, headsets, phones, and accessories. Prior to this tool, the team faced the following challenges:

- **No single source of truth:** Asset locations and assignments were tracked inconsistently across Jira, spreadsheets, and verbal communication.
- **Slow asset lookup:** Finding an asset in Jira required navigating multiple screens and schemas.
- **Manual assignment updates:** Updating who has which asset, where it is, and when it was issued required navigating Jira's complex Assets interface.
- **No QR code support:** There was no way to quickly pull up an asset record by scanning a label.
- **No bulk intake process:** When a batch of new hardware arrived, each item had to be entered into Jira manually one by one.
- **No deletion control:** Assets could be removed without any approval gate.

---

## 3. Proposed Solution

A **Next.js web application** that serves as a purpose-built front-end for Jira Assets, providing:

- Simple asset search by Asset Tag or Object Key
- Full asset detail view
- One-page assignment form (assignee, location, status, date)
- QR-code dashboard for scanning labels
- Bulk CSV import for new stock intake
- PIN-protected asset deletion with reason tracking
- Shared team login (no per-user accounts)

All data is stored in **Jira Assets** — this app never maintains its own database. It is purely an interface layer that makes Jira easier to use for common SE team tasks.

---

## 4. Technical Architecture

### 4.1 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Authentication | NextAuth.js (beta) — Credentials provider |
| QR Codes | qrcode.react |
| API Integration | Jira Assets REST API v1 |
| Runtime | Node.js (local network deployment) |
| SSL Fix | cross-env + NODE_TLS_REJECT_UNAUTHORIZED=0 |

### 4.2 Architecture Rules

- All Jira API calls are made **server-side only** (Next.js API routes or Server Components)
- The `JIRA_API_TOKEN` is never exposed to the browser
- No local database — Jira Assets is the single source of truth
- The app is stateless between restarts (sessions use JWT cookies)

### 4.3 Jira Assets Integration

- **Workspace ID:** `033a7188-5c76-413e-9005-84cee5f0ea5f`
- **Schema:** Test Asset (`TA`, Schema ID: `4`)
- **API Base URL:** `https://api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1/`

#### Key API endpoints used:

| Operation | Endpoint |
|---|---|
| Search assets (AQL) | `GET /aql/objects?qlQuery=...` |
| Fetch full asset | `GET /object/{id}` |
| Update asset | `PUT /object/{id}` |
| Create asset | `POST /object/create` |
| Delete asset | `DELETE /object/{id}` |
| Get object type schema | `GET /objecttype/{id}/attributes` |
| List all types in schema | `GET /objectschema/{id}/objecttypes/flat` |
| Search users | `GET /user/search` (Jira Cloud REST API) |

### 4.4 Application Routes

| Route | Type | Description |
|---|---|---|
| `/` | Client Page | Asset search (by tag or key) |
| `/dashboard` | Client Page | All assets with status tabs and QR codes |
| `/asset/[objectKey]` | Server Page | Asset detail + assignment form + delete button |
| `/import` | Client Page | Bulk CSV import with preview and progress |
| `/login` | Client Page | Shared credential login form |
| `/api/jira/getAsset` | API Route | Fetch single asset |
| `/api/jira/updateAsset` | API Route | Update asset attributes |
| `/api/jira/deleteAsset` | API Route | Delete asset (PIN-verified) |
| `/api/jira/importAssets` | API Route | Bulk create assets from CSV rows |
| `/api/jira/listAssets` | API Route | List assets (with optional status filter) |
| `/api/jira/searchUsers` | API Route | User search typeahead |
| `/api/jira/searchLocations` | API Route | Location search typeahead |
| `/api/jira/createTicket` | API Route | Create CMDB ticket in JSM |
| `/api/auth/[...nextauth]` | API Route | NextAuth session handling |

---

## 5. Features

### 5.1 Asset Search
- Search by **Object Key** (e.g. `TA-575`) or **Asset Tag** (e.g. `1234`)
- Auto-detects input format and builds the correct AQL query
- Two-step Jira fetch: AQL for the object ID, then full `GET /object/{id}` to retrieve named attributes

### 5.2 Asset Detail Page
- Displays: Model, Manufacturer, Serial Number, Status, Assigned To, Location
- Status badge with colour coding
- Links to assignment form and delete button

### 5.3 Asset Assignment Form
- **Assignee search:** Debounced typeahead against Jira user directory (searches by email/name)
- **Location search:** Debounced typeahead against Jira `Location` object type (partial match)
- **Status dropdown:** In Stock · Ready to Deploy · Issued · Returned · Faulty
- **Date Issued:** Date picker defaulting to today
- Optional: creates a Jira Service Management CMDB ticket on save

### 5.4 Dashboard with QR Codes
- Status tab bar: All / In Stock / Ready to Deploy / Issued / Returned / Faulty
- Asset card grid showing model, serial, status badge, assignee, location
- Each card contains a QR code encoding the direct Jira Assets URL
- Scanning the QR code on a phone opens the asset directly in Jira
- Refresh button to reload live data

### 5.5 Bulk Import (CSV)
- Download a pre-filled CSV template
- Upload a CSV file or paste content directly
- Columns: Object Type, Asset Tag, Model, Manufacturer, Serial Number, Location, Status, Date Added
- **Object type aliases:** Common terms are mapped to Jira types automatically:
  - Laptop / Desktop / PC / Notebook → `Computer`
  - Screen / Display → `Monitor`
  - Dock / Docking → `Docking Station`
  - Phone / Mobile → `Phones`
  - Headphones → `Headset`
- **Select field validation:** Manufacturer and Status are Select-type dropdowns in Jira — values not in the allowed list are skipped (asset is still created) and a warning is reported per row
- **Location resolution:** Exact match first, then partial match fallback; lists available locations if none found
- Live preview table with per-row result (✓ created / ⚠ created with skipped fields / ✗ error)
- Batch processing (5 rows at a time) with progress bar

### 5.6 Delete with Approval
- **Delete button** on asset detail page (🗑 Delete Asset)
- Two-step modal:
  - **Step 1 — Confirm:** Shows asset key and model, optional reason field
  - **Step 2 — PIN:** Approval PIN entry (checked server-side, never exposed to browser)
- Incorrect PIN → rejected, asset not deleted
- Correct PIN → asset permanently deleted from Jira, redirected to home with success notice
- Server-side audit log entry on every deletion

### 5.7 Authentication
- Shared username/password login (`seteam` / `Powerco2026!`)
- JWT session cookie (no server-side session store)
- All routes protected via Next.js middleware (`proxy.ts`)
- Login page at `/login`; unauthenticated users are automatically redirected
- Sign out button in header

---

## 6. Jira Assets Schema Reference

### Object Types (Schema: Test Asset, ID 4)

| Jira Name | Type ID | Notes |
|---|---|---|
| Computer | 41 | Laptops, desktops (use alias: Laptop) |
| Monitor | 76 | |
| Keyboard | 38 | |
| Mouse | 39 | |
| Headset | 37 | |
| Docking Station | 82 | |
| Lenovo Gen 4 | 116 | Specific dock model |
| Phones | 40 | |
| Accessories | 77 | |
| Location | 81 | Part of Sites > Location hierarchy |

### Key Attribute Notes

| Attribute | Type | Notes |
|---|---|---|
| Status | Select | Fixed options: In Stock, Ready to Deploy, Issued, Returned, Faulty |
| Manufacturer | Select | Options vary per object type (e.g. Computer: Lenovo/HP/Dell; Monitor: Dell/Philips) |
| Location | Object Reference (type 1) | Must pass the numeric object ID, not the display name |
| Assigned To | User Reference (type 2) | Must pass Jira `accountId`, not email |
| Date Issued / Date Received | DateTime | Must include time component: `YYYY-MM-DDT00:00:00.000Z` |

---

## 7. Environment Configuration

All secrets and configuration are stored in `.env.local` (never committed to source control).

| Variable | Purpose |
|---|---|
| `JIRA_BASE_URL` | Jira Cloud base URL |
| `NEXT_PUBLIC_JIRA_BASE_URL` | Client-accessible version (for QR code URLs) |
| `JIRA_EMAIL` | Service account email for API auth |
| `JIRA_API_TOKEN` | Jira API token (server-side only) |
| `JIRA_ASSETS_WORKSPACE_ID` | Assets workspace ID |
| `JIRA_SM_PROJECT_KEY` | JSM project key for CMDB tickets |
| `NEXT_PUBLIC_APP_URL` | Local network IP for QR codes (e.g. `http://192.168.5.88:3000`) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` to bypass Powerco corporate proxy SSL |
| `APP_USERNAME` | Shared login username (`seteam`) |
| `APP_PASSWORD` | Shared login password |
| `AUTH_SECRET` | JWT signing secret (generated once) |
| `APPROVAL_PIN` | PIN required to approve asset deletions |

---

## 8. Known Limitations & Future Enhancements

### Current Limitations
- **Single shared login:** All team members use the same credentials. There is no per-user audit trail for assignments or changes.
- **Manufacturer Select list:** Manufacturer is a fixed dropdown in Jira. Values entered in CSV import that don't match the list are silently skipped. The list must be updated directly in Jira Assets settings.
- **200-asset dashboard limit:** The dashboard fetches up to 200 assets per query. Pagination is not yet implemented.
- **No offline support:** Requires network access to reach `api.atlassian.com`.
- **SSL bypass:** `NODE_TLS_REJECT_UNAUTHORIZED=0` is required due to the Powerco corporate proxy. This is acceptable for an internal tool but should be replaced with a proper CA certificate bundle in a production deployment.

### Potential Future Enhancements
| Feature | Notes |
|---|---|
| Microsoft Entra ID (Azure AD) login | Per-user login via company accounts. Code foundation already drafted. Requires an app registration in Azure portal. |
| Per-user audit log | Track who changed what and when, stored as Jira comments or a separate log |
| Asset history view | Show changelog for an asset (create/update/delete events) |
| Email notifications | Notify assignee when an asset is assigned to them |
| Pagination on dashboard | Load more than 200 assets |
| Export to CSV | Download current filtered asset list |
| Print asset labels | Print QR code stickers for physical labelling |
| Warranty / PO tracking | Surface warranty expiry and purchase order number fields |

---

## 9. Deployment

### Running Locally

```bash
cd SEAsset-Tracker
npm install
npm run dev
```

App runs at `http://localhost:3000` (or `http://{YOUR_IP}:3000` for network access).

### Making it available to the team
1. Open a terminal on the host PC and run `npm run dev`
2. Ensure the PC's firewall allows inbound connections on port 3000
3. Set `NEXT_PUBLIC_APP_URL=http://{YOUR_IP}:3000` in `.env.local`
4. Share the URL with the team — they can access it from any device on the same network

### Production Build
```bash
npm run build
npm start
```

---

## 10. Project File Structure

```
SEAsset-Tracker/
├── .env.local                    # All secrets (never commit this)
├── auth.ts                       # NextAuth configuration
├── proxy.ts                      # Route protection middleware
├── next.config.ts
├── tailwind.config.ts
├── app/
│   ├── layout.tsx                # Root layout (header, nav, sign-out)
│   ├── page.tsx                  # Home — asset search
│   ├── globals.css
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth session routes
│   │   └── jira/
│   │       ├── getAsset/         # Fetch single asset
│   │       ├── updateAsset/      # Update asset attributes
│   │       ├── deleteAsset/      # Delete asset (PIN-protected)
│   │       ├── importAssets/     # Bulk create assets
│   │       ├── listAssets/       # List assets with status filter
│   │       ├── searchUsers/      # User typeahead search
│   │       ├── searchLocations/  # Location typeahead search
│   │       ├── createTicket/     # Create CMDB ticket
│   │       └── debug/            # Debug endpoint
│   ├── asset/[objectKey]/        # Asset detail + assign + delete
│   ├── dashboard/                # Asset dashboard with QR codes
│   ├── import/                   # Bulk CSV import page
│   └── login/                    # Login page
├── components/
│   ├── AssetAssignForm.tsx        # Assignment form (client)
│   └── DeleteAssetButton.tsx      # Delete modal with PIN (client)
└── lib/
    └── jira.ts                    # All Jira API logic (server-side only)
```

---

## 11. Contacts

| Role | Name | Contact |
|---|---|---|
| Developer / Owner | Shayenne Galiste | shayenne.galiste@powerco.co.nz |
| Jira Assets Admin | SE Team | — |

---

*This document was generated on March 4, 2026 and reflects the current state of the SE Asset Tracker application.*
