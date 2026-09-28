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
    <div className="rounded-lg border border-edge bg-surface p-5 text-sm text-muted" aria-live="polite">
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
    <div className="rounded-lg border border-dashed border-edge bg-surface p-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

export function StatisticsErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-100" role="alert">
      <p className="font-semibold">Statistics read failed</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function StatisticsInvalidState({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-6">
      <h2 className="text-xl font-semibold text-white">Invalid {name}</h2>
      <p className="mt-2 text-sm text-muted">This public record could not be resolved.</p>
    </div>
  );
}

export function StatMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 p-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-2 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}

export function TypeSummaryCard({
  unitType,
  title,
  children,
}: {
  unitType: keyof typeof UnitTypeLabel;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-edge bg-surface p-4">
      <h4 className="mb-3 text-base font-semibold text-white">{title ?? getUnitTypeLabel(unitType)}</h4>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
