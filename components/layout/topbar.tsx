"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileTabs = [
  { label: "Dashboard", href: "/dashboard", matchPrefix: "/dashboard" },
  { label: "Daily Tracking", href: "/cashflow", matchPrefix: "/cashflow" },
  { label: "Assets", href: "/assets/investments", matchPrefix: "/assets" },
  { label: "Income", href: "/income", matchPrefix: "/income" },
  { label: "Debts", href: "/debts", matchPrefix: "/debts" },
];

type TopbarProps = {
  title: string;
  subtitle: string;
  primaryAction?: string;
  primaryActionHref?: string;
  primaryActionEvent?: string;
  secondaryAction?: string;
};

export function Topbar({ title, subtitle, primaryAction, primaryActionHref, primaryActionEvent, secondaryAction }: TopbarProps) {
  const pathname = usePathname();

  function handlePrimaryActionClick() {
    if (primaryActionEvent) {
      window.dispatchEvent(new CustomEvent(primaryActionEvent));
    }
  }

  return (
    <header className="panel sticky top-3 z-20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold leading-tight sm:text-2xl">{title}</p>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {primaryAction ? (
            primaryActionHref ? (
              <Link className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white" href={primaryActionHref}>
                {primaryAction}
              </Link>
            ) : (
              <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={handlePrimaryActionClick} type="button">
                {primaryAction}
              </button>
            )
          ) : null}
          {primaryAction && secondaryAction ? <button className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold">{secondaryAction}</button> : null}
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">JD</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
        {mobileTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-chip ${pathname === tab.href || pathname.startsWith(`${tab.matchPrefix}/`) ? "nav-chip-active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
