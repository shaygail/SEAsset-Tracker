'use client'

import { useEffect, useState } from 'react'

interface LinkedIssue {
  key: string
  summary: string
  status: string
}

const ACTIVE_STATUSES = ['To Do', 'In Progress', 'In Review', 'Repair', 'Open', 'Reopened']
const CLOSED_STATUSES = ['Done', 'Closed', 'Resolved', 'Cancelled', 'Rejected', 'Declined']

export default function LinkedIssues({ assetKey }: { assetKey: string }) {
  const [issues, setIssues] = useState<LinkedIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchIssues() {
      try {
        const resp = await fetch(`/api/jira/searchAssetIssues?assetKey=${encodeURIComponent(assetKey)}`)
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Failed to load issues')
        setIssues(data.issues ?? [])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchIssues()
  }, [assetKey])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Related Issues</h2>
        <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading related issues…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Related Issues</h2>
        <div className="text-sm text-gray-500 italic">Could not load related issues</div>
      </div>
    )
  }

  const activeIssues = issues.filter(issue => ACTIVE_STATUSES.includes(issue.status))
  const closedIssues = issues.filter(issue => CLOSED_STATUSES.includes(issue.status))
  const otherIssues = issues.filter(issue => !ACTIVE_STATUSES.includes(issue.status) && !CLOSED_STATUSES.includes(issue.status))

  const statusColors: Record<string, string> = {
    'To Do': 'bg-gray-100 text-gray-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'In Review': 'bg-yellow-100 text-yellow-700',
    'Done': 'bg-green-100 text-green-700',
    'Repair': 'bg-orange-100 text-orange-700',
    'Returned': 'bg-purple-100 text-purple-700',
    'Closed': 'bg-gray-200 text-gray-700',
    'Resolved': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'Rejected': 'bg-red-100 text-red-700',
    'Declined': 'bg-red-100 text-red-700',
    'Open': 'bg-blue-100 text-blue-700',
    'Reopened': 'bg-orange-100 text-orange-700',
  }

  const IssueLink = ({ issue }: { issue: LinkedIssue }) => (
    <a
      href={`https://powerco-sandbox.atlassian.net/browse/${issue.key}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-600 hover:underline">{issue.key}</p>
          <p className="text-sm text-gray-700 mt-1 truncate">{issue.summary}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
            statusColors[issue.status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {issue.status}
        </span>
      </div>
    </a>
  )

  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Related Issues</h2>
        <div className="text-sm text-gray-500 italic">No related issues found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Issues */}
      {activeIssues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            🔴 Active Issues ({activeIssues.length})
          </h2>
          <div className="space-y-3">
            {activeIssues.map((issue) => (
              <IssueLink key={issue.key} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Other Status Issues */}
      {otherIssues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            ⏳ Pending Issues ({otherIssues.length})
          </h2>
          <div className="space-y-3">
            {otherIssues.map((issue) => (
              <IssueLink key={issue.key} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Ticket History / Closed Issues */}
      {closedIssues.length > 0 && (
        <div className="bg-gray-50 rounded-2xl shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-4">
            📋 Ticket History ({closedIssues.length})
          </h2>
          <p className="text-xs text-gray-500 mb-4">Previously created tickets and resolutions</p>
          <div className="space-y-3">
            {closedIssues.map((issue) => (
              <IssueLink key={issue.key} issue={issue} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
