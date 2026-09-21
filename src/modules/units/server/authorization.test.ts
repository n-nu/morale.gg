import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import {
  canManageAuthorizedUsers,
  canManageRoster,
  canManageUnit,
  hasEffectiveUnitPermission,
} from "./authorization";

const rootA = "root-a";
const rootB = "root-b";
const branch = "branch";
const grandchild = "grandchild";
const unrelated = "unrelated";
const actor = "actor";
const commander = "commander";
const other = "other";

type Snapshot = {
  units: Array<{ id: string; parentId: string | null; rootUnitId: string | null }>;
  roots: Array<{ unitId: string; designatedUnit: { id: string } }>;
  grants: Array<{
    id: string;
    authorizedUserMembershipId: string;
    permission: "MANAGE_UNIT" | "MANAGE_STRUCTURE" | "MANAGE_ROSTER" | "MANAGE_AUTHORIZED_USERS";
    scope: "SELF" | "SELF_AND_CHILDREN" | "SELF_AND_DESCENDANTS" | null;
    delegatedFromGrantId: string | null;
    revokedAt: Date | null;
    membership: { userId: string; unitId: string; authorityLevel: number } | null;
  }>;
};

function baseSnapshot(): Snapshot {
  return {
    units: [
      { id: rootA, parentId: null, rootUnitId: rootA },
      { id: branch, parentId: rootA, rootUnitId: rootA },
      { id: grandchild, parentId: branch, rootUnitId: rootA },
      { id: unrelated, parentId: rootA, rootUnitId: rootA },
      { id: rootB, parentId: null, rootUnitId: rootB },
    ],
    roots: [
      { unitId: rootA, designatedUnit: { id: rootA } },
      { unitId: rootB, designatedUnit: { id: rootB } },
    ],
    grants: [],
  };
}

function addGrant(
  snapshot: Snapshot,
  values: Partial<Snapshot["grants"][number]> & {
    id: string;
    permission: Snapshot["grants"][number]["permission"];
    scope: Snapshot["grants"][number]["scope"];
    userId?: string;
    unitId?: string;
  },
) {
  snapshot.grants.push({
    id: values.id,
    authorizedUserMembershipId: `${values.id}-membership`,
    permission: values.permission,
    scope: values.scope,
    delegatedFromGrantId: values.delegatedFromGrantId ?? null,
    revokedAt: values.revokedAt ?? null,
    membership: values.membership ?? {
      userId: values.userId ?? actor,
      unitId: values.unitId ?? rootA,
      authorityLevel: 1,
    },
  });
}

function installSnapshot(snapshot: Snapshot) {
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: async ({ where }: { where: { id: string } }) =>
      ([actor, commander, other].includes(where.id) ? { id: where.id } : null),
  });
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: async () => snapshot.units,
  });
  Object.defineProperty(prisma.rootUnit, "findMany", {
    configurable: true,
    value: async () => snapshot.roots,
  });
  Object.defineProperty(prisma.permissionGrant, "findMany", {
    configurable: true,
    value: async () => snapshot.grants,
  });
}

test.afterEach(() => {
  Object.defineProperty(prisma.user, "findUnique", {
    configurable: true,
    value: originalDelegates.userFindUnique,
  });
  Object.defineProperty(prisma.unit, "findMany", {
    configurable: true,
    value: originalDelegates.unitFindMany,
  });
  Object.defineProperty(prisma.rootUnit, "findMany", {
    configurable: true,
    value: originalDelegates.rootFindMany,
  });
  Object.defineProperty(prisma.permissionGrant, "findMany", {
    configurable: true,
    value: originalDelegates.grantFindMany,
  });
});

const originalDelegates = {
  userFindUnique: prisma.user.findUnique,
  unitFindMany: prisma.unit.findMany,
  rootFindMany: prisma.rootUnit.findMany,
  grantFindMany: prisma.permissionGrant.findMany,
};

test("enforces ordinary scopes and downward-only authority", async () => {
  const snapshot = baseSnapshot();
  addGrant(snapshot, { id: "self", permission: "MANAGE_UNIT", scope: "SELF" });
  installSnapshot(snapshot);
  assert.equal(await canManageUnit(actor, rootA), true);
  assert.equal(await canManageUnit(actor, branch), false);

  snapshot.grants = [];
  addGrant(snapshot, { id: "children", permission: "MANAGE_ROSTER", scope: "SELF_AND_CHILDREN" });
  installSnapshot(snapshot);
  assert.equal(await canManageRoster(actor, rootA), true);
  assert.equal(await canManageRoster(actor, branch), true);
  assert.equal(await canManageRoster(actor, grandchild), false);

  snapshot.grants = [];
  addGrant(snapshot, { id: "descendants", permission: "MANAGE_ROSTER", scope: "SELF_AND_DESCENDANTS" });
  installSnapshot(snapshot);
  assert.equal(await canManageRoster(actor, grandchild), true);
  assert.equal(await canManageRoster(actor, unrelated), true);
  assert.equal(await canManageRoster(actor, rootB), false);
});

