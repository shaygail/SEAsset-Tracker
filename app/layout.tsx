import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import { auth, signOut } from '@/auth'
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
        <header className="bg-blue-700 text-white px-4 py-3 sm:px-6 sm:py-4 shadow print:hidden">
          <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
            <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-90 flex-shrink-0">
              ⚡ SE Asset Tracker
            </Link>
            <HeaderNav session={session} />
          </div>
        </header>
        <main className="min-h-screen bg-gray-50 py-6 px-2 sm:py-10 sm:px-6">
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-8">
            {children}
          </div>
        </main>
        <footer className="text-center text-gray-400 text-xs py-4">
          Powerco SE Team &mdash; Internal Use Only
        </footer>
      </body>
    </html>
  )
}
