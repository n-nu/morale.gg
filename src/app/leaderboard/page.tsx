import type { Metadata } from "next";

import { Breadcrumbs, PageHeader, PageShell } from "@/app/presentation";
import { getLeaderboard } from "@/modules/statistics";
import {
  parseLeaderboardQuery,
  resolveLeaderboardUnitType,
  type LeaderboardData,
} from "@/modules/statistics/leaderboard-model";
import { LeaderboardView } from "@/modules/statistics/leaderboard-presentation";
import { StatisticsErrorState, resolveStatisticsWindow } from "@/modules/statistics/presentation";
import { StatisticsWindowSelector } from "@/modules/statistics/window-selector";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Leaderboard · morale.gg",
  description: "Public rankings of players, commanders, generals, and units from finalized Audits.",
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const window = resolveStatisticsWindow(params.window);
  const query = parseLeaderboardQuery(params, window);

  let data: LeaderboardData | null = null;
  try {
    data = await getLeaderboard(query.board, window);
  } catch {
    data = null;
  }

  return (
    <PageShell className="pt-1">
      <Breadcrumbs items={[
        { label: "Community", href: "/events" },
        { label: "Statistics", href: "/statistics" },
        { label: "Leaderboard" },
      ]} />
      <PageHeader
        category="Records"
        title="Leaderboard"
        description="Who is leading the line — ranked from finalized battle Audits."
        actions={<StatisticsWindowSelector value={window} />}
      />
      {data === null ? (
        <div className="mt-6">
          <StatisticsErrorState message="The Leaderboard could not be loaded. Try again shortly." />
        </div>
      ) : (
        <LeaderboardView
          data={data}
          query={{ ...query, unitType: resolveLeaderboardUnitType(query.unitType, data.partitions) }}
        />
      )}
    </PageShell>
  );
}
