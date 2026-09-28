import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/website-admin";
import {
  canCreateChildUnit,
  canDeleteUnit,
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
import { listRootMedals, listRootRanks } from "@/modules/units/server/catalogs";
import {
  AuthorizedUserManagement,
  ManagementNotice,
  ManagementSectionNav,
  OrganizationCatalogs,
  OrganizationManagement,
  UnitLifecycle,
  UnitOverview,
} from "@/modules/units/components/management";

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
  const [canEditProfile, canAdministerUsers, canCreateChild, canDelete, canManageOrganization] = await Promise.all([
    canManageUnit(userId, unitId),
    canManageAuthorizedUsers(userId, unitId),
    canCreateChildUnit(userId, unitId),
    canDeleteUnit(userId, unitId),
    rootUnitId !== null && unit.id === rootUnitId
      ? canManageRootSettings(userId, rootUnitId)
      : Promise.resolve(false),
  ]);
  const canManageRootFromChild = rootUnitId !== null && unit.id !== rootUnitId
    ? await canManageRootSettings(userId, rootUnitId)
    : false;
  if (!canEditProfile && !canAdministerUsers && !canCreateChild && !canDelete && !canManageOrganization && !canManageRootFromChild) {
    notFound();
  }

  const [memberships, moveDestinations, ranks, medals] = await Promise.all([
    canAdministerUsers ? listAuthorizedMembershipsForManagement(userId, unitId) : null,
    unit.parentId !== null ? listMoveDestinations(userId, unitId) : [],
    canManageOrganization && rootUnitId ? listRootRanks(rootUnitId) : [],
    canManageOrganization && rootUnitId ? listRootMedals(rootUnitId) : [],
  ]);
  const notice = queryValue(query.notice);
  const error = queryValue(query.error);
  // Row controls follow the existing server resolver; workflows re-check every mutation.
  const manageableMembershipIds = memberships
    ? (await Promise.all(memberships
      .filter((membership) => membership.endedAt === null)
      .map(async (membership) => (await canManageAuthorizedUser(userId, membership.id, unitId)) ? membership.id : null)))
      .filter((id): id is string => id !== null)
    : [];
  const showStructure = canManageOrganization && rootUnitId === unitId && unit.rootUnit !== null;
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "organization", label: "Organization" },
    ...(showStructure ? [{ id: "structure", label: "Structure" }] : []),
    ...(canAdministerUsers && memberships ? [{ id: "access", label: "Access" }] : []),
    ...(canDelete ? [{ id: "lifecycle", label: "Lifecycle" }] : []),
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
      <header className="units-management-header">
        <div>
          <p className="units-eyebrow">Unit administration</p>
          <h1>{unit.name}</h1>
          <p className="units-management-subtitle">
            {unit.parent ? `Within ${unit.parent.name}` : "Root organization"}
          </p>
        </div>
        <Link href={`/units/${encodeURIComponent(unitId)}`} className="units-management-link">
          Public Unit page
        </Link>
      </header>

      <ManagementSectionNav sections={sections} />
      <ManagementNotice notice={notice} error={error} />

      <section id="overview" className="units-management-section" aria-labelledby="unit-overview-heading">
        <div className="units-section-title">
          <h2 id="unit-overview-heading">Overview</h2>
          <span>{canEditProfile ? "MANAGE_UNIT" : "Read-only"}</span>
        </div>
        <UnitOverview unit={unit} canEdit={canEditProfile} />
      </section>

      <section id="organization" className="units-management-section" aria-labelledby="organization-heading">
        <div className="units-section-title">
          <h2 id="organization-heading">Organization</h2>
          <span>Operation-specific structure authority</span>
        </div>
        <OrganizationManagement
          unit={{ id: unit.id, name: unit.name, parent: unit.parent, children: unit.children }}
          canCreateChild={canCreateChild}
          moveDestinations={moveDestinations}
          rootSettingsHref={canManageRootFromChild && rootUnitId ? `/units/${encodeURIComponent(rootUnitId)}/manage#structure` : undefined}
        />
      </section>

      {showStructure && rootUnitId ? (
        <section id="structure" className="units-management-section" aria-labelledby="structure-heading">
          <div className="units-section-title">
            <h2 id="structure-heading">Structure</h2>
            <span>RootUnit owner</span>
          </div>
          <OrganizationCatalogs rootUnitId={rootUnitId} ranks={ranks} medals={medals} />
        </section>
      ) : null}

      {canAdministerUsers && memberships ? (
        <section id="access" className="units-management-section" aria-labelledby="authorized-users-heading">
          <div className="units-section-title">
            <h2 id="authorized-users-heading">Authorized Users</h2>
            <span>MANAGE_AUTHORIZED_USERS</span>
          </div>
          <AuthorizedUserManagement unitId={unitId} entries={memberships} manageableMembershipIds={manageableMembershipIds} />
        </section>
      ) : null}

      {canDelete ? (
        <section id="lifecycle" className="units-management-section is-danger" aria-labelledby="lifecycle-heading">
          <div className="units-section-title">
            <h2 id="lifecycle-heading">Lifecycle</h2>
            <span>Destructive actions</span>
          </div>
          <UnitLifecycle unitId={unit.id} unitName={unit.name} />
        </section>
      ) : null}
    </>
  );
}