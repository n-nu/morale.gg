import Link from "next/link";
import { notFound } from "next/navigation";
import type { AuditUnitType } from "@prisma/client";

import { Breadcrumbs } from "@/app/presentation";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { PlayerAwardsSection } from "@/modules/units/components/awards";
import { getPlayerAwardManagementData } from "@/modules/units/server/awards";
import { getPublicUnitPresentationBatch } from "@/modules/units/server/public-presentation";
import { findPlayerByGameId, getPlayerMemberships } from "@/modules/players/server/queries";
import { PlayerIdentity } from "@/modules/players/components/player-identity";
import { playerIdentityLabel } from "@/modules/players/identity";
import { getPublicEventPresentationBatch } from "@/modules/events/server/queries";
import { getPlayerProfileStatistics } from "@/modules/statistics";
import { StatisticsDisclosure, resolveStatisticsWindow } from "@/modules/statistics/presentation";
import { PlayerStatisticsSections } from "@/modules/statistics/player-presentation";
import { PlayerProfileFilters, type PlayerProfileTab } from "@/modules/statistics/player-profile-filters";

export const dynamic = "force-dynamic";

const UNIT_TYPES = ["REGULAR", "RIFLES", "CAVALRY", "ARTILLERY"] as const satisfies readonly AuditUnitType[];
const PROFILE_TABS = ["ranker", "commander", "general"] as const satisfies readonly PlayerProfileTab[];

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function profileUnitType(value?: string | string[]): AuditUnitType | null {
  const normalized = queryValue(value)?.trim().toUpperCase();
  return UNIT_TYPES.find((unitType) => unitType === normalized) ?? null;
}

function profilePage(value?: string | string[]): number {
  const parsed = Number.parseInt(queryValue(value) ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function profileTab(value?: string | string[]): PlayerProfileTab {
  const normalized = queryValue(value)?.trim().toLowerCase();
  return PROFILE_TABS.find((tab) => tab === normalized) ?? "ranker";
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    window?: string | string[];
    type?: string | string[];
    playerPage?: string | string[];
    commanderPage?: string | string[];
    generalPage?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { id: playerId } = await params;
  const query = await searchParams;
  const player = await findPlayerByGameId(playerId);
  if (!player) notFound();

  const identity = {
    playerId: player.playerId,
    robloxUsername: player.robloxUsername,
    robloxAvatarUrl: player.robloxAvatarUrl,
  };
  const selectedTab = profileTab(query.tab);
  const selectedWindow = resolveStatisticsWindow(query.window);
  const selectedUnitType = profileUnitType(query.type);
  const [
    memberships,
    statistics,
    userId,
  ] = await Promise.all([
    getPlayerMemberships(player.id),
    getPlayerProfileStatistics({
      gamePlayerId: player.playerId,
      window: selectedWindow,
      unitType: selectedUnitType,
      playerPage: profilePage(query.playerPage),
      commanderPage: profilePage(query.commanderPage),
      generalPage: profilePage(query.generalPage),
    }),
    getAuthenticatedUserId(),
  ]);
  const awardData = await getPlayerAwardManagementData(userId, player.playerId);

  const allEventIds = [
    ...statistics.playerHistory.rows.map(({ eventId }) => eventId),
    ...statistics.commanderHistory.rows.map(({ eventId }) => eventId),
    ...statistics.generalHistory.rows.map(({ eventId }) => eventId),
  ];
  const allUnitIds = [
    ...statistics.playerHistory.rows.map(({ unitId }) => unitId),
    ...statistics.commanderHistory.rows.map(({ unitId }) => unitId),
    ...statistics.generalHistory.rows.map(({ unitId }) => unitId),
  ];
  const [events, units] = await Promise.all([
    getPublicEventPresentationBatch(allEventIds),
    getPublicUnitPresentationBatch(allUnitIds),
  ]);

  return (
    <>
      <Breadcrumbs items={[
        { label: "Community", href: "/events" },
        { label: "Players", href: "/players" },
        { label: playerIdentityLabel(identity) },
      ]} />

      <header className="mt-5 pb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">Player record</p>
        <h1 className="sr-only">{playerIdentityLabel(identity)}</h1>
        <div className="mt-4 flex justify-center">
          <PlayerIdentity identity={identity} size={152} layout="stacked" />
        </div>
      </header>

      <PlayerAwardsSection
        playerId={player.playerId}
        awards={awardData.awards}
        available={awardData.available}
        manageableAwardIds={awardData.manageableAwardIds}
        notice={queryValue(query.notice)}
        error={queryValue(query.error)}
      />

      <section className="mt-7" aria-labelledby="statistics-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">Statistical dossier</p>
            <h2 id="statistics-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-white">
              Performance
            </h2>
          </div>
        </div>
        <PlayerProfileFilters
          tab={selectedTab}
          window={selectedWindow}
          unitType={selectedUnitType?.toLowerCase() ?? null}
        />
        <PlayerStatisticsSections tab={selectedTab} statistics={statistics} events={events} units={units} />
      </section>

      <section className="mt-8" aria-labelledby="membership-history-heading">
        <StatisticsDisclosure
          title="Membership history"
          headingLevel={2}
          headingId="membership-history-heading"
          summary={`${memberships.length} records`}
        >
          {memberships.length ? (
            <ul className="divide-y divide-edge border-b border-edge">
              {memberships.map((membership) => (
                <li key={membership.id} className="py-3">
                  <Link className="font-semibold text-foreground underline decoration-edge-strong underline-offset-4 hover:text-gold" href={`/units/${membership.unitId}`}>
                    {membership.unit.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    Joined {membership.startedAt.toISOString().replace("T", " ").slice(0, 19)} UTC · {membership.endedAt ? `Ended ${membership.endedAt.toISOString().replace("T", " ").slice(0, 19)} UTC` : "Active"}
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No membership history.</p>}
        </StatisticsDisclosure>
      </section>
    </>
  );
}
