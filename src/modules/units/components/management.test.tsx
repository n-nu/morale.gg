import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import type { PermissionGrant } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";

// Render management forms in Node without evaluating the server-only marker.
// Authorization is enforced and tested in the server workflows against PostgreSQL.
const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = { exports: {} } as NodeModule;

const load = () => import("./management");

function grant(overrides: Partial<PermissionGrant>): PermissionGrant {
  return {
    id: "grant",
    authorizedUserMembershipId: "m-staff",
    permission: "MANAGE_ROSTER",
    scope: "SELF",
    delegatedFromGrantId: null,
    createdByUserId: "owner",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    revokedAt: null,
    revokedByUserId: null,
    ...overrides,
  };
}

const commander = {
  id: "m-commander",
  userId: "owner",
  authorityLevel: 0,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  endedAt: null,
  user: { id: "owner", name: "Root Owner", email: "owner@example.test" },
  grants: [grant({ id: "g-owner", authorizedUserMembershipId: "m-commander", permission: "MANAGE_AUTHORIZED_USERS", scope: "SELF_AND_DESCENDANTS" })],
};
const staff = {
  id: "m-staff",
  userId: "staff",
  authorityLevel: 2,
  createdAt: new Date("2026-09-02T00:00:00Z"),
  endedAt: null,
  user: { id: "staff", name: "Staff User", email: "staff@example.test" },
  grants: [
    grant({ id: "g-roster", permission: "MANAGE_ROSTER", scope: "SELF_AND_CHILDREN" }),
    grant({ id: "g-structure", permission: "MANAGE_STRUCTURE", scope: null }),
    grant({ id: "g-old", permission: "MANAGE_EVENTS", scope: "SELF", revokedAt: new Date("2026-09-10T00:00:00Z") }),
  ],
};
const senior = {
  id: "m-senior",
  userId: "senior",
  authorityLevel: 1,
  createdAt: new Date("2026-09-03T00:00:00Z"),
  endedAt: null,
  user: { id: "senior", name: "Senior Officer", email: "senior@example.test" },
  grants: [grant({ id: "g-senior", authorizedUserMembershipId: "m-senior", permission: "MANAGE_UNIT" })],
};
const former = {
  id: "m-former",
  userId: "former",
  authorityLevel: 4,
  createdAt: new Date("2026-08-01T00:00:00Z"),
  endedAt: new Date("2026-09-05T00:00:00Z"),
  user: { id: "former", name: "Former Staff", email: "former@example.test" },
  grants: [grant({ id: "g-former", authorizedUserMembershipId: "m-former", revokedAt: new Date("2026-09-05T00:00:00Z") })],
};

function segment(html: string, start: string, end?: string) {
  const from = html.indexOf(start);
  assert.ok(from >= 0, `missing ${start}`);
  const to = end ? html.indexOf(end, from + start.length) : -1;
  return html.slice(from, to >= 0 ? to : undefined);
}

test("Rank Structure renders compact ordered rows with closed edit disclosures", async () => {
  const { RankStructure } = await load();
  const html = renderToStaticMarkup(<RankStructure rootUnitId="root" ranks={[
    { id: "r1", name: "Private", description: "Entry rank", sortOrder: 10 },
    { id: "r2", name: "Corporal", description: null, sortOrder: 20 },
  ]} />);

  assert.match(html, /Rank Structure/);
  assert.match(html, /<strong>Private<\/strong><span>Entry rank<\/span>/);
  assert.match(html, /<span class="units-catalog-position">2<\/span>/);
  assert.match(html, /<span class="sr-only">Order <\/span>20/);
  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.equal((html.match(/name="rankId" value="r1"/g) ?? []).length, 2, "edit and delete target r1");
  assert.match(html, /Delete Private/);
  assert.match(html, /name="sortOrder"[^>]*value="21"/, "add form suggests the next order value");
  assert.doesNotMatch(html, /abbreviation|rank image/i);
});

