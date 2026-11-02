import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AwardCategory, Permission, PermissionGrant, PermissionScope } from "@prisma/client";

import {
  createAwardAction,
  addAuthorizedUserAction,
  createChildUnitAction,
  createRankAction,
  deleteAwardAction,
  deleteRankAction,
  deleteUnitAction,
  endAuthorizedUserMembershipAction,
  grantPermissionAction,
  moveUnitAction,
  removeUnitImageAction,
  revokePermissionGrantAction,
  updateAuthorizedUserLevelAction,
  updateAwardAction,
  updateRankAction,
  updateUnitImageAction,
  updateUnitProfileAction,
} from "../server/actions";

type MembershipEntry = {
  id: string;
  userId: string;
  authorityLevel: number;
  createdAt: Date;
  endedAt: Date | null;
  user: { id: string; name: string | null; email: string | null };
  grants: PermissionGrant[];
};

type RankEntry = {
  id: string;
  name: string;
  abbreviation: string | null;
  imageRef: string | null;
  description: string | null;
  sortOrder: number;
};

type AwardEntry = {
  id: string;
  category: AwardCategory;
  name: string;
  description: string | null;
  imageRef: string | null;
  sortOrder: number;
  quantityAwarded: number;
};

type ManagementHeaderUnit = {
  id: string;
  name: string;
  imageRef: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
  commander: { name: string | null; image: string | null } | null;
  memberCount: number;
};

const fieldClass = "units-management-input";
const labelClass = "units-management-label";
const buttonClass = "units-management-button";

const permissionLabels: Record<Permission, string> = {
  MANAGE_UNIT: "Manage Unit",
  MANAGE_AWARDS: "Manage Awards",
  MANAGE_STRUCTURE: "Manage structure",
  MANAGE_ROSTER: "Manage roster",
  REQUEST_EVENT_PARTICIPATION: "Request Event participation",
  MANAGE_EVENTS: "Manage Events",
  SUBMIT_AUDITS: "Submit audits",
  MANAGE_AUTHORIZED_USERS: "Manage authorized users",
};
const ordinaryPermissions = (Object.keys(permissionLabels) as Permission[])
  .filter((permission) => permission !== "MANAGE_STRUCTURE");
const scopeLabels: Record<PermissionScope, string> = {
  SELF: "This Unit",
  SELF_AND_CHILDREN: "This Unit and direct children",
  SELF_AND_DESCENDANTS: "This Unit and all descendants",
};

