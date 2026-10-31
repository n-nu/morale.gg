import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageHeader, PageShell, SectionHeading } from "@/app/presentation";
import {
  LEADERBOARD_BOARDS,
  LEADERBOARD_BOARD_DEFINITIONS,
} from "@/modules/statistics/leaderboard-model";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Statistics · morale.gg" };

const DESTINATIONS: Array<[string, string, string]> = [
  ["Players", "Individual Ranker, Commander, General, and attendance records", "/players"],
  ["Units", "Organization and Direct, Organizational, and Average performance", "/units"],
  ["Events", "Schedule and battle results", "/events"],
  ["Audit results", "Finalized event records", "/audits"],
];

export default async function StatisticsPage() {
  return (
    <PageShell className="pt-1">
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Statistics" }]} />
      <PageHeader category="Records" title="Statistics" description="Public performance and attendance, derived from finalized Audits." />

      <section className="mt-7" aria-labelledby="statistics-leaderboard">
        <SectionHeading
          id="statistics-leaderboard"
          title="Leaderboard"
          detail={<Link href="/leaderboard" className="font-semibold text-gold hover:text-gold-bright">Open Leaderboard →</Link>}
        />
        <ul className="grid border-b border-edge sm:grid-cols-2 lg:grid-cols-4">
          {LEADERBOARD_BOARDS.map((board) => {
            const definition = LEADERBOARD_BOARD_DEFINITIONS[board];
            return (
              <li key={board} className="border-b border-edge last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0 sm:[&:nth-child(3)]:border-l-0 lg:[&:nth-child(3)]:border-l">
                <Link
                  href={board === "players" ? "/leaderboard" : `/leaderboard?board=${board}`}
                  className="group flex h-full flex-col gap-1 py-3.5 sm:px-4 sm:first:pl-0"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors group-hover:text-gold">
                    {definition.label}
                  </span>
                  <span className="text-sm leading-snug text-muted">{definition.summary}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="statistics-destinations">
        <SectionHeading id="statistics-destinations" title="Explore records" />
        <ul className="divide-y divide-edge border-b border-edge">
          {DESTINATIONS.map(([title, detail, href]) => (
            <li key={href}>
              <Link href={href} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3 transition-colors hover:text-gold">
                <span className="font-bold text-foreground">{title}</span>
                <span className="text-sm text-muted">{detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
