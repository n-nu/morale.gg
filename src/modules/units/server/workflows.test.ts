import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  createRootAward,
  deleteRootAward,
  getPlayerAwardManagementData,
  grantPlayerAward,
  grantUnitAward,
  listRootAwards,
  removePlayerAward,
  removeUnitAward,
  updateRootAward,
} from "./awards";
import { canManageRootSettings } from "./authorization";
import {
  createRootRank,
  deleteRootRank,
  listRootRanks,
  updateRootRank,
} from "./catalogs";
import { unitWorkflows } from "./workflows";

test("Unit management workflows preserve authority and hierarchy invariants", async (t) => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL is required; persistence verification must not silently skip");

  const schema = `units_test_${randomUUID().replaceAll("-", "")}`;
  const client = new Client({ connectionString });
  await client.connect();
  let db: PrismaClient | null = null;

  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const migrationsUrl = new URL("../../../../prisma/migrations/", import.meta.url);
    const migrations = (await readdir(migrationsUrl, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const initialSql = await readFile(new URL(`${migrations[0]}/migration.sql`, migrationsUrl), "utf8");
    await client.query(initialSql);
    await client.query(
      'INSERT INTO "Unit" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      ["root-a", "Root A"],
    );
    await client.query(
      'INSERT INTO "User" ("id", "name", "email") VALUES ($1, $2, $3)',
      ["owner", "Root Owner", "owner@example.test"],
    );

    for (const migration of migrations.slice(1)) {
      if (migration === "20260920150000_authority_commander_contract") {
        await client.query(
          'INSERT INTO "AuthorizedUserMembership" ("id", "userId", "unitId", "authorityLevel", "createdByUserId", "createdAt", "updatedAt") VALUES ($1, $2, $3, 0, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          ["root-a-owner-membership", "owner", "root-a"],
        );
        await client.query('UPDATE "Unit" SET "commanderUserId" = $1 WHERE "id" = $2', ["owner", "root-a"]);
      }
      if (migration === "20261102213000_awards") {
        await client.query(
          'INSERT INTO "MedalDefinition" ("id", "rootUnitId", "name", "description", "imageRef", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ($6, $2, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          ["legacy-medal-z", "root-a", "Z Service Medal", "Legacy description", "/medals/z.png", "legacy-medal-a", "A Service Cross", "Earlier alphabetical Medal", null],
        );
      }
      const sql = await readFile(new URL(`${migration}/migration.sql`, migrationsUrl), "utf8");
      await client.query(sql);
    }
    await client.query(`ALTER FUNCTION "${schema}"."validate_commander_membership_consistency"() SET search_path TO "${schema}", public`);
    await client.query(`ALTER FUNCTION "${schema}"."validate_commander_membership_consistency_for_unit"(TEXT) SET search_path TO "${schema}", public`);
    await client.query(`ALTER FUNCTION "${schema}"."validate_unit_root_consistency"() SET search_path TO "${schema}", public`);

    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
    const migratedAwards = await db.awardDefinition.findMany({
      where: { id: { in: ["legacy-medal-a", "legacy-medal-z"] } },
      orderBy: [{ sortOrder: "asc" }],
    });
    assert.deepEqual(
      migratedAwards.map(({ id, category, rootUnitId, name, description, imageRef, sortOrder }) => ({
        id,
        category,
        rootUnitId,
        name,
        description,
        imageRef,
        sortOrder,
      })),
      [
        {
          id: "legacy-medal-a",
          category: "PLAYER",
          rootUnitId: "root-a",
          name: "A Service Cross",
          description: "Earlier alphabetical Medal",
          imageRef: null,
          sortOrder: 0,
        },
        {
          id: "legacy-medal-z",
          category: "PLAYER",
          rootUnitId: "root-a",
          name: "Z Service Medal",
          description: "Legacy description",
          imageRef: "/medals/z.png",
          sortOrder: 1,
        },
      ],
    );
    await db.user.createMany({
      data: [
        { id: "commander-a", name: "Commander A", email: "commander-a@example.test" },
        { id: "commander-b", name: "Commander B", email: "commander-b@example.test" },
        { id: "staff", name: "Staff User", email: "staff@example.test" },
        { id: "other", name: "Other User", email: "other@example.test" },
      ],
    });

    await db.$transaction(async (tx) => {
      const membership = await tx.authorizedUserMembership.findFirstOrThrow({
        where: { userId: "owner", unitId: "root-a", endedAt: null },
        select: { id: true },
      });
      await tx.permissionGrant.createMany({
        data: [
          { authorizedUserMembershipId: membership.id, permission: "MANAGE_UNIT", scope: "SELF", createdByUserId: "owner" },
          { authorizedUserMembershipId: membership.id, permission: "MANAGE_AWARDS", scope: "SELF_AND_DESCENDANTS", createdByUserId: "owner" },
          { authorizedUserMembershipId: membership.id, permission: "MANAGE_AUTHORIZED_USERS", scope: "SELF_AND_DESCENDANTS", createdByUserId: "owner" },
          { authorizedUserMembershipId: membership.id, permission: "MANAGE_STRUCTURE", scope: null, createdByUserId: "owner" },
          { authorizedUserMembershipId: membership.id, permission: "MANAGE_ROSTER", scope: "SELF_AND_DESCENDANTS", createdByUserId: "owner" },
        ],
      });
    }, { isolationLevel: "Serializable" });

    const workflow = unitWorkflows({ db, getUserId: async () => "owner" });
    const catalogDependencies = { db, getUserId: async () => "owner" };
    const catalogs = {
      createRootRank: (input: Parameters<typeof createRootRank>[0]) => createRootRank(input, catalogDependencies),
      updateRootRank: (input: Parameters<typeof updateRootRank>[0]) => updateRootRank(input, catalogDependencies),
      deleteRootRank: (rootUnitId: string, rankId: string) => deleteRootRank(rootUnitId, rankId, catalogDependencies),
      listRootRanks: (rootUnitId: string) => listRootRanks(rootUnitId, catalogDependencies),
    };
    const awards = {
      create: (input: Parameters<typeof createRootAward>[0]) => createRootAward(input, catalogDependencies),
      update: (input: Parameters<typeof updateRootAward>[0]) => updateRootAward(input, catalogDependencies),
      delete: (rootUnitId: string, awardId: string) => deleteRootAward(rootUnitId, awardId, catalogDependencies),
      list: (rootUnitId: string, category: "PLAYER" | "UNIT") => listRootAwards(rootUnitId, category, catalogDependencies),
    };
    const createDeleteCandidate = (name: string) => workflow.createChildUnit({
      parentUnitId: "root-a",
      name,
      commanderEmail: "commander-a@example.test",
    });

    assert.equal(
      (await db.unit.findUnique({ where: { id: "root-a" }, select: { commanderUserId: true } }))?.commanderUserId,
      "owner",
    );

    await t.test("profile fields use MANAGE_UNIT and persist as public Unit data", async () => {
      const updated = await workflow.updateUnitProfile({
        unitId: "root-a",
        name: " Root A Updated ",
        description: "Community description",
        imageRef: "/flags/root-a.png",
        discordInvite: "https://discord.gg/root-a",
        groupLink: "https://example.test/group",
      });
      assert.equal(updated.name, "Root A Updated");
      assert.equal(updated.description, "Community description");
      assert.equal(updated.imageRef, "/flags/root-a.png");
      assert.equal(updated.discordInvite, "https://discord.gg/root-a");
      assert.equal(updated.groupLink, "https://example.test/group");
    });

    await t.test("Unit image is set, changed, validated, and removed through MANAGE_UNIT", async () => {
      const changed = await workflow.updateUnitImage({ unitId: "root-a", imageRef: "https://cdn.example.test/root-a.png" });
      assert.equal(changed.imageRef, "https://cdn.example.test/root-a.png");

      for (const imageRef of ["http://example.test/a.png", "//example.test/a.png", "/flags/../secret.png", "javascript:alert(1)"]) {
        await assert.rejects(workflow.updateUnitImage({ unitId: "root-a", imageRef }), /Image reference/);
      }
      assert.equal((await db!.unit.findUnique({ where: { id: "root-a" }, select: { imageRef: true } }))?.imageRef, "https://cdn.example.test/root-a.png");

      const profileOnly = await workflow.updateUnitProfile({
        unitId: "root-a",
        name: "Root A Updated",
        description: "Community description",
        discordInvite: "https://discord.gg/root-a",
        groupLink: "https://example.test/group",
      });
      assert.equal(profileOnly.imageRef, "https://cdn.example.test/root-a.png");

      const removed = await workflow.updateUnitImage({ unitId: "root-a", imageRef: "" });
      assert.equal(removed.imageRef, null);
      await workflow.updateUnitImage({ unitId: "root-a", imageRef: "/flags/root-a.png" });

      const unauthorizedWorkflow = unitWorkflows({ db: db!, getUserId: async () => "other" });
      await assert.rejects(
        unauthorizedWorkflow.updateUnitImage({ unitId: "root-a", imageRef: "" }),
        /permission to manage this Unit image/,
      );
      assert.equal((await db!.unit.findUnique({ where: { id: "root-a" }, select: { imageRef: true } }))?.imageRef, "/flags/root-a.png");
    });

    await t.test("roster membership alone grants no Unit management authority", async () => {
      const player = await db!.player.create({ data: { playerId: `roster-${randomUUID()}`, name: "Other User" } });
      await db!.unitMembership.create({ data: { playerId: player.id, unitId: "root-a", startedAt: new Date() } });
      const rosterOnly = unitWorkflows({ db: db!, getUserId: async () => "other" });
      await assert.rejects(rosterOnly.updateUnitImage({ unitId: "root-a", imageRef: "" }), /permission/);
      await assert.rejects(
        rosterOnly.addAuthorizedUser({ unitId: "root-a", email: "commander-b@example.test", authorityLevel: "9" }),
        /do not have authority/,
      );
      await db!.unitMembership.deleteMany({ where: { playerId: player.id } });
      await db!.player.delete({ where: { id: player.id } });
    });

    await t.test("unauthorized User cannot update a profile or create a child", async () => {
      const unauthorizedWorkflow = unitWorkflows({ db: db!, getUserId: async () => "other" });
      await assert.rejects(
        unauthorizedWorkflow.updateUnitProfile({
          unitId: "root-a",
          name: "Forged",
          description: "",
          imageRef: "",
          discordInvite: "",
          groupLink: "",
        }),
        /permission/,
      );
      await assert.rejects(
        unauthorizedWorkflow.createChildUnit({
          parentUnitId: "root-a",
          name: "Unauthorized Child",
          commanderEmail: "commander-a@example.test",
        }),
        /not authorized/,
      );
      assert.equal(await db!.unit.count({ where: { name: "Unauthorized Child" } }), 0);
    });

    let membershipId = "";
    await t.test("add an authorized User at a subordinate level", async () => {
      const added = await workflow.addAuthorizedUser({
        unitId: "root-a",
        email: "staff@example.test",
        authorityLevel: "3",
      });
      membershipId = added.id;
      assert.equal(added.authorityLevel, 3);
      assert.equal((await db!.unit.findUnique({ where: { id: "root-a" }, select: { commanderUserId: true } }))?.commanderUserId, "owner");
    });

    await t.test("add rejects missing accounts, duplicates, and invalid levels without new rows", async () => {
      const before = await db!.authorizedUserMembership.count({ where: { unitId: "root-a" } });
      await assert.rejects(
        workflow.addAuthorizedUser({ unitId: "root-a", email: "missing@example.test", authorityLevel: "3" }),
        /No website account uses that email/,
      );
      await assert.rejects(
        workflow.addAuthorizedUser({ unitId: "root-a", email: "staff@example.test", authorityLevel: "5" }),
        /already authorized/,
      );
      await assert.rejects(
        workflow.addAuthorizedUser({ unitId: "root-a", email: "other@example.test", authorityLevel: "0" }),
        /Authority level must be/,
      );
      await assert.rejects(
        workflow.grantPermission({ unitId: "root-a", membershipId, permission: "MANAGE_STRUCTURE", scope: "SELF" }),
        /Structural permission does not use an ordinary scope/,
      );
      await assert.rejects(
        workflow.grantPermission({ unitId: "root-a", membershipId, permission: "MANAGE_UNIT", scope: "" }),
        /valid permission scope/,
      );
      assert.equal(await db!.authorizedUserMembership.count({ where: { unitId: "root-a" } }), before);
    });

    await t.test("change an authorized User's level without changing the Commander", async () => {
      const changed = await workflow.updateAuthorizedUserLevel({
        unitId: "root-a",
        membershipId,
        authorityLevel: "4",
      });
      assert.equal(changed.authorityLevel, 4);
      assert.equal((await db!.unit.findUnique({ where: { id: "root-a" }, select: { commanderUserId: true } }))?.commanderUserId, "owner");
    });

    let activeGrantId = "";
    await t.test("create and revoke a narrower grant while retaining lineage", async () => {
      const grant = await workflow.grantPermission({
        unitId: "root-a",
        membershipId,
        permission: "MANAGE_ROSTER",
        scope: "SELF",
      });
      assert.ok(grant.delegatedFromGrantId);

      await assert.rejects(
        workflow.grantPermission({
          unitId: "root-a",
          membershipId,
          permission: "MANAGE_ROSTER",
          scope: "SELF_AND_DESCENDANTS",
        }),
        /cannot delegate/,
      );

      const revoked = await workflow.revokePermissionGrant({
        unitId: "root-a",
        membershipId,
        grantId: grant.id,
      });
      assert.ok(revoked.revokedAt);
      const storedGrant = await db!.permissionGrant.findUnique({ where: { id: grant.id } });
      assert.ok(storedGrant?.revokedAt);
      assert.equal(storedGrant?.delegatedFromGrantId, grant.delegatedFromGrantId);

      const activeGrant = await workflow.grantPermission({
        unitId: "root-a",
        membershipId,
        permission: "MANAGE_ROSTER",
        scope: "SELF_AND_CHILDREN",
      });
      activeGrantId = activeGrant.id;
    });

    await t.test("end a membership, revoke its active grants, and re-add a new period", async () => {
      const ended = await workflow.endAuthorizedUserMembership({ unitId: "root-a", membershipId });
      assert.ok(ended.endedAt);
      const [storedMembership, endedGrant] = await Promise.all([
        db!.authorizedUserMembership.findUnique({ where: { id: membershipId } }),
        db!.permissionGrant.findUnique({ where: { id: activeGrantId } }),
      ]);
      assert.ok(storedMembership?.endedAt);
      assert.ok(endedGrant?.revokedAt);

      const readded = await workflow.addAuthorizedUser({
        unitId: "root-a",
        email: "staff@example.test",
        authorityLevel: "3",
      });
      assert.notEqual(readded.id, membershipId);
      assert.equal(await db!.authorizedUserMembership.count({ where: { userId: "staff", unitId: "root-a", endedAt: null } }), 1);
      await assert.rejects(
        workflow.endAuthorizedUserMembership({ unitId: "root-a", membershipId: (await db!.authorizedUserMembership.findFirst({ where: { unitId: "root-a", userId: "owner", endedAt: null } }))!.id }),
        /current Commander/,
      );
    });

    let childAId = "";
    let childBId = "";
    await t.test("child creation is atomic and moves preserve RootUnit and prevent cycles", async () => {
      const childA = await workflow.createChildUnit({
        parentUnitId: "root-a",
        name: "Child A",
        commanderEmail: "commander-a@example.test",
      });
      const childB = await workflow.createChildUnit({
        parentUnitId: "root-a",
        name: "Child B",
        commanderEmail: "commander-b@example.test",
      });
      childAId = childA.id;
      childBId = childB.id;
      const initialCommander = await db!.authorizedUserMembership.findFirst({
        where: { unitId: childAId, authorityLevel: 0, endedAt: null },
      });
      assert.equal(initialCommander?.userId, "commander-a");
      assert.equal(await db!.permissionGrant.count({ where: { authorizedUserMembershipId: initialCommander!.id } }), 0);

      const directGrant = await workflow.grantPermission({
        unitId: childAId,
        membershipId: initialCommander!.id,
        permission: "MANAGE_ROSTER",
        scope: "SELF",
      });

      await workflow.moveUnit({ unitId: childAId, destinationParentId: childBId });
      const moved = await db!.unit.findUnique({ where: { id: childAId } });
      assert.equal(moved?.parentId, childBId);
      assert.equal(moved?.rootUnitId, "root-a");
      assert.equal((await db!.authorizedUserMembership.findUnique({ where: { id: initialCommander!.id } }))?.unitId, childAId);
      assert.equal((await db!.permissionGrant.findUnique({ where: { id: directGrant.id } }))?.authorizedUserMembershipId, initialCommander!.id);
      await assert.rejects(
        workflow.moveUnit({ unitId: childBId, destinationParentId: childAId }),
        /beneath itself|not authorized/,
      );
      await assert.rejects(
        workflow.endAuthorizedUserMembership({ unitId: childAId, membershipId: initialCommander!.id }),
        /current Commander/,
      );
    });

    await t.test("RootUnit owner manages Rank and Award definitions without losing migrated Medals", async () => {
      assert.equal(await canManageRootSettings("owner", "root-a", db!), true);
      assert.equal(await canManageRootSettings("commander-a", "root-a", db!), false);

      const rank = await catalogs.createRootRank({
        rootUnitId: "root-a",
        name: "Lieutenant",
        abbreviation: "LT",
        imageRef: "/ranks/lieutenant.png",
        description: "Junior officer",
        sortOrder: 3,
      });
      assert.equal(rank.abbreviation, "LT");
      assert.equal(rank.imageRef, "/ranks/lieutenant.png");
      await catalogs.createRootRank({ rootUnitId: "root-a", name: "Captain", description: "", sortOrder: 2 });
      assert.deepEqual((await catalogs.listRootRanks("root-a")).map((item) => item.name), ["Captain", "Lieutenant"]);
      const updatedRank = await catalogs.updateRootRank({
        rootUnitId: "root-a",
        rankId: rank.id,
        name: "First Lieutenant",
        description: "",
        sortOrder: 1,
      });
      assert.equal(updatedRank.name, "First Lieutenant");
      assert.equal(updatedRank.abbreviation, "LT", "legacy updates preserve the short code");
      assert.equal(updatedRank.imageRef, "/ranks/lieutenant.png", "legacy updates preserve the image");
      const revisedRank = await catalogs.updateRootRank({
        rootUnitId: "root-a", rankId: rank.id, name: "First Lieutenant",
        description: "", sortOrder: 1, abbreviation: "1LT", imageRef: "https://example.test/first-lieutenant.png",
      });
      assert.equal(revisedRank.abbreviation, "1LT");
      assert.equal(revisedRank.imageRef, "https://example.test/first-lieutenant.png");
      await assert.rejects(
        updateRootRank({
          rootUnitId: "root-a", rankId: rank.id, name: "Unauthorized",
          description: "", sortOrder: 1, abbreviation: "BAD", imageRef: "",
        }, { db: db!, getUserId: async () => "commander-a" }),
        /current owner/,
      );
      const clearedRank = await catalogs.updateRootRank({
        rootUnitId: "root-a", rankId: rank.id, name: "First Lieutenant",
        description: "", sortOrder: 1, abbreviation: "", imageRef: "",
      });
      assert.equal(clearedRank.abbreviation, null);
      assert.equal(clearedRank.imageRef, null);
      await catalogs.deleteRootRank("root-a", rank.id);

      const playerAward = await awards.create({
        rootUnitId: "root-a",
        category: "PLAYER",
        name: "Service Cross",
        description: "Long service",
        imageRef: "/medals/service.png",
        sortOrder: 5,
      });
      const unitAward = await awards.create({
        rootUnitId: "root-a",
        category: "UNIT",
        name: "Unit Citation",
        description: "Collective distinction",
        imageRef: "",
        sortOrder: 1,
      });
      assert.equal((await awards.list("root-a", "PLAYER")).length, 3);
      assert.equal((await awards.list("root-a", "PLAYER")).at(-1)?.name, "Service Cross");
      assert.deepEqual((await awards.list("root-a", "UNIT")).map(({ name }) => name), ["Unit Citation"]);
      assert.equal((await awards.list("root-a", "PLAYER")).find(({ id }) => id === "legacy-medal-z")?.quantityAwarded, 0);

      const updatedAward = await awards.update({
        rootUnitId: "root-a",
        awardId: playerAward.id,
        category: "PLAYER",
        name: "Distinguished Service Cross",
        description: "Distinguished service",
        imageRef: "",
        sortOrder: 2,
      });
      assert.equal(updatedAward.name, "Distinguished Service Cross");
      assert.equal(updatedAward.imageRef, null);
      assert.equal(updatedAward.sortOrder, 2);

      await db!.player.create({ data: { id: "award-player-internal", playerId: "award-player" } });
      await db!.unitMembership.create({
        data: { playerId: "award-player-internal", unitId: "root-a" },
      });
      const awardDependencies = { db: db!, getUserId: async () => "owner" };
      await grantPlayerAward({ playerId: "award-player", awardId: playerAward.id }, awardDependencies);
      await grantUnitAward({ unitId: "root-a", awardId: unitAward.id }, awardDependencies);
      await assert.rejects(
        grantPlayerAward({ playerId: "award-player", awardId: playerAward.id }, awardDependencies),
        /already holds that Award/,
      );
      await assert.rejects(
        grantUnitAward({ unitId: "root-a", awardId: unitAward.id }, awardDependencies),
        /already holds that Award/,
      );
      await assert.rejects(
        grantPlayerAward({ playerId: "award-player", awardId: unitAward.id }, awardDependencies),
        /Player Award/,
      );
      await assert.rejects(
        grantUnitAward({ unitId: "root-a", awardId: playerAward.id }, awardDependencies),
        /Unit Award/,
      );
      const playerCounts = await awards.list("root-a", "PLAYER");
      const unitCounts = await awards.list("root-a", "UNIT");
      assert.equal(playerCounts.find(({ id }) => id === playerAward.id)?.quantityAwarded, 1);
      assert.equal(unitCounts.find(({ id }) => id === unitAward.id)?.quantityAwarded, 1);
      await assert.rejects(awards.delete("root-a", playerAward.id), /Remove this Award/);
      await removePlayerAward({ playerId: "award-player", awardId: playerAward.id }, awardDependencies);
      await removeUnitAward({ unitId: "root-a", awardId: unitAward.id }, awardDependencies);
      assert.equal((await awards.list("root-a", "PLAYER")).find(({ id }) => id === playerAward.id)?.quantityAwarded, 0);
      assert.equal((await awards.list("root-a", "UNIT")).find(({ id }) => id === unitAward.id)?.quantityAwarded, 0);

      const commanderAMembership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { userId: "commander-a", unitId: childAId, endedAt: null },
        select: { id: true },
      });
      await db!.permissionGrant.create({
        data: {
          authorizedUserMembershipId: commanderAMembership.id,
          permission: "MANAGE_AWARDS",
          scope: "SELF",
          createdByUserId: "owner",
        },
      });
      await db!.player.create({ data: { id: "multi-award-player-internal", playerId: "multi-award-player" } });
      await db!.unitMembership.create({
        data: { playerId: "multi-award-player-internal", unitId: childBId },
      });
      const branchManagerDependencies = { db: db!, getUserId: async () => "commander-a" };
      await assert.rejects(
        grantPlayerAward({ playerId: "multi-award-player", awardId: playerAward.id }, branchManagerDependencies),
        /Manage Awards for a Unit this Player currently belongs to/,
      );
      await db!.unitMembership.create({
        data: { playerId: "multi-award-player-internal", unitId: childAId },
      });
      await grantPlayerAward({ playerId: "multi-award-player", awardId: playerAward.id }, branchManagerDependencies);
      assert.equal((await awards.list("root-a", "PLAYER")).find(({ id }) => id === playerAward.id)?.quantityAwarded, 1);
      await removePlayerAward({ playerId: "multi-award-player", awardId: playerAward.id }, branchManagerDependencies);

      await grantPlayerAward({ playerId: "award-player", awardId: playerAward.id }, awardDependencies);
      await db!.unitMembership.updateMany({
        where: { playerId: "award-player-internal", unitId: "root-a", endedAt: null },
        data: { endedAt: new Date() },
      });
      const orphanedPlayerAwards = await getPlayerAwardManagementData("owner", "award-player", { db: db! });
      assert.deepEqual(orphanedPlayerAwards.manageableAwardIds, [playerAward.id]);
      assert.deepEqual(orphanedPlayerAwards.available, []);
      const cleanupMembership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { unitId: "root-a", userId: "staff", endedAt: null },
        select: { id: true },
      });
      await db!.permissionGrant.create({
        data: {
          authorizedUserMembershipId: cleanupMembership.id,
          permission: "MANAGE_AWARDS",
          scope: "SELF_AND_DESCENDANTS",
          createdByUserId: "owner",
        },
      });
      const fullRootManagerAwards = await getPlayerAwardManagementData("staff", "award-player", { db: db! });
      assert.deepEqual(fullRootManagerAwards.manageableAwardIds, [playerAward.id]);
      await assert.rejects(
        removePlayerAward(
          { playerId: "award-player", awardId: playerAward.id },
          { db: db!, getUserId: async () => "commander-a" },
        ),
        /RootUnit owner or a full-root Award manager/,
      );
      await removePlayerAward(
        { playerId: "award-player", awardId: playerAward.id },
        { db: db!, getUserId: async () => "staff" },
      );
      assert.equal((await awards.list("root-a", "PLAYER")).find(({ id }) => id === playerAward.id)?.quantityAwarded, 0);
      await awards.delete("root-a", playerAward.id);
      await awards.delete("root-a", unitAward.id);
      await assert.rejects(
        createRootAward({
          rootUnitId: "root-a",
          category: "PLAYER",
          name: "Unauthorized Award",
          description: "",
          imageRef: "",
          sortOrder: 1,
        }, { db: db!, getUserId: async () => "commander-a" }),
        /Manage Awards at this RootUnit/,
      );
      await assert.rejects(
        listRootRanks("root-a", { db: db!, getUserId: async () => "commander-a" }),
        /current owner/,
      );
    });

    await t.test("an unused authorized leaf can be deleted with its bootstrap Commander membership", async () => {
      const candidate = await createDeleteCandidate("Disposable Leaf");
      const membership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { unitId: candidate.id, endedAt: null },
        select: { id: true, userId: true, authorityLevel: true },
      });
      assert.equal(membership.userId, candidate.commanderUserId);
      assert.equal(membership.authorityLevel, 0);

      await workflow.deleteUnit({ unitId: candidate.id });

      assert.equal(await db!.unit.findUnique({ where: { id: candidate.id } }), null);
      assert.equal(await db!.authorizedUserMembership.findUnique({ where: { id: membership.id } }), null);
    });

    await t.test("RootUnits cannot be deleted", async () => {
      const commanderMembership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { unitId: "root-a", authorityLevel: 0, endedAt: null },
      });
      await assert.rejects(workflow.deleteUnit({ unitId: "root-a" }), /authorized|RootUnit/);
      assert.ok(await db!.unit.findUnique({ where: { id: "root-a" } }));
      assert.ok(await db!.authorizedUserMembership.findUnique({ where: { id: commanderMembership.id } }));
    });

    await t.test("a Unit with children cannot be deleted", async () => {
      const candidate = await createDeleteCandidate("Parent With Child");
      const child = await workflow.createChildUnit({
        parentUnitId: candidate.id,
        name: "Protected Child",
        commanderEmail: "commander-b@example.test",
      });
      await assert.rejects(workflow.deleteUnit({ unitId: candidate.id }), /children/);
      assert.ok(await db!.unit.findUnique({ where: { id: candidate.id } }));
      assert.ok(await db!.unit.findUnique({ where: { id: child.id } }));
    });

    await t.test("an unauthorized structural actor cannot delete a leaf", async () => {
      const candidate = await createDeleteCandidate("Unauthorized Delete");
      const commanderMembership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { unitId: candidate.id, endedAt: null },
      });
      const unauthorizedWorkflow = unitWorkflows({ db: db!, getUserId: async () => "other" });
      await assert.rejects(unauthorizedWorkflow.deleteUnit({ unitId: candidate.id }), /not authorized/);
      assert.ok(await db!.unit.findUnique({ where: { id: candidate.id } }));
      assert.ok(await db!.authorizedUserMembership.findUnique({ where: { id: commanderMembership.id } }));
    });

    await t.test("Player membership history blocks deletion", async () => {
      const candidate = await createDeleteCandidate("Player History");
      const player = await db!.player.create({
        data: { playerId: `delete-${randomUUID()}`, name: "Historical Player" },
      });
      const membership = await db!.unitMembership.create({
        data: {
          playerId: player.id,
          unitId: candidate.id,
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          endedAt: new Date(),
        },
      });
      await assert.rejects(workflow.deleteUnit({ unitId: candidate.id }), /Player membership history/);
      assert.ok(await db!.unit.findUnique({ where: { id: candidate.id } }));
      assert.ok(await db!.unitMembership.findUnique({ where: { id: membership.id } }));
    });

    await t.test("EventParticipation history blocks deletion", async () => {
      const candidate = await createDeleteCandidate("Event History");
      const event = await db!.event.create({
        data: {
          name: `Deletion history ${randomUUID()}`,
          scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
          eventType: "BATTLE",
          ownerUserId: "owner",
        },
      });
      const participation = await db!.eventParticipation.create({
        data: { eventId: event.id, unitId: candidate.id },
      });
      await assert.rejects(workflow.deleteUnit({ unitId: candidate.id }), /Event participation history/);
      assert.ok(await db!.unit.findUnique({ where: { id: candidate.id } }));
      assert.ok(await db!.eventParticipation.findUnique({
        where: { eventId_unitId: { eventId: event.id, unitId: candidate.id } },
      }));
      assert.ok(participation.id);
    });

    await t.test("historical authorized-user memberships block deletion", async () => {
      const candidate = await createDeleteCandidate("Membership History");
      const historicalMembership = await db!.authorizedUserMembership.create({
        data: {
          userId: "staff",
          unitId: candidate.id,
          authorityLevel: 2,
          endedAt: new Date(),
          createdByUserId: "owner",
        },
      });
      await assert.rejects(workflow.deleteUnit({ unitId: candidate.id }), /authorized-user membership/);
      assert.ok(await db!.unit.findUnique({ where: { id: candidate.id } }));
      assert.ok(await db!.authorizedUserMembership.findUnique({ where: { id: historicalMembership.id } }));
    });

    await t.test("grant and delegation history blocks deletion without partial changes", async () => {
      const candidate = await createDeleteCandidate("Grant History");
      const commanderMembership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { unitId: candidate.id, authorityLevel: 0, endedAt: null },
      });
      const sourceGrant = await db!.permissionGrant.create({
        data: {
          authorizedUserMembershipId: commanderMembership.id,
          permission: "MANAGE_ROSTER",
          scope: "SELF_AND_DESCENDANTS",
          createdByUserId: "owner",
          revokedAt: new Date(),
          revokedByUserId: "owner",
        },
      });
      const delegatedGrant = await db!.permissionGrant.create({
        data: {
          authorizedUserMembershipId: commanderMembership.id,
          permission: "MANAGE_ROSTER",
          scope: "SELF",
          delegatedFromGrantId: sourceGrant.id,
          createdByUserId: "owner",
        },
      });
      const beforeUnit = await db!.unit.findUnique({ where: { id: candidate.id } });
      const beforeMembership = await db!.authorizedUserMembership.findUniqueOrThrow({
        where: { id: commanderMembership.id },
        include: { grants: { orderBy: { id: "asc" } } },
      });

      await assert.rejects(workflow.deleteUnit({ unitId: candidate.id }), /grant or delegation history/);

      assert.deepEqual(await db!.unit.findUnique({ where: { id: candidate.id } }), beforeUnit);
      assert.deepEqual(
        await db!.authorizedUserMembership.findUniqueOrThrow({
          where: { id: commanderMembership.id },
          include: { grants: { orderBy: { id: "asc" } } },
        }),
        beforeMembership,
      );
      assert.ok(await db!.permissionGrant.findUnique({ where: { id: delegatedGrant.id } }));
    });

    await t.test("the Commander membership cannot be ordinarily removed", async () => {
      const candidate = await createDeleteCandidate("Commander Removal Guard");
      const commanderMembership = await db!.authorizedUserMembership.findFirstOrThrow({
        where: { unitId: candidate.id, authorityLevel: 0, endedAt: null },
      });
      await assert.rejects(
        workflow.endAuthorizedUserMembership({ unitId: candidate.id, membershipId: commanderMembership.id }),
        /current Commander/,
      );
      assert.equal((await db!.authorizedUserMembership.findUnique({ where: { id: commanderMembership.id } }))?.endedAt, null);
    });
  } finally {
    await db?.$disconnect();
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});