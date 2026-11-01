import Link from "next/link";

import {
  LEADERBOARD_BOARDS,
  LEADERBOARD_BOARD_DEFINITIONS,
  LEADERBOARD_UNIT_TYPES,
  LEADERBOARD_UNIT_TYPE_LABELS,
  STATISTICS_WINDOW_PHRASES,
  STATISTICS_WINDOW_SCOPES,
  describeRatio,
  formatLeaderboardMetric,
  leaderboardHref,
  rankLeaderboardRows,
  type LeaderboardColumn,
  type LeaderboardData,
  type LeaderboardMetric,
  type LeaderboardQuery,
  type LeaderboardSubject,
  type LeaderboardUnitType,
  type RankedLeaderboardRow,
} from "./leaderboard-model";
import { STATISTICS_WINDOWS } from "./windows";

/** Only the leader gets an edge bar; a large tie for 2nd would otherwise stripe the table. */
const LEADER_EDGE = "shadow-[inset_3px_0_0_var(--gold)]";

const PODIUM_TEXT: Record<number, string> = {
  1: "text-gold",
  2: "text-foreground",
  3: "text-bronze",
};

function BoardTabs({ query }: { query: LeaderboardQuery }) {
  return (
    <nav aria-label="Leaderboard boards" className="border-b border-edge">
      <ul className="-mb-px flex gap-4 overflow-x-auto sm:gap-6">
        {LEADERBOARD_BOARDS.map((board) => {
          const active = board === query.board;
          return (
            <li key={board} className="flex-shrink-0">
              <Link
                href={leaderboardHref(query, { board })}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-block border-b-2 border-gold pb-2.5 pt-1 text-xs font-bold uppercase tracking-[0.1em] text-white"
                    : "inline-block border-b-2 border-transparent pb-2.5 pt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:text-white"
                }
              >
                {LEADERBOARD_BOARD_DEFINITIONS[board].label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BranchFilter({ query, data }: { query: LeaderboardQuery; data: LeaderboardData }) {
  return (
    <div role="group" aria-label="Branch" className="flex flex-wrap gap-2">
      {LEADERBOARD_UNIT_TYPES.map((unitType) => {
        const count = data.partitions.find((partition) => partition.unitType === unitType)?.rows.length ?? 0;
        const active = unitType === query.unitType;
        return (
          <Link
            key={unitType}
            href={leaderboardHref(query, { unitType })}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "inline-flex min-h-9 items-center gap-2 rounded-full bg-gold px-3.5 text-[13px] font-bold text-gold-ink"
                : `inline-flex min-h-9 items-center gap-2 rounded-full border border-edge-strong bg-surface px-3.5 text-[13px] font-semibold transition-colors hover:border-faint ${count === 0 ? "text-faint" : "text-foreground"}`
            }
          >
            {LEADERBOARD_UNIT_TYPE_LABELS[unitType]}
            <span className={`tabular-nums ${active ? "text-gold-ink/70" : "text-faint"}`}>{count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SubjectCell({ subject }: { subject: LeaderboardSubject }) {
  if (subject.kind === "unit") {
    return (
      <Link href={`/units/${encodeURIComponent(subject.unitId)}`} className="font-semibold text-white hover:text-gold sm:whitespace-nowrap">
        {subject.unitName}
      </Link>
    );
  }
  return (
    <>
      <Link href={`/players/${encodeURIComponent(subject.gamePlayerId)}`} className="font-semibold text-white hover:text-gold sm:whitespace-nowrap">
        {subject.displayName}
      </Link>
      {subject.displayName !== subject.gamePlayerId ? (
        <span className="block break-all font-mono text-[11px] text-faint">{subject.gamePlayerId}</span>
      ) : null}
    </>
  );
}

function MetricCell({ metric }: { metric: LeaderboardMetric | undefined }) {
  if (metric === undefined) return <span className="text-faint">—</span>;
  const text = formatLeaderboardMetric(metric);
  if (metric.kind !== "ratio") return <>{text}</>;
  const raw = describeRatio(metric.ratio);
  const label = metric.ratio.state === "ZERO_DENOMINATOR" ? `${raw}, no deaths` : raw;
  return <span title={label} aria-label={`${text} (${label})`}>{text}</span>;
}

function SortHeader({ column, query }: { column: LeaderboardColumn; query: LeaderboardQuery }) {
  const active = column.key === query.sort;
  const nextDir = active && query.dir === "desc" ? "asc" : "desc";
  return (
    <th
      scope="col"
      aria-sort={active ? (query.dir === "desc" ? "descending" : "ascending") : undefined}
      className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.06em]"
    >
      <Link
        href={leaderboardHref(query, { sort: column.key, dir: nextDir })}
        title={`${column.description} — sort ${nextDir === "desc" ? "highest" : "lowest"} first`}
        className={active ? "text-gold" : "text-faint transition-colors hover:text-foreground"}
      >
        {column.label}
        <span aria-hidden="true" className="ml-1 inline-block w-2">{active ? (query.dir === "desc" ? "↓" : "↑") : ""}</span>
      </Link>
    </th>
  );
}

function LeaderboardTable({
  rows,
  query,
}: {
  rows: RankedLeaderboardRow[];
  query: LeaderboardQuery;
}) {
  const definition = LEADERBOARD_BOARD_DEFINITIONS[query.board];
  return (
    <div className="overflow-x-auto border-y border-edge" data-testid="leaderboard-scroll">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          {definition.label} leaderboard, ranked by {definition.columns.find((column) => column.key === query.sort)?.description}
        </caption>
        <thead>
          <tr className="border-b border-edge">
            <th scope="col" className="sticky left-0 z-10 w-12 min-w-12 bg-background px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-faint">#</th>
            <th scope="col" className="sticky left-12 z-10 bg-background px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
              {definition.subjectHeading}
            </th>
            {definition.columns.map((column) => <SortHeader key={column.key} column={column} query={query} />)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = row.subject.kind === "player" ? row.subject.gamePlayerId : row.subject.unitId;
            return (
              <tr key={key} className="group border-b border-edge/70 last:border-b-0">
                <td className={`sticky left-0 z-10 w-12 min-w-12 bg-background px-3 py-2.5 font-bold tabular-nums group-hover:bg-surface ${row.rank === 1 ? LEADER_EDGE : ""} ${PODIUM_TEXT[row.rank] ?? "text-muted"}`}>
                  {row.rank}
                </td>
                <th scope="row" className="sticky left-12 z-10 min-w-36 max-w-[180px] bg-background px-3 py-2.5 text-left font-normal group-hover:bg-surface sm:max-w-none">
                  <SubjectCell subject={row.subject} />
                </th>
                {definition.columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-3 py-2.5 text-right tabular-nums group-hover:bg-surface ${column.key === query.sort ? "font-bold text-white" : "text-body-soft"}`}
                  >
                    <MetricCell metric={row.metrics[column.key]} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankingGuide({ query }: { query: LeaderboardQuery }) {
  const boardNote: Record<LeaderboardQuery["board"], string> = {
    players: "Each finalized Audit a player appears in counts once. Distinct Events are on each player's own page.",
    commanders: "Unit K/D and totals belong to the whole unit in battles the player commanded, not to the commander's own kills.",
    generals: "A qualifying command is an Event Command Group containing two or more atomic units. Branch columns count the units led.",
    units: "Direct results only: a parent Unit is not credited with its subunits' battles. Unit pages show organizational totals.",
  };
  return (
    <details className="group mt-6 border-t border-edge">
      <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold text-gold outline-none hover:text-gold-bright focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
        How rankings work
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <ul className="max-w-3xl list-disc space-y-1.5 pb-4 pl-5 text-sm leading-relaxed text-muted">
        <li>Only finalized Audits count, and an Event counts when its scheduled time falls inside the selected window.</li>
        <li>Regular, Rifles, Cavalry, and Artillery are ranked separately — results from different branches are not comparable.</li>
        <li>Ratios are pooled: total kills ÷ total deaths across every Audit, never an average of per-battle ratios. Hover a ratio for its raw totals.</li>
        <li>With zero deaths a ratio shows its total instead, such as “18 K”, and ranks above every finite ratio. Check the Audits column for sample size.</li>
        <li>Tied values share a rank. Players without a public name are shown by their game Player ID.</li>
        <li>{boardNote[query.board]}</li>
      </ul>
    </details>
  );
}

export function LeaderboardView({ query, data }: { query: LeaderboardQuery; data: LeaderboardData }) {
  const definition = LEADERBOARD_BOARD_DEFINITIONS[query.board];
  const partition = definition.partitioned
    ? data.partitions.find((candidate) => candidate.unitType === query.unitType)
    : data.partitions[0];
  const rows = rankLeaderboardRows(partition?.rows ?? [], query.sort, query.dir);
  const sortColumn = definition.columns.find((column) => column.key === query.sort);
  const branch = definition.partitioned && query.unitType ? LEADERBOARD_UNIT_TYPE_LABELS[query.unitType as LeaderboardUnitType] : null;
  const windowPhrase = STATISTICS_WINDOW_PHRASES[query.window];

  return (
    <div className="mt-6 flex flex-col gap-4">
      <BoardTabs query={query} />
      <p className="text-sm text-muted">{definition.summary}</p>
      {definition.partitioned ? <BranchFilter query={query} data={data} /> : null}

      <p className="text-sm text-muted" aria-live="polite">
        Ranked by <span className="font-bold text-white">{sortColumn?.label}</span>{" "}
        ({query.dir === "desc" ? "highest" : "lowest"} first)
        {branch ? <> · <span className="font-bold text-white">{branch}</span></> : null}
        {" "}· {windowPhrase} · <span className="tabular-nums">{rows.length}</span> {definition.subjects}
      </p>

      {rows.length === 0 ? (
        <div className="border-y border-edge py-7">
          <h2 className="font-bold text-white">
            No {branch ? `${branch} ` : ""}{definition.subjects} with finalized results {STATISTICS_WINDOW_SCOPES[query.window]}.
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {STATISTICS_WINDOWS.filter((window) => window !== query.window).map((window, index) => (
              <span key={window}>
                {index > 0 ? " · " : "Try "}
                <Link href={leaderboardHref(query, { window })} className="font-semibold text-gold hover:text-gold-bright">
                  {STATISTICS_WINDOW_PHRASES[window]}
                </Link>
              </span>
            ))}
          </p>
        </div>
      ) : (
        <LeaderboardTable rows={rows} query={query} />
      )}

      <RankingGuide query={query} />
    </div>
  );
}
