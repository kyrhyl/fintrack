"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

type NavIcon = "dashboard" | "accounts" | "budget" | "income" | "trend" | "stocks";

const navItems: Array<{ label: string; href: string; icon: NavIcon }> = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Daily Tracking", href: "/cashflow", icon: "accounts" },
  { label: "Assets", href: "/assets/investments", icon: "budget" },
  { label: "Income", href: "/income", icon: "income" },
  { label: "Debts", href: "/debts", icon: "trend" },
  { label: "Stock Portfolio", href: "/stock-portfolio", icon: "stocks" },
];

function SidebarIcon({ icon }: { icon: NavIcon }) {
  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="4" width="7" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="10.5" width="7" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "accounts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 8.5H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 14H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "budget") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 4V12L17 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "income") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 16.5L9.5 12L13.2 14.8L19 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.5 9H19V12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 6.5H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "stocks") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18L10 12L14 15L20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8H20V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16L9 11L13 14L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 7H20V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  function handleSignOut() {
    void signOut({ callbackUrl: "/login" });
  }

  return (
    <aside className="panel hidden h-[calc(100vh-3rem)] flex-col overflow-hidden p-0 lg:flex">
      <div className="dashboard-side-brand">
        <div className="dashboard-side-logo">F</div>
        <p className="dashboard-side-title">FinPulse</p>
      </div>

      <nav className="mt-3 space-y-1 px-3 text-sm">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "nav-item-active" : ""}`}>
            <span className="nav-item-icon">
              <SidebarIcon icon={item.icon} />
            </span>
            {item.label}
          </Link>
        ))}

        <p className="px-3 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">System</p>
        <button className="nav-item" type="button">
          <span className="nav-item-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 4V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12 18V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M4 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M18 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6.3 6.3L7.8 7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16.2 16.2L17.7 17.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16.2 7.8L17.7 6.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6.3 17.7L7.8 16.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          Settings
        </button>
      </nav>

      <button className="mt-auto border-t border-line px-4 py-3 text-left text-sm font-medium text-muted" type="button">
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M21 12.6A8.9 8.9 0 0 1 11.4 3A9 9 0 1 0 21 12.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Theme Toggle
        </span>
      </button>

      <button className="border-t border-line px-4 py-3 text-left text-sm font-medium text-muted" type="button" onClick={handleSignOut}>
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M9 6.75C9 5.78 9.78 5 10.75 5H17.25C18.22 5 19 5.78 19 6.75V17.25C19 18.22 18.22 19 17.25 19H10.75C9.78 19 9 18.22 9 17.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M14 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6.75 9.25L4 12L6.75 14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </span>
      </button>
    </aside>
  );
}
