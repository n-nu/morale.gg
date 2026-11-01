/**
 * Client-safe Leaderboard model: boards, columns, query parsing, sorting,
 * ranking, and display formatting. No persistence access — rows are built by
 * the server-only `leaderboard.ts` from the approved Statistics readers.
 */

import type { RatioMetric } from "./ratios";
import {
  DEFAULT_STATISTICS_WINDOW,
  type StatisticsWindow,
} from "./windows";

export const LEADERBOARD_BOARDS = ["players", "commanders", "generals", "units"] as const;
export type LeaderboardBoard = (typeof LEADERBOARD_BOARDS)[number];

export const LEADERBOARD_UNIT_TYPES = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;
export type LeaderboardUnitType = (typeof LEADERBOARD_UNIT_TYPES)[number];

export const LEADERBOARD_UNIT_TYPE_LABELS: Record<LeaderboardUnitType, string> = {
  REGULAR: "Regular",
  RIFLES: "Rifles",
  CAVALRY: "Cavalry",
  ARTILLERY: "Artillery",
};

export const STATISTICS_WINDOW_PHRASES: Record<StatisticsWindow, string> = {
  "14d": "last 14 days",
  "30d": "last 30 days",
  "all-time": "all time",
};

/** Completes "No results …": "in the last 14 days", "on record". */
export const STATISTICS_WINDOW_SCOPES: Record<StatisticsWindow, string> = {
  "14d": "in the last 14 days",
  "30d": "in the last 30 days",
  "all-time": "on record",
};

export type LeaderboardMetric =
  | { kind: "count"; value: number }
  | { kind: "average"; value: number }
  | { kind: "ratio"; ratio: RatioMetric };

export type LeaderboardSubject =
  | { kind: "player"; gamePlayerId: string; displayName: string }
  | { kind: "unit"; unitId: string; unitName: string };

export type LeaderboardRow = {
  subject: LeaderboardSubject;
  metrics: Record<string, LeaderboardMetric>;
};

export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

export type LeaderboardPartition = {
  /** `null` for boards that are not partitioned by Unit type (Generals). */
  unitType: LeaderboardUnitType | null;
  rows: LeaderboardRow[];
};

export type LeaderboardData = {
  window: StatisticsWindow;
  board: LeaderboardBoard;
  partitions: LeaderboardPartition[];
};

export type LeaderboardColumn = {
  key: string;
  label: string;
  description: string;
};

export type LeaderboardBoardDefinition = {
  label: string;
  /** Plural noun for the ranked subjects, e.g. "players". */
  subjects: string;
  subjectHeading: string;
  partitioned: boolean;
  summary: string;
  defaultSort: string;
  columns: LeaderboardColumn[];
};

