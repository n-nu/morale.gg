import Image from "next/image";
import Link from "next/link";
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
  revokePermissionGrantAction,
  updateAuthorizedUserLevelAction,
  updateMedalAction,
  updateRankAction,
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
const permissions: Permission[] = [
  "MANAGE_UNIT",
  "MANAGE_STRUCTURE",
  "MANAGE_ROSTER",
  "REQUEST_EVENT_PARTICIPATION",
  "MANAGE_EVENTS",
  "SUBMIT_AUDITS",
  "MANAGE_AUTHORIZED_USERS",
];

function permissionName(permission: Permission) {
  return permission.replaceAll("_", " ").toLowerCase();
}

function scopeName(scope: PermissionScope | null) {
  if (scope === null) return "Structural anchor";
  return scope.replaceAll("_", " ").toLowerCase();
}

export function ManagementNotice({ notice, error }: { notice?: string; error?: string }) {
  if (error) return <p className="units-management-error" role="alert">{error}</p>;
  if (notice) return <p className="units-management-notice" role="status">{notice}</p>;
  return null;
}

export function UnitProfileForm({ unit }: { unit: {
  id: string;
  name: string;
  description: string | null;
  imageRef: string | null;
  discordInvite: string | null;
  groupLink: string | null;
} }) {
  return (
    <form action={updateUnitProfileAction} className="units-management-form">
      <input type="hidden" name="unitId" value={unit.id} />
      <label className={labelClass}>
        Unit name
        <input className={fieldClass} name="name" maxLength={100} required defaultValue={unit.name} />
      </label>
      <label className={labelClass}>
        Description
        <textarea className={fieldClass} name="description" rows={4} maxLength={2000} defaultValue={unit.description ?? ""} />
      </label>
      <label className={labelClass}>
        Flag or icon reference
        <input className={fieldClass} name="imageRef" maxLength={2048} placeholder="https://… or /images/…" defaultValue={unit.imageRef ?? ""} />
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
      <button className={buttonClass} type="submit">Save profile</button>
    </form>
  );
}

