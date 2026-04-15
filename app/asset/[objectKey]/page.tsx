import { notFound } from 'next/navigation'
import { fetchAsset, JiraAsset } from '@/lib/jira'
import AssetAssignForm from '@/components/AssetAssignForm'
import DeleteAssetButton from '@/components/DeleteAssetButton'
import LinkedIssues from '@/components/LinkedIssues'

interface Props {
  params: Promise<{ objectKey: string }>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-semibold text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value || <span className="text-gray-400 italic">—</span>}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    'In Stock': 'bg-green-100 text-green-800',
    'Ready to Deploy': 'bg-blue-100 text-blue-800',
    Issued: 'bg-orange-100 text-orange-800',
    Assigned: 'bg-blue-100 text-blue-800',
    Returned: 'bg-yellow-100 text-yellow-800',
    Faulty: 'bg-red-100 text-red-800',
    Repair: 'bg-orange-100 text-orange-800',
    Retired: 'bg-slate-200 text-slate-700',
  }
  const cls = colours[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>
      {status || 'Unknown'}
    </span>
  )
}

export default async function AssetPage({ params }: Props) {
  const { objectKey: rawKey } = await params
  const objectKey = decodeURIComponent(rawKey)
  // Uppercase only if it looks like an object key (e.g. TA-575); asset tags (e.g. 1234) stay as-is
  const query = /^[A-Za-z]+-\d+$/.test(objectKey) ? objectKey.toUpperCase() : objectKey

  let asset: JiraAsset

  try {
    asset = await fetchAsset(query)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes('not found')) {
      notFound()
    }
    // Show a readable error for configuration / network issues
    return (
      <div className="max-w-3xl mx-auto w-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <h2 className="font-bold text-lg mb-1">Failed to load asset</h2>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
      {/* Asset details card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">
              Asset Object Key
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{asset.objectKey}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={asset.status} />
            <DeleteAssetButton
              objectKey={asset.objectKey}
              objectId={asset.objectId}
              model={asset.model}
            />
          </div>
        </div>

        <div className="mt-4">
          <DetailRow label="Type" value={asset.objectTypeName} />
          <DetailRow label="Category" value={asset.category} />
          <DetailRow label="Model" value={asset.model} />
          <DetailRow label="Manufacturer" value={asset.manufacturer} />
          <DetailRow label="Serial Number" value={asset.serialNumber} />
          <DetailRow label="Assigned To" value={asset.assignedTo} />
          <DetailRow label="Location" value={asset.location} />
        </div>
      </div>

      {/* Related issues section */}
      <LinkedIssues assetKey={asset.objectKey} />

      {/* Assignment form (client component) */}
      <AssetAssignForm
        objectKey={asset.objectKey}
        manufacturer={asset.manufacturer}
        objectTypeName={asset.objectTypeName}
        currentCategory={asset.category}
        currentAssignedTo={asset.assignedTo}
        currentStatus={asset.status}
        currentLocation={asset.location}
        currentLocationKey={asset.locationKey}
      />
    </div>
  )
}
