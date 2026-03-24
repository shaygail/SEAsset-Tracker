# Jira Automation Setup: Automatic Asset Linking in ISSD

**Document Date:** March 19, 2026  
**Project:** SEAsset-Tracker (IT Asset Management)  
**Environment:** Sandbox (Powerco Sandbox Jira)

---

## Overview

This document describes how to configure **Jira Automation** in the ISSD (IT Service Desk) project to automatically link service desk tickets to IT assets when an asset key is mentioned in the ticket.

### Business Goal
- When an ISSD ticket is created with an asset key (e.g., "TA-798") in the summary or description, automatically create a link between the ticket and the asset in Jira Assets
- Provide the SE Asset Tracker web app with bidirectional ticket-to-asset relationships
- Reduce manual linking efforts and improve audit trails

### Current State
- ISSD tickets reference assets by their key (e.g., "Asset: TA-798 — Assigned to N/A")
- Assets in Jira Assets do not have automatic bookkeeping of related tickets
- Linking must be done manually or via external tools

### Desired State
- When a ticket is created/updated in ISSD with an asset key mentioned, automatically create a "relates to" link
- Tickets appear in the SE Asset Tracker web app under "Related Issues" section
- Audit trail maintained in both Jira Assets and ISSD

---

## Prerequisites

**Required Permissions:**
- Jira Project Admin access to ISSD project
- Automation feature enabled (available in Jira Cloud with Automation license)

