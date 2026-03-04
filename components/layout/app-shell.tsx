"use client";

import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
      <div className="dashboard-shell grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Sidebar />
        <section className="flex min-w-0 flex-col gap-4">{children}</section>
      </div>
    </main>
  );
}
