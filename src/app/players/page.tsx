import Link from "next/link";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { listPlayers, findPlayerByGameId } from "@/modules/players/server/queries";
import { RegisterPlayerForm } from "@/modules/players/components/forms";

export const dynamic = "force-dynamic";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 128) : "";
  const [matches, exact, userId] = await Promise.all([listPlayers(query), query ? findPlayerByGameId(query) : null, getAuthenticatedUserId()]);
  const players = exact ? [exact, ...matches.filter((player) => player.id !== exact.id)] : matches;
  return <>
    <h1 className="text-3xl font-bold">Players</h1>
    <p className="my-3 text-muted">Find a persistent game identity to reuse on a Unit roster.</p>
    <form className="my-6 flex flex-wrap gap-3" action="/players">
      <label className="flex-1">Name or game Player ID<input name="q" defaultValue={query} maxLength={128} className="mt-1 block w-full rounded border border-edge bg-background p-2" /></label>
      <button className="self-end rounded bg-gold px-4 py-2 font-semibold text-gold-ink">Search</button>
    </form>
    <p className="mb-3 text-sm text-muted">Up to 50 matches, with an exact game ID match shown first. Narrow your search if needed.</p>
    {players.length ? <ul className="divide-y divide-edge">{players.map((player) => <li key={player.id} className="py-3"><Link className="font-semibold underline" href={`/players/${player.id}`}>{player.name}</Link><p className="break-all text-sm text-muted">Game ID: {player.playerId}</p></li>)}</ul> : <p>No Players found.</p>}
    <section className="mt-10 max-w-lg" aria-labelledby="register-heading"><h2 id="register-heading" className="mb-3 text-xl font-semibold">Register a Player</h2>
      <p className="mb-4 text-sm text-muted">Search first to avoid duplicates. Registration does not add a membership.</p>
      {userId ? <RegisterPlayerForm /> : <p>Sign in using the link above to register a Player.</p>}
    </section>
  </>;
}
