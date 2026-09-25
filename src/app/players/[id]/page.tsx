import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayerMemberships } from "@/modules/players/server/queries";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();
  const memberships = await getPlayerMemberships(id);
  return <>
    <h1 className="text-3xl font-bold">{player.name}</h1>
    <p className="my-3 break-all text-muted">Game Player ID: {player.playerId}</p>
    <h2 className="mb-4 mt-8 text-xl font-semibold">Membership history</h2>
    {memberships.length ? <ul className="divide-y divide-edge">{memberships.map((membership) => <li key={membership.id} className="py-4">
      <Link className="font-semibold underline" href={`/units/${membership.unitId}`}>{membership.unit.name}</Link>
      <p className="text-sm text-muted">Joined {membership.startedAt.toISOString().replace("T", " ").slice(0, 19)} UTC · {membership.endedAt ? `Ended ${membership.endedAt.toISOString().replace("T", " ").slice(0, 19)} UTC` : "Active"}</p>
    </li>)}</ul> : <p>No membership history yet.</p>}
  </>;
}
