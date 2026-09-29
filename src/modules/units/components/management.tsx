import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Permission, PermissionGrant, PermissionScope } from "@prisma/client";

import {
  addAuthorizedUserAction,
  createChildUnitAction,
  createMedalAction,
  createRankAction,
  deleteMedalAction,
  deleteRankAction,
  deleteUnitAction,
  endAuthorizedUserMembershipAction,
  grantPermissionAction,
  moveUnitAction,
  removeUnitImageAction,
  revokePermissionGrantAction,
  updateAuthorizedUserLevelAction,
  updateMedalAction,
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
  description: string | null;
  sortOrder: number;
};

type MedalEntry = {
  id: string;
  name: string;
  description: string | null;
  imageRef: string | null;
};

const fieldClass = "units-management-input";
const labelClass = "units-management-label";
const buttonClass = "units-management-button";

const permissionLabels: Record<Permission, string> = {
  MANAGE_UNIT: "Manage Unit",
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
  return (
    <nav aria-label="Management sections" className="units-management-nav">
      <ul>
        {sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>)}
      </ul>
    </nav>
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
          <div><dt>Name</dt><dd>{unit.name}</dd></div>
          <div><dt>Description</dt><dd>{unit.description || <span className="units-muted">No description</span>}</dd></div>
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
                <p className="units-management-help">Use a site path beginning with / or an HTTPS URL. Files are not uploaded.</p>
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
            <p className="units-management-help">
              The person must already have signed in once. Higher numbers are weaker authority; you can add only levels weaker than your own. Roster membership does not grant management access.
            </p>
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
            <p className="units-management-help">The level-0 Commander membership is protected. Replace the Commander through the separate Commander workflow.</p>
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
              <>
                {unit.children.slice(0, 8).map((child) => (
                  <Link key={child.id} href={`/units/${encodeURIComponent(child.id)}`}>{child.name}</Link>
                ))}
                {unit.children.length > 8 ? (
                  <Disclosure summary={`${unit.children.length - 8} more`}>
                    {unit.children.slice(8).map((child) => (
                      <Link key={child.id} href={`/units/${encodeURIComponent(child.id)}`}>{child.name}</Link>
                    ))}
                  </Disclosure>
                ) : null}
              </>
            ) : (
              <span>None</span>
            )}
          </dd>
        </div>
      </dl>

      <p className="units-management-help">
        Roster membership is managed on the <Link className="units-inline-link" href={`/units/${encodeURIComponent(unit.id)}`}>public Unit page</Link> and never grants management access.
        {rootSettingsHref ? <> Rank and Medal catalogs are managed in <Link className="units-inline-link" href={rootSettingsHref}>RootUnit organization settings</Link>.</> : null}
      </p>

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
        <p className="units-management-help">Only an unused leaf Unit can be deleted. Player, Event, membership, grant, and child-Unit history block deletion.</p>
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

export function OrganizationCatalogs({ rootUnitId, ranks, medals }: {
  rootUnitId: string;
  ranks: RankEntry[];
  medals: MedalEntry[];
}) {
  return (
    <div className="units-management-stack">
      <RankStructure rootUnitId={rootUnitId} ranks={ranks} />
      <MedalCatalog rootUnitId={rootUnitId} medals={medals} />
    </div>
  );
}

function displayName(entry: MembershipEntry) {
  return entry.user.name ?? entry.user.email ?? entry.userId;
}

