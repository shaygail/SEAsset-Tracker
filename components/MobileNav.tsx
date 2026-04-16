"use client";
import { useState } from "react";
import Link from "next/link";
import { useEffect } from "react";
import SignOutButton from "./SignOutButton";

const NAV_LINKS = [
  { href: "/", label: "Search" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receiving-stock", label: "Receive stock" },
  { href: "/receiving-stock/history", label: "Receive history" },
  { href: "/bulk-operations", label: "Bulk Ops" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  // Get user from localStorage/sessionStorage if needed, or just always show sign out for now
  return (
    <div className="sm:hidden">
      <button
        className="p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        style={{ minWidth: 56, minHeight: 56 }}
      >
        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black bg-opacity-40" onClick={() => setOpen(false)} />
          <nav
            className={`fixed top-0 right-0 z-50 w-64 h-full bg-white shadow-lg transform transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-slate-50">
              <span className="font-bold text-lg text-blue-800">SE Asset Tracker</span>
              <button
                className="p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="flex flex-col gap-2 p-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block px-4 py-3 rounded-lg text-base text-slate-800 hover:bg-blue-50 font-medium"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="p-4 border-t">
              <SignOutButton />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
