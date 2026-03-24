# SEAsset-Tracker — Latest Features

**Last Updated:** March 19, 2026

---

## 🚀 Quick Overview

SEAsset-Tracker is a Next.js-powered IT asset management system that syncs with Jira Assets. Recent updates focus on **bulk operations**, **flexible importing**, and **import tracking**.

---

## ✨ Core Features

### 1. **Dashboard with Dynamic Filtering**
Asset overview page with live filters
- **Status filters:** All, In Stock, Issued, Ready to Deploy, Returned, Faulty
- **Asset type filters:** Dynamically populated from Jira Assets object types
- **Toggle behavior:** Click to select/deselect filters
- **Real-time updates:** Filter results instantly
- **Location:** `/dashboard`

### 2. **Flexible CSV Import**
Smart, schema-aware CSV import engine
- **Auto-detect headers:** Recognizes various column name formats (case-insensitive)
- **Supported columns:** Model name, Serial number, Type, Status, Location, Building, Date Received, PO number
- **Type aliases:** Recognizes common variations (e.g., "Laptop" → Computer, "Dock" → Docking Station)
- **Auto-tagging:** Generates asset tags (`TA-IMPORT-001`, etc.)
- **Progress tracking:** Visual feedback during import
- **Location:** `/import`
- **Output:** Assets created in Jira Assets with all metadata

### 3. **Import Preview & Filtering**
Review all rows before importing
- **Live preview table:** See all CSV rows with parsing results
- **Filter options:** By status and asset type
- **Result indicators:** ✓ (success), ⚠ (warning), ✗ (error) for each row
- **Batch control:** Import entire batch with one click
- **Location:** `/import` → Step 3 Preview

### 4. **Bulk Operations**
Manage multiple assets at once after importing
- **Auto-tracked assets:** Recently imported assets (24-hour window)
- **Grouped by type:** Assets organized into expandable sections
- **Batch selection:** Select individual assets or entire type groups
- **Bulk update fields:**
  - Status (dropdown with all status options)
  - Location (text input with autocomplete from Jira)
  - Building (dropdown from Jira Assets Building objects)
  - Assigned To (email address)
- **Bulk delete:** With confirmation dialog
- **Confirmation:** Shows count of updated/deleted assets
- **Location:** `/bulk-operations`

### 5. **Building Support**
Manage building assignments for assets
- **Building dropdown:** Pulls from Jira Assets Building objects
- **Synced schema:** Always matches your Jira configuration
- **Bulk assignment:** Update building for multiple assets
- **Asset detail:** Building displayed on asset pages
- **Query support:** Optional filter in asset search
- **Location:** Bulk operations, asset detail pages

### 6. **Import History Tracking**
Persistent record of all import batches
- **Server-side logging:** All imports logged to `/logs/imports.jsonl`
- **History page:** View all past imports with metadata
  - Total batches and assets imported
  - Success rate percentages
  - Expandable batch cards with asset type breakdown
  - Clickable asset keys linking to detail pages
  - Import timestamps
- **Statistics:** Per-batch success/fail counts
- **Location:** `/import-history`

### 7. **Asset Management**
Comprehensive single-asset view and edit
- **Detail page:** `/asset/[objectKey]`
- **Display fields:** Type, serial number, status, location, building, assigned user, linked issues
- **Quick actions:** Edit attributes, create CMDB ticket, delete asset
- **Linked issues:** Related service requests or change tickets
- **QR code support:** Assets accessible via QR codes encoding asset keys

### 8. **Print-Friendly View**
Export asset list to print
- **Print page:** `/print`
- **Format:** Table with all asset fields
- **Use cases:** Physical asset labels, inventory sheets
- **Browser print:** Use browser print to PDF

---

## 🔗 API Endpoints

### Asset Operations
- `GET /api/jira/getAsset` — Fetch single asset details
- `POST /api/jira/updateAsset` — Update asset attributes
- `POST /api/jira/deleteAsset` — Delete asset
- `GET /api/jira/listAssets` — List all assets with optional filters

