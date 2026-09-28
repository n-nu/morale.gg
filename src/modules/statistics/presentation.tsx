import type { ReactNode } from "react";
import type { RatioMetric } from "./ratios";
import {
  DEFAULT_STATISTICS_WINDOW,
  STATISTICS_WINDOWS,
  type StatisticsWindow,
} from "./windows";

export const UnitTypeLabel = {
  REGULAR: "Regular",
  RIFLES: "Rifles",
  CAVALRY: "Cavalry",
  ARTILLERY: "Artillery",
} as const;

export function getUnitTypeLabel(unitType: string): string {
  return UnitTypeLabel[unitType as keyof typeof UnitTypeLabel] ?? unitType;
}

export function parseStatisticsWindow(value: string | string[] | undefined): StatisticsWindow {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized && STATISTICS_WINDOWS.includes(normalized as StatisticsWindow)) {
    return normalized as StatisticsWindow;
  }
  return DEFAULT_STATISTICS_WINDOW;
}

export function resolveStatisticsWindow(
  input?: string | string[] | URLSearchParams | Record<string, unknown> | null,
): StatisticsWindow {
  if (typeof input === "string" || Array.isArray(input)) {
    return parseStatisticsWindow(input);
  }

  if (input && typeof (input as URLSearchParams).get === "function") {
    return parseStatisticsWindow((input as URLSearchParams).get("window") ?? undefined);
  }

  if (input && typeof input === "object") {
    const rawWindow = (input as Record<string, unknown>).window;
    return parseStatisticsWindow(Array.isArray(rawWindow) ? rawWindow : typeof rawWindow === "string" ? rawWindow : undefined);
  }

  return DEFAULT_STATISTICS_WINDOW;
}

export function StatisticsRatio({ ratio }: { ratio: RatioMetric }) {
  return <>{ratio.display}</>;
}

export function StatisticsLoadingState({ message = "Loading statistics…" }: { message?: string }) {
  return (
    <div className="border-y border-edge py-4 text-sm text-muted" aria-live="polite">
      {message}
    </div>
  );
}

export function StatisticsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-y border-edge py-4">
      <h3 className="font-bold text-white">{title}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function StatisticsErrorState({ message }: { message: string }) {
  return (
    <div className="border-l-2 border-red-400 py-2 pl-3 text-sm text-red-100" role="alert">
      <p className="font-bold">Statistics read failed</p>
      <p className="mt-1 text-red-100/80">{message}</p>
    </div>
  );
}

export function StatisticsInvalidState({ name }: { name: string }) {
  return (
    <div className="border-y border-edge py-5">
      <h2 className="text-lg font-extrabold text-white">Invalid {name}</h2>
      <p className="mt-1 text-sm text-muted">This public record could not be resolved.</p>
    </div>
  );
}

export function StatisticsDisclosure({
  title,
  summary,
  triggerLabel,
  children,
  headingId,
  headingLevel = 2,
  defaultOpen = false,
}: {
  title: string;
  summary?: ReactNode;
  triggerLabel?: string;
  children: ReactNode;
  headingId?: string;
  headingLevel?: 2 | 3;
  defaultOpen?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className="border-t border-edge">
      <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 py-3">
        <Heading id={headingId} className="text-lg font-extrabold text-white">{title}</Heading>
        {summary ? <div className="text-sm text-muted">{summary}</div> : null}
      </header>
      <details open={defaultOpen} className="group border-t border-edge/70">
        <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold text-gold outline-none hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
          {triggerLabel ?? `${title} details`}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="pb-5">{children}</div>
      </details>
    </section>
  );
}

export function StatMetric({
  label,
  value,
}: {
  label: string;
  value: string | number | ReactNode;
}) {
  return (
    <div className="min-w-0 border-l border-edge py-2 pl-3 first:border-l-0 first:pl-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-lg font-bold tabular-nums text-white">{value}</dd>
    </div>
  );
}

export function TypeSummaryCard({
  unitType,
  title,
  children,
  defaultOpen = false,
}: {
  unitType: keyof typeof UnitTypeLabel;
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-b border-edge">
      <summary className="cursor-pointer list-none py-3 text-sm font-bold text-foreground outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
        {title ?? getUnitTypeLabel(unitType)}
      </summary>
      <div className="grid gap-2 pb-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </details>
  );
}

export function AttendanceSummaryPanel({
  summary,
}: {
  summary: {
    obligations: number;
    present: number;
    absent: number;
    pending: number;
    percentage: number | null;
    noResolvedData: boolean;
  };
}) {
  const status = summary.obligations === 0
    ? "No attendance requirement"
    : summary.noResolvedData
      ? "Pending"
      : `${summary.percentage}% resolved attendance`;

  return (
    <div className="border-t border-edge pt-3">
      <dl className="grid grid-cols-2 divide-x divide-edge sm:grid-cols-3 lg:grid-cols-5">
        <StatMetric label="Obligations" value={summary.obligations} />
        <StatMetric label="Present" value={summary.present} />
        <StatMetric label="Absent" value={summary.absent} />
        <StatMetric label="Pending" value={summary.pending} />
        <StatMetric label="Resolved attendance" value={status} />
      </dl>
    </div>
  );
}