test("denies revoked grants and Commander-only operational access", async () => {
  const snapshot = baseSnapshot();
  addGrant(snapshot, { id: "revoked", permission: "MANAGE_UNIT", scope: "SELF", revokedAt: new Date() });
  installSnapshot(snapshot);
  assert.equal(await canManageUnit(actor, rootA), false);
  assert.equal(await canManageUnit(commander, rootA), false);
});

test("validates delegation and source revocation", async () => {
  const snapshot = baseSnapshot();
  addGrant(snapshot, { id: "source", permission: "MANAGE_AUTHORIZED_USERS", scope: "SELF_AND_DESCENDANTS", userId: other });
  addGrant(snapshot, { id: "delegated", permission: "MANAGE_AUTHORIZED_USERS", scope: "SELF", delegatedFromGrantId: "source", unitId: branch });
  installSnapshot(snapshot);
  assert.equal(await canManageAuthorizedUsers(actor, branch), true);
  snapshot.grants[0].revokedAt = new Date();
  installSnapshot(snapshot);
  assert.equal(await canManageAuthorizedUsers(actor, branch), false);
});

test("fails closed for missing, cyclic, wrong-permission, and cross-root lineage", async () => {
  const snapshot = baseSnapshot();
  addGrant(snapshot, { id: "missing", permission: "MANAGE_UNIT", scope: "SELF", delegatedFromGrantId: "absent" });
  addGrant(snapshot, { id: "cycle-a", permission: "MANAGE_UNIT", scope: "SELF_AND_DESCENDANTS", delegatedFromGrantId: "cycle-b" });
  addGrant(snapshot, { id: "cycle-b", permission: "MANAGE_UNIT", scope: "SELF", delegatedFromGrantId: "cycle-a" });
  addGrant(snapshot, { id: "wrong-source", permission: "MANAGE_ROSTER", scope: "SELF_AND_DESCENDANTS", userId: other });
  addGrant(snapshot, { id: "wrong-child", permission: "MANAGE_UNIT", scope: "SELF", delegatedFromGrantId: "wrong-source" });
  addGrant(snapshot, { id: "cross-root", permission: "MANAGE_UNIT", scope: "SELF", delegatedFromGrantId: "wrong-source", unitId: rootB });
  installSnapshot(snapshot);
  assert.equal(await canManageUnit(actor, rootA), false);
});

test("MANAGE_STRUCTURE covers strict descendants but not its anchor", async () => {
  const snapshot = baseSnapshot();
  addGrant(snapshot, { id: "structure", permission: "MANAGE_STRUCTURE", scope: null });
  installSnapshot(snapshot);
  assert.equal(await hasEffectiveUnitPermission(actor, rootA, "MANAGE_STRUCTURE"), false);
  assert.equal(await hasEffectiveUnitPermission(actor, branch, "MANAGE_STRUCTURE"), true);
  assert.equal(await hasEffectiveUnitPermission(actor, grandchild, "MANAGE_STRUCTURE"), true);
});

test("malformed hierarchy and RootUnit data fail closed", async () => {
  const rootMismatch = baseSnapshot();
  addGrant(rootMismatch, { id: "valid", permission: "MANAGE_UNIT", scope: "SELF" });
  rootMismatch.units[0].rootUnitId = rootB;
  installSnapshot(rootMismatch);
  assert.equal(await canManageUnit(actor, rootA), false);

  const cyclic = baseSnapshot();
  addGrant(cyclic, { id: "cyclic", permission: "MANAGE_UNIT", scope: "SELF" });
  cyclic.units[0].parentId = branch;
  installSnapshot(cyclic);
  assert.equal(await canManageUnit(actor, rootA), false);
});

test("an invalid delegated grant does not cancel an independent valid grant", async () => {
  const snapshot = baseSnapshot();
  addGrant(snapshot, { id: "independent", permission: "MANAGE_UNIT", scope: "SELF" });
  addGrant(snapshot, { id: "invalid-dependent", permission: "MANAGE_UNIT", scope: "SELF", delegatedFromGrantId: "missing", unitId: branch });
  installSnapshot(snapshot);
  assert.equal(await canManageUnit(actor, rootA), true);
});
