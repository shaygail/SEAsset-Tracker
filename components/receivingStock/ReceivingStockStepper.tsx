'use client'

type Step = 1 | 2 | 3

const steps: { n: Step; label: string }[] = [
  { n: 1, label: 'Select type' },
  { n: 2, label: 'Enter details' },
  { n: 3, label: 'Review & submit' },
]

export default function ReceivingStockStepper({ step }: { step: Step }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {steps.map((s, idx) => {
          const done = step > s.n
          const active = step === s.n
          return (
            <li key={s.n} className="flex flex-1 items-center min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold border-2',
                    done
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : active
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-300 text-slate-500',
                  ].join(' ')}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : s.n}
                </span>
                <span
                  className={[
                    'text-sm font-medium truncate',
                    active ? 'text-blue-800' : done ? 'text-slate-700' : 'text-slate-500',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden sm:block flex-1 mx-2 h-0.5 bg-slate-200 min-w-[1rem]" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