export function RankStructure({ rootUnitId, ranks }: { rootUnitId: string; ranks: RankEntry[] }) {
  const nextOrder = ranks.length === 0 ? 1 : Math.max(...ranks.map((rank) => rank.sortOrder)) + 1;

  return (
    <section className="units-management-catalog" aria-label="Rank Structure">
      <div className="units-management-section-header">
        <h3>Rank Structure</h3>
        <details className="units-management-disclosure compact-disclosure">
          <summary>Add Rank</summary>
          <form action={createRankAction} className="units-management-form">
            <input type="hidden" name="rootUnitId" value={rootUnitId} />
            <div className="units-management-grid">
              <label className={labelClass}>
                Rank name
                <input className={fieldClass} name="name" maxLength={100} required />
              </label>
              <label className={labelClass}>
                Order
                <input className={fieldClass} name="sortOrder" type="number" min={-100000} max={100000} step={1} defaultValue={nextOrder} required />
              </label>
            </div>
            <label className={labelClass}>
              Description
              <textarea className={fieldClass} name="description" rows={2} maxLength={2000} />
            </label>
            <button className={buttonClass} type="submit">Add Rank</button>
          </form>
        </details>
      </div>

      {ranks.length === 0 ? (
        <p className="units-management-empty">No Ranks defined yet.</p>
      ) : (
        <div className="units-management-table">
          {ranks.map((rank, index) => (
            <div className="units-management-table-row" key={rank.id}>
              <span className="units-catalog-position">{index + 1}</span>
              <div className="units-management-row-main">
                <strong>{rank.name}</strong>
                {rank.description ? <span>{rank.description}</span> : null}
              </div>
              <div className="units-management-row-meta">
                <span className="sr-only">Order </span>{rank.sortOrder}
              </div>
              <div className="units-management-row-actions">
                <details className="units-management-disclosure compact-disclosure">
                  <summary>Edit</summary>
                  <form action={updateRankAction} className="units-management-form">
                    <input type="hidden" name="rootUnitId" value={rootUnitId} />
                    <input type="hidden" name="rankId" value={rank.id} />
                    <div className="units-management-grid">
                      <label className={labelClass}>
                        Rank name
                        <input className={fieldClass} name="name" maxLength={100} defaultValue={rank.name} required />
                      </label>
                      <label className={labelClass}>
                        Order
                        <input className={fieldClass} name="sortOrder" type="number" min={-100000} max={100000} step={1} defaultValue={rank.sortOrder} required />
                      </label>
                    </div>
                    <label className={labelClass}>
                      Description
                      <textarea className={fieldClass} name="description" rows={2} maxLength={2000} defaultValue={rank.description ?? ""} />
                    </label>
                    <button className={buttonClass} type="submit">Save</button>
                  </form>
                </details>
                <form action={deleteRankAction}>
                  <input type="hidden" name="rootUnitId" value={rootUnitId} />
                  <input type="hidden" name="rankId" value={rank.id} />
                  <button className="units-management-danger-button" type="submit">Delete {rank.name}</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MedalFields({ medal }: { medal?: MedalEntry }) {
  return (
    <>
      <label className={labelClass}>Medal name<input className={fieldClass} name="name" maxLength={100} defaultValue={medal?.name} required /></label>
      <label className={labelClass}>Description<textarea className={fieldClass} name="description" rows={2} maxLength={2000} defaultValue={medal?.description ?? ""} /></label>
      <label className={labelClass}>Image reference<input className={fieldClass} name="imageRef" maxLength={2048} placeholder="https://… or /images/…" defaultValue={medal?.imageRef ?? ""} /></label>
    </>
  );
}

export function MedalCatalog({ rootUnitId, medals }: { rootUnitId: string; medals: MedalEntry[] }) {
  return (
    <section className="units-management-catalog" aria-labelledby="medal-catalog-heading">
      <div className="units-catalog-heading">
        <h3 id="medal-catalog-heading">Medals <span className="units-muted">{medals.length}</span></h3>
        <Disclosure summary="Add Medal" className="units-add">
          <form action={createMedalAction} className="units-management-form">
            <input type="hidden" name="rootUnitId" value={rootUnitId} />
            <MedalFields />
            <button className={buttonClass} type="submit">Add Medal</button>
          </form>
        </Disclosure>
      </div>
      {medals.length ? (
        <div className="units-catalog">
          <div className="units-catalog-head is-medal" aria-hidden="true"><span>Image</span><span>Medal</span><span /></div>
          <ul className="units-catalog-list" aria-label="Medals">
            {medals.map((medal) => (
              <li key={medal.id}>
                <details className="units-disclosure units-catalog-row">
                  <summary className="is-medal">
                    <span className="units-catalog-thumb">
                      {medal.imageRef ? <Image src={medal.imageRef} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-contain" /> : <><span className="units-muted" aria-hidden="true">—</span><span className="sr-only">No image</span></>}
                    </span>
                    <span className="units-catalog-name">
                      <strong>{medal.name}</strong>
                      {medal.description ? <span>{medal.description}</span> : null}
                    </span>
                    <span className="units-access-action">Edit</span>
                  </summary>
                  <div className="units-disclosure-panel">
                    <form action={updateMedalAction} className="units-management-form">
                      <input type="hidden" name="rootUnitId" value={rootUnitId} />
                      <input type="hidden" name="medalId" value={medal.id} />
                      <MedalFields medal={medal} />
                      <button className={buttonClass} type="submit">Save Medal</button>
                    </form>
                    <ConfirmAction
                      label="Delete Medal"
                      confirmLabel={`Delete ${medal.name}`}
                      action={deleteMedalAction}
                      fields={{ rootUnitId, medalId: medal.id }}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="units-management-empty">No Medals defined yet.</p>}
    </section>
  );
}