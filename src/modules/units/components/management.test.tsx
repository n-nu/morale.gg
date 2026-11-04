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

test("Rank Structure shows saved order, image, short rank and name with full-width editors", async () => {
  const { RankStructure } = await load();
  const html = renderToStaticMarkup(<RankStructure rootUnitId="root" ranks={[
    { id: "r1", name: "Private", abbreviation: "PVT", imageRef: "/ranks/private.png", description: "Entry rank", sortOrder: 10 },
    { id: "r2", name: "Corporal", abbreviation: null, imageRef: null, description: null, sortOrder: 20 },
  ]} />);

  assert.match(html, /Rank Structure/);
  assert.match(html, /<span>Order<\/span><span>Image<\/span><span>Rank<\/span><span>Rank name<\/span>/);
  assert.match(html, /src="\/ranks\/private.png"/);
  assert.match(html, /<span class="sr-only">Rank <\/span>PVT/);
  assert.match(html, /<strong[^>]*>Private<\/strong>/);
  assert.match(html, />Entry rank<\/textarea>/, "description remains editable, not in the compact row");
  assert.match(html, /<span class="sr-only">Order <\/span>20/);
  assert.match(html, /No image/);
  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.equal((html.match(/name="rankId" value="r1"/g) ?? []).length, 2, "edit and delete target r1");
  assert.match(html, /Delete Private/);
  assert.match(html, /name="sortOrder"[^>]*value="21"/, "add form suggests the next order value");
  assert.match(html, /name="abbreviation"[^>]*value="PVT"/);
  assert.match(html, /name="imageRef"[^>]*value="\/ranks\/private.png"/);
  assert.match(html, /<\/summary><div class="units-disclosure-panel"><form/);
  assert.doesNotMatch(html, /units-management-row-actions/);
});

test("Rank Structure empty state keeps the add action", async () => {
  const { RankStructure } = await load();
  const html = renderToStaticMarkup(<RankStructure rootUnitId="root" ranks={[]} />);
  assert.match(html, /No Ranks defined yet/);
  assert.match(html, /Add Rank/);
  assert.match(html, /name="rootUnitId" value="root"/);
});

test("Award catalog separates categories and shows order, image, quantity, name, and description", async () => {
  const { AwardCatalog } = await load();
  const html = renderToStaticMarkup(<AwardCatalog rootUnitId="root" category="PLAYER" awards={[
    { id: "aw1", category: "PLAYER", name: "Valor", description: "For bravery", imageRef: "/medals/valor.png", sortOrder: 5, quantityAwarded: 3 },
    { id: "aw2", category: "PLAYER", name: "Service", description: null, imageRef: null, sortOrder: 10, quantityAwarded: 0 },
  ]} />);

  assert.match(html, /Player Awards/);
  assert.match(html, /<span>Order<\/span><span>Image<\/span><span>Quantity Awarded<\/span><span>Award Name<\/span>/);
  assert.match(html, /src="\/medals\/valor.png"/);
  assert.match(html, /<span class="sr-only">No image<\/span>/);
  assert.match(html, /For bravery/);
  assert.match(html, /<span class="sr-only">Quantity awarded <\/span>0/);
  assert.equal((html.match(/name="awardId" value="aw2"/g) ?? []).length, 2);
  assert.match(html, /name="category" value="PLAYER"/);
  assert.match(html, /Delete Valor/);
  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.match(html, /name="sortOrder"[^>]*value="11"/);

  const empty = renderToStaticMarkup(<AwardCatalog rootUnitId="root" category="UNIT" awards={[]} />);
  assert.match(empty, /No Unit Awards defined yet/);
  assert.match(empty, /Add Unit Award/);
});

