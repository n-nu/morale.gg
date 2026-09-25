import Link from "next/link";
import { AddMembershipForm, EndMembershipForm } from "./forms";

export type RosterEntry = {
  id: string;
  startedAt: Date;
  player: { id: string; playerId: string; name: string };
};

export function Roster({ unitId, entries, canManage }: { unitId: string; entries: RosterEntry[]; canManage: boolean }) {
  return <section aria-labelledby="roster-heading" className="mt-8">
    <div className="units-section-title"><h2 id="roster-heading">Current roster</h2><span>{entries.length} active</span></div>
    <p className="my-3 text-sm"><Link className="underline" href="/players">Find or register a Player</Link></p>
    {entries.length ? <ul className="divide-y divide-edge rounded border border-edge">
      {entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div><Link className="font-semibold underline" href={`/players/${entry.player.id}`}>{entry.player.name}</Link>
          <p className="break-all text-sm text-muted">Game ID: {entry.player.playerId} · Joined {entry.startedAt.toISOString().slice(0, 10)} (UTC)</p>
        </div>
        {canManage && <EndMembershipForm unitId={unitId} membershipId={entry.id} playerName={entry.player.name} />}
      </li>)}
    </ul> : <p className="units-empty">No active memberships.</p>}
    {canManage ? <div className="mt-5 max-w-lg space-y-3"><h3 className="font-semibold">Add an existing Player</h3><AddMembershipForm unitId={unitId} /><p className="text-sm text-muted">Ending a membership keeps the Player and their history.</p></div> : <p className="mt-4 text-sm text-muted">Roster changes require an authorized signed-in manager.</p>}
  </section>;
}
