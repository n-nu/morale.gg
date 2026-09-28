import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageEmptyState, PageHeader, PageShell, SectionHeading } from "@/app/presentation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Statistics · morale.gg" };

export default async function StatisticsPage() {
  return (
    <PageShell className="pt-1">
      <Breadcrumbs items={[{ label: "Community", href: "/events" }, { label: "Statistics" }]} />
      <PageHeader category="Records" title="Statistics" description="Public performance and attendance." />

      <section className="mt-7" aria-labelledby="statistics-destinations">
        <SectionHeading id="statistics-destinations" title="Explore records" />
        <ul className="divide-y divide-edge border-b border-edge">
          {[
            ["Players", "Ranker, Commander, General, and attendance", "/players"],
            ["Units", "Organization and unit performance", "/units"],
            ["Events", "Schedule and historical context", "/events"],
            ["Audit results", "Finalized event records", "/audits"],
          ].map(([title, detail, href]) => (
            <li key={href}>
              <Link href={href} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3 transition-colors hover:text-gold">
                <span className="font-bold text-foreground">{title}</span>
                <span className="text-sm text-muted">{detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="statistics-categories">
        <SectionHeading id="statistics-categories" title="Categories" />
        <PageEmptyState title="Ranker · Commander · General · Attendance">
          Results are grouped by their existing Unit-type and attendance definitions.
        </PageEmptyState>
      </section>
    </PageShell>
  );
}
