import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, PageHeader, SectionHeading } from "@/app/presentation";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { UnitOrganizationTree } from "@/modules/units/components/unit-organization-tree";
import {
  canCreateChildUnit,
  canDeleteUnit,
  canManageAuthorizedUsers,
  canManageRootSettings,
  canManageUnit,
} from "@/modules/units/server/authorization";
import { isUnitsDemoMode } from "@/modules/units/server/demo";
import { getUnit, listUnits } from "@/modules/units/server/queries";
import {
  getAverageUnitPerformance,
  getDirectUnitPerformance,
  getOrganizationalUnitPerformance,
} from "@/modules/statistics";
import {
  resolveStatisticsWindow,
  StatisticsErrorState,
} from "@/modules/statistics/presentation";
import { StatisticsWindowSelector } from "@/modules/statistics/window-selector";
import { UnitStatisticsSections } from "@/modules/statistics/unit-presentation";
import { UnitRoster } from "./unit-roster";

export const dynamic = "force-dynamic";

export default async function UnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}) {
  const [{ unitId }, { window }] = await Promise.all([params, searchParams]);
  const unit = await getUnit(unitId);
  if (!unit) notFound();

  const [directoryUnits, userId] = await Promise.all([
    listUnits(),
    getAuthenticatedUserId(),
  ]);
  const selectedWindow = resolveStatisticsWindow(window);
  let statistics: {
    direct: Awaited<ReturnType<typeof getDirectUnitPerformance>>;
    organizational: Awaited<ReturnType<typeof getOrganizationalUnitPerformance>>;
    average: Awaited<ReturnType<typeof getAverageUnitPerformance>>;
  } | null = null;
  let statisticsError = false;
  try {
    const [direct, organizational, average] = await Promise.all([
      getDirectUnitPerformance(unitId, selectedWindow),
      getOrganizationalUnitPerformance(unitId, selectedWindow),
      getAverageUnitPerformance(unitId, selectedWindow),
    ]);
    statistics = { direct, organizational, average };
  } catch {
    statisticsError = true;
  }

  const canManage = userId !== null && !isUnitsDemoMode()
    ? (await Promise.all([
        canManageUnit(userId, unitId),
        canManageAuthorizedUsers(userId, unitId),
        canCreateChildUnit(userId, unitId),
        canDeleteUnit(userId, unitId),
        unit.parent === null ? canManageRootSettings(userId, unitId) : false,
      ])).some(Boolean)
    : false;

  return (
    <>
      <Breadcrumbs items={[
        { label: "Community", href: "/events" },
        { label: "Units", href: "/units" },
        ...(unit.parent ? [{ label: unit.parent.name, href: `/units/${encodeURIComponent(unit.parent.id)}` }] : []),
        { label: unit.name },
      ]} />
      <PageHeader
        category={unit.parent ? "Unit" : "Root Unit"}
        title={unit.name}
        description={unit.description || (unit.parent ? `Part of ${unit.parent.name}.` : "Organization root.")}
        actions={canManage ? (
          <Link href={`/units/${encodeURIComponent(unitId)}/manage`} className="rounded-md border border-gold px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-[#1a1810]">
            Manage Unit
          </Link>
        ) : null}
      />

      {unit.imageRef || unit.discordInvite || unit.groupLink ? (
        <section className="flex flex-wrap items-center gap-4 border-b border-edge py-4" aria-label="Unit profile details">
          {unit.imageRef ? <Image src={unit.imageRef} alt={`${unit.name} flag or icon`} width={96} height={64} unoptimized className="max-h-16 max-w-24 object-contain" /> : null}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {unit.discordInvite ? <a href={unit.discordInvite} target="_blank" rel="noreferrer" className="text-gold underline decoration-edge-strong underline-offset-4 hover:text-gold-bright">Discord</a> : null}
            {unit.groupLink ? <a href={unit.groupLink} target="_blank" rel="noreferrer" className="text-gold underline decoration-edge-strong underline-offset-4 hover:text-gold-bright">External group</a> : null}
          </div>
        </section>
      ) : null}

      <UnitOrganizationTree
        selected={{ id: unit.id, name: unit.name, imageRef: unit.imageRef }}
        units={directoryUnits}
      />

      {isUnitsDemoMode() ? (
        <section className="mt-8 border-t border-edge pt-4" aria-labelledby="roster-heading">
          <SectionHeading id="roster-heading" title="Roster" />
          <p className="py-3 text-sm text-muted">Rosters are available for persisted Units. Sample units have no roster.</p>
        </section>
      ) : <UnitRoster unitId={unitId} window={selectedWindow} />}

      <section className="mt-8" aria-labelledby="unit-statistics-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading id="unit-statistics-heading" title="Unit Statistics" detail={selectedWindow} />
          <StatisticsWindowSelector value={selectedWindow} />
        </div>
        <div className="mt-4">
          {statisticsError ? (
            <StatisticsErrorState message="The Unit Statistics reader could not load this view." />
          ) : statistics ? (
            <UnitStatisticsSections direct={statistics.direct} organizational={statistics.organizational} average={statistics.average} />
          ) : null}
        </div>
      </section>
    </>
  );
}