**Required Details:**
- ISSD Project Key: `ISSD`
- Asset Asset Type Name: `Asset` (or whatever it's called in Jira Assets schema)
- Sandbox URL: `https://powerco-sandbox.atlassian.net`

---

## Option 1: Manual Jira Automation (Recommended for Initial Testing)

### Step 1: Access Project Automation

1. Go to https://powerco-sandbox.atlassian.net
2. Navigate to **ISSD** (IT Service Desk) project
3. Click **Project Settings** (bottom left sidebar)
4. Select **Automation**
5. Click **Create rule** button

### Step 2: Configure Trigger

**Rule Name:** "Link asset tickets automatically"

**Trigger:**
- Type: **Issue created**
- (Optional: Also add "Issue updated" if you want to catch existing tickets)

### Step 3: Add Condition (Filter for Asset-Related Tickets)

To avoid running this rule on every ticket, add a condition:

1. Click **Add condition**
2. Select **Condition: Text fields**
3. **Configure:**
   - Select fields: **Summary** + **Description**
   - Operator: **contains (regex)**
   - Pattern: `TA-\d{1,4}` (matches asset keys like TA-798, TA-1, etc.)
4. Click **Save condition**

*This ensures we only process tickets that mention an asset key.*

### Step 4: Add Action - Create Link

**Option A: Using Built-in "Link Issue" Action (Preferred)**

1. Click **Add action**
2. Select **Link issue**
3. **Configuration:**
   - Link type: `relates to`
   - Issue to link: Use **Smart value** to extract the asset key from the ticket
     - Smart value syntax: `{{issue.summary | extract 'TA-\d+'}}` or `{{issue.description | extract 'TA-\d+'}}`
     - The system will extract "TA-798" from the ticket and create a link
4. Click **Save action**

**Note:** If the "Link issue" action doesn't support extracting from Jira Assets (only Jira Issues), proceed to Option B.

**Option B: Using "Send Web Request" Action (Fallback)**

If Jira Automation doesn't support direct asset linking:

1. Click **Add action**
2. Select **Send web request**
3. **Configuration:**

   **Method:** `POST`

   **URL:** 
   ```
   https://powerco-sandbox.atlassian.net/rest/api/3/issuelinks
   ```

   **Headers:**
   ```
   Authorization: Basic [base64-encoded email:token]
   Content-Type: application/json
   ```

   **Body (JSON):**
   ```json
   {
     "type": {
       "name": "relates to"
     },
     "inwardIssue": {
       "key": "{{issue.key}}"
     },
     "outwardIssue": {
       "key": "{{issue.summary | extract 'TA-\\d+'}}"
     }
   }
   ```

   *Note: This approach links Jira Issues only, not Jira Assets objects. See Option C for asset linking.*

**Option C: Webhook to SE Asset Tracker App (Most Flexible)**

For proper Jira Assets linking:

1. Click **Add action**
2. Select **Send web request**
3. **Configuration:**

   **Method:** `POST`

   **URL:**
   ```
   http://your-se-asset-tracker-ip:3000/api/jira/linkAssetToTicket
   ```
   *(Replace with your SE Asset Tracker app IP or domain)*

   **Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_API_TOKEN
   ```

   **Body (JSON):**
   ```json
   {
     "ticketKey": "{{issue.key}}",
     "summary": "{{issue.summary}}",
     "description": "{{issue.description}}",
     "projectKey": "ISSD"
   }
   ```

   **Note:** This requires the SE Asset Tracker app to have the `/api/jira/linkAssetToTicket` endpoint. Contact the development team to implement this if not already available.

### Step 5: Review and Publish

1. Review the rule configuration
2. Click **Publish** to activate the rule
3. The rule is now active and will process all new ISSD tickets

---

## Option 2: Webhook approach (If Jira Automation Options Don't Work)

If Jira Automation has limitations, use **Jira Webhooks** for more control:

### Configuration

Go to **Project Settings** → **Webhooks** and create a new webhook:

**Event:** `jira:issue_created` and `jira:issue_updated`

**URL:**
```
http://your-app-url:3000/api/webhooks/jira/issueCreated
```

**Authentication:** Add header:
```
Authorization: Bearer YOUR_WEBHOOK_SECRET
```

This allows the SE Asset Tracker app to process tickets asynchronously and create proper asset links.

---

## Testing the Automation

### In Sandbox

1. Go to https://powerco-sandbox.atlassian.net/projects/ISSD
2. Create a new ticket with:
   - **Summary:** "Asset: TA-798 — Monitor needs repair"
   - **Description:** "Asset Key: TA-798, Serial: TEST123"
3. Submit the ticket
4. **Check Automation Rule Execution:**
   - In the ticket details, look for "Related Issues" or "Linked Issues" section
   - Verify that a **"relates to"** link was created if using Option A/B
   - Or check the SE Asset Tracker app at `/asset/TA-798` to see if the ticket appears in "Related Issues"

### Verification Checklist

- [ ] ISSD ticket created with asset key in description/summary
- [ ] Rule triggered (check Automation history in Project Settings)
- [ ] Link created between ticket and asset
- [ ] Link visible in SE Asset Tracker app's "Related Issues" section
- [ ] Link visible in Jira Assets (if using Option C)

---

## Troubleshooting

### Issue: Automation Rule Not Triggering

**Causes:**
- Rule is disabled (check **Automation** → **Rules** and verify status)
- Condition regex doesn't match asset key format (e.g., ticket uses "Asset-798" instead of "TA-798")
- User doesn't have permission to trigger automation

**Solution:**
- Verify rule is enabled
- Check condition regex pattern matches actual asset key in test ticket
- Ensure project admin has triggered a test rule

### Issue: Link Not Created

**Causes:**
- Action syntax is incorrect
- Smart value extraction failed (asset key not found)
- Authentication failed (for web request option)
- Jira Assets objects cannot be linked via Jira Issue API

**Solution:**
- Review action logs in Automation rule details
- Manually test the extraction pattern
- Use Option C (Webhook) for proper Jira Assets support

### Issue: "Cannot Extract Asset Key" Error

**Causes:**
- Regex pattern doesn't match the asset key format in the ticket
- Asset key is not in Summary or Description fields

**Solution:**
- Check ticket format (ensure it contains "TA-XXX")
- Adjust regex pattern if needed
- Add more fields to the condition (e.g., check Custom Fields too)

---

## Configuration Reference

### Asset Key Format
- **Pattern:** `TA-` followed by 1-4 digits
- **Examples:** TA-1, TA-798, TA-9999
- **Regex:** `TA-\d{1,4}`

### Issue Link Type
- **Type:** "relates to" (bidirectional)
- **Alternative:** "blocks", "blocks", "is blocked by" (if relationship is more specific)

### Environments

| Environment | URL | Project Key | Status |
|------------|-----|-------------|--------|
| Sandbox | https://powerco-sandbox.atlassian.net | ISSD | Testing |
| Production | https://powerco.atlassian.net | ISSD | TBD |

---

## Next Steps

1. **Test in Sandbox:**
   - Set up rule following this guide
   - Create 3-5 test tickets with asset keys
   - Verify links are created automatically

2. **Review with SE Team:**
   - Validate that links appear in SE Asset Tracker app
   - Check that "Related Issues" section shows tickets correctly

3. **Deploy to Production** (when approved):
   - Create same rule in production ISSD project
   - Coordinate with stakeholders for deployment window

4. **Monitor & Adjust:**
   - Check automation rule history for failures
   - Refine regex or conditions if needed
   - Document final configuration for audit trail

---

## Appendix: Smart Values Reference

For Jira Automation smart values (if using):

```
{{issue.key}}                           # Ticket key (e.g., ISSD-98475)
{{issue.summary}}                       # Ticket summary/title
{{issue.description}}                   # Ticket description
{{issue.summary | extract 'TA-\d*'}}   # Extract asset key from summary
{{issue.description | extract 'TA-\d*'}} # Extract asset key from description
```

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-03-19 | 1.0 | SE Asset Team | Initial setup guide |

---

## Contact & Support

For questions about this automation setup:
- **Jira Admin:** [Your Jira Admin Name]
- **Development Team:** [Dev contact for app endpoint support]
- **Project Owner:** Powerco SE Team

---

**Approval Required Before Production Deployment**

This guide is for sandbox testing. Production deployment requires:
- [ ] Jira Admin approval
- [ ] SE Team sign-off
- [ ] IT Security review
- [ ] Change management ticket

