import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">Public statistics</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Statistics</h1>
        <p className="mt-3 max-w-3xl text-base text-muted">
          Discover the community’s public performance records by player, unit, and event history.
          This page is a simple entry point to the existing public statistics surfaces.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/players" className="rounded-xl border border-edge bg-surface p-5 transition-colors hover:border-gold">
          <h2 className="text-lg font-semibold text-white">Players</h2>
          <p className="mt-2 text-sm text-muted">Browse player profiles and their Ranker, Commander, and General statistics.</p>
        </Link>
        <Link href="/units" className="rounded-xl border border-edge bg-surface p-5 transition-colors hover:border-gold">
          <h2 className="text-lg font-semibold text-white">Units</h2>
          <p className="mt-2 text-sm text-muted">Review unit hierarchy and the public performance context behind formations.</p>
        </Link>
        <Link href="/events" className="rounded-xl border border-edge bg-surface p-5 transition-colors hover:border-gold">
          <h2 className="text-lg font-semibold text-white">Events</h2>
          <p className="mt-2 text-sm text-muted">Follow the public event calendar and the related battle history.</p>
        </Link>
        <Link href="/audits" className="rounded-xl border border-edge bg-surface p-5 transition-colors hover:border-gold">
          <h2 className="text-lg font-semibold text-white">Audit results</h2>
          <p className="mt-2 text-sm text-muted">Explore finalized public audit records and their event-linked outcomes.</p>
        </Link>
      </div>

      <section className="mt-10 rounded-xl border border-edge bg-surface p-6">
        <h2 className="text-xl font-semibold text-white">Statistics categories</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          <li className="rounded-lg border border-edge bg-surface-2 p-3 text-sm text-muted">Ranker: player combat totals and per-Audit performance.</li>
          <li className="rounded-lg border border-edge bg-surface-2 p-3 text-sm text-muted">Commander: battlefield command performance and command-group results.</li>
          <li className="rounded-lg border border-edge bg-surface-2 p-3 text-sm text-muted">General: command-group and atomic-unit totals by unit type.</li>
          <li className="rounded-lg border border-edge bg-surface-2 p-3 text-sm text-muted">Attendance: obligations and resolved participation states.</li>
        </ul>
      </section>
    </main>
  );
}
