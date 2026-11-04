"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { STATISTICS_WINDOWS, type StatisticsWindow } from "./windows";

const windowLabels: Record<StatisticsWindow, string> = {
  "14d": "14 Days",
  "30d": "30 Days",
  "all-time": "All Time",
};

const unitTypeFilters = [
  { value: "all", label: "All" },
  { value: "regular", label: "Regular" },
  { value: "rifles", label: "Rifles" },
  { value: "cavalry", label: "Cavalry" },
  { value: "artillery", label: "Artillery" },
] as const;

const tabs = [
  { value: "ranker", label: "Ranker" },
  { value: "commander", label: "Commander" },
  { value: "general", label: "General" },
] as const;

export type PlayerProfileTab = (typeof tabs)[number]["value"];

export function PlayerProfileFilters({
  tab,
  window,
  unitType,
}: {
  tab: PlayerProfileTab;
  window: StatisticsWindow;
  unitType: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const updateQuery = (key: "tab" | "window" | "type", value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "tab") {
      next.delete("playerPage");
      next.delete("commanderPage");
      next.delete("generalPage");
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Player performance sections" className="grid grid-cols-3 gap-2 border-b border-edge pb-4">
        {tabs.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={tab === option.value}
            onClick={() => updateQuery("tab", option.value)}
            className={tab === option.value
              ? "min-h-12 rounded-sm border border-gold bg-gold px-3 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-gold-ink shadow-[0_0_18px_rgba(212,175,55,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:text-sm"
              : "min-h-12 rounded-sm border border-edge bg-surface px-3 py-3 text-xs font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:border-edge-strong hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:text-sm"}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-end">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            Timeframe
          </legend>
          <div className="flex flex-wrap gap-1" aria-label="Statistics timeframe">
            {STATISTICS_WINDOWS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={window === option}
                onClick={() => updateQuery("window", option)}
                className={window === option
                  ? "rounded-sm border border-gold bg-gold px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-gold-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  : "rounded-sm border border-edge px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-muted hover:border-edge-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"}
              >
                {windowLabels[option]}
              </button>
            ))}
          </div>
        </fieldset>

        {tab !== "general" ? (
          <fieldset className="min-w-0">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              Unit type
            </legend>
            <div className="flex flex-wrap gap-1" aria-label="Player and Commander Unit type filter">
              {unitTypeFilters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={unitType === (option.value === "all" ? null : option.value)}
                  onClick={() => updateQuery("type", option.value === "all" ? null : option.value)}
                  className={unitType === (option.value === "all" ? null : option.value)
                    ? "rounded-sm border border-gold bg-[#1a1810] px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    : "rounded-sm border border-edge px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-muted hover:border-edge-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>
    </div>
  );
}
