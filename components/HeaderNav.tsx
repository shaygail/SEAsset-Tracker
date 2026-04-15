"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import SignOutButton from "@/components/SignOutButton";

const MobileNav = dynamic(() => import("@/components/MobileNav"), { ssr: false });

export default function HeaderNav({ session }: { session: any }) {
  return (
    <>
      {/* Desktop: nav, user, sign out. Mobile: hamburger only. */}
      <div className="hidden sm:flex items-center gap-1 md:gap-3 flex-wrap justify-end min-w-0">
        <nav className="flex items-center gap-2 md:gap-4 text-sm flex-wrap justify-end">
          <Link href="/" className="text-blue-100 hover:text-white transition-colors px-1 py-1 rounded-md hover:bg-white/10">
            Search
          </Link>
          <Link href="/dashboard" className="text-blue-100 hover:text-white transition-colors px-1 py-1 rounded-md hover:bg-white/10">
            Dashboard
          </Link>
          <Link href="/import" className="text-blue-100 hover:text-white transition-colors px-1 py-1 rounded-md hover:bg-white/10">
            Import
          </Link>
          <Link href="/receiving-stock" className="text-blue-100 hover:text-white transition-colors px-1 py-1 rounded-md hover:bg-white/10">
            Receive stock
          </Link>
          <Link href="/import-history" className="text-blue-100 hover:text-white transition-colors px-1 py-1 rounded-md hover:bg-white/10">
            History
          </Link>
          <Link href="/bulk-operations" className="text-blue-100 hover:text-white transition-colors px-1 py-1 rounded-md hover:bg-white/10">
            Bulk Ops
          </Link>
        </nav>
        {session?.user && (
          <div className="flex items-center gap-2 pl-2 md:pl-3 ml-1 border-l border-white/20 min-w-0">
            <span className="text-blue-100 text-xs md:text-sm truncate max-w-[10rem] md:max-w-[14rem]" title={session.user.name ?? session.user.email ?? ""}>
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton variant="header" />
          </div>
        )}
      </div>
      <div className="sm:hidden flex items-center shrink-0">
        <MobileNav />
      </div>
    </>
  );
}