test("Rank Structure empty state keeps the add action", async () => {
  const { RankStructure } = await load();
  const html = renderToStaticMarkup(<RankStructure rootUnitId="root" ranks={[]} />);
  assert.match(html, /No Ranks defined yet/);
  assert.match(html, /Add Rank/);
  assert.match(html, /name="rootUnitId" value="root"/);
});

test("Medal catalog shows image previews, placeholders, compact actions, and empty state", async () => {
  const { MedalCatalog } = await load();
  const html = renderToStaticMarkup(<MedalCatalog rootUnitId="root" medals={[
    { id: "md1", name: "Valor", description: "For bravery", imageRef: "/medals/valor.png" },
    { id: "md2", name: "Service", description: null, imageRef: null },
  ]} />);

  assert.match(html, /src="\/medals\/valor.png"/);
  assert.match(html, /<span class="sr-only">No image<\/span>/);
  assert.match(html, /For bravery/);
  assert.equal((html.match(/name="medalId" value="md2"/g) ?? []).length, 2);
  assert.match(html, /Delete Valor/);
  assert.doesNotMatch(html, /<details[^>]*open/);

  const empty = renderToStaticMarkup(<MedalCatalog rootUnitId="root" medals={[]} />);
  assert.match(empty, /No Medals defined yet/);
  assert.match(empty, /Add Medal/);
});

test("Unit image controls preview, change, and remove an existing reference", async () => {
  const { UnitOverview } = await load();
  const unit = { id: "u1", name: "First Legion", description: null, imageRef: "https://cdn.example.test/flag.png", discordInvite: null, groupLink: null };
  const html = renderToStaticMarkup(<UnitOverview unit={unit} canEdit />);

  assert.match(html, /src="https:\/\/cdn.example.test\/flag.png"/);
  assert.match(html, /alt="First Legion flag or icon"/);
  assert.match(html, /Change image/);
  assert.match(html, /Remove image/);
  assert.match(html, /name="imageRef"[^>]*value="https:\/\/cdn.example.test\/flag.png"/);
  assert.match(html, /Files are not uploaded/);
  const profileForm = segment(html, "Edit profile");
  assert.doesNotMatch(profileForm, /name="imageRef"/, "profile save must not overwrite the image reference");
});

test("Unit image empty state offers only add, and read-only viewers get no controls", async () => {
  const { UnitOverview } = await load();
  const unit = { id: "u1", name: "First Legion", description: "About", imageRef: null, discordInvite: null, groupLink: null };
  const html = renderToStaticMarkup(<UnitOverview unit={unit} canEdit />);
  assert.match(html, /No image/);
  assert.match(html, /Add image/);
  assert.doesNotMatch(html, /Remove image/);

  const readOnly = renderToStaticMarkup(<UnitOverview unit={{ ...unit, imageRef: "/flag.png" }} canEdit={false} />);
  assert.match(readOnly, /src="\/flag.png"/);
  assert.doesNotMatch(readOnly, /<form|Change image|Remove image|Edit profile/);
  assert.match(readOnly, /require MANAGE_UNIT/);
});

test("Authorized Users rows summarize identity, authority, and active grant counts", async () => {
  const { AuthorizedUserManagement } = await load();
  const html = renderToStaticMarkup(<AuthorizedUserManagement unitId="u1" entries={[commander, staff, senior, former]} manageableMembershipIds={["m-staff"]} />);

  assert.match(html, /3 active authorized Users/);
  assert.match(html, /Staff User<\/strong><span>staff@example.test/);
  assert.match(html, /Commander · Level 0/);
  assert.match(html, />Level 2</);
  assert.match(html, /2 active permissions/, "revoked grants are not counted as active");
  assert.match(html, /1 active permission</);
  assert.match(html, /Add authorized User/);
  assert.match(html, /must already have signed in once/);
  assert.match(html, /Roster membership does not grant management access/);
});

test("ended memberships appear only in collapsed history without actions", async () => {
  const { AuthorizedUserManagement } = await load();
  const html = renderToStaticMarkup(<AuthorizedUserManagement unitId="u1" entries={[commander, former]} manageableMembershipIds={[]} />);
  const history = segment(html, "Ended access history (1)");
  assert.match(history, /Former Staff/);
  assert.match(history, /Ended 2026-09-05/);
  assert.doesNotMatch(history, /<form/);
  assert.doesNotMatch(segment(html, "Active authorized Users", "Ended access history"), /Former Staff/);
});