export const LEADERBOARD_BOARD_DEFINITIONS: Record<LeaderboardBoard, LeaderboardBoardDefinition> = {
  players: {
    label: "Players",
    subjects: "players",
    subjectHeading: "Player",
    partitioned: true,
    summary: "Individual fighting record from finalized Audits, ranked within each branch.",
    defaultSort: "kills",
    columns: [
      { key: "audits", label: "Audits", description: "Finalized Audit appearances in this branch" },
      { key: "kills", label: "K", description: "Total kills" },
      { key: "deaths", label: "D", description: "Total deaths" },
      { key: "assists", label: "A", description: "Total assists" },
      { key: "kd", label: "K/D", description: "Total kills ÷ total deaths" },
      { key: "kad", label: "(K+A)/D", description: "Total kills plus assists ÷ total deaths" },
      { key: "killsPerAudit", label: "K/Audit", description: "Kills per Audit appearance" },
    ],
  },
  commanders: {
    label: "Commanders",
    subjects: "commanders",
    subjectHeading: "Commander",
    partitioned: true,
    summary: "Unit results in battles where the player held the battlefield Commander role.",
    defaultSort: "battles",
    columns: [
      { key: "battles", label: "Battles", description: "Battles commanded" },
      { key: "kd", label: "Unit K/D", description: "Commanded unit's total kills ÷ total deaths" },
      { key: "kills", label: "Kills", description: "Commanded unit's total kills" },
      { key: "tickets", label: "Tickets", description: "Total tickets" },
      { key: "flagCaptures", label: "Flags won", description: "Total flag captures" },
      { key: "flagLosses", label: "Flags lost", description: "Total flag losses" },
      { key: "stars", label: "Stars", description: "Total stars" },
      { key: "averagePlayers", label: "Avg players", description: "Average players per battle commanded" },
    ],
  },
  generals: {
    label: "Generals",
    subjects: "generals",
    subjectHeading: "General",
    partitioned: false,
    summary: "Command of Event Command Groups spanning two or more atomic units.",
    defaultSort: "commands",
    columns: [
      { key: "commands", label: "Commands", description: "Qualifying command groups led" },
      { key: "events", label: "Events", description: "Distinct Events with a qualifying command" },
      { key: "atomicUnits", label: "Units led", description: "Atomic units under qualifying commands" },
      { key: "regular", label: "Regular", description: "Regular atomic units led" },
      { key: "rifles", label: "Rifles", description: "Rifles atomic units led" },
      { key: "cavalry", label: "Cavalry", description: "Cavalry atomic units led" },
      { key: "artillery", label: "Artillery", description: "Artillery atomic units led" },
    ],
  },
  units: {
    label: "Units",
    subjects: "units",
    subjectHeading: "Unit",
    partitioned: true,
    summary: "Direct battlefield results of each persistent Unit, ranked within each branch.",
    defaultSort: "kd",
    columns: [
      { key: "audits", label: "Audits", description: "Finalized Audits attributed directly to this Unit" },
      { key: "kd", label: "K/D", description: "Total kills ÷ total deaths" },
      { key: "kills", label: "Kills", description: "Total kills" },
      { key: "deaths", label: "Deaths", description: "Total deaths" },
      { key: "tickets", label: "Tickets", description: "Total tickets" },
      { key: "flagCaptures", label: "Flags won", description: "Total flag captures" },
      { key: "flagLosses", label: "Flags lost", description: "Total flag losses" },
      { key: "stars", label: "Stars", description: "Total stars" },
    ],
  },
};

export type SortDirection = "asc" | "desc";

export type LeaderboardQuery = {
  window: StatisticsWindow;
  board: LeaderboardBoard;
  /** Explicitly requested branch, or `null` to pick the first branch with results. */
  unitType: LeaderboardUnitType | null;
  sort: string;
  dir: SortDirection;
};

type SearchParamValue = string | string[] | undefined;

function firstValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseLeaderboardQuery(
  params: Record<string, SearchParamValue>,
  window: StatisticsWindow = DEFAULT_STATISTICS_WINDOW,
): LeaderboardQuery {
  const rawBoard = firstValue(params.board)?.trim().toLowerCase();
  const board = LEADERBOARD_BOARDS.find((candidate) => candidate === rawBoard) ?? "players";
  const definition = LEADERBOARD_BOARD_DEFINITIONS[board];

  const rawType = firstValue(params.type)?.trim().toUpperCase();
  const unitType = definition.partitioned
    ? LEADERBOARD_UNIT_TYPES.find((candidate) => candidate === rawType) ?? null
    : null;

  const rawSort = firstValue(params.sort)?.trim();
  const sort = definition.columns.some((column) => column.key === rawSort)
    ? (rawSort as string)
    : definition.defaultSort;

  const dir: SortDirection = firstValue(params.dir)?.trim().toLowerCase() === "asc" ? "asc" : "desc";

  return { window, board, unitType, sort, dir };
}

/** The branch to show: the requested one, else the first branch with results. */
export function resolveLeaderboardUnitType(
  requested: LeaderboardUnitType | null,
  partitions: LeaderboardPartition[],
): LeaderboardUnitType {
  if (requested !== null) return requested;
  const firstWithRows = LEADERBOARD_UNIT_TYPES.find((unitType) =>
    partitions.some((partition) => partition.unitType === unitType && partition.rows.length > 0),
  );
  return firstWithRows ?? "REGULAR";
}

