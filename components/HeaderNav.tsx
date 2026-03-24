"use client";
import Link from "next/link";
import dynamic from "next/dynamic";

const MobileNav = dynamic(() => import("@/components/MobileNav"), { ssr: false });

export default function HeaderNav({ session }: { session: any }) {
  return (
    <>
      {/* Desktop: nav and user info. Mobile: only hamburger. */}
      <nav className="hidden sm:flex items-center gap-4 text-sm">
        <Link href="/" className="text-blue-200 hover:text-white transition-colors">
          Search
        </Link>
        <Link href="/dashboard" className="text-blue-200 hover:text-white transition-colors">
          Dashboard
        </Link>
        <Link href="/import" className="text-blue-200 hover:text-white transition-colors">
          Import
        </Link>
        <Link href="/import-history" className="text-blue-200 hover:text-white transition-colors">
          History
        </Link>
        <Link href="/bulk-operations" className="text-blue-200 hover:text-white transition-colors">
          Bulk Ops
        </Link>
      </nav>
      {session?.user && (
        <span className="text-blue-200 hidden sm:block ml-4">
          {session.user.name ?? session.user.email}
        </span>
      )}
      <div className="sm:hidden flex items-center ml-auto">
        <MobileNav />
      </div>
    </>
  );
}
