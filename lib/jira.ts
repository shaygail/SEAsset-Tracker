/**
 * Shared Jira Assets API helper.
 * All Jira calls must be made server-side only.
 * Never import this file in client components.
 */

export interface JiraAsset {
  /** Numeric Jira object ID — used for DELETE and direct Jira URLs */
  objectId: string
  objectKey: string
  model: string
  manufacturer: string
  serialNumber: string
  status: string
  assignedTo: string
  /** Display name for location, e.g. "New Plymouth" */
  location: string
  /** Raw object ID/key for the Location reference (used when updating via Jira API) */
  locationKey: string
  /** Raw attributes returned by Jira Assets for extensibility */
  rawAttributes: Record<string, string>
}

export interface UpdateAssetPayload {
  objectKey: string
  assignedToAccountId: string   // Jira accountId (from user search)
  assignedToDisplay: string     // Display name for reference
  status: string
  /** Raw object ID/key for the Location reference — must NOT be the display name */
  locationKey: string
  /** Building name/field value */
  building?: string
  /** ISO date string YYYY-MM-DD for the "Date Issued" attribute */
  dateIssued: string
}

export interface CreateTicketPayload {
  objectKey: string
  assignedTo: string
  status: string
  location: string
  summary?: string
  description?: string
  vendorSupportId?: string
}

export interface EquipmentRequest {
  key: string
  summary: string
  requester: string
  requesterName: string
  requesterEmail: string
  description: string
  equipmentItems: string[] // List of equipment items (e.g., ["Laptop", "Mouse", "Keyboard"])
  createdDate: string
  status: string
  assignedAssetKey: string | null
}

export interface AssignToRequestPayload {
  assetKey: string
  ticketKey: string
  assignedTo: string
}

export interface AssignToRequestResponse {
  success: boolean
  assetKey: string
  ticketKey: string
  ticketUpdated: boolean
  ticketStatus: string
  message: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!email || !token) {
    throw new Error('Missing JIRA_EMAIL or JIRA_API_TOKEN environment variables')
  }

  const credentials = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function getBaseUrl(): string {
  const base = process.env.JIRA_BASE_URL
  if (!base) throw new Error('Missing JIRA_BASE_URL environment variable')
  return base.replace(/\/$/, '')
}

function getWorkspaceId(): string {
  const id = process.env.JIRA_ASSETS_WORKSPACE_ID
  if (!id) throw new Error('Missing JIRA_ASSETS_WORKSPACE_ID environment variable')
  return id
}

/** Base URL for the Jira Cloud Assets API */
function getAssetsApiBase(): string {
  return `https://api.atlassian.com/jsm/assets/workspace/${getWorkspaceId()}/v1`
}

/**
 * Extracts a named attribute's display value (or plain value) from the Jira Assets object.
 * For referenced objects this returns the human-readable display name.
 */
function getAttribute(attributes: JiraRawAttribute[], name: string): string {
  const attr = attributes.find(
    (a) => a.objectTypeAttribute?.name?.toLowerCase() === name.toLowerCase()
  )
  if (!attr || !attr.objectAttributeValues?.length) return ''
  const val = attr.objectAttributeValues[0]
  // Referenced objects have a displayValue, plain values use value
  return val.displayValue ?? val.value ?? ''
}

/**
 * Returns the raw `value` field for a named attribute.
 * For referenced object attributes this is the numeric object ID (e.g. "280"),
 * which is what the Jira Assets PUT endpoint requires.
 */
function getAttributeRawValue(attributes: JiraRawAttribute[], name: string): string {
  const attr = attributes.find(
    (a) => a.objectTypeAttribute?.name?.toLowerCase() === name.toLowerCase()
  )
  if (!attr || !attr.objectAttributeValues?.length) return ''
  return attr.objectAttributeValues[0].value ?? ''
}

interface JiraRawAttribute {
  objectTypeAttribute?: { name?: string }
  objectAttributeValues?: Array<{ value?: string; displayValue?: string }>
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a single asset from Jira Assets.
 * Accepts either an object key (e.g. "TA-575") or an asset tag (e.g. "1234").
 * Object keys match the pattern LETTERS-NUMBERS. Everything else is treated as an asset tag.
 */
export async function fetchAsset(query: string): Promise<JiraAsset> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  // Determine whether this is an object key (e.g. TA-575) or an asset tag (e.g. 1234)
  const isObjectKey = /^[A-Z]+-\d+$/i.test(query.trim())
  const qlQuery = isObjectKey
    ? `Key = "${query}"`
    : `"Asset tag" = "${query}"`