/** Builds a `/leaderboard` URL, omitting values that equal their defaults. */
export function leaderboardHref(query: LeaderboardQuery, overrides: Partial<LeaderboardQuery> = {}): string {
  const next = { ...query, ...overrides };
  if (overrides.board !== undefined && overrides.board !== query.board && overrides.sort === undefined) {
    next.sort = LEADERBOARD_BOARD_DEFINITIONS[next.board].defaultSort;
    next.dir = "desc";
  }
  const params = new URLSearchParams();
  if (next.window !== DEFAULT_STATISTICS_WINDOW) params.set("window", next.window);
  if (next.board !== "players") params.set("board", next.board);
  if (next.unitType !== null && LEADERBOARD_BOARD_DEFINITIONS[next.board].partitioned) {
    params.set("type", next.unitType.toLowerCase());
  }
  if (next.sort !== LEADERBOARD_BOARD_DEFINITIONS[next.board].defaultSort) params.set("sort", next.sort);
  if (next.dir !== "desc") params.set("dir", next.dir);
  const search = params.toString();
  return search ? `/leaderboard?${search}` : "/leaderboard";
}

/**
 * Natural ascending order of two metrics. Ratios compare by value; a zero
 * denominator with a positive numerator (e.g. "18 K") is greater than every
 * finite ratio and ordered by its numerator; 0 ÷ 0 is the lowest value.
 */
export function compareLeaderboardMetrics(left: LeaderboardMetric, right: LeaderboardMetric): number {
  return compareKeys(metricSortKey(left), metricSortKey(right));
}

function metricSortKey(metric: LeaderboardMetric): [number, number] {
  if (metric.kind !== "ratio") return [1, metric.value];
  const { ratio } = metric;
  if (ratio.state === "RATIO") return [1, ratio.value];
  return ratio.numerator > 0 ? [2, ratio.numerator] : [0, 0];
}

function compareKeys(left: [number, number], right: [number, number]): number {
  return left[0] - right[0] || left[1] - right[1];
}

export function subjectName(subject: LeaderboardSubject): string {
  return subject.kind === "player" ? subject.displayName : subject.unitName;
}

function subjectKey(subject: LeaderboardSubject): string {
  return subject.kind === "player" ? subject.gamePlayerId : subject.unitId;
}

/**
 * Sorts rows by one metric and assigns standard competition ranks
 * (1, 2, 2, 4). Rows tied on the metric keep a stable name order.
 */
export function rankLeaderboardRows(
  rows: LeaderboardRow[],
  sort: string,
  dir: SortDirection,
): RankedLeaderboardRow[] {
  const missing: LeaderboardMetric = { kind: "count", value: Number.NEGATIVE_INFINITY };
  const metricOf = (row: LeaderboardRow) => row.metrics[sort] ?? missing;
  const sorted = [...rows].sort((left, right) => {
    const byMetric = compareLeaderboardMetrics(metricOf(left), metricOf(right));
    if (byMetric !== 0) return dir === "asc" ? byMetric : -byMetric;
    return (
      subjectName(left.subject).localeCompare(subjectName(right.subject)) ||
      subjectKey(left.subject).localeCompare(subjectKey(right.subject))
    );
  });

  const ranked: RankedLeaderboardRow[] = [];
  sorted.forEach((row, index) => {
    const previous = ranked[index - 1];
    const tied = previous !== undefined && compareLeaderboardMetrics(metricOf(previous), metricOf(row)) === 0;
    ranked.push({ ...row, rank: tied ? previous.rank : index + 1 });
  });
  return ranked;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** Finite ratios round to two decimals; zero-denominator ratios keep their approved form. */
export function formatRatio(ratio: RatioMetric): string {
  return ratio.state === "RATIO" ? trimNumber(ratio.value) : ratio.display;
}

/** The raw pooled population behind a ratio, e.g. "31 ÷ 15". */
export function describeRatio(ratio: RatioMetric): string {
  return `${ratio.numerator} ÷ ${ratio.denominator}`;
}

export function formatLeaderboardMetric(metric: LeaderboardMetric): string {
  return metric.kind === "ratio" ? formatRatio(metric.ratio) : trimNumber(metric.value);
}