function day(date: Date) {
  return date.toISOString().slice(0, 10);
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function Disclosure({ summary, className, open, children }: {
  summary: ReactNode;
  className?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={className ? `units-disclosure ${className}` : "units-disclosure"} open={open}>
      <summary>{summary}</summary>
      <div className="units-disclosure-panel">{children}</div>
    </details>
  );
}

function ConfirmAction({ label, confirmLabel, action, fields, help }: {
  label: string;
  confirmLabel: string;
  action: (data: FormData) => Promise<void>;
  fields: Record<string, string>;
  help?: string;
}) {
  return (
    <details className="units-confirm">
      <summary>{label}</summary>
      <form action={action} className="units-confirm-panel">
        {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        {help ? <p>{help}</p> : null}
        <button className="units-management-danger-button" type="submit">{confirmLabel}</button>
      </form>
    </details>
  );
}

export function ManagementNotice({ notice, error }: { notice?: string; error?: string }) {
  if (error) return <p className="units-management-error" role="alert">{error}</p>;
  if (notice) return <p className="units-management-notice" role="status">{notice}</p>;
  return null;
}

export function ManagementSectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const icons: Record<string, ReactNode> = {
    overview: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></>,
    organization: <><circle cx="12" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M12 7v5M6 17v-3h12v3" /></>,
    structure: <><path d="M4 5h16v5H4zM4 14h7v5H4zM15 14h5v5h-5z" /><path d="M12 10v2M7.5 12h10" /></>,
    access: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1zM17 8h4M19 6v4" /></>,
    lifecycle: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  };

  return (
    <nav aria-label="Management sections" className="units-management-nav">
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icons[section.id] ?? icons.overview}
              </svg>
              <span>{section.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function UnitManagementHeader({ unit }: { unit: ManagementHeaderUnit }) {
  const commanderName = unit.commander?.name?.trim() || (unit.commander ? "Name unavailable" : "Unassigned");

  return (
    <header className="units-management-header">
      <div className="units-management-heading">
        <div className="units-management-emblem" aria-hidden="true">
          {unit.imageRef ? (
            <Image src={unit.imageRef} alt="" width={64} height={64} unoptimized />
          ) : (
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M24 4 41 10v12c0 11-7 18-17 22C14 40 7 33 7 22V10L24 4Z" />
              <path d="M24 12v23M15 20h18" />
            </svg>
          )}
        </div>
        <div className="units-management-identity">
          <p className="units-eyebrow">Unit management</p>
          <h1>{unit.name}</h1>
          <p className="units-management-subtitle">
            {unit.parent ? <>Under <Link href={`/units/${encodeURIComponent(unit.parent.id)}`}>{unit.parent.name}</Link></> : "Root Unit"}
          </p>
        </div>
      </div>

      <dl className="units-management-summary" aria-label="Unit summary">
        <div>
          <dt>Commander</dt>
          <dd className="units-management-commander">
            {unit.commander?.image ? <Image src={unit.commander.image} alt="" width={24} height={24} unoptimized /> : null}
            <span>{commanderName}</span>
          </dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{unit.memberCount}</dd>
        </div>
        <div>
          <dt>Subunits</dt>
          <dd>{unit.children.length}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{unit.parent ? "Subunit" : "Root"}</dd>
        </div>
      </dl>

      <nav className="units-management-header-actions" aria-label="Unit shortcuts">
        <Link href={`/units/${encodeURIComponent(unit.id)}#roster-heading`} className="units-management-link">
          Manage roster
        </Link>
        <Link href={`/units/${encodeURIComponent(unit.id)}`} className="units-management-secondary-link">
          Public Unit page
        </Link>
      </nav>
    </header>
  );
}

type OverviewUnit = {
  id: string;
  name: string;
  description: string | null;
  imageRef: string | null;
  discordInvite: string | null;
  groupLink: string | null;
};

export function UnitOverview({ unit, canEdit }: { unit: OverviewUnit; canEdit: boolean }) {
  return (
    <div className="units-overview">
      <div className="units-overview-identity">
        <figure className="units-image-preview">
          {unit.imageRef ? (
            <Image src={unit.imageRef} alt={`${unit.name} flag or icon`} width={96} height={64} unoptimized className="max-h-16 max-w-24 object-contain" />
          ) : (
            <span className="units-image-empty">No image</span>
          )}
        </figure>
        <dl className="units-overview-facts">
          <div><dt>About</dt><dd>{unit.description || <span className="units-muted">No description</span>}</dd></div>
          <div>
            <dt>Links</dt>
            <dd>
              {unit.discordInvite || unit.groupLink ? (
                <span className="units-overview-links">
                  {unit.discordInvite ? <a href={unit.discordInvite} target="_blank" rel="noreferrer">Discord</a> : null}
                  {unit.groupLink ? <a href={unit.groupLink} target="_blank" rel="noreferrer">External group</a> : null}
                </span>
              ) : <span className="units-muted">None</span>}
            </dd>
          </div>
        </dl>
      </div>

      {canEdit ? (
        <div className="units-overview-actions">
          <div className="units-image-controls">
            <Disclosure summary={unit.imageRef ? "Change image" : "Add image"}>
              <form action={updateUnitImageAction} className="units-management-form">
                <input type="hidden" name="unitId" value={unit.id} />
                <label className={labelClass}>
                  Image reference
                  <input className={fieldClass} name="imageRef" maxLength={2048} required placeholder="https://… or /images/…" defaultValue={unit.imageRef ?? ""} />
                </label>
                <p className="units-management-help">HTTPS URL or site path. Files are not uploaded.</p>
                <button className={buttonClass} type="submit">Save image</button>
              </form>
            </Disclosure>
            {unit.imageRef ? (
              <form action={removeUnitImageAction}>
                <input type="hidden" name="unitId" value={unit.id} />
                <button className="units-management-text-button" type="submit">Remove image</button>
              </form>
            ) : null}
          </div>

          <Disclosure summary="Edit profile">
            <form action={updateUnitProfileAction} className="units-management-form">
              <input type="hidden" name="unitId" value={unit.id} />
              <label className={labelClass}>
                Unit name
                <input className={fieldClass} name="name" maxLength={100} required defaultValue={unit.name} />
              </label>
              <label className={labelClass}>
                Description
                <textarea className={fieldClass} name="description" rows={3} maxLength={2000} defaultValue={unit.description ?? ""} />
              </label>
              <div className="units-management-grid">
                <label className={labelClass}>
                  Discord invite
                  <input className={fieldClass} name="discordInvite" maxLength={500} placeholder="https://discord.gg/…" defaultValue={unit.discordInvite ?? ""} />
                </label>
                <label className={labelClass}>
                  External group link
                  <input className={fieldClass} name="groupLink" maxLength={2048} placeholder="https://…" defaultValue={unit.groupLink ?? ""} />
                </label>
              </div>
              <div className="units-management-row-actions">
                <button className={buttonClass} type="submit">Save profile</button>
              </div>
            </form>
          </Disclosure>
        </div>
      ) : (
        <p className="units-management-help">Profile and image changes require MANAGE_UNIT for this Unit.</p>
      )}
    </div>
  );
}

export function AuthorizedUserManagement({ unitId, entries, manageableMembershipIds }: {
  unitId: string;
  entries: MembershipEntry[];
  manageableMembershipIds: readonly string[];
}) {
  const manageable = new Set(manageableMembershipIds);
  const active = entries.filter((entry) => entry.endedAt === null);
  const ended = entries.filter((entry) => entry.endedAt !== null);

  return (
    <div className="units-management-stack">
      <div className="units-access-toolbar">
        <p>{plural(active.length, "active authorized User")}</p>
        <Disclosure summary="Add authorized User" className="units-add">
          <form action={addAuthorizedUserAction} className="units-management-form">
            <input type="hidden" name="unitId" value={unitId} />
            <div className="units-management-grid">
              <label className={labelClass}>
                Website account email
                <input className={fieldClass} name="email" type="email" maxLength={254} required autoComplete="off" />
              </label>
              <label className={labelClass}>
                Authority level
                <input className={fieldClass} name="authorityLevel" type="number" min={1} max={100000} step={1} defaultValue={1} required />
              </label>
            </div>
            <p className="units-management-help">The account must sign in once first. Higher levels have less authority; roster membership does not grant management access.</p>
            <button className={buttonClass} type="submit">Add authorized User</button>
          </form>
        </Disclosure>
      </div>

      {active.length === 0 ? (
        <p className="units-management-empty">No active authorized Users for this Unit.</p>
      ) : (
        <div className="units-access">
          <div className="units-access-head" aria-hidden="true">
            <span>User</span><span>Authority</span><span>Grants</span><span>Access</span><span>End access</span>
          </div>
          <ul className="units-access-list" aria-label="Active authorized Users">
            {active.map((entry) => (
              <AuthorizedUserRow key={entry.id} unitId={unitId} entry={entry} canManage={manageable.has(entry.id)} />
            ))}
          </ul>
        </div>
      )}

      {ended.length > 0 ? (
        <Disclosure summary={`Ended access history (${ended.length})`} className="units-access-history">
          <ul className="units-history-list" aria-label="Ended authorized-user memberships">
            {ended.map((entry) => (
              <li key={entry.id}>
                <span className="units-access-user">
                  <strong>{displayName(entry)}</strong>
                  <span>{entry.user.email ?? entry.userId}</span>
                </span>
                <span>Level {entry.authorityLevel}</span>
                <span>{plural(entry.grants.length, "grant")} recorded</span>
                <span className="units-management-status is-ended">Ended {day(entry.endedAt!)}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}

function AuthorizedUserRow({ unitId, entry, canManage }: {
  unitId: string;
  entry: MembershipEntry;
  canManage: boolean;
}) {
  const isCommander = entry.authorityLevel === 0;
  const activeGrants = entry.grants.filter((grant) => grant.revokedAt === null);
  const name = displayName(entry);
  const target = { unitId, membershipId: entry.id };

  return (
    <li className="units-access-row">
      <details className="units-disclosure units-access-detail">
        <summary>
          <span className="units-access-user">
            <strong>{name}</strong>
            <span>{entry.user.email ?? entry.userId}</span>
          </span>
          <span className="units-access-authority">{isCommander ? "Commander · Level 0" : `Level ${entry.authorityLevel}`}</span>
          <span className="units-access-grants">{plural(activeGrants.length, "active permission")}</span>
          <span className="units-access-action">{canManage ? "Manage access" : "View access"}</span>
        </summary>
        <div className="units-disclosure-panel">
          <GrantList grants={entry.grants} canRevoke={canManage} target={target} />
          {canManage ? <GrantForms target={target} /> : null}
          {isCommander ? (
            <p className="units-management-help">The level-0 Commander membership is protected from these access controls.</p>
          ) : canManage ? (
            <form action={updateAuthorizedUserLevelAction} className="units-management-inline-form">
              <input type="hidden" name="unitId" value={unitId} />
              <input type="hidden" name="membershipId" value={entry.id} />
              <label className={labelClass}>
                Authority level
                <input className={fieldClass} name="authorityLevel" type="number" min={1} max={100000} step={1} defaultValue={entry.authorityLevel} required />
              </label>
              <button className={buttonClass} type="submit">Save level</button>
            </form>
          ) : (
            <p className="units-management-help">Your authority does not cover this membership&apos;s level, so it is read-only for you.</p>
          )}
        </div>
      </details>
      <div className="units-access-end">
        {isCommander ? (
          <span className="units-muted">Protected</span>
        ) : canManage ? (
          <ConfirmAction
            label="End access"
            confirmLabel={`End access for ${name}`}
            action={endAuthorizedUserMembershipAction}
            fields={target}
            help="Active grants are revoked. Membership and grant history are kept."
          />
        ) : (
          <span className="units-muted">—</span>
        )}
      </div>
    </li>
  );
}

function GrantList({ grants, canRevoke, target }: {
  grants: PermissionGrant[];
  canRevoke: boolean;
  target: { unitId: string; membershipId: string };
}) {
  if (grants.length === 0) return <p className="units-management-empty">No permission grants.</p>;

  return (
    <ul className="units-grant-list" aria-label="Permission grants">
      {grants.map((grant) => (
        <li key={grant.id} data-revoked={grant.revokedAt ? "" : undefined}>
          <span className="units-grant-permission">
            <strong>{permissionLabels[grant.permission]}</strong>
            <code>{grant.permission}</code>
          </span>
          <span className="units-grant-scope">{grant.scope === null ? "Structural anchor at this Unit" : scopeLabels[grant.scope]}</span>
          <span className={grant.revokedAt ? "units-management-status is-ended" : "units-management-status"}>
            {grant.revokedAt ? `Revoked ${day(grant.revokedAt)}` : "Active"}
          </span>
          {canRevoke && !grant.revokedAt ? (
            <form action={revokePermissionGrantAction}>
              <input type="hidden" name="unitId" value={target.unitId} />
              <input type="hidden" name="membershipId" value={target.membershipId} />
              <input type="hidden" name="grantId" value={grant.id} />
              <button className="units-management-text-button" type="submit" aria-label={`Revoke ${permissionLabels[grant.permission]}, ${grant.scope === null ? "Structural anchor at this Unit" : scopeLabels[grant.scope]}`}>Revoke</button>
            </form>
          ) : <span />}
        </li>
      ))}
    </ul>
  );
}

function GrantForms({ target }: { target: { unitId: string; membershipId: string } }) {
  return (
    <div className="units-grant-forms">
      <form action={grantPermissionAction} className="units-management-inline-form">
        <input type="hidden" name="unitId" value={target.unitId} />
        <input type="hidden" name="membershipId" value={target.membershipId} />
        <label className={labelClass}>
          Permission
          <select className={fieldClass} name="permission" defaultValue="MANAGE_UNIT" required>
            {ordinaryPermissions.map((permission) => (
              <option key={permission} value={permission}>{permissionLabels[permission]}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Scope
          <select className={fieldClass} name="scope" defaultValue="SELF" required>
            {(Object.keys(scopeLabels) as PermissionScope[]).map((scope) => (
              <option key={scope} value={scope}>{scopeLabels[scope]}</option>
            ))}
          </select>
        </label>
        <button className={buttonClass} type="submit">Grant</button>
      </form>

      <form action={grantPermissionAction} className="units-grant-structure">
        <input type="hidden" name="unitId" value={target.unitId} />
        <input type="hidden" name="membershipId" value={target.membershipId} />
        <input type="hidden" name="permission" value="MANAGE_STRUCTURE" />
        <input type="hidden" name="scope" value="" />
        <span>Manage structure uses a structural anchor at this Unit instead of a scope.</span>
        <button className="units-management-text-button is-neutral" type="submit">Grant Manage structure</button>
      </form>

      <p className="units-management-help">You can delegate only a permission you hold with a broader scope; the server rejects anything outside your authority.</p>
    </div>
  );
}

export function OrganizationManagement({ unit, canCreateChild, moveDestinations, rootSettingsHref }: {
  unit: { id: string; name: string; parent: { id: string; name: string } | null; children: { id: string; name: string }[] };
  canCreateChild: boolean;
  moveDestinations: { id: string; name: string }[];
  rootSettingsHref?: string;
}) {
  return (
    <div className="units-management-stack">
      <dl className="units-management-structure">
        <div>
          <dt className="units-management-kicker">Parent</dt>
          <dd>{unit.parent ? <Link href={`/units/${encodeURIComponent(unit.parent.id)}`}>{unit.parent.name}</Link> : <span>RootUnit</span>}</dd>
        </div>
        <div>
          <dt className="units-management-kicker">Direct children ({unit.children.length})</dt>
          <dd>
            {unit.children.length ? (
              <div className="units-child-links">
                {unit.children.slice(0, 8).map((child) => (
                  <Link key={child.id} href={`/units/${encodeURIComponent(child.id)}`}>{child.name}</Link>
                ))}
                {unit.children.length > 8 ? (
                  <Disclosure summary={`${unit.children.length - 8} more`}>
                    <div className="units-child-links">
                      {unit.children.slice(8).map((child) => (
                        <Link key={child.id} href={`/units/${encodeURIComponent(child.id)}`}>{child.name}</Link>
                      ))}
                    </div>
                  </Disclosure>
                ) : null}
              </div>
            ) : (
              <span>None</span>
            )}
          </dd>
        </div>
      </dl>

      {rootSettingsHref ? (
        <p className="units-management-shortcut">
          <Link href={rootSettingsHref}>Manage root catalogs</Link>
        </p>
      ) : null}

      {canCreateChild || (unit.parent && moveDestinations.length > 0) ? (
        <div className="units-disclosure-group">
          {canCreateChild ? (
            <Disclosure summary="Create child Unit">
              <form action={createChildUnitAction} className="units-management-form">
                <input type="hidden" name="unitId" value={unit.id} />
                <div className="units-management-grid">
                  <label className={labelClass}>
                    Unit name
                    <input className={fieldClass} name="name" maxLength={100} required />
                  </label>
                  <label className={labelClass}>
                    Initial Commander email
                    <input className={fieldClass} name="commanderEmail" type="email" maxLength={254} required />
                  </label>
                </div>
                <p className="units-management-help">The child and its Commander&apos;s level-0 membership are created together. No permissions are added automatically.</p>
                <button className={buttonClass} type="submit">Create child</button>
              </form>
            </Disclosure>
          ) : null}

          {unit.parent && moveDestinations.length > 0 ? (
            <Disclosure summary="Move this Unit">
              <form action={moveUnitAction} className="units-management-inline-form">
                <input type="hidden" name="unitId" value={unit.id} />
                <label className={labelClass}>
                  New parent
                  <select className={fieldClass} name="destinationParentId" defaultValue={moveDestinations[0].id} required>
                    {moveDestinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>{destination.name}</option>
                    ))}
                  </select>
                </label>
                <button className={buttonClass} type="submit">Move Unit</button>
              </form>
            </Disclosure>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function UnitLifecycle({ unitId, unitName }: { unitId: string; unitName: string }) {
  return (
    <div className="units-danger-row">
      <div>
        <h3>Delete Unit</h3>
        <p className="units-management-help">Only unused leaf Units can be deleted; linked player, event, membership, grant, or child history blocks deletion.</p>
      </div>
      <details className="units-confirm">
        <summary>Delete Unit</summary>
        <form action={deleteUnitAction} className="units-confirm-panel">
          <input type="hidden" name="unitId" value={unitId} />
          <p>This cannot be undone.</p>
          <button className="units-management-danger-button" type="submit">Permanently delete {unitName}</button>
        </form>
      </details>
    </div>
  );
}

export function OrganizationCatalogs({ rootUnitId, ranks, playerAwards, unitAwards, canManageRanks }: {
  rootUnitId: string;
  ranks: RankEntry[];
  playerAwards: AwardEntry[];
  unitAwards: AwardEntry[];
  canManageRanks: boolean;
}) {
  return (
    <div className="units-management-stack">
      {canManageRanks ? <RankStructure rootUnitId={rootUnitId} ranks={ranks} /> : null}
      <AwardCatalog rootUnitId={rootUnitId} category="PLAYER" awards={playerAwards} />
      <AwardCatalog rootUnitId={rootUnitId} category="UNIT" awards={unitAwards} />
    </div>
  );
}

function displayName(entry: MembershipEntry) {
  return entry.user.name ?? entry.user.email ?? entry.userId;
}

function RankFields({ rank, nextOrder }: { rank?: RankEntry; nextOrder?: number }) {
  return (
    <>
      <div className="units-rank-fields">
        <label className={labelClass}>
          Order
          <input className={fieldClass} name="sortOrder" type="number" min={-100000} max={100000} step={1} defaultValue={rank?.sortOrder ?? nextOrder} required />
        </label>
        <label className={labelClass}>
          Rank (short code)
          <input className={fieldClass} name="abbreviation" maxLength={20} placeholder="PVT" defaultValue={rank?.abbreviation ?? ""} />
        </label>
        <label className={labelClass}>
          Rank name
          <input className={fieldClass} name="name" maxLength={100} placeholder="Private" defaultValue={rank?.name ?? ""} required />
        </label>
      </div>
      <label className={labelClass}>
        Image reference
        <input className={fieldClass} name="imageRef" maxLength={2048} placeholder="https://... or /images/..." defaultValue={rank?.imageRef ?? ""} />
      </label>
      <p className="units-management-help">Optional image: HTTPS URL or site path. Files are not uploaded.</p>
      <label className={labelClass}>
        Description
        <textarea className={fieldClass} name="description" rows={2} maxLength={2000} defaultValue={rank?.description ?? ""} />
      </label>
    </>
  );
}

export function RankStructure({ rootUnitId, ranks }: { rootUnitId: string; ranks: RankEntry[] }) {
  const nextOrder = ranks.length === 0 ? 1 : Math.max(...ranks.map((rank) => rank.sortOrder)) + 1;

  return (
    <section className="units-management-catalog" aria-label="Rank Structure">
      <div className="units-catalog-heading">
        <h3>Rank Structure</h3>
        <Disclosure summary="Add Rank" className="units-add">
          <form action={createRankAction} className="units-management-form">
            <input type="hidden" name="rootUnitId" value={rootUnitId} />
            <RankFields nextOrder={nextOrder} />
            <button className={buttonClass} type="submit">Add Rank</button>
          </form>
        </Disclosure>
      </div>

      {ranks.length === 0 ? (
        <p className="units-management-empty">No Ranks defined yet.</p>
      ) : (
        <div className="units-ranks">
          <div className="units-rank-columns units-rank-head" aria-hidden="true">
            <span>Order</span><span>Image</span><span>Rank</span><span>Rank name</span><span />
          </div>
          <ul className="units-catalog-list" aria-label="Ranks">
            {ranks.map((rank) => (
              <li key={rank.id}>
                <details className="units-disclosure units-rank-row">
                  <summary className="units-rank-columns">
                    <span className="units-catalog-position"><span className="sr-only">Order </span>{rank.sortOrder}</span>
                    <span className="units-catalog-thumb">
                      {rank.imageRef ? (
                        <Image src={rank.imageRef} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" />
                      ) : (
                        <><span className="units-muted" aria-hidden="true">—</span><span className="sr-only">No image</span></>
                      )}
                    </span>
                    <span className="units-rank-code"><span className="sr-only">Rank </span>{rank.abbreviation || "—"}</span>
                    <strong className="units-rank-name">{rank.name}</strong>
                    <span className="units-rank-action">Edit<span className="sr-only"> {rank.name}</span></span>
                  </summary>
                  <div className="units-disclosure-panel">
                    <form action={updateRankAction} className="units-management-form">
                      <input type="hidden" name="rootUnitId" value={rootUnitId} />
                      <input type="hidden" name="rankId" value={rank.id} />
                      <RankFields rank={rank} />
                      <button className={buttonClass} type="submit">Save</button>
                    </form>
                    <form action={deleteRankAction}>
                      <input type="hidden" name="rootUnitId" value={rootUnitId} />
                      <input type="hidden" name="rankId" value={rank.id} />
                      <button className="units-management-text-button" type="submit">Delete {rank.name}</button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function AwardFields({ award, category, nextOrder }: {
  award?: AwardEntry;
  category: AwardCategory;
  nextOrder?: number;
}) {
  return (
    <>
      <input type="hidden" name="category" value={category} />
      <div className="units-award-fields">
        <label className={labelClass}>
          Order
          <input className={fieldClass} name="sortOrder" type="number" min={-100000} max={100000} step={1} defaultValue={award?.sortOrder ?? nextOrder} required />
        </label>
        <label className={labelClass}>
          Award name
          <input className={fieldClass} name="name" maxLength={100} defaultValue={award?.name ?? ""} required />
        </label>
      </div>
      <label className={labelClass}>
        Image reference
        <input className={fieldClass} name="imageRef" maxLength={2048} placeholder="https://... or /images/..." defaultValue={award?.imageRef ?? ""} />
      </label>
      <p className="units-management-help">Optional image: HTTPS URL or site path. Files are not uploaded.</p>
      <label className={labelClass}>
        Description
        <textarea className={fieldClass} name="description" rows={2} maxLength={2000} defaultValue={award?.description ?? ""} />
      </label>
    </>
  );
}

export function AwardCatalog({ rootUnitId, category, awards }: {
  rootUnitId: string;
  category: AwardCategory;
  awards: AwardEntry[];
}) {
  const title = category === "PLAYER" ? "Player Awards" : "Unit Awards";
  const nextOrder = awards.length === 0 ? 1 : Math.max(...awards.map((award) => award.sortOrder)) + 1;
  return (
    <section className="units-management-catalog" aria-label={title}>
      <div className="units-catalog-heading">
        <h3>{title} <span className="units-muted">{awards.length}</span></h3>
        <Disclosure summary={`Add ${category === "PLAYER" ? "Player" : "Unit"} Award`} className="units-add">
          <form action={createAwardAction} className="units-management-form">
            <input type="hidden" name="rootUnitId" value={rootUnitId} />
            <AwardFields category={category} nextOrder={nextOrder} />
            <button className={buttonClass} type="submit">Add Award</button>
          </form>
        </Disclosure>
      </div>
      {awards.length ? (
        <div className="units-awards">
          <div className="units-award-columns units-award-head" aria-hidden="true">
            <span>Order</span><span>Image</span><span>Quantity Awarded</span><span>Award Name</span><span />
          </div>
          <ul className="units-catalog-list" aria-label={title}>
            {awards.map((award) => (
              <li key={award.id}>
                <details className="units-disclosure units-award-row">
                  <summary className="units-award-columns">
                    <span className="units-catalog-position"><span className="sr-only">Order </span>{award.sortOrder}</span>
                    <span className="units-catalog-thumb">
                      {award.imageRef ? <Image src={award.imageRef} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" /> : <><span className="units-muted" aria-hidden="true">—</span><span className="sr-only">No image</span></>}
                    </span>
                    <span className="units-award-quantity"><span className="sr-only">Quantity awarded </span>{award.quantityAwarded}</span>
                    <span className="units-award-name">
                      <strong>{award.name}</strong>
                      {award.description ? <span>{award.description}</span> : null}
                    </span>
                    <span className="units-rank-action">Edit<span className="sr-only"> {award.name}</span></span>
                  </summary>
                  <div className="units-disclosure-panel">
                    <form action={updateAwardAction} className="units-management-form">
                      <input type="hidden" name="rootUnitId" value={rootUnitId} />
                      <input type="hidden" name="awardId" value={award.id} />
                      <AwardFields award={award} category={category} />
                      <button className={buttonClass} type="submit">Save Award</button>
                    </form>
                    <ConfirmAction
                      label="Delete Award"
                      confirmLabel={`Delete ${award.name}`}
                      action={deleteAwardAction}
                      fields={{ rootUnitId, awardId: award.id }}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="units-management-empty">No {title} defined yet.</p>}
    </section>
  );
}