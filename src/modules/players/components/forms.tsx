"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addMembershipAction,
  endMembershipAction,
  previewPlayerIdentityAction,
  previewRosterPlayerIdentityAction,
  registerPlayerAction,
  type FormState,
} from "../server/actions";
import { robloxProfileUrl } from "../identity";
import { PlayerIdentity } from "./player-identity";

const initialState: FormState = { message: "", ok: false };
const inputClass = "min-h-10 w-full rounded-md border border-edge-strong bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold";
const buttonClass = "min-h-10 rounded-md bg-gold px-4 py-2 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright disabled:opacity-50";

function Feedback({ state }: { state: FormState }) {
  return state.message ? <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-green-bright" : "text-red-200"}`}>
    {state.message}{state.playerId && <> <Link className="underline" href={`/players/${state.playerId}`}>View Player</Link></>}
  </p> : null;
}

export function RegisterPlayerForm() {
  const [playerId, setPlayerId] = useState("");
  const [previewState, previewAction, previewPending] = useActionState(previewPlayerIdentityAction, initialState);
  const [state, action, pending] = useActionState(registerPlayerAction, initialState);
  const activePreview = previewState.identity && playerId.trim() === previewState.playerId ? previewState : null;
  const profileUrl = activePreview?.identity ? robloxProfileUrl(activePreview.identity.playerId) : null;

  return (
    <div className="space-y-3">
      <form action={previewAction} className="space-y-3">
        <label className="block">Roblox User ID or exact existing Player ID<input className={inputClass} name="playerId" value={playerId} onChange={(event) => setPlayerId(event.target.value)} required maxLength={128} autoComplete="off" /></label>
        <button className={buttonClass} disabled={previewPending}>{previewPending ? "Looking up Roblox…" : "Look up Roblox account"}</button>
        <Feedback state={previewState} />
      </form>
      {activePreview ? (
        <div className="space-y-3 rounded-md border border-edge p-4">
          <PlayerIdentity identity={activePreview.identity!} size={56} showPlayerId />
          {profileUrl ? (
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gold underline underline-offset-4">
              View Roblox Profile ↗
            </a>
          ) : null}
          <p className="text-sm text-muted">{activePreview.message}</p>
          <form action={action}>
            <input type="hidden" name="playerId" value={activePreview.identity!.playerId} />
            <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : activePreview.existing ? "Confirm and reuse Player" : "Confirm and register Player"}</button>
            <Feedback state={state} />
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function AddMembershipForm({ unitId }: { unitId: string }) {
  const [playerId, setPlayerId] = useState("");
  const [previewState, previewAction, previewPending] = useActionState(previewRosterPlayerIdentityAction, initialState);
  const [state, action, pending] = useActionState(addMembershipAction, initialState);
  const activePreview = previewState.identity && playerId.trim() === previewState.playerId ? previewState : null;
  const profileUrl = activePreview?.identity ? robloxProfileUrl(activePreview.identity.playerId) : null;

  return (
    <div className="space-y-3">
      <form action={previewAction} className="space-y-3">
        <input type="hidden" name="unitId" value={unitId} />
        <label className="block">Roblox User ID or exact existing Player ID<input className={inputClass} name="playerId" value={playerId} onChange={(event) => setPlayerId(event.target.value)} required maxLength={128} autoComplete="off" /></label>
        <button className={buttonClass} disabled={previewPending}>{previewPending ? "Looking up Roblox…" : "Look up Roblox account"}</button>
        <Feedback state={previewState} />
      </form>
      {activePreview ? (
        <div className="space-y-3 rounded-md border border-edge p-4">
          <PlayerIdentity identity={activePreview.identity!} size={56} showPlayerId />
          {profileUrl ? (
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gold underline underline-offset-4">
              View Roblox Profile ↗
            </a>
          ) : null}
          <p className="text-sm text-muted">{activePreview.message}</p>
          {activePreview.existing && !activePreview.verified ? (
            <p className="text-sm text-muted">This stored Player has no verified Roblox metadata. The existing record can still be reused by its ID.</p>
          ) : null}
          <form action={action}>
            <input type="hidden" name="unitId" value={unitId} />
            <input type="hidden" name="playerId" value={activePreview.identity!.playerId} />
            <button className={buttonClass} disabled={pending}>{pending ? "Adding…" : "Confirm identity and add to roster"}</button>
            <Feedback state={state} />
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function EndMembershipForm({ unitId, membershipId, playerName }: { unitId: string; membershipId: string; playerName: string }) {
  const [state, action, pending] = useActionState(endMembershipAction, initialState);
  return <form action={action}>
    <input type="hidden" name="unitId" value={unitId} />
    <input type="hidden" name="membershipId" value={membershipId} />
    <button className="rounded border border-edge px-3 py-2 text-sm disabled:opacity-50" aria-label={`End membership for ${playerName}`} disabled={pending}>{pending ? "Ending…" : "End membership"}</button>
    <Feedback state={state} />
  </form>;
}