export function AuthorizedUserManagement({ unitId, entries }: {
  unitId: string;
  entries: MembershipEntry[];
}) {
  return (
    <div className="units-management-stack">
      <form action={addAuthorizedUserAction} className="units-management-form">
        <input type="hidden" name="unitId" value={unitId} />
        <div className="units-management-grid">
          <label className={labelClass}>
            Existing website account email
            <input className={fieldClass} name="email" type="email" maxLength={254} required autoComplete="email" />
          </label>
          <label className={labelClass}>
            Authority level
            <input className={fieldClass} name="authorityLevel" type="number" min={1} max={100000} step={1} defaultValue={1} required />
          </label>
        </div>
        <button className={buttonClass} type="submit">Add authorized User</button>
      </form>

      {entries.length === 0 ? <p className="units-management-empty">No authorized-user memberships are recorded for this Unit.</p> : (
        <ul className="units-management-list">
          {entries.map((entry) => {
            const isActive = entry.endedAt === null;
            const isCommander = entry.authorityLevel === 0;
            return (
              <li className="units-management-member" key={entry.id}>
                <div className="units-management-member-heading">
                  <div className="min-w-0">
                    <h3>{entry.user.name ?? entry.user.email ?? entry.userId}</h3>
                    <p>{entry.user.email ?? entry.userId}</p>
                  </div>
                  <span className={isActive ? "units-management-status" : "units-management-status is-ended"}>
                    {isActive ? (isCommander ? "Commander · level 0" : `Active · level ${entry.authorityLevel}`) : `Ended · level ${entry.authorityLevel}`}
                  </span>
                </div>

                {entry.grants.length > 0 ? (
                  <ul className="units-management-grants">
                    {entry.grants.map((grant) => (
                      <li key={grant.id}>
                        <span>{permissionName(grant.permission)} · {scopeName(grant.scope)}</span>
                        <span>{grant.revokedAt ? `Revoked ${grant.revokedAt.toISOString().slice(0, 10)}` : "Active"}</span>
                        {isActive && !grant.revokedAt ? (
                          <form action={revokePermissionGrantAction}>
                            <input type="hidden" name="unitId" value={unitId} />
                            <input type="hidden" name="membershipId" value={entry.id} />
                            <input type="hidden" name="grantId" value={grant.id} />
                            <button className="units-management-text-button" type="submit">Revoke</button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="units-management-empty">No permission grants.</p>}

                {isActive ? (
                  <div className="units-management-member-actions">
                    {!isCommander ? (
                      <>
                        <form action={updateAuthorizedUserLevelAction} className="units-management-inline-form">
                          <input type="hidden" name="unitId" value={unitId} />
                          <input type="hidden" name="membershipId" value={entry.id} />
                          <label className={labelClass}>
                            Change level
                            <input className={fieldClass} name="authorityLevel" type="number" min={1} max={100000} step={1} defaultValue={entry.authorityLevel} required />
                          </label>
                          <button className={buttonClass} type="submit">Save level</button>
                        </form>
                        <form action={endAuthorizedUserMembershipAction}>
                          <input type="hidden" name="unitId" value={unitId} />
                          <input type="hidden" name="membershipId" value={entry.id} />
                          <button className="units-management-danger-button" type="submit">End access</button>
                        </form>
                      </>
                    ) : <p className="units-management-empty">Commander membership is protected from ordinary removal and level changes.</p>}

                    <form action={grantPermissionAction} className="units-management-inline-form">
                      <input type="hidden" name="unitId" value={unitId} />
                      <input type="hidden" name="membershipId" value={entry.id} />
                      <label className={labelClass}>
                        Permission
                        <select className={fieldClass} name="permission" defaultValue="MANAGE_UNIT" required>
                          {permissions.map((permission) => <option key={permission} value={permission}>{permissionName(permission)}</option>)}
                        </select>
                      </label>
                      <label className={labelClass}>
                        Scope
                        <select className={fieldClass} name="scope" defaultValue="SELF">
                          <option value="SELF">self</option>
                          <option value="SELF_AND_CHILDREN">self and children</option>
                          <option value="SELF_AND_DESCENDANTS">self and descendants</option>
                          <option value="">structural anchor (MANAGE_STRUCTURE)</option>
                        </select>
                      </label>
                      <button className={buttonClass} type="submit">Grant permission</button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function StructuralManagement({ unit, canCreateChild, canDelete, moveDestinations }: {
  unit: { id: string; name: string; parent: { id: string; name: string } | null; children: { id: string; name: string }[] };
  canCreateChild: boolean;
  canDelete: boolean;
  moveDestinations: { id: string; name: string }[];
}) {
  return (
    <div className="units-management-stack">
      <div className="units-management-structure">
        <div>
          <p className="units-management-kicker">Parent</p>
          {unit.parent ? <Link href={`/units/${encodeURIComponent(unit.parent.id)}`}>{unit.parent.name}</Link> : <span>RootUnit</span>}
        </div>
        <div>
          <p className="units-management-kicker">Direct children</p>
          {unit.children.length ? (
            <ul>{unit.children.map((child) => <li key={child.id}><Link href={`/units/${encodeURIComponent(child.id)}`}>{child.name}</Link></li>)}</ul>
          ) : <span>None</span>}
        </div>
      </div>

      {canCreateChild ? (
        <form action={createChildUnitAction} className="units-management-form">
          <input type="hidden" name="unitId" value={unit.id} />
          <h3>Create child Unit</h3>
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
      ) : null}

      {unit.parent && moveDestinations.length > 0 ? (
        <form action={moveUnitAction} className="units-management-form">
          <input type="hidden" name="unitId" value={unit.id} />
          <h3>Move this Unit</h3>
          <label className={labelClass}>
            New parent
            <select className={fieldClass} name="destinationParentId" defaultValue={moveDestinations[0].id} required>
              {moveDestinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
            </select>
          </label>
          <button className={buttonClass} type="submit">Move Unit</button>
        </form>
      ) : null}

      {canDelete ? (
        <form action={deleteUnitAction} className="units-management-form">
          <input type="hidden" name="unitId" value={unit.id} />
          <h3>Delete Unit</h3>
          <p className="units-management-help">Permanent deletion is available only for an unused leaf Unit. Player, Event, membership, grant, and child-Unit history will block deletion.</p>
          <button className="units-management-danger-button" type="submit">Delete unused Unit</button>
        </form>
      ) : null}
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
      <section className="units-management-catalog" aria-labelledby="rank-catalog-heading">
        <h3 id="rank-catalog-heading">Rank structure</h3>
        <form action={createRankAction} className="units-management-form">
          <input type="hidden" name="rootUnitId" value={rootUnitId} />
          <div className="units-management-grid">
            <label className={labelClass}>Rank name<input className={fieldClass} name="name" maxLength={100} required /></label>
            <label className={labelClass}>Order<input className={fieldClass} name="sortOrder" type="number" min={-100000} max={100000} step={1} defaultValue={0} required /></label>
          </div>
          <label className={labelClass}>Description<textarea className={fieldClass} name="description" rows={2} maxLength={2000} /></label>
          <button className={buttonClass} type="submit">Add Rank</button>
        </form>
        {ranks.length ? <ul className="units-management-list">{ranks.map((rank) => (
          <li className="units-management-catalog-item" key={rank.id}>
            <form action={updateRankAction} className="units-management-form">
              <input type="hidden" name="rootUnitId" value={rootUnitId} />
              <input type="hidden" name="rankId" value={rank.id} />
              <div className="units-management-grid">
                <label className={labelClass}>Name<input className={fieldClass} name="name" maxLength={100} defaultValue={rank.name} required /></label>
                <label className={labelClass}>Order<input className={fieldClass} name="sortOrder" type="number" min={-100000} max={100000} step={1} defaultValue={rank.sortOrder} required /></label>
              </div>
              <label className={labelClass}>Description<textarea className={fieldClass} name="description" rows={2} maxLength={2000} defaultValue={rank.description ?? ""} /></label>
              <button className={buttonClass} type="submit">Save Rank</button>
            </form>
            <form action={deleteRankAction}>
              <input type="hidden" name="rootUnitId" value={rootUnitId} />
              <input type="hidden" name="rankId" value={rank.id} />
              <button className="units-management-danger-button" type="submit">Delete</button>
            </form>
          </li>
        ))}</ul> : <p className="units-management-empty">No Rank definitions yet.</p>}
      </section>

      <section className="units-management-catalog" aria-labelledby="medal-catalog-heading">
        <h3 id="medal-catalog-heading">Medal management</h3>
        <form action={createMedalAction} className="units-management-form">
          <input type="hidden" name="rootUnitId" value={rootUnitId} />
          <label className={labelClass}>Medal name<input className={fieldClass} name="name" maxLength={100} required /></label>
          <label className={labelClass}>Description<textarea className={fieldClass} name="description" rows={2} maxLength={2000} /></label>
          <label className={labelClass}>Image reference<input className={fieldClass} name="imageRef" maxLength={2048} placeholder="https://… or /images/…" /></label>
          <button className={buttonClass} type="submit">Add Medal</button>
        </form>
        {medals.length ? <ul className="units-management-list">{medals.map((medal) => (
          <li className="units-management-catalog-item" key={medal.id}>
            <form action={updateMedalAction} className="units-management-form">
              <input type="hidden" name="rootUnitId" value={rootUnitId} />
              <input type="hidden" name="medalId" value={medal.id} />
              {medal.imageRef ? <Image src={medal.imageRef} alt="" width={48} height={48} unoptimized className="h-12 w-12 object-contain" /> : null}
              <label className={labelClass}>Name<input className={fieldClass} name="name" maxLength={100} defaultValue={medal.name} required /></label>
              <label className={labelClass}>Description<textarea className={fieldClass} name="description" rows={2} maxLength={2000} defaultValue={medal.description ?? ""} /></label>
              <label className={labelClass}>Image reference<input className={fieldClass} name="imageRef" maxLength={2048} defaultValue={medal.imageRef ?? ""} /></label>
              <button className={buttonClass} type="submit">Save Medal</button>
            </form>
            <form action={deleteMedalAction}>
              <input type="hidden" name="rootUnitId" value={rootUnitId} />
              <input type="hidden" name="medalId" value={medal.id} />
              <button className="units-management-danger-button" type="submit">Delete</button>
            </form>
          </li>
        ))}</ul> : <p className="units-management-empty">No Medal definitions yet.</p>}
      </section>
    </div>
  );
}