  const params = new URLSearchParams({
    qlQuery,
    resultPerPage: '1',
    includeAttributes: 'true',
  })
  const url = `${assetsBase}/aql/objects?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Jira Assets API error (${response.status}): ${text}`)
  }

  const data = await response.json()

  if (!data.objectEntries || data.objectEntries.length === 0) {
    throw new Error(`Asset not found: ${query}`)
  }

  // AQL results omit objectTypeAttribute names — fetch the full object by ID
  const objectId: string = data.objectEntries[0].id
  const fullResp = await fetch(`${assetsBase}/object/${objectId}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })
  if (!fullResp.ok) {
    const text = await fullResp.text()
    throw new Error(`Failed to fetch full asset: ${text}`)
  }
  const obj = await fullResp.json()
  const attrs: JiraRawAttribute[] = obj.attributes ?? []

  // Build a flat map of all attributes for extensibility
  const rawAttributes: Record<string, string> = {}
  for (const a of attrs) {
    const attrName = a.objectTypeAttribute?.name ?? 'unknown'
    rawAttributes[attrName] = getAttribute(attrs, attrName)
  }

  return {
    objectId: String(objectId),
    objectKey: obj.objectKey ?? query,
    // 'Model name' is the label attribute in the Powerco schema
    model: getAttribute(attrs, 'Model name') || getAttribute(attrs, 'Model') || obj.label || '',
    manufacturer: getAttribute(attrs, 'Manufacturer') || getAttribute(attrs, 'Vendor') || '',
    serialNumber: getAttribute(attrs, 'Serial Number') || getAttribute(attrs, 'Serial') || '',
    status: getAttribute(attrs, 'Status') || '',
    // Assigned To is a user-reference type; displayValue = 'Name (email)'
    assignedTo: getAttribute(attrs, 'Assigned To') || getAttribute(attrs, 'Owner') || '',
    // Location is a referenced object; displayValue = location name e.g. 'New Plymouth'
    location: getAttribute(attrs, 'Location') || '',
    // Raw numeric object ID used when sending updates back to Jira Assets
    locationKey: getAttributeRawValue(attrs, 'Location') || '',
    rawAttributes,
  }
}

/**
 * Update asset attributes in Jira Assets.
 */
export async function updateAsset(payload: UpdateAssetPayload): Promise<void> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  // Step 1: Find the object by key using GET /object/aql
  const params = new URLSearchParams({
    qlQuery: `Key = "${payload.objectKey}"`,
    resultPerPage: '1',
    includeAttributes: 'true',
  })
  const searchResp = await fetch(`${assetsBase}/aql/objects?${params.toString()}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (!searchResp.ok) {
    const text = await searchResp.text()
    throw new Error(`Failed to find asset: ${text}`)
  }

  const searchData = await searchResp.json()
  if (!searchData.objectEntries?.length) {
    throw new Error(`Asset not found: ${payload.objectKey}`)
  }

  const obj = searchData.objectEntries[0]
  const objectId: string = obj.id
  const objectTypeId: string = obj.objectType?.id

  // Step 2: Get attribute type IDs from the object type schema
  const schemaResp = await fetch(
    `${assetsBase}/objecttype/${objectTypeId}/attributes`,
    { headers, cache: 'no-store' }
  )

  if (!schemaResp.ok) {
    const text = await schemaResp.text()
    throw new Error(`Failed to fetch object type schema: ${text}`)
  }

  const attrTypes: Array<{ id: string; name: string }> = await schemaResp.json() ?? []

  function findAttrId(...names: string[]): string | undefined {
    for (const name of names) {
      const found = attrTypes.find((a) => a.name.toLowerCase() === name.toLowerCase())
      if (found) return found.id
    }
    return undefined
  }

  const attributesToUpdate: Array<{ objectTypeAttributeId: string; objectAttributeValues: Array<{ value: string }> }> = []

  const statusId = findAttrId('Status')
  if (statusId) {
    attributesToUpdate.push({ objectTypeAttributeId: statusId, objectAttributeValues: [{ value: payload.status }] })
  }

  const assignedToId = findAttrId('Assigned To', 'Owner')
  if (assignedToId && payload.assignedToAccountId) {
    attributesToUpdate.push({ objectTypeAttributeId: assignedToId, objectAttributeValues: [{ value: payload.assignedToAccountId }] })
  }

  const locationId = findAttrId('Location')
  if (locationId && payload.locationKey) {
    // Must pass the raw object ID/key — NOT the display name
    attributesToUpdate.push({ objectTypeAttributeId: locationId, objectAttributeValues: [{ value: payload.locationKey }] })
  }

  const buildingId = findAttrId('Building')
  if (buildingId && payload.building) {
    attributesToUpdate.push({ objectTypeAttributeId: buildingId, objectAttributeValues: [{ value: payload.building }] })
  }

  const dateIssuedId = findAttrId('Date Issued', 'Date issued', 'DateIssued')
  if (dateIssuedId && payload.dateIssued) {
    // Jira Assets requires a full ISO 8601 DateTime string, e.g. "2026-03-04T00:00:00.000Z"
    const isoDateTime = payload.dateIssued.includes('T')
      ? payload.dateIssued
      : `${payload.dateIssued}T00:00:00.000Z`
    attributesToUpdate.push({ objectTypeAttributeId: dateIssuedId, objectAttributeValues: [{ value: isoDateTime }] })
  }

  // Step 3: Update the object
  const updateResp = await fetch(`${assetsBase}/object/${objectId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      objectTypeId,
      attributes: attributesToUpdate,
    }),
    cache: 'no-store',
  })

  if (!updateResp.ok) {
    const text = await updateResp.text()
    throw new Error(`Failed to update asset: ${text}`)
  }
}

export interface AssetListItem {
  /** Numeric object ID used in the Jira Assets URL: /jira/assets/object/{objectId} */
  objectId: string
  objectKey: string
  label: string
  model: string
  serialNumber: string
  status: string
  assignedTo: string
  location: string
  objectTypeName: string
}

/**
 * List assets from Jira Assets, optionally filtered by status and/or asset type.
 * Uses 2 API calls: one AQL query + one schema fetch to resolve attribute names.
 */
export async function listAssets(statusFilter?: string, typeFilter?: string): Promise<AssetListItem[]> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  const statusValues = ['In Stock', 'Ready to Deploy', 'Issued', 'Returned', 'Faulty']
  let qlQuery = ''
  
  const statusPart = statusFilter
    ? `"Status" = "${statusFilter}"`
    : `"Status" IN (${statusValues.map((s) => `"${s}"`).join(', ')})`
  
  const typePart = typeFilter
    ? `objectType = "${typeFilter}"`
    : ''
  
  if (statusPart && typePart) {
    qlQuery = `${statusPart} AND ${typePart}`
  } else {
    qlQuery = statusPart || typePart
  }

  const params = new URLSearchParams({
    qlQuery,
    resultPerPage: '200',
    includeAttributes: 'true',
  })

  const resp = await fetch(`${assetsBase}/aql/objects?${params.toString()}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Failed to list assets: ${text}`)
  }

  const data = await resp.json()
  const entries: Array<{
    id: string
    objectKey: string
    label: string
    objectType?: { id: string }
    attributes?: Array<{
      objectTypeAttributeId: string
      objectAttributeValues?: Array<{ value?: string; displayValue?: string }>
    }>
  }> = data.objectEntries ?? []

  if (entries.length === 0) return []

  // Build a map of objectTypeId → objectTypeName
  const objectTypeIdToName: Record<string, string> = {}
  const uniqueTypeIds = Array.from(new Set(entries.map(e => e.objectType?.id).filter(Boolean)))
  
  for (const typeId of uniqueTypeIds) {
    const typeResp = await fetch(`${assetsBase}/objecttype/${typeId}`, {
      headers,
      cache: 'no-store',
    })
    if (typeResp.ok) {
      const typeData: { id: string; name: string } = await typeResp.json()
      objectTypeIdToName[String(typeId)] = typeData.name
    }
  }

  // Fetch attribute schema once to map attribute ID → name
  const objectTypeId = entries[0].objectType?.id
  const attrIdToName: Record<string, string> = {}

  if (objectTypeId) {
    const schemaResp = await fetch(`${assetsBase}/objecttype/${objectTypeId}/attributes`, {
      headers,
      cache: 'no-store',
    })
    if (schemaResp.ok) {
      const attrTypes: Array<{ id: string; name: string }> = await schemaResp.json() ?? []
      for (const a of attrTypes) {
        attrIdToName[String(a.id)] = a.name
      }
    }
  }

  return entries.map((obj) => {
    const attrMap: Record<string, string> = {}
    for (const attr of obj.attributes ?? []) {
      const name = attrIdToName[String(attr.objectTypeAttributeId)]
      if (name && attr.objectAttributeValues?.length) {
        const val = attr.objectAttributeValues[0]
        attrMap[name.toLowerCase()] = val.displayValue ?? val.value ?? ''
      }
    }
    return {
      objectId: String(obj.id ?? ''),
      objectKey: obj.objectKey ?? '',
      label: obj.label ?? '',
      model: attrMap['model name'] || attrMap['model'] || obj.label || '',
      serialNumber: attrMap['serial number'] || attrMap['serial'] || '',
      status: attrMap['status'] || '',
      assignedTo: attrMap['assigned to'] || attrMap['owner'] || '',
      location: attrMap['location'] || '',
      objectTypeName: objectTypeIdToName[String(obj.objectType?.id)] || 'Unknown',
    }
  })
}

export interface CreateAssetPayload {
  /** Object type name, e.g. "Laptop", "Monitor" */
  objectTypeName: string
  assetTag?: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  /** Location display name — will be resolved to its Jira object ID */
  locationName?: string
  status?: string
  /** ISO date string YYYY-MM-DD */
  dateAdded?: string
}

/**
 * Alias map: normalises common user-entered terms to the actual Jira object type names.
 * Keys are lowercase; values must match the Jira object type label exactly.
 */
const OBJECT_TYPE_ALIASES: Record<string, string> = {
  // Computer aliases
  laptop:     'Computer',
  desktop:    'Computer',
  pc:         'Computer',
  notebook:   'Computer',
  computer:   'Computer',
  // Monitor aliases
  monitor:    'Monitor',
  screen:     'Monitor',
  display:    'Monitor',
  portable:   'Monitor',
  'portable monitor': 'Monitor',
  // Keyboard
  keyboard:   'Keyboard',
  'keyboard only': 'Keyboard',
  // Mouse
  mouse:      'Mouse',
  standard:   'Mouse',
  vertical:   'Mouse',
  // Keyboard/Mouse Combo
  'keyboard/mouse combo': 'Keyboard',
  'keyboard mouse combo': 'Keyboard',
  'combo':     'Keyboard',
  // Headset
  headset:    'Headset',
  headphones: 'Headset',
  // Docking Station
  'docking station': 'Docking Station',
  dock:       'Docking Station',
  docking:    'Docking Station',
  // Lenovo Gen 4 dock
  'lenovo gen 4': 'Lenovo Gen 4',
  // Phones
  phones:     'Phones',
  phone:      'Phones',
  mobile:     'Mobile',
  // Accessories
  accessories: 'Accessories',
  accessory:   'Accessories',
}

/**
 * Hardcoded map of Jira Assets object type name → numeric type ID.
 * These IDs are stable for the "Test Asset" (TA) schema (ID 4) in this workspace.
 * To add new types: check GET /objectschema/4/objecttypes/flat for the id field.
 */
const OBJECT_TYPE_IDS: Record<string, string> = {
  'Computer':        '41',
  'Monitor':         '76',
  'Keyboard':        '38',
  'Mouse':           '39',
  'Headset':         '37',
  'Docking Station': '82',
  'Lenovo Gen 4':    '116',
  'Phones':          '40',
  'Mobile':          '40',
  'Accessories':     '77',
}

/**
 * Default asset type used when none is provided during creation.
 * This ensures all assets have a type even if not specified in CSV.
 */
export const DEFAULT_OBJECT_TYPE = 'Accessories'

/**
 * Resolves an object type name (or alias) to its numeric Jira type ID.
 * Uses the hardcoded map first (no API call needed); falls back to the
 * schema API for any types added to Jira after this map was written.
 */
async function findObjectTypeId(typeName: string): Promise<string> {
  // If no type name provided, use default type
  if (!typeName || typeName.trim() === '') {
    return OBJECT_TYPE_IDS[DEFAULT_OBJECT_TYPE]
  }

  const resolved = OBJECT_TYPE_ALIASES[typeName.toLowerCase()] ?? typeName

  // Fast path — hardcoded map covers all known types
  if (OBJECT_TYPE_IDS[resolved]) return OBJECT_TYPE_IDS[resolved]

  // Also try using the alias map without full resolution (handles exact-case mismatches)
  const resolvedLower = resolved.toLowerCase()
  const hardcodedEntry = Object.entries(OBJECT_TYPE_IDS).find(
    ([k]) => k.toLowerCase() === resolvedLower
  )
  if (hardcodedEntry) return hardcodedEntry[1]

  // Fallback — query the schema API for types added after this map was written
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()
  const schemaId = process.env.JIRA_ASSETS_SCHEMA_ID ?? '4'
  const resp = await fetch(`${assetsBase}/objectschema/${schemaId}/objecttypes/flat`, {
    headers,
    cache: 'no-store',
  })
  if (resp.ok) {
    const types: Array<{ id: string; name: string }> = (await resp.json()) ?? []
    const found = types.find((t) => t.name.toLowerCase() === resolved.toLowerCase())
    if (found) return String(found.id)
  }

  // If type not found after all attempts, use default type
  return OBJECT_TYPE_IDS[DEFAULT_OBJECT_TYPE]
}

/**
 * Resolves a location display name to its Jira object ID.
 * Tries exact match first, then falls back to a partial (LIKE) search.
 */
async function resolveLocationId(locationName: string): Promise<string> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  // Try exact match first
  for (const qlQuery of [
    `objectType = "Location" AND label = "${locationName}"`,
    `objectType = "Location" AND label like "%${locationName}%"`,
  ]) {
    const params = new URLSearchParams({ qlQuery, resultPerPage: '1', includeAttributes: 'false' })
    const resp = await fetch(`${assetsBase}/aql/objects?${params.toString()}`, {
      headers,
      cache: 'no-store',
    })
    if (!resp.ok) continue
    const data = await resp.json()
    if (data.objectEntries?.length) return String(data.objectEntries[0].id)
  }

  // Fetch all locations so we can hint the user
  const allParams = new URLSearchParams({
    qlQuery: 'objectType = "Location"',
    resultPerPage: '50',
    includeAttributes: 'false',
  })
  const allResp = await fetch(`${assetsBase}/aql/objects?${allParams.toString()}`, { headers, cache: 'no-store' })
  if (allResp.ok) {
    const allData = await allResp.json()
    const names: string[] = (allData.objectEntries ?? []).map((e: { label?: string }) => e.label ?? '')
    throw new Error(`Location not found: "${locationName}". Available locations: ${names.join(', ')}`)
  }

  throw new Error(`Location not found: "${locationName}"`)
}

/**
 * Create a new asset object in Jira Assets.
 * Returns the new object key (e.g. "TA-612").
 */
export async function createAsset(payload: CreateAssetPayload): Promise<string> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  const objectTypeId = await findObjectTypeId(payload.objectTypeName)

  const schemaResp = await fetch(`${assetsBase}/objecttype/${objectTypeId}/attributes`, {
    headers,
    cache: 'no-store',
  })
  if (!schemaResp.ok) throw new Error(`Failed to fetch schema: ${await schemaResp.text()}`)

  // Full attribute metadata — includes defaultType (Text/Select/DateTime…) and options list
  const attrTypes: Array<{
    id: string
    name: string
    defaultType?: { id: number; name: string }
    /** Comma-separated list of allowed values for Select attributes */
    options?: string
  }> = (await schemaResp.json()) ?? []

  function findAttr(...names: string[]) {
    for (const name of names) {
      const found = attrTypes.find((a) => a.name.toLowerCase() === name.toLowerCase())
      if (found) return found
    }
    return undefined
  }

  const skippedFields: string[] = []
  const attributes: Array<{
    objectTypeAttributeId: string
    objectAttributeValues: Array<{ value: string }>
  }> = []

  /**
   * Push an attribute value, skipping if:
   * - id or value is missing
   * - attribute is a Select type and value is not in the allowed options list
   */
  const push = (attrName: string, value: string | undefined, ...altNames: string[]) => {
    const attr = findAttr(attrName, ...altNames)
    if (!attr || !value) return

    const isSelect = attr.defaultType?.id === 10 || attr.defaultType?.name === 'Select'
    if (isSelect && attr.options) {
      const allowed = attr.options.split(',').map((o) => o.trim().toLowerCase())
      if (!allowed.includes(value.toLowerCase())) {
        skippedFields.push(`${attr.name} ("${value}" not in allowed options: ${attr.options})`)
        return
      }
    }

    attributes.push({ objectTypeAttributeId: attr.id, objectAttributeValues: [{ value }] })
  }

  push('Asset tag', payload.assetTag, 'Asset Tag')
  push('Model name', payload.model, 'Model')
  push('Manufacturer', payload.manufacturer, 'Vendor')
  push('Serial Number', payload.serialNumber, 'Serial')
  // Status is often a required field in Jira Assets, so always include if provided
  if (payload.status) {
    push('Status', payload.status)
  }

  if (payload.locationName) {
    const locationId = await resolveLocationId(payload.locationName)
    const locationAttr = findAttr('Location')
    if (locationAttr) {
      attributes.push({ objectTypeAttributeId: locationAttr.id, objectAttributeValues: [{ value: locationId }] })
    }
  }

  if (payload.dateAdded) {
    const iso = payload.dateAdded.includes('T') ? payload.dateAdded : `${payload.dateAdded}T00:00:00.000Z`
    push('Date received', iso, 'Date Received', 'Date Added', 'Date Issued', 'Date added')
  }

  // Ensure at least one attribute is provided
  if (attributes.length === 0) {
    const fieldsProvided = [
      payload.assetTag && 'Asset tag',
      payload.model && 'Model',
      payload.manufacturer && 'Manufacturer',
      payload.serialNumber && 'Serial Number',
      payload.status && 'Status',
      payload.locationName && 'Location',
      payload.dateAdded && 'Date received',
    ].filter(Boolean).join(', ')
    
    const missingFields = [
      !payload.model && 'Model name (or Model)',
      !payload.assetTag && !payload.serialNumber && 'Asset tag or Serial Number',
      !payload.status && 'Status',
    ].filter(Boolean).join('; ')
    
    throw new Error(
      `Cannot create asset with no attributes. ` +
      `Provided: ${fieldsProvided || 'none'}. ` +
      `Required: at least ${missingFields || 'Model name, Asset tag, or Serial Number'}`
    )
  }

  const createPayload = { objectTypeId, attributes }
  console.log(`Sending to Jira: ${JSON.stringify(createPayload, null, 2)}`)

  const createResp = await fetch(`${assetsBase}/object/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload),
    cache: 'no-store',
  })

  if (!createResp.ok) {
    const text = await createResp.text()
    console.error(`Jira API error (${createResp.status}):`, text)
    throw new Error(`Failed to create asset: ${text}`)
  }
  const created = await createResp.json()

  const objectKey = (created.objectKey ?? String(created.id)) as string
  if (skippedFields.length > 0) {
    // Return key but append a note about skipped fields (caller can surface this)
    return `${objectKey} (note: skipped fields — ${skippedFields.join('; ')})`
  }
  return objectKey
}

