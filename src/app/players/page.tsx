import { getAuthenticatedUserId } from "@/lib/website-admin";
import { listPlayers, findPlayerByGameId } from "@/modules/players/server/queries";
import { RegisterPlayerForm } from "@/modules/players/components/forms";
import { PlayerDirectory } from "@/modules/players/components/directory";
import { Breadcrumbs, PageEmptyState, PageHeader } from "@/app/presentation";

export const dynamic = "force-dynamic";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 128) : "";
  const [matches, exact, userId] = await Promise.all([listPlayers(query), query ? findPlayerByGameId(query) : null, getAuthenticatedUserId()]);
  const players = exact
    ? [{ playerId: exact.playerId, name: exact.name }, ...matches.filter((player) => player.playerId !== exact.playerId)]
    : matches;
  return <>
    <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Players" }]} />
    <PageHeader category="Records" title="Players" count={players.length} description="Find a persistent game identity and public record." />
    <form className="my-6 flex flex-wrap items-end gap-3 border-b border-edge pb-6" action="/players">
      <label className="min-w-0 flex-1 text-sm font-semibold text-foreground">Name or game Player ID<input name="q" defaultValue={query} maxLength={128} className="mt-1 block min-h-10 w-full rounded-md border border-edge-strong bg-background px-3 py-2 font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold" /></label>
      <button className="min-h-10 rounded-md bg-gold px-4 py-2 text-sm font-bold text-gold-ink transition-colors hover:bg-gold-bright">Search</button>
    </form>
    <section aria-labelledby="players-heading">
      <div className="mb-2 flex items-baseline justify-between gap-4"><h2 id="players-heading" className="text-base font-extrabold text-white">Directory</h2><span className="text-xs text-muted">Up to 50 matches</span></div>
      {players.length ? <PlayerDirectory players={players} /> : <PageEmptyState title="No Players found." />}
    </section>
    <section className="mt-10 max-w-2xl border-t border-edge pt-5" aria-labelledby="register-heading"><h2 id="register-heading" className="mb-2 text-base font-extrabold text-white">Register a Player</h2>
      <p className="mb-4 text-sm text-muted">Search first to avoid duplicates. Registration does not add a membership.</p>
      {userId ? <RegisterPlayerForm /> : <p className="text-sm text-muted">Sign in to register a Player.</p>}
    </section>
  </>;
}
