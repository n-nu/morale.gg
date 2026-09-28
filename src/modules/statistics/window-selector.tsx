"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { STATISTICS_WINDOWS, type StatisticsWindow } from "./windows";

const windowLabels: Record<StatisticsWindow, string> = {
  "14d": "14 Days",
  "30d": "30 Days",
  "all-time": "All Time",
};

export function StatisticsWindowSelector({ value }: { value: StatisticsWindow }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const applyWindow = (nextWindow: StatisticsWindow) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("window", nextWindow);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div
      role="tablist"
      aria-label="Statistics window"
      className="inline-flex flex-wrap rounded-lg border border-edge bg-surface p-1"
    >
      {STATISTICS_WINDOWS.map((windowKey) => (
        <button
          key={windowKey}
          type="button"
          role="tab"
          aria-selected={value === windowKey}
          aria-label={`Select ${windowLabels[windowKey]} window`}
          onClick={() => applyWindow(windowKey)}
          className={
            value === windowKey
              ? "rounded-md bg-gold px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-gold-ink"
              : "rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground"
          }
        >
          {windowLabels[windowKey]}
        </button>
      ))}
    </div>
  );
}
