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
    ownerUserId: "forged-owner",
  } as Parameters<typeof createEventForAuthenticatedUser>[0] & { ownerUserId: string };

  const result = await createEventForAuthenticatedUser(
    input,
    "authenticated-owner",
    async () => true,
  );

  assert.equal(result.ownerUserId, "authenticated-owner");
  assert.equal(persistedData?.ownerUserId, "authenticated-owner");
  assert.equal(Object.hasOwn(persistedData ?? {}, "organizingUnitId"), false);
  assert.equal(Object.hasOwn(persistedData ?? {}, "authorityUnitId"), false);
});

test("denies missing or unauthorized authenticated Users", async () => {
  const input = {
    name: "Line Battle",
    scheduledAt: new Date(Date.now() + 60_000),
    eventType: "external",
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