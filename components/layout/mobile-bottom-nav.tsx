"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", matchPrefix: "/dashboard" },
  { label: "Daily", href: "/cashflow", matchPrefix: "/cashflow" },
  { label: "Assets", href: "/assets/investments", matchPrefix: "/assets" },
  { label: "Income", href: "/income", matchPrefix: "/income" },
  { label: "Debts", href: "/debts", matchPrefix: "/debts" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 rounded-2xl border border-line bg-white/95 p-2 shadow-[0_12px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1 text-[11px] font-semibold">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.matchPrefix}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition ${
                isActive ? "bg-accent/10 text-accent" : "text-muted"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-accent" : "bg-line"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
