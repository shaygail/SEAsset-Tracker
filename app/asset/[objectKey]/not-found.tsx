import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center mt-24 gap-6 text-center">
      <div className="text-6xl">🔍</div>
      <h2 className="text-2xl font-bold text-gray-800">Asset Not Found</h2>
      <p className="text-gray-500 max-w-sm">
        No asset matching that object key was found in Jira Assets. Check the key and try again.
      </p>
      <Link
        href="/"
        className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
      >
        ← Back to Search
      </Link>
    </div>
  )
}
