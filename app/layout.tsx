import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import { auth } from '@/auth'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SE Asset Tracker',
  description: 'Powerco SE Team IT Asset Management',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-4 py-3 sm:px-6 sm:py-4 shadow-md border-b border-blue-950/30 print:hidden">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 w-full min-w-0">
            <Link href="/" className="text-lg sm:text-xl font-bold tracking-tight hover:opacity-90 flex-shrink-0 min-w-0 truncate">
              ⚡ SE Asset Tracker
            </Link>
            <HeaderNav session={session} />
          </div>
        </header>
        <main className="min-h-[calc(100vh-8rem)] bg-slate-50 py-6 px-3 sm:py-10 sm:px-6">
          <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">
            {children}
          </div>
        </main>
        <footer className="text-center text-slate-400 text-xs py-6 print:hidden border-t border-slate-200/80 bg-slate-50">
          Powerco SE Team &mdash; Internal Use Only
        </footer>
      </body>
    </html>
  )
}
