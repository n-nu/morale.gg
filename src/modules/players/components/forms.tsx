"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addMembershipAction, endMembershipAction, registerPlayerAction, type FormState } from "../server/actions";

const initialState: FormState = { message: "", ok: false };
const inputClass = "min-h-10 w-full rounded-md border border-edge-strong bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold";
const buttonClass = "min-h-10 rounded-md bg-gold px-4 py-2 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright disabled:opacity-50";

function Feedback({ state }: { state: FormState }) {
  return state.message ? <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-green-bright" : "text-red-200"}`}>
    {state.message}{state.playerId && <> <Link className="underline" href={`/players/${state.playerId}`}>View Player</Link></>}
  </p> : null;
}

export function RegisterPlayerForm() {
  const [state, action, pending] = useActionState(registerPlayerAction, initialState);
  return <form action={action} className="space-y-3">
    <label className="block">Game Player ID<input className={inputClass} name="playerId" required maxLength={128} autoComplete="off" /></label>
    <label className="block">Player name<input className={inputClass} name="name" required maxLength={100} /></label>
    <button className={buttonClass} disabled={pending}>{pending ? "Registering…" : "Register Player"}</button>
    <Feedback state={state} />
  </form>;
}

export function AddMembershipForm({ unitId }: { unitId: string }) {
  const [state, action, pending] = useActionState(addMembershipAction, initialState);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="unitId" value={unitId} />
    <label className="block">Existing game Player ID<input className={inputClass} name="playerId" required maxLength={128} autoComplete="off" /></label>
    <button className={buttonClass} disabled={pending}>{pending ? "Adding…" : "Add to roster"}</button>
    <Feedback state={state} />
  </form>;
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
