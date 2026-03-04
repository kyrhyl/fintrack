"use client";

import { OPEN_LIABILITY_CREATE_EVENT } from "@/lib/events";

export function DebtsHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <button className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted" type="button">
        ◐
      </button>
      <button
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_LIABILITY_CREATE_EVENT))}
        type="button"
      >
        + New Liability
      </button>
    </div>
  );
}
