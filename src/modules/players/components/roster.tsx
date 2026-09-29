"use client";

import Link from "next/link";
import { useState } from "react";

import { AddMembershipForm, EndMembershipForm } from "./forms";

const unitTypes = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const;
type UnitType = (typeof unitTypes)[number];

export type RosterEntry = {
  membershipId: string;
  startedAt: Date;
  player: { playerId: string; name: string | null };
  ranker?: {
    distinctEvents: number;
    unitTypes: Partial<Record<UnitType, {
      kills: number;
      deaths: number;
      assists: number;
      kdr: string;
    }>>;
  };
  attendance?: {
    obligations: number;
    present: number;
    absent: number;
    pending: number;
    percentage: number | null;
    noResolvedData: boolean;
  };
};

const windowLabel = { "14d": "14 Days", "30d": "30 Days", "all-time": "All Time" } as const;

function attendanceLabel(summary: RosterEntry["attendance"]) {
  if (!summary) return "—";
  if (summary.obligations === 0) return "No requirement";
  if (summary.noResolvedData) return `Pending · ${summary.pending}`;
  return `${summary.percentage}% · ${summary.present}/${summary.present + summary.absent}`;
}

export function Roster({
  unitId,
  entries,
  canManage,
  window = "14d",
  statisticsError = false,
  attendanceError = false,
}: {
  unitId: string;
  entries: RosterEntry[];
  canManage: boolean;
  window?: "14d" | "30d" | "all-time";
  statisticsError?: boolean;
  attendanceError?: boolean;
}) {
  const defaultType = unitTypes.find((unitType) => entries.some((entry) => entry.ranker?.unitTypes[unitType])) ?? "REGULAR";
  const [selectedType, setSelectedType] = useState<UnitType>(defaultType);

  return (
    <section className="mt-8" aria-labelledby="roster-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-edge pb-2">
        <h2 id="roster-heading" className="text-base font-extrabold text-white">Roster</h2>
        <span className="text-xs text-muted">{entries.length} active</span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-edge py-3">
        <p className="text-xs text-muted">Overall Player Statistics · {windowLabel[window]} · not Unit-scoped</p>
        <label className="flex items-center gap-2 text-xs font-bold text-muted">
          Result type
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value as UnitType)}
            className="min-h-9 rounded-md border border-edge-strong bg-background px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {unitTypes.map((unitType) => <option key={unitType} value={unitType}>{unitType[0] + unitType.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
      </div>
      {statisticsError ? <p className="border-b border-edge py-2 text-sm text-muted" role="status">Overall Player Statistics are unavailable.</p> : null}
      {attendanceError ? <p className="border-b border-edge py-2 text-sm text-muted" role="status">Attendance is unavailable.</p> : null}
      <p className="roster-scroll-note">Scroll table horizontally for more columns</p>
      {entries.length ? (
        <div className="roster-table-scroll">
          <table className="roster-table">
            <caption className="sr-only">Active Unit roster with overall Player Statistics for {windowLabel[window]}</caption>
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col" className="numeric">K</th>
                <th scope="col" className="numeric">D</th>
                <th scope="col" className="numeric">A</th>
                <th scope="col" className="numeric">KDR</th>
                <th scope="col" className="numeric">Events</th>
                <th scope="col">Attendance · Unit</th>
                {canManage ? <th scope="col">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const stats = entry.ranker?.unitTypes[selectedType];
                return (
                  <tr key={entry.membershipId}>
                    <th scope="row">
                      <Link href={`/players/${entry.player.playerId}`} className="roster-player-link">
                        {entry.player.name?.trim() || entry.player.playerId}
                      </Link>
                      <span className="roster-player-id">{entry.player.playerId}</span>
                    </th>
                    <td className="numeric">{stats?.kills ?? "—"}</td>
                    <td className="numeric">{stats?.deaths ?? "—"}</td>
                    <td className="numeric">{stats?.assists ?? "—"}</td>
                    <td className="numeric">{stats?.kdr ?? "—"}</td>
                    <td className="numeric">{entry.ranker?.distinctEvents ?? "—"}</td>
                    <td>{attendanceLabel(entry.attendance)}</td>
                    {canManage ? <td><EndMembershipForm unitId={unitId} membershipId={entry.membershipId} playerName={entry.player.name ?? entry.player.playerId} /></td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border-b border-edge py-4 text-sm text-muted">No active memberships.</p>
      )}
      {canManage ? (
        <div className="mt-5 max-w-lg border-t border-edge pt-4">
          <h3 className="mb-3 text-sm font-extrabold text-white">Add an existing Player</h3>
          <AddMembershipForm unitId={unitId} />
          <p className="mt-3 text-xs text-muted">Ending a membership keeps the Player and their history.</p>
        </div>
      ) : <p className="mt-3 text-xs text-muted">Roster changes require an authorized signed-in manager.</p>}
    </section>
  );
}
