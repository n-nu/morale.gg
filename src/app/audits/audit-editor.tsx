"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { PlayerIdentity } from "@/modules/players/components/player-identity";
import { robloxProfileUrl } from "@/modules/players/identity";
import type { AuditActionState } from "@/modules/audits/server/actions";

type AuditAction = (previous: AuditActionState, data: FormData) => Promise<AuditActionState>;

type AuditEditorProps = {
  auditId: string;
  submitAction: AuditAction;
  previewAction: AuditAction;
};

type PreviewRow = { playerId: string; kills: string; deaths: string; assists: string };

const initialState: AuditActionState = { ok: false, message: "" };

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

export function AuditEditor({ auditId, submitAction, previewAction }: AuditEditorProps) {
  const [rawData, setRawData] = useState("");
  const [previewState, runPreview, previewPending] = useActionState(previewAction, initialState);
  const [submitState, runSubmit, submitPending] = useActionState(submitAction, initialState);
  const currentPreview =
    previewState.auditId === auditId &&
    previewState.rawData === rawData &&
    previewState.players !== undefined;
  const canFinalize = currentPreview && previewState.ok && (previewState.invalidIds?.length ?? 0) === 0;
  const identityById = new Map((currentPreview ? previewState.players ?? [] : []).map((player) => [player.playerId, player]));
  const rows = previewRows(rawData);

  return (
    <form action={runSubmit} className="mt-4 space-y-5">
      <input type="hidden" name="auditId" value={auditId} />
      {canFinalize ? (
        <>
          <input type="hidden" name="verifiedRawData" value={rawData} />
          <input type="hidden" name="verifiedAuditId" value={auditId} />
        </>
      ) : null}
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
            Virtual leaderboard — Roblox identity preview
          </caption>
          <thead className="text-xs uppercase text-muted">
            <tr><th className="px-3 py-2">Player</th><th className="px-3 py-2">K</th><th className="px-3 py-2">D</th><th className="px-3 py-2">A</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-3 text-muted">Paste rows, then verify the Roblox identities.</td></tr>
            ) : rows.map((row, index) => {
              const identity = identityById.get(row.playerId);
              const profileUrl = identity ? robloxProfileUrl(identity.playerId) : null;
              const invalid = previewState.invalidIds?.includes(row.playerId) ?? false;
              return (
                <tr key={`${row.playerId}-${index}`} className="border-t border-edge">
                  <td className="px-3 py-2">
                    {identity ? (
                      <Link href={`/players/${encodeURIComponent(identity.playerId)}`} className="inline-flex items-center gap-2 underline decoration-edge-strong underline-offset-2">
                        <PlayerIdentity identity={identity} size={24} />
                      </Link>
                    ) : (
                      <span className="font-mono">{row.playerId || "Missing PlayerID"}</span>
                    )}
                    {profileUrl ? (
                      <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-gold underline">
                        Roblox ↗
                      </a>
                    ) : null}
                    {invalid ? <span className="ml-2 text-xs text-red-200" role="alert">Invalid Roblox ID</span> : null}
                  </td>
                  <td className="px-3 py-2">{row.kills}</td><td className="px-3 py-2">{row.deaths}</td><td className="px-3 py-2">{row.assists}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {previewState.message ? (
        <p role={previewState.ok ? "status" : "alert"} className="text-sm text-muted">{previewState.message}</p>
      ) : null}

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

      <div className="flex flex-wrap gap-3">
        <button type="submit" formAction={runPreview} disabled={previewPending} className="rounded border border-edge-strong px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">
          {previewPending ? "Verifying Players…" : "Verify Roblox identities"}
        </button>
        <button type="submit" disabled={!canFinalize || submitPending} className="rounded bg-gold px-4 py-2 text-sm font-bold text-gold-ink disabled:opacity-50">
          {submitPending ? "Finalizing…" : "Confirm identities and finalize Audit"}
        </button>
      </div>
      {submitState.message ? (
        <p role={submitState.ok ? "status" : "alert"} className="text-sm text-muted">{submitState.message}</p>
      ) : null}
    </form>
  );
}
