'use client'

import { useState, useRef, useEffect } from 'react'

interface StatusOption {
  label: string
}

interface JiraUser {
  accountId: string
  displayName: string
  email: string
}

interface JiraLocation {
  objectId: string
  objectKey: string
  label: string
}

interface Props {
  objectKey: string
  manufacturer: string
  currentAssignedTo: string
  currentStatus: string
  currentLocation: string
  /** Raw object ID for the Location reference (needed by Jira Assets API) */
  currentLocationKey: string
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export default function AssetAssignForm({
  objectKey,
  manufacturer,
  currentAssignedTo,
  currentStatus,
  currentLocation,
  currentLocationKey,
}: Props) {
  const [statusOptions, setStatusOptions] = useState<string[]>(['In Stock', 'Ready to Deploy', 'Issued', 'Returned', 'Faulty'])
  const [statusLoading, setStatusLoading] = useState(true)
  
  const [status, setStatus] = useState(currentStatus || '')
  const [dateIssued, setDateIssued] = useState(() => new Date().toISOString().split('T')[0])
  const [createTicket, setCreateTicket] = useState(false)
  const [ticketSummary, setTicketSummary] = useState('')
  const [ticketDescription, setTicketDescription] = useState('')
  const [vendorSupportId, setVendorSupportId] = useState('')

  // User search state
  const [userQuery, setUserQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<JiraUser | null>(null)
  const [userResults, setUserResults] = useState<JiraUser[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Location dropdown state — all locations fetched once on mount
  const [allLocations, setAllLocations] = useState<JiraLocation[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [selectedLocationId, setSelectedLocationId] = useState(currentLocationKey ?? '')

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('')
  const [ticketKey, setTicketKey] = useState('')

  const isLoading = submitState === 'loading'
  
  // Fetch valid status options on mount
  useEffect(() => {
    async function fetchStatusOptions() {
      try {
        const resp = await fetch('/api/jira/statusOptions')
        if (resp.ok) {
          const data = await resp.json()
          const options = data.options ?? []
          
          if (options.length > 0) {
            setStatusOptions(options)
            // Set current status if it's valid, otherwise use first option
            if (options.includes(currentStatus)) {
              setStatus(currentStatus)
            } else {
              setStatus(options[0])
            }
          } else {
            // If no options returned, keep current status
            setStatus(currentStatus || '')
          }
        }
      } catch (err) {
        console.error('Failed to fetch status options:', err)
        setStatus(currentStatus || '')
      } finally {
        setStatusLoading(false)
      }
    }
    fetchStatusOptions()
  }, [currentStatus])

  // Fetch all locations once on mount
  useEffect(() => {
    fetch('/api/jira/searchLocations?all=true')
      .then((r) => r.json())
      .then((d) => setAllLocations(d.locations ?? []))
      .catch(() => {})
      .finally(() => setLocationsLoading(false))
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleUserQueryChange(val: string) {
    setUserQuery(val)
    setSelectedUser(null)
    setShowDropdown(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < 2) {
      setUserResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setUserSearching(true)
      try {
        const resp = await fetch(`/api/jira/searchUsers?query=${encodeURIComponent(val.trim())}`)
        const data = await resp.json()
        setUserResults(data.users ?? [])
        setShowDropdown(true)
      } catch {
        setUserResults([])
      } finally {
        setUserSearching(false)
      }
    }, 300)
  }

  function selectUser(user: JiraUser) {
    setSelectedUser(user)
    setUserQuery(user.displayName)
    setShowDropdown(false)
    setUserResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitState('loading')
    setMessage('')
    setTicketKey('')

    const assignedToAccountId = selectedUser?.accountId ?? ''
    const assignedToDisplay = selectedUser?.displayName ?? currentAssignedTo
    // Use selected location object ID, or fall back to the current key (no change)
    const locationKey = selectedLocationId || currentLocationKey

    try {
      const updateResp = await fetch('/api/jira/updateAsset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectKey, assignedToAccountId, assignedToDisplay, status, locationKey, dateIssued }),
      })

      if (!updateResp.ok) {
        const data = await updateResp.json()
        throw new Error(data.error ?? 'Failed to update asset')
      }

      if (createTicket) {
        const ticketResp = await fetch('/api/jira/createTicket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            objectKey, 
            assignedTo: assignedToDisplay, 
            status, 
            location, 
            summary: ticketSummary || `Repair needed (${objectKey})`,
            description: ticketDescription,
            vendorSupportId: vendorSupportId || undefined,
          }),
        })

        if (!ticketResp.ok) {
          const data = await ticketResp.json()
          throw new Error(data.error ?? 'Asset updated but failed to create sandbox ticket')
        }

        const ticketData = await ticketResp.json()
        setTicketKey(ticketData.issueKey ?? '')
      }

      setSubmitState('success')
      setMessage('Asset updated successfully.')
    } catch (err) {
      setSubmitState('error')
      setMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-5">Update Assignment</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Assign To — email/name search */}
        <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
          <label className="text-sm font-semibold text-gray-600">
            Assign To
          </label>
          {currentAssignedTo && (
            <p className="text-xs text-gray-400 mb-1">
              Currently: <span className="font-medium text-gray-600">{currentAssignedTo}</span>
            </p>
          )}
          <div className="relative">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => handleUserQueryChange(e.target.value)}
              placeholder="Search by name or email (e.g. jane@powerco.co.nz)"
              disabled={isLoading}
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 pr-8"
            />
            {userSearching && (
              <svg className="animate-spin h-4 w-4 text-gray-400 absolute right-3 top-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
          </div>

          {/* User dropdown */}
          {showDropdown && userResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {userResults.map((user) => (
                <button
                  key={user.accountId}
                  type="button"
                  onClick={() => selectUser(user)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                >
                  <p className="text-sm font-semibold text-gray-800">{user.displayName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </button>
              ))}
            </div>
          )}

          {showDropdown && userResults.length === 0 && !userSearching && userQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 px-4 py-3 text-sm text-gray-400">
              No users found for &ldquo;{userQuery}&rdquo;
            </div>
          )}

          {selectedUser && (
            <p className="text-xs text-green-600 font-medium mt-1">
              ✓ Selected: {selectedUser.displayName} ({selectedUser.email})
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-semibold text-gray-600">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isLoading || statusLoading}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white"
          >
            {statusLoading ? (
              <option>Loading statuses…</option>
            ) : (
              statusOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))
            )}
          </select>
        </div>

        {/* Date Issued */}
        <div className="flex flex-col gap-1">
          <label htmlFor="dateIssued" className="text-sm font-semibold text-gray-600">
            Date Issued
          </label>
          <input
            id="dateIssued"
            type="date"
            value={dateIssued}
            onChange={(e) => setDateIssued(e.target.value)}
            disabled={isLoading}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        {/* Location — select dropdown */}
        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm font-semibold text-gray-600">Location</label>
          {currentLocation && (
            <p className="text-xs text-gray-400 mb-1">
              Currently: <span className="font-medium text-gray-600">{currentLocation}</span>
            </p>
          )}
          <select
            id="location"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            disabled={isLoading || locationsLoading}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white"
          >
            <option value="">{locationsLoading ? 'Loading locations…' : '— No change —'}</option>
            {allLocations
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((loc) => (
                <option key={loc.objectId} value={loc.objectId}>
                  {loc.label}
                </option>
              ))}
          </select>
        </div>

        {/* Create ticket in sandbox */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={createTicket}
            onChange={(e) => setCreateTicket(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 accent-blue-700"
          />
          <span className="text-sm text-gray-700">Create ticket in sandbox (ISSD) for this asset</span>
        </label>

        {/* Ticket fields (shown when createTicket is checked) */}
        {createTicket && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="ticketSummary" className="text-sm font-semibold text-gray-700">
                Ticket Summary (required)
              </label>
              <input
                id="ticketSummary"
                type="text"
                value={ticketSummary}
                onChange={(e) => setTicketSummary(e.target.value)}
                disabled={isLoading}
                placeholder="e.g., Broken USB port, Screen flickering, Battery not charging..."
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500">Short title for the ticket (will be shown as issue summary)</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ticketDesc" className="text-sm font-semibold text-gray-700">
                Description
              </label>
              <textarea
                id="ticketDesc"
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                disabled={isLoading}
                placeholder="Detailed description of the issue, repair needed, or support request..."
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500">Include device asset key {objectKey} and any relevant details</p>
            </div>

            {manufacturer?.toLowerCase().includes('lenovo') && (
              <div className="flex flex-col gap-1">
                <label htmlFor="vendorSupportId" className="text-sm font-semibold text-gray-700">
                  🔧 Lenovo Vendor Support ID
                </label>
                <input
                  id="vendorSupportId"
                  type="text"
                  value={vendorSupportId}
                  onChange={(e) => setVendorSupportId(e.target.value)}
                  disabled={isLoading}
                  placeholder="e.g., SN-12345678, RMA number if available"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500">Lenovo service tag, RMA number, or support ID for tracking repairs</p>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>

      {/* Feedback */}
      {submitState === 'success' && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold">✓ {message}</p>
          {ticketKey && (
            <p className="mt-1">
              Sandbox Ticket:{' '}
              <a
                href={`https://powerco-sandbox.atlassian.net/browse/${ticketKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                {ticketKey}
              </a>
            </p>
          )}
        </div>
      )}

      {submitState === 'error' && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold">✗ Error</p>
          <p className="mt-1">{message}</p>
        </div>
      )}
    </div>
  )
}