test("manageable members get grant, revoke, level, and confirmed end-access controls", async () => {
  const { AuthorizedUserManagement } = await load();
  const html = renderToStaticMarkup(<AuthorizedUserManagement unitId="u1" entries={[staff]} manageableMembershipIds={["m-staff"]} />);

  assert.match(html, /Manage access/);
  assert.match(html, /Manage roster<\/strong><code>MANAGE_ROSTER<\/code>/);
  assert.match(html, /This Unit and direct children/);
  assert.match(html, /Structural anchor at this Unit/);
  assert.match(html, /Revoked 2026-09-10/);
  assert.equal((html.match(/>Revoke</g) ?? []).length, 2, "only active grants are revocable");
  assert.match(html, /name="grantId" value="g-roster"/);
  assert.doesNotMatch(html, /name="grantId" value="g-old"/);
  assert.match(html, /End access for Staff User/);
  assert.match(html, /Membership and grant history are kept/);
  assert.match(html, /name="authorityLevel"[^>]*value="2"/);
});

test("permission forms expose only existing permissions and scopes", async () => {
  const { AuthorizedUserManagement } = await load();
  const html = renderToStaticMarkup(<AuthorizedUserManagement unitId="u1" entries={[staff]} manageableMembershipIds={["m-staff"]} />);
  const select = segment(html, 'name="permission"', "</select>");
  const options = [...select.matchAll(/value="([A-Z_]+)"/g)].map(([, value]) => value);
  assert.deepEqual(options, ["MANAGE_UNIT", "MANAGE_ROSTER", "REQUEST_EVENT_PARTICIPATION", "MANAGE_EVENTS", "SUBMIT_AUDITS", "MANAGE_AUTHORIZED_USERS"]);
  const scopes = [...segment(html, 'name="scope" required', "</select>").matchAll(/value="([A-Z_]+)"/g)].map(([, value]) => value);
  assert.deepEqual(scopes, ["SELF", "SELF_AND_CHILDREN", "SELF_AND_DESCENDANTS"]);
  assert.match(html, /name="permission" value="MANAGE_STRUCTURE"\/><input type="hidden" name="scope" value=""\/>/);
});

test("limited authority and Commander rows do not expose ordinary management actions", async () => {
  const { AuthorizedUserManagement } = await load();
  const html = renderToStaticMarkup(<AuthorizedUserManagement unitId="u1" entries={[commander, senior]} manageableMembershipIds={[]} />);

  assert.match(html, /View access/);
  assert.doesNotMatch(html, /Manage access|>Revoke<|End access for|name="permission"|Save level/);
  assert.match(html, /Protected/);
  assert.match(html, /level-0 Commander membership is protected/);
  assert.match(html, /read-only for you/);
});

test("Commander stays protected even when the actor can manage the membership", async () => {
  const { AuthorizedUserManagement } = await load();
  const html = renderToStaticMarkup(<AuthorizedUserManagement unitId="u1" entries={[commander]} manageableMembershipIds={["m-commander"]} />);
  assert.doesNotMatch(html, /End access for|Save level/);
  assert.match(html, /Protected/);
});

test("section navigation and lifecycle confirmation are explicit", async () => {
  const { ManagementSectionNav, UnitLifecycle } = await load();
  const nav = renderToStaticMarkup(<ManagementSectionNav sections={[{ id: "overview", label: "Overview" }, { id: "access", label: "Access" }]} />);
  assert.match(nav, /aria-label="Management sections"/);
  assert.match(nav, /href="#access"/);
  const lifecycle = renderToStaticMarkup(<UnitLifecycle unitId="u1" unitName="First Legion" />);
  assert.match(lifecycle, /<details class="units-confirm"><summary>Delete Unit<\/summary>/);
  assert.match(lifecycle, /Permanently delete First Legion/);
});
