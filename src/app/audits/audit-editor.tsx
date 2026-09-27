"use client";

import { useState } from "react";

type AuditAction = (data: FormData) => void | Promise<void>;

type AuditEditorProps = {
  auditId: string;
  submitAction: AuditAction;
};

type PreviewRow = { playerId: string; kills: string; deaths: string; assists: string };

function previewRows(rawData: string): PreviewRow[] {
  return rawData
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [playerId = "", kills = "", deaths = "", assists = ""] = line.split(",");
      return { playerId: playerId.trim(), kills: kills.trim(), deaths: deaths.trim(), assists: assists.trim() };
    })
    .sort((left, right) => Number(right.kills) - Number(left.kills));
}

const inputClass = "rounded border border-edge bg-surface-2 px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-muted";

export function AuditEditor({ auditId, submitAction }: AuditEditorProps) {
  const [rawData, setRawData] = useState("");
  const rows = previewRows(rawData);

  return (
    <form action={submitAction} className="mt-4 space-y-5">
      <input type="hidden" name="auditId" value={auditId} />
      <label className={labelClass}>
        Raw Player results
        <textarea
          name="rawData"
          required
          rows={7}
          value={rawData}
          onChange={(event) => setRawData(event.target.value)}
          placeholder="playerId,kills,deaths,assists"
          className={`${inputClass} resize-y font-mono normal-case tracking-normal`}
        />
      </label>

      <div className="overflow-x-auto rounded border border-edge">
        <table className="w-full text-left text-sm">
          <caption className="border-b border-edge bg-surface-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted">
            Virtual leaderboard
          </caption>
          <thead className="text-xs uppercase text-muted">
            <tr><th className="px-3 py-2">Player</th><th className="px-3 py-2">K</th><th className="px-3 py-2">D</th><th className="px-3 py-2">A</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-3 text-muted">Paste rows to preview them.</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.playerId}-${index}`} className="border-t border-edge">
                <td className="px-3 py-2 font-mono">{row.playerId || "Missing PlayerID"}</td>
                <td className="px-3 py-2">{row.kills}</td><td className="px-3 py-2">{row.deaths}</td><td className="px-3 py-2">{row.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Unit type<select name="unitType" required defaultValue="REGULAR" className={inputClass}>
          <option value="REGULAR">Regular</option><option value="RIFLES">Rifles</option><option value="CAVALRY">Cavalry</option><option value="ARTILLERY">Artillery</option>
        </select></label>
        <label className={labelClass}>Commander PlayerID<input name="commanderPlayerId" required className={inputClass} /></label>
        <label className={labelClass}>Flag Bearer PlayerID<input name="flagBearerPlayerId" className={inputClass} /></label>
        <label className={labelClass}>Tickets<input name="tickets" required min="0" type="number" className={inputClass} /></label>
        <label className={labelClass}>Flag Captures<input name="flagCaptures" required min="0" type="number" className={inputClass} /></label>
        <label className={labelClass}>Flag Losses<input name="flagLosses" required min="0" type="number" className={inputClass} /></label>
        <label className={labelClass}>Stars<input name="stars" required min="0" type="number" className={inputClass} /></label>
      </div>

      <button type="submit" className="rounded bg-gold px-4 py-2 text-sm font-bold text-gold-ink hover:bg-gold-bright">
        Finalize Audit
      </button>
    </form>
  );
}