import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/prisma";
import { createEventForAuthenticatedUser } from "./create-event";

const originalCreate = prisma.event.create;

test.afterEach(() => {
  Object.defineProperty(prisma.event, "create", {
    configurable: true,
    value: originalCreate,
  });
});

test("authorized authenticated creator becomes owner", async () => {
  let persistedData: Record<string, unknown> | undefined;
  Object.defineProperty(prisma.event, "create", {
    configurable: true,
    value: async ({ data }: { data: Record<string, unknown> }) => {
      persistedData = data;
      return { id: "event-1", ...data, createdAt: new Date(), updatedAt: new Date() };
    },
  });

  const input = {
    name: "Line Battle",
    scheduledAt: new Date(Date.now() + 60_000),
    eventType: "external",
    rallyMinutesBeforeStart: 30,
    durationMinutes: 35,
    attackerName: "  French Empire ",
    defenderName: "United Kingdom & Prussia",
    invitePolicy: "CLOSED",
    ownerUserId: "forged-owner",
  } as Parameters<typeof createEventForAuthenticatedUser>[0] & { ownerUserId: string };

  const result = await createEventForAuthenticatedUser(
    input,
    "authenticated-owner",
    async () => true,
  );

  assert.equal(result.ownerUserId, "authenticated-owner");
  assert.equal(persistedData?.ownerUserId, "authenticated-owner");
  assert.equal(persistedData?.rallyMinutesBeforeStart, 30);
  assert.equal(persistedData?.durationMinutes, 35);
  assert.equal(persistedData?.attackerName, "French Empire");
  assert.equal(persistedData?.defenderName, "United Kingdom & Prussia");
  assert.equal(persistedData?.invitePolicy, "CLOSED");
  assert.equal(Object.hasOwn(persistedData ?? {}, "opponent"), false);
  assert.equal(Object.hasOwn(persistedData ?? {}, "organizingUnitId"), false);
  assert.equal(Object.hasOwn(persistedData ?? {}, "authorityUnitId"), false);
});

test("denies missing or unauthorized authenticated Users", async () => {
  const input = {
    name: "Line Battle",
    scheduledAt: new Date(Date.now() + 60_000),
    eventType: "external",
    durationMinutes: 35,
  };

  await assert.rejects(
    () => createEventForAuthenticatedUser(input, "", async () => true),
    /Authentication is required/i,
  );
  await assert.rejects(
    () => createEventForAuthenticatedUser(input, "unauthorized-user", async () => false),
    /Unauthorized/i,
  );
});

test("validates schedule ranges and defaults rally and invite policy", async () => {
  const valid = {
    name: "Line Battle",
    scheduledAt: new Date(Date.now() + 60_000),
    eventType: "external",
    durationMinutes: 35,
  };
  let persistedData: Record<string, unknown> | undefined;
  Object.defineProperty(prisma.event, "create", {
    configurable: true,
    value: async ({ data }: { data: Record<string, unknown> }) => {
      persistedData = data;
      return { id: "event-2", ...data, createdAt: new Date(), updatedAt: new Date() };
    },
  });

  await createEventForAuthenticatedUser(valid, "owner", async () => true);
  assert.equal(persistedData?.rallyMinutesBeforeStart, 0);
  assert.equal(persistedData?.invitePolicy, "OPEN");

  for (const invalid of [
    { rallyMinutesBeforeStart: -1 },
    { rallyMinutesBeforeStart: 1441 },
    { rallyMinutesBeforeStart: 1.5 },
    { durationMinutes: 0 },
    { durationMinutes: -30 },
    { durationMinutes: 1441 },
    { durationMinutes: 35.5 },
    { scheduledAt: new Date(Number.NaN) },
  ]) {
    await assert.rejects(
      () =>
        createEventForAuthenticatedUser(
          { ...valid, ...invalid },
          "owner",
          async () => true,
        ),
    );
  }
});