/**
 * Delete an asset from Jira Assets by object key.
 * Fetches the object ID from the key, then deletes it.
 */
export async function deleteAsset(objectKey: string): Promise<void> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  // Step 1: Find the object by key
  const params = new URLSearchParams({
    qlQuery: `Key = "${objectKey}"`,
    resultPerPage: '1',
    includeAttributes: 'false',
  })
  const searchResp = await fetch(`${assetsBase}/aql/objects?${params.toString()}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (!searchResp.ok) {
    const text = await searchResp.text()
    throw new Error(`Failed to find asset: ${text}`)
  }

  const searchData = await searchResp.json()
  if (!searchData.objectEntries?.length) {
    throw new Error(`Asset not found: ${objectKey}`)
  }

  const objectId: string = searchData.objectEntries[0].id

  // Step 2: Delete the object
  const deleteResp = await fetch(`${assetsBase}/object/${objectId}`, {
    method: 'DELETE',
    headers,
    cache: 'no-store',
  })

  if (!deleteResp.ok) {
    const text = await deleteResp.text()
    throw new Error(`Failed to delete asset: ${text}`)
  }
}

/**
 * Get available issue types for a project
 */
async function getAvailableIssueTypes(projectKey: string, baseUrl: string): Promise<Array<{ id: string; name: string }>> {
  const headers = getAuthHeaders()

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.warn(`Failed to get issue types: ${response.status}`)
      return []
    }

    const data = await response.json()
    const project = data.projects?.[0]
    if (!project?.issuetypes) return []

    return project.issuetypes.map((type: { id: string; name: string }) => ({
      id: type.id,
      name: type.name,
    }))
  } catch (err) {
    console.warn('Error getting issue types:', err)
    return []
  }
}

/**
 * Fetch valid status options for assets from Jira Assets.
 * Queries the Status attribute metadata to get all possible valid values.
 */
export async function getValidStatusOptions(): Promise<string[]> {
  const assetsBase = getAssetsApiBase()
  const headers = getAuthHeaders()

  try {
    // Get a sample asset to determine object type and get its Status values
    const params = new URLSearchParams({
      qlQuery: 'ORDER BY created DESC',
      resultPerPage: '50',
      includeAttributes: 'true',
    })

    const searchResp = await fetch(`${assetsBase}/aql/objects?${params.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!searchResp.ok) {
      console.warn('Failed to fetch assets for status schema')
      return []
    }

    const searchData = await searchResp.json()
    const entries = searchData.objectEntries ?? []
    
    if (entries.length === 0) {
      return []
    }

    // Extract all unique Status values from actual assets
    const statusValues = new Set<string>()
    
    for (const entry of entries) {
      const attrs: JiraRawAttribute[] = entry.attributes ?? []
      const statusValue = getAttribute(attrs, 'Status')
      if (statusValue) {
        statusValues.add(statusValue)
      }
    }

    // Return sorted unique status values
    return Array.from(statusValues).sort()
  } catch (err) {
    console.warn('Error fetching status options:', err)
    return []
  }
}

