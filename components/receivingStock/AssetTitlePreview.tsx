'use client'

export default function AssetTitlePreview({ title }: { title: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-2 rounded-md bg-slate-100 border border-slate-200/80 px-3 py-2 text-xs text-slate-700">
      <span className="text-slate-400 shrink-0" aria-hidden>
        💬
      </span>
      <span className="font-medium break-all">{title}</span>
    </div>
  )
}
