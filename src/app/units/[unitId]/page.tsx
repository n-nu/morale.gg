import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, SectionHeading } from "@/app/presentation";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { UnitOrganizationTree } from "@/modules/units/components/unit-organization-tree";
import { UnitQuickFacts } from "@/modules/units/components/unit-quick-facts";
import { UnitAwardsSection } from "@/modules/units/components/awards";
import { getUnitAwards } from "@/modules/units/server/awards";
import {
  canCreateChildUnit,
  canDeleteUnit,
  canManageAuthorizedUsers,
  canManageRootSettings,
  canManageUnit,
} from "@/modules/units/server/authorization";
import { isUnitsDemoMode } from "@/modules/units/server/demo";
import { getPublicUnitHierarchy } from "@/modules/units/server/queries";
import {
  getAverageUnitPerformance,
  getDirectUnitPerformance,
  getDirectUnitPerformanceForAllUnits,
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
  const [hierarchy, userId, unitAwards] = await Promise.all([
    getPublicUnitHierarchy(unitId),
    getAuthenticatedUserId(),
    isUnitsDemoMode() ? Promise.resolve([]) : getUnitAwards(unitId),
  ]);
  if (!hierarchy) notFound();
  const unit = hierarchy.find((entry) => entry.id === unitId);
  if (!unit) notFound();

  const selectedWindow = resolveStatisticsWindow(window);
  type DirectPerformance = Awaited<ReturnType<typeof getDirectUnitPerformance>>;
  let statistics: {
    direct: DirectPerformance;
    organizational: Awaited<ReturnType<typeof getOrganizationalUnitPerformance>>;
    average: Awaited<ReturnType<typeof getAverageUnitPerformance>>;
  } | null = null;
  let statisticsError = false;
  try {
    const [allDirect, organizational, average] = await Promise.all([
      getDirectUnitPerformanceForAllUnits(selectedWindow),
      getOrganizationalUnitPerformance(unitId, selectedWindow),
      getAverageUnitPerformance(unitId, selectedWindow),
    ]);
    const directForUnit = allDirect.units.find((entry) => entry.unitId === unitId);
    statistics = {
      direct: {
        window: selectedWindow,
        unitId,
        unitTypes: directForUnit?.unitTypes ?? [],
      },
      organizational,
      average,
    };
  } catch {
    statisticsError = true;
  }
  const directoryUnits = hierarchy;
  const selectedUnit = unit;

  const canManage = userId !== null && !isUnitsDemoMode()
    ? (await Promise.all([
        canManageUnit(userId, unitId),
        canManageAuthorizedUsers(userId, unitId),
        canCreateChildUnit(userId, unitId),
        canDeleteUnit(userId, unitId),
        unit.parent === null ? canManageRootSettings(userId, unitId) : false,
      ])).some(Boolean)
    : false;

  const directoryById = new Map(directoryUnits.map((entry) => [entry.id, entry]));
  const ancestors: { id: string; name: string }[] = [];
  const visited = new Set([unit.id]);
  let ancestor = unit.parent ? directoryById.get(unit.parent.id) : undefined;
  while (ancestor && !visited.has(ancestor.id)) {
    visited.add(ancestor.id);
    ancestors.push({ id: ancestor.id, name: ancestor.name });
    ancestor = ancestor.parent ? directoryById.get(ancestor.parent.id) : undefined;
  }

  return (
    <>
      <Breadcrumbs items={[
        { label: "Community", href: "/events" },
        { label: "Units", href: "/units" },
        ...ancestors.reverse().map((entry) => ({
          label: entry.name,
          href: `/units/${encodeURIComponent(entry.id)}`,
        })),
        { label: unit.name },
      ]} />

      <section className="unit-profile-hero" aria-labelledby="unit-profile-heading">
        {unit.imageRef ? (
          <Image
            src={unit.imageRef}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 700px) calc(100vw - 40px), 1760px"
            className="unit-profile-background"
          />
        ) : null}
        <div className="unit-profile-shade" />
        <div className="unit-profile-content">
          <div className="unit-profile-emblem" aria-hidden="true">
            {unit.imageRef ? (
              <Image src={unit.imageRef} alt="" width={100} height={100} unoptimized />
            ) : (
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 4 41 10v12c0 11-7 18-17 22C14 40 7 33 7 22V10L24 4Z" />
                <path d="M24 12v23M15 20h18" />
              </svg>
            )}
          </div>
          <div className="unit-profile-identity">
            <p className="unit-profile-category">
              {unit.parent ? "Organization Unit" : "Root Unit"}
            </p>
            <h1 id="unit-profile-heading">{unit.name}</h1>
            {unit.description ? (
              <p className="unit-profile-description">{unit.description}</p>
            ) : null}
            <UnitQuickFacts
              unit={selectedUnit}
              variant="profile"
            />
            {unit.parent ? (
              <Link
                href={`/units/${encodeURIComponent(unit.parent.id)}`}
                className="unit-profile-parent-link"
              >
                ← Back to {unit.parent.name}
              </Link>
            ) : null}
          </div>
          {canManage ? (
            <Link
              href={`/units/${encodeURIComponent(unitId)}/manage`}
              className="unit-profile-manage"
            >
              Manage Unit
            </Link>
          ) : null}
        </div>
      </section>

      {unit.discordInvite || unit.groupLink ? (
        <nav className="unit-profile-links" aria-label="Unit links">
          {unit.discordInvite ? (
            <a href={unit.discordInvite} target="_blank" rel="noreferrer">Discord <span aria-hidden="true">↗</span></a>
          ) : null}
          {unit.groupLink ? (
            <a href={unit.groupLink} target="_blank" rel="noreferrer">External group <span aria-hidden="true">↗</span></a>
          ) : null}
        </nav>
      ) : null}

      <UnitOrganizationTree
        key={selectedUnit.id}
        selected={selectedUnit}
        units={directoryUnits}
      />

      <UnitAwardsSection awards={unitAwards} />

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
            <UnitStatisticsSections
              direct={statistics.direct}
              organizational={statistics.organizational}
              average={statistics.average}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