test("public Award sections render empty states, accessible descriptions, and scoped actions", async () => {
  const { PlayerAwardsSection, UnitAwardManagement, UnitAwardsSection } = await import("./awards");
  const assigned = {
    id: "award-player",
    rootUnitId: "root",
    name: "Valor",
    description: "For bravery",
    imageRef: "/awards/valor.png",
    sortOrder: 1,
  };
  const available = {
    id: "award-available",
    rootUnitId: "root",
    name: "Service",
    description: null,
    imageRef: null,
    sortOrder: 2,
  };

  const emptyUnit = renderToStaticMarkup(<UnitAwardsSection awards={[]} />);
  assert.match(emptyUnit, /Unit Awards/);
  assert.match(emptyUnit, /This Unit has no Awards yet/);

  const emptyPlayer = renderToStaticMarkup(<PlayerAwardsSection
    playerId="player-stable-id"
    awards={[]}
    available={[]}
    manageableAwardIds={[]}
  />);
  assert.match(emptyPlayer, /No Awards have been granted to this Player/);
  assert.doesNotMatch(emptyPlayer, /Grant a Player Award/);

  const playerHtml = renderToStaticMarkup(<PlayerAwardsSection
    playerId="player-stable-id"
    awards={[assigned]}
    available={[available]}
    manageableAwardIds={[assigned.id]}
    notice="Award granted."
    error="A later action failed."
  />);
  assert.match(playerHtml, /Player Awards/);
  assert.match(playerHtml, /role="status"/);
  assert.match(playerHtml, /role="alert"/);
  assert.match(playerHtml, /aria-label="Player medals"/);
  assert.match(playerHtml, /aria-label="Valor medal details"/);
  assert.match(playerHtml, /aria-expanded="false"/);
  assert.match(playerHtml, /aria-hidden="true"/);
  assert.match(playerHtml, /src="\/awards\/valor.png"/);
  assert.match(playerHtml, /class="player-award-medal__depth/);
  assert.equal((playerHtml.match(/player-award-medal__depth player-award-medal__depth--/g) ?? []).length, 4);
  assert.match(playerHtml, /class="player-award-medal__face/);
  assert.match(playerHtml, /data-dimensional="false"/);
  assert.match(playerHtml, /data-hovered="false"/);
  assert.match(playerHtml, /data-focused="false"/);
  assert.match(playerHtml, /h-14 w-10 shrink-0/);
  assert.match(playerHtml, /data-\[open=true\]:scale-200/);
  assert.match(playerHtml, /absolute left-1\/2 top-18/);
  assert.doesNotMatch(playerHtml, /bg-surface shadow-lg/);
  assert.match(playerHtml, /transition-transform duration-500 ease-in-out/);
  assert.match(playerHtml, /transition-all duration-500 ease-in-out/);
  assert.match(playerHtml, /<section class="mt-4" aria-labelledby="player-awards-heading"/);
  assert.match(playerHtml, /bg-transparent/);
  assert.doesNotMatch(playerHtml, /rounded-full border border-edge-strong/);
  assert.match(playerHtml, /For bravery/);
  assert.match(playerHtml, /Remove Award/);
  assert.match(playerHtml, /Grant a Player Award/);
  assert.match(playerHtml, /name="playerId" value="player-stable-id"/);
  assert.match(playerHtml, /value="award-available"/);

  const missingImageHtml = renderToStaticMarkup(<PlayerAwardsSection
    playerId="player-stable-id"
    awards={[{ ...assigned, imageRef: null }]}
    available={[]}
    manageableAwardIds={[]}
  />);
  assert.match(missingImageHtml, /aria-label="Valor medal details"/);
  assert.match(missingImageHtml, /border border-edge bg-surface-2/);

  const orphanedPlayerHtml = renderToStaticMarkup(<PlayerAwardsSection
    playerId="former-player"
    awards={[assigned]}
    available={[]}
    manageableAwardIds={[assigned.id]}
  />);
  assert.match(orphanedPlayerHtml, /Remove Award/);
  assert.match(orphanedPlayerHtml, /No additional Player Awards are available to grant/);

  const unitManagementHtml = renderToStaticMarkup(<UnitAwardManagement
    unitId="unit-target"
    assigned={[assigned]}
    available={[available]}
  />);
  assert.match(unitManagementHtml, /Remove/);
  assert.match(unitManagementHtml, /Grant Award/);
  assert.match(unitManagementHtml, /name="unitId" value="unit-target"/);
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

test("Unit management header summarizes identity and links to existing roster controls", async () => {
  const { UnitManagementHeader } = await load();
  const html = renderToStaticMarkup(<UnitManagementHeader unit={{
    id: "unit one",
    name: "First Legion",
    imageRef: "/units/first-legion.png",
    parent: { id: "root", name: "Army" },
    children: [{ id: "child-1", name: "Grenadiers" }, { id: "child-2", name: "Voltigeurs" }],
    commander: null,
    memberCount: 42,
  }} />);

  assert.match(html, /<h1>First Legion<\/h1>/);
  assert.match(html, /Under <a href="\/units\/root">Army<\/a>/);
  assert.match(html, /Commander<\/dt><dd[^>]*><span>Unassigned/);
  assert.match(html, /Members<\/dt><dd>42/);
  assert.match(html, /Subunits<\/dt><dd>2/);
  assert.match(html, /href="\/units\/unit%20one#roster-heading">Manage roster/);
  assert.match(html, /href="\/units\/unit%20one">Public Unit page/);
});

test("Unit management header shows the current commander name", async () => {
  const { UnitManagementHeader } = await load();
  const html = renderToStaticMarkup(<UnitManagementHeader unit={{
    id: "u1",
    name: "First Legion",
    imageRef: null,
    parent: null,
    children: [],
    commander: { name: "John Smith", image: "/players/commander.png" },
    memberCount: 0,
  }} />);

  assert.match(html, /Commander<\/dt><dd[^>]*>.*<span>John Smith/);
  assert.match(html, /src="\/players\/commander.png"/);
  assert.match(html, /class="units-management-emblem" aria-hidden="true"/);
  assert.match(html, /Root Unit/);
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
  assert.match(html, /account must sign in once first/);
  assert.match(html, /roster membership does not grant management access/);
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
  assert.deepEqual(options, ["MANAGE_UNIT", "MANAGE_AWARDS", "MANAGE_ROSTER", "REQUEST_EVENT_PARTICIPATION", "MANAGE_EVENTS", "SUBMIT_AUDITS", "MANAGE_AUTHORIZED_USERS"]);
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
  assert.match(html, /level-0 Commander membership is protected from these access controls/);
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
  const nav = renderToStaticMarkup(<ManagementSectionNav sections={[{ id: "overview", label: "Profile" }, { id: "access", label: "Permissions" }, { id: "lifecycle", label: "Danger Zone" }]} />);
  assert.match(nav, /aria-label="Management sections"/);
  assert.match(nav, /href="#access"/);
  assert.match(nav, /<span>Danger Zone<\/span>/);
  assert.match(nav, /aria-hidden="true"/);
  const lifecycle = renderToStaticMarkup(<UnitLifecycle unitId="u1" unitName="First Legion" />);
  assert.match(lifecycle, /<details class="units-confirm"><summary>Delete Unit<\/summary>/);
  assert.match(lifecycle, /Permanently delete First Legion/);
});

test("organization rows link to hierarchy and keep child creation controls", async () => {
  const { OrganizationManagement } = await load();
  const html = renderToStaticMarkup(<OrganizationManagement
    unit={{
      id: "root",
      name: "Army",
      parent: null,
      children: [{ id: "child", name: "First Legion" }],
    }}
    canCreateChild
    moveDestinations={[]}
  />);

  assert.match(html, /RootUnit/);
  assert.match(html, /Direct children \(1\)/);
  assert.match(html, /href="\/units\/child">First Legion/);
  assert.match(html, /Create child Unit/);
  assert.match(html, /name="commanderEmail"/);
  assert.match(html, /No permissions are added automatically/);
});
