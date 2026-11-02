import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import {
  canCreateChildUnit,
  canDeleteUnit,
  canManageAwards,
  canManageRootAwardCatalog,
  canManageAuthorizedUser,
  canManageAuthorizedUsers,
  canManageRootSettings,
  canManageUnit,
} from "@/modules/units/server/authorization";
import {
  getUnitManagementData,
  listAuthorizedMembershipsForManagement,
  listMoveDestinations,
} from "@/modules/units/server/queries";
import { getUnitAwardManagementData, listRootAwards } from "@/modules/units/server/awards";
import { listRootRanks } from "@/modules/units/server/catalogs";
import {
  AuthorizedUserManagement,
  ManagementNotice,
  ManagementSectionNav,
  OrganizationCatalogs,
  OrganizationManagement,
  UnitManagementHeader,
  UnitLifecycle,
  UnitOverview,
} from "@/modules/units/components/management";
import { UnitAwardManagement } from "@/modules/units/components/awards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Unit · morale.gg",
};

type PageProps = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }>;
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function SignInPanel() {
  return (
    <section className="units-management-gate" aria-labelledby="signin-heading">
      <h1 id="signin-heading">Sign in to manage this Unit</h1>
      <p>Unit management is available to authorized Unit managers and the RootUnit owner.</p>
      <Link href="/api/auth/signin">Sign in</Link>
    </section>
  );
}

export default async function UnitManagementPage({ params, searchParams }: PageProps) {
  const [{ unitId }, query, userId] = await Promise.all([
    params,
    searchParams,
    getAuthenticatedUserId(),
  ]);
  if (userId === null) return <SignInPanel />;

  const unit = await getUnitManagementData(unitId);
  if (unit === null) notFound();

  const rootUnitId = unit.rootUnitId;
  const [canEditProfile, canAdministerUsers, canCreateChild, canDelete, canManageOrganization, canManageAwardsHere] = await Promise.all([
    canManageUnit(userId, unitId),
    canManageAuthorizedUsers(userId, unitId),
    canCreateChildUnit(userId, unitId),
    canDeleteUnit(userId, unitId),
    rootUnitId !== null && unit.id === rootUnitId
      ? canManageRootSettings(userId, rootUnitId)
      : Promise.resolve(false),
    canManageAwards(userId, unitId),
  ]);

  const canManageAwardCatalog = rootUnitId !== null && unit.id === rootUnitId
    ? await canManageRootAwardCatalog(userId, rootUnitId)
    : false;
  const canManageRootFromChild = rootUnitId !== null && unit.id !== rootUnitId
    ? await canManageRootSettings(userId, rootUnitId)
    : false;

  if (!canEditProfile && !canAdministerUsers && !canCreateChild && !canDelete && !canManageOrganization && !canManageAwardCatalog && !canManageAwardsHere && !canManageRootFromChild) {
    notFound();
  }

  const [memberships, moveDestinations, ranks, playerAwards, unitAwards, unitAwardManagement] = await Promise.all([
    canAdministerUsers ? listAuthorizedMembershipsForManagement(userId, unitId) : null,
    unit.parentId !== null ? listMoveDestinations(userId, unitId) : [],
    canManageOrganization && rootUnitId ? listRootRanks(rootUnitId) : [],
    canManageAwardCatalog && rootUnitId ? listRootAwards(rootUnitId, "PLAYER") : [],
    canManageAwardCatalog && rootUnitId ? listRootAwards(rootUnitId, "UNIT") : [],
    canManageAwardsHere ? getUnitAwardManagementData(unitId) : null,
  ]);

  const notice = queryValue(query.notice);
  const error = queryValue(query.error);

  const manageableMembershipIds = memberships
    ? (await Promise.all(
        memberships
          .filter((membership) => membership.endedAt === null)
          .map(async (membership) => (await canManageAuthorizedUser(userId, membership.id, unitId)) ? membership.id : null),
      )).filter((id): id is string => id !== null)
    : [];
  const canManageRankCatalog = canManageOrganization && rootUnitId === unitId;
  const canShowAwardCatalogs = canManageRankCatalog || canManageAwardCatalog;

  const sections = [
    { id: "overview", label: "Profile" },
    { id: "organization", label: "Organization" },
    ...(canShowAwardCatalogs ? [{ id: "structure", label: "Catalogs" }] : []),
    ...(canManageAwardsHere ? [{ id: "awards", label: "Awards" }] : []),
    ...(canAdministerUsers && memberships ? [{ id: "access", label: "Permissions" }] : []),
    ...(canDelete ? [{ id: "lifecycle", label: "Danger Zone" }] : []),
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="units-back">
        <Link href="/units">All Units</Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/units/${encodeURIComponent(unitId)}`}>{unit.name}</Link>
        <span aria-hidden="true"> / </span>
        <span>Manage</span>
      </nav>

      <UnitManagementHeader unit={unit} />

      <ManagementSectionNav sections={sections} />
      <ManagementNotice notice={notice} error={error} />

      <section id="overview" className="units-management-section" aria-labelledby="unit-overview-heading">
        <div className="units-section-title">
          <h2 id="unit-overview-heading">Public Profile</h2>
        </div>
        <UnitOverview unit={unit} canEdit={canEditProfile} />
      </section>

      <section id="organization" className="units-management-section" aria-labelledby="organization-heading">
        <div className="units-section-title">
          <h2 id="organization-heading">Organization</h2>
        </div>
        <OrganizationManagement
          unit={{ id: unit.id, name: unit.name, parent: unit.parent, children: unit.children }}
          canCreateChild={canCreateChild}
          moveDestinations={moveDestinations}
          rootSettingsHref={canManageRootFromChild && rootUnitId ? `/units/${encodeURIComponent(rootUnitId)}/manage#structure` : undefined}
        />
      </section>

      {canShowAwardCatalogs && rootUnitId ? (
        <section id="structure" className="units-management-section" aria-labelledby="structure-heading">
          <div className="units-section-title">
            <h2 id="structure-heading">{canManageRankCatalog ? "Rank Structure & Awards" : "Awards"}</h2>
          </div>
          <OrganizationCatalogs
            rootUnitId={rootUnitId}
            ranks={ranks}
            playerAwards={playerAwards}
            unitAwards={unitAwards}
            canManageRanks={canManageRankCatalog}
          />
        </section>
      ) : null}

      {canManageAwardsHere && unitAwardManagement ? (
        <section id="awards" className="units-management-section" aria-labelledby="unit-awards-management-heading">
          <div className="units-section-title">
            <h2 id="unit-awards-management-heading">Unit Awards</h2>
          </div>
          <UnitAwardManagement
            unitId={unitId}
            assigned={unitAwardManagement.assigned}
            available={unitAwardManagement.available}
          />
        </section>
      ) : null}

      {canAdministerUsers && memberships ? (
        <section id="access" className="units-management-section" aria-labelledby="authorized-users-heading">
          <div className="units-section-title">
            <h2 id="authorized-users-heading">Permissions</h2>
          </div>
          <AuthorizedUserManagement unitId={unitId} entries={memberships} manageableMembershipIds={manageableMembershipIds} />
        </section>
      ) : null}

      {canDelete ? (
        <section id="lifecycle" className="units-management-section is-danger" aria-labelledby="lifecycle-heading">
          <div className="units-section-title">
            <h2 id="lifecycle-heading">Danger Zone</h2>
          </div>
          <UnitLifecycle unitId={unit.id} unitName={unit.name} />
        </section>
      ) : null}
    </>
  );
}