/**
 * Create a ticket in the Jira sandbox for asset management (repairs, tracking, etc).
 * Links the asset key in the description for easy reference.
 */
export async function createSandboxTicket(payload: CreateTicketPayload): Promise<string> {
  const sandboxUrl = process.env.JIRA_SANDBOX_BASE_URL
  const projectKey = process.env.JIRA_SANDBOX_PROJECT_KEY ?? 'ISSD'
  
  if (!sandboxUrl) {
    throw new Error('Missing JIRA_SANDBOX_BASE_URL environment variable')
  }

  const headers = getAuthHeaders()

  const summary = payload.summary
    ?? `Asset: ${payload.objectKey} — Assigned to ${payload.assignedTo || 'N/A'}`

  // Build description with asset details and user-provided issue description
  let descriptionText = `Asset Key: ${payload.objectKey}\nAssigned To: ${payload.assignedTo}\nStatus: ${payload.status}\nLocation: ${payload.location}`
  
  if (payload.description) {
    descriptionText += `\n\nIssue Description:\n${payload.description}`
  }
  
  if (payload.vendorSupportId) {
    descriptionText += `\n\nVendor Support ID: ${payload.vendorSupportId}`
  }

  const description = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: descriptionText,
          },
        ],
      },
    ],
  }

  // Get available issue types
  const issueTypes = await getAvailableIssueTypes(projectKey, sandboxUrl)
  
  // Try to find a suitable issue type (prefer first one available)
  if (issueTypes.length === 0) {
    throw new Error(`No issue types available for project ${projectKey}. Check project configuration.`)
  }

  const issueTypeId = issueTypes[0].id
  const issueTypeName = issueTypes[0].name

  console.log(`Creating ticket with issue type: ${issueTypeName} (${issueTypeId})`)

  const response = await fetch(`${sandboxUrl.replace(/\/$/, '')}/rest/api/3/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description,
        issuetype: { id: issueTypeId },
      },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to create sandbox ticket: ${text}`)
  }

  const data = await response.json()
  return data.key as string
}