### Search & Lookup
- `GET /api/jira/searchAssetIssues` — Find linked service requests/change tickets
- `GET /api/jira/searchLocations` — Autocomplete location names
- `GET /api/jira/searchBuildings` — List all buildings
- `GET /api/jira/searchUsers` — Search for Jira users

### Bulk Operations
- `POST /api/jira/bulkUpdate` — Update multiple assets in one request
- `POST /api/jira/bulkDelete` — Delete multiple assets in one request

### Import & Export
- `POST /api/jira/importAssets` — Import CSV data as new assets
- `GET /api/export` — Export assets to CSV
- `GET /api/importHistory` — Retrieve import history logs

### Other
- `POST /api/jira/createTicket` — Create CMDB ticket in Jira Service Management
- `GET /api/jira/statusOptions` — Get available asset status values

---

## 🎯 Workflows

### Workflow 1: Import & Bulk Update
1. Navigate to `/import`
2. Upload or paste CSV data
3. Preview rows with optional filtering
4. Click "Import" to create assets in Jira
5. Navigate to `/bulk-operations`
6. Select assets from the recently imported section
7. Bulk update status, location, building, or assigned user
8. Confirm changes

### Workflow 2: Find & Assign Asset
1. Use `/dashboard` to search by status or type
2. Click an asset to open detail page (`/asset/[objectKey]`)
3. Edit assignment form (status, location, building, assigned to)
4. Save changes to Jira Assets
5. Optional: Create linked ticket in CMDB

### Workflow 3: Track Import History
1. Navigate to `/import-history`
2. View summary stats at top (total imports, success rate)
3. Expand batch cards to see details
4. Click asset keys to jump to asset pages
5. Reference batch info for audit trails

---

## 📊 Data Storage

| Data | Storage | Retention | Format |
|------|---------|-----------|--------|
| Assets | Jira Assets API | Persistent | Object Types |
| Recently Imported | Browser localStorage | 24 hours | JSON array |
| Import History | Server-side log file | Persistent | JSONL (line-delimited JSON) |
| User Sessions | NextAuth.js | Per session | JWT tokens |

---

## 🔐 Security

- **No secrets exposed:** JIRA_API_TOKEN kept server-side only
- **API routes:** All Jira API calls routed through Next.js API middleware
- **Authentication:** Powered by NextAuth.js with Jira OAuth
- **Environment variables:** Configured via `.env.local` (never committed)
- **CORS:** Handled server-side to prevent direct client-to-Jira requests

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js API Routes
- **External API:** Jira Assets REST API
- **Authentication:** NextAuth.js
- **No database:** All data lives in Jira Assets

---

## 📱 User Interface

- **Responsive design:** Works on desktop and tablet
- **Color-coded filters:** Status (blue), Asset Types (green)
- **Grouped displays:** Assets organized by type in bulk operations
- **Toggle filters:** Click to select/deselect (intuitive UX)
- **Autocomplete dropdowns:** For locations and buildings
- **Loading states:** Visual feedback during operations
- **Success/error messages:** Clear actionable feedback
- **Expandable sections:** Organize large lists by category

---

## 🧪 Testing

Test the features:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

Then:
1. Log in via Jira OAuth
2. Visit `/dashboard` to see all assets
3. Go to `/import` to test CSV import
4. Check `/bulk-operations` after importing
5. View `/import-history` for import logs

---

## 📚 Additional Resources

- **Project Proposal:** See [PROJECT_PROPOSAL.md](PROJECT_PROPOSAL.md)
- **Update Log:** See [UPDATES.md](UPDATES.md)
- **Environment Setup:** See `.env.local` template
- **API Documentation:** Check individual route files in `/app/api/`

---

## 🚀 Getting Started

### Prerequisites
- Jira Cloud instance with Jira Assets enabled
- Jira API token (create at https://id.atlassian.com/manage-profile/security)
- Node.js 18+

### Setup
1. Clone repository
2. Copy `.env.local.example` to `.env.local`
3. Fill in Jira credentials:
   ```
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@domain.com
   JIRA_API_TOKEN=your-api-token
   ```
4. Run `npm install && npm run dev`
5. Open http://localhost:3000

---

Generated: March 19, 2026
