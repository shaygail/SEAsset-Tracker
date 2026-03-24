# SEAsset-Tracker - Copilot Instructions

## Project Overview
Local IT Asset Assignment System for Powerco SE team. Manages IT hardware via Jira Assets API.

## Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Jira Assets REST API (no local database)

## Architecture Rules
- All Jira API calls must happen server-side (API routes or server components)
- Never expose JIRA_API_TOKEN to the client
- API routes live in `/app/api/`
- Shared Jira fetch logic lives in `/lib/jira.ts`
- Use `process.env` for all secrets

## Environment Variables
- `JIRA_BASE_URL` - e.g., https://your-domain.atlassian.net
- `JIRA_EMAIL` - Jira account email
- `JIRA_API_TOKEN` - Jira API token (never expose client-side)

## Key Routes
- `/` - Home page with asset search
- `/asset/[objectKey]` - Asset detail + assignment form
- `/api/jira/getAsset` - Fetch asset from Jira
- `/api/jira/updateAsset` - Update asset attributes in Jira
- `/api/jira/createTicket` - Create CMDB ticket in Jira Service Management

## QR Code Flow
QR codes encode `http://localhost:3000/asset/{OBJECT_KEY}` - page auto-fetches on load.
