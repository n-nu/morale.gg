import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAuthenticatedUserId } from "@/lib/website-admin";
import { getUnit } from "@/modules/units/server/queries";
import { UnitLinks } from "@/modules/units/components/unit-links";
import { isUnitsDemoMode } from "@/modules/units/server/demo";
import {
  canCreateChildUnit,
  canDeleteUnit,
  canManageAuthorizedUsers,
  canManageRootSettings,
  canManageUnit,
} from "@/modules/units/server/authorization";
import { RosterSection } from "@/modules/players/server/roster-section";

export const dynamic = "force-dynamic";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await getUnit(unitId);
  if (!unit) notFound();

  const userId = await getAuthenticatedUserId();
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
      <Link href="/units" className="units-back">
        ← All units
      </Link>
      <div className="units-hero">
        <div className="units-eyebrow">
          {unit.parent ? "Linked unit" : "Root unit"}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1>{unit.name}</h1>
          {canManage ? (
            <Link href={`/units/${encodeURIComponent(unitId)}/manage`} className="units-manage-link">
              Manage Unit
            </Link>
          ) : null}
        </div>
        <p>
          {unit.description || (unit.parent
            ? `Part of ${unit.parent.name}. Follow the connections below to explore this formation.`
            : "Where this organization begins. Explore the units connected below.")}
        </p>
        {unit.imageRef ? (
          <Image
            src={unit.imageRef}
            alt={`${unit.name} flag or icon`}
            width={160}
            height={100}
            unoptimized
            className="mt-5 max-h-28 w-auto max-w-full object-contain"
          />
        ) : null}
        {unit.discordInvite || unit.groupLink ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {unit.discordInvite ? <a href={unit.discordInvite} target="_blank" rel="noreferrer" className="underline">Discord</a> : null}
            {unit.groupLink ? <a href={unit.groupLink} target="_blank" rel="noreferrer" className="underline">External group</a> : null}
          </div>
        ) : null}
        <div className="units-stats">
          <span><strong>{unit.children.length}</strong>Child units</span>
        </div>
      </div>
      <section aria-labelledby="parent-heading" className="mt-8">
        <div className="units-section-title">
          <h2 id="parent-heading">Parent unit</h2>
          <span>One level up</span>
        </div>
        {unit.parent ? (
          <UnitLinks units={[unit.parent]} />
        ) : (
          <p className="units-empty">This is a root unit. It has no parent.</p>
        )}
      </section>
      <section aria-labelledby="children-heading" className="mt-8">
        <div className="units-section-title">
          <h2 id="children-heading">Child units</h2>
          <span>Continue exploring</span>
        </div>
        {unit.children.length > 0 ? (
          <UnitLinks units={unit.children} />
        ) : (
          <p className="units-empty">This unit has no child units.</p>
        )}
      </section>
      {isUnitsDemoMode() ? <p className="units-empty mt-8">Rosters are available for persisted Units. Sample units have no roster.</p> : <RosterSection unitId={unitId} />}
    </>
  );
}
