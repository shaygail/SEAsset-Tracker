'use client'

export default function ReceivingStockSuccessBanner({
  count,
  jiraAssetsUrl,
}: {
  count: number
  jiraAssetsUrl: string
}) {
  return (
    <div
      className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900 shadow-sm"
      role="status"
    >
      <p className="font-semibold">
        {count} asset{count !== 1 ? 's' : ''} created successfully
      </p>
      <p className="text-sm mt-1">
        <a
          href={jiraAssetsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-800 underline font-medium hover:text-green-950"
        >
          Open Jira Assets
        </a>
      </p>
    </div>
  )
}