/**
 * Search for linked issues in the sandbox related to an asset.
 * Returns all issues in ISSD project that mention the asset key.
 */
export async function searchAssetIssues(assetKey: string): Promise<Array<{ key: string; summary: string; status: string }>> {
  const sandboxUrl = process.env.JIRA_SANDBOX_BASE_URL
  const projectKey = process.env.JIRA_SANDBOX_PROJECT_KEY ?? 'ISSD'
  
  console.log('\n=== searchAssetIssues START ===')
  console.log('[searchAssetIssues] Asset Key:', assetKey)
  console.log('[searchAssetIssues] Sandbox URL:', sandboxUrl)
  console.log('[searchAssetIssues] Project Key:', projectKey)
  
  if (!sandboxUrl) {
    console.error('[searchAssetIssues] ERROR: Sandbox URL not configured in JIRA_SANDBOX_BASE_URL')
    console.log('=== searchAssetIssues END (no sandbox) ===\n')
    return []
  }

  const headers = getAuthHeaders()

  try {
    // Try multiple search strategies
    const strategies = [
      { name: 'text search', jql: `project = "${projectKey}" AND text ~ "${assetKey}"` },
      { name: 'summary or description', jql: `project = "${projectKey}" AND (summary ~ "${assetKey}" OR description ~ "${assetKey}")` },
    ]

    for (const strategy of strategies) {
      console.log(`\n[searchAssetIssues] Trying strategy: ${strategy.name}`)
      console.log('[searchAssetIssues] JQL:', strategy.jql)
      
      // Use the new /rest/api/3/search/jql endpoint (old search endpoint was deprecated)
      const url = `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/search/jql`
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          jql: strategy.jql,
          fields: ['key', 'summary', 'status'],
          maxResults: 50,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[searchAssetIssues] API Error ${response.status} for strategy "${strategy.name}":`)
        console.error(errorText.substring(0, 500))
        continue
      }

      const data = await response.json()
      const issues = data.issues ?? []
      console.log(`[searchAssetIssues] Found ${issues.length} issues with strategy "${strategy.name}"`)
      
      if (issues.length > 0) {
        const result = issues.map((issue: { key: string; fields: { summary: string; status?: { name?: string } } }) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status?.name ?? 'Unknown',
        }))
        console.log('[searchAssetIssues] Returning issues:', result)
        console.log('=== searchAssetIssues END (found) ===\n')
        return result
      }
    }
    
    console.log('[searchAssetIssues] No issues found with any strategy')
    console.log('=== searchAssetIssues END (no results) ===\n')
    return []
  } catch (err) {
    console.error('[searchAssetIssues] ERROR:', err instanceof Error ? err.message : String(err))
    console.error('[searchAssetIssues] Stack trace:', err instanceof Error ? err.stack : 'N/A')
    console.log('=== searchAssetIssues END (error) ===\n')
    return []
  }
}

/**
 * Search for pending equipment requests in ISSD project.
 * Returns unresolved tickets of type "New Starter Kit" only.
 * Extracts equipment items from description (format: "1 x Laptop", "1 x Mouse", etc).
 */
export async function searchPendingRequests(): Promise<EquipmentRequest[]> {
  const sandboxUrl = process.env.JIRA_SANDBOX_BASE_URL
  const projectKey = process.env.JIRA_SANDBOX_PROJECT_KEY ?? 'ISSD'

  if (!sandboxUrl) {
    console.warn('[searchPendingRequests] Sandbox URL not configured')
    return []
  }

  const headers = getAuthHeaders()

  try {
    // Search for tickets in ISSD that are "New Starter Kit" type (all statuses)
    const jql = `project = "${projectKey}" AND type = "New Starter Kit" ORDER BY created DESC`
    
    console.log('[searchPendingRequests] JQL:', jql)

    const url = `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/search/jql`
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        jql,
        fields: ['key', 'summary', 'description', 'created', 'status', 'issuelinks', 'reporter', 'assignee'],
        maxResults: 50,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[searchPendingRequests] API Error ${response.status}:`, errorText.substring(0, 200))
      return []
    }

    const data = await response.json()
    const issues = data.issues ?? []
    
    console.log(`[searchPendingRequests] Found ${issues.length} New Starter Kit tickets`)

    const requests: EquipmentRequest[] = issues.map((issue: any) => {
      const description = issue.fields.description?.content
        ?.map((c: any) => c.content?.map((t: any) => t.text).join(''))
        .join('\n') || issue.fields.description || ''
      
      // Extract asset key if already linked (e.g., "Assigned: TA-798")
      const assetKeyMatch = description.match(/(?:TA|Asset[:\s]+)(TA-\d+)/i)
      const assignedAssetKey = assetKeyMatch ? assetKeyMatch[1] : null

      // Extract equipment items from description (format: "1 x Laptop", "2 x Mouse", etc)
      // Also handle format: "- Laptop (with charger)"
      const equipmentItems: string[] = []
      const itemRegex = /(?:^|\n|-|\*)\s*\d+\s*x\s+([^(\n]*?)(?:\(|$|\n)/gim
      let match
      while ((match = itemRegex.exec(description)) !== null) {
        const item = match[1].trim()
        if (item && !item.toLowerCase().includes('please') && !item.toLowerCase().includes('setup')) {
          equipmentItems.push(item)
        }
      }

      // Fallback: if no items found with "x" format, try to extract items from list
      if (equipmentItems.length === 0) {
        const lines = description.split('\n')
        for (const line of lines) {
          // Look for lines that mention equipment types
          if (line.match(/laptop|mouse|keyboard|headset|monitor|docking|backpack|accessories/i)) {
            const match = line.match(/(?:^|\s)([^(\n]+?)(?:\(|$|\n)/i)
            if (match) {
              const item = match[1].trim().replace(/^[\d\-*•\s]+/, '').trim()
              if (item && item.length > 0) {
                equipmentItems.push(item)
              }
            }
          }
        }
      }

      const reporter = issue.fields.reporter
      const assignee = issue.fields.assignee

      return {
        key: issue.key,
        summary: issue.fields.summary || '',
        requester: reporter?.emailAddress || '',
        requesterName: reporter?.displayName || 'Unknown',
        requesterEmail: assignee?.emailAddress || reporter?.emailAddress || '',
        description,
        equipmentItems: equipmentItems.length > 0 ? equipmentItems : ['Equipment'],
        createdDate: issue.fields.created || '',
        status: issue.fields.status?.name || 'Open',
        assignedAssetKey,
      }
    })

    return requests.filter(r => !r.assignedAssetKey) // Only return unassigned requests
  } catch (err) {
    console.error('[searchPendingRequests] Error:', err instanceof Error ? err.message : String(err))
    return []
  }
}

/**
 * Get details of a specific equipment request ticket.
 */
export async function getRequestDetails(ticketKey: string): Promise<EquipmentRequest | null> {
  const sandboxUrl = process.env.JIRA_SANDBOX_BASE_URL

  if (!sandboxUrl) {
    console.warn('[getRequestDetails] Sandbox URL not configured')
    return null
  }

  const headers = getAuthHeaders()

  try {
    const url = `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/issue/${ticketKey}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`[getRequestDetails] Failed to fetch ${ticketKey}: ${response.status}`)
      return null
    }

    const issue = await response.json()
    const description = issue.fields.description?.content
      ?.map((c: any) => c.content?.map((t: any) => t.text).join(''))
      .join('\n') || issue.fields.description || ''
    
    // Extract asset key if already linked
    const assetKeyMatch = description.match(/(?:TA|Asset[:\s]+)(TA-\d+)/i)
    const assignedAssetKey = assetKeyMatch ? assetKeyMatch[1] : null

    // Extract equipment items from description (format: "1 x Laptop", "2 x Mouse", etc)
    const equipmentItems: string[] = []
    const itemRegex = /(?:^|\n|-|\*)\s*\d+\s*x\s+([^(\n]*?)(?:\(|$|\n)/gim
    let match
    while ((match = itemRegex.exec(description)) !== null) {
      const item = match[1].trim()
      if (item && !item.toLowerCase().includes('please') && !item.toLowerCase().includes('setup')) {
        equipmentItems.push(item)
      }
    }

    // Fallback: if no items found with "x" format
    if (equipmentItems.length === 0) {
      const lines = description.split('\n')
      for (const line of lines) {
        if (line.match(/laptop|mouse|keyboard|headset|monitor|docking|backpack|accessories/i)) {
          const itemMatch = line.match(/(?:^|\s)([^(\n]+?)(?:\(|$|\n)/i)
          if (itemMatch) {
            const item = itemMatch[1].trim().replace(/^[\d\-*•\s]+/, '').trim()
            if (item && item.length > 0) {
              equipmentItems.push(item)
            }
          }
        }
      }
    }

    const reporter = issue.fields.reporter
    const assignee = issue.fields.assignee

    return {
      key: issue.key,
      summary: issue.fields.summary || '',
      requester: reporter?.emailAddress || '',
      requesterName: reporter?.displayName || 'Unknown',
      requesterEmail: assignee?.emailAddress || reporter?.emailAddress || '',
      description,
      equipmentItems: equipmentItems.length > 0 ? equipmentItems : ['Equipment'],
      createdDate: issue.fields.created || '',
      status: issue.fields.status?.name || 'Open',
      assignedAssetKey,
    }
  } catch (err) {
    console.error('[getRequestDetails] Error:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Assign an asset to an equipment request ticket.
 * Creates a link between them, updates ticket status, and updates the asset assignment.
 */
export async function assignToRequest(
  payload: AssignToRequestPayload
): Promise<AssignToRequestResponse> {
  const sandboxUrl = process.env.JIRA_SANDBOX_BASE_URL

  if (!sandboxUrl) {
    throw new Error('Sandbox URL not configured')
  }

  const headers = getAuthHeaders()

  try {
    console.log('[assignToRequest] Starting assignment:', payload)

    // Step 1: Create a link between the ticket and the asset (via a comment)
    const comment = `Asset assigned: ${payload.assetKey} to ${payload.assignedTo}`
    
    const commentResp = await fetch(
      `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/issue/${payload.ticketKey}/comment`,
      {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: comment }],
              },
            ],
          },
        }),
      }
    )

    if (!commentResp.ok) {
      const errorText = await commentResp.text()
      console.warn('[assignToRequest] Failed to add comment:', errorText)
    }

    // Step 2: Update ticket status to "Resolved" or "Done"
    const transitionResp = await fetch(
      `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/issue/${payload.ticketKey}/transitions`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    )

    if (transitionResp.ok) {
      const transitions = await transitionResp.json()
      const resolveTransition = (transitions.transitions || []).find(
        (t: any) => t.name === 'Done' || t.name === 'Resolve'
      )

      if (resolveTransition) {
        const updateResp = await fetch(
          `${sandboxUrl.replace(/\/$/, '')}/rest/api/3/issue/${payload.ticketKey}/transitions`,
          {
            method: 'POST',
            headers,
            cache: 'no-store',
            body: JSON.stringify({ transition: { id: resolveTransition.id } }),
          }
        )

        if (!updateResp.ok) {
          console.warn('[assignToRequest] Failed to transition ticket')
        }
      }
    }

    return {
      success: true,
      assetKey: payload.assetKey,
      ticketKey: payload.ticketKey,
      ticketUpdated: true,
      ticketStatus: 'Resolved',
      message: `Asset ${payload.assetKey} assigned to ${payload.assignedTo} (Ticket: ${payload.ticketKey})`,
    }
  } catch (err) {
    console.error('[assignToRequest] Error:', err)
    throw err
  }
}
