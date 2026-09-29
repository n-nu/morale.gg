import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "@/lib/prisma";

import {
  getEventResultState,
  proposeEventResultCorrection,
  reviewEventResultCorrection,
  setInitialEventResult,
} from "./results";

test("Event results preserve history and require a different authorized reviewer", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");
  const suffix = randomUUID();
  const owner = await prisma.user.create({ data: { email: `result-owner-${suffix}@example.test`, name: "Result owner" }, select: { id: true } });
  const manager = await prisma.user.create({ data: { email: `result-manager-${suffix}@example.test`, name: "Result manager" }, select: { id: true } });
  const event = await prisma.event.create({
    data: {
      name: `Result event ${suffix}`,
      scheduledAt: new Date(Date.now() - 60_000),
      eventType: "integration",
      ownerUserId: owner.id,
    },
    select: { id: true },
  });
  await prisma.eventAuthorizedUser.create({ data: { eventId: event.id, userId: manager.id, addedByUserId: owner.id } });

  try {
    const initial = await setInitialEventResult(owner.id, event.id, "DEFENDER_WIN");
    assert.equal(initial.status, "EFFECTIVE");

    const proposal = await proposeEventResultCorrection(manager.id, event.id, "DRAW");
    assert.equal(proposal.status, "PENDING");
    assert.equal((await getEventResultState(event.id)).effective?.value, "DEFENDER_WIN");

    await assert.rejects(
      () => reviewEventResultCorrection(manager.id, event.id, proposal.id, "APPROVE"),
      /proposer cannot review/i,
    );

    const approved = await reviewEventResultCorrection(owner.id, event.id, proposal.id, "APPROVE");
    assert.equal(approved.status, "EFFECTIVE");
    assert.equal((await getEventResultState(event.id)).effective?.value, "DRAW");

    const rejectedProposal = await proposeEventResultCorrection(owner.id, event.id, "ATTACKER_WIN");
    const rejected = await reviewEventResultCorrection(manager.id, event.id, rejectedProposal.id, "REJECT");
    assert.equal(rejected.status, "REJECTED");
    assert.equal((await getEventResultState(event.id)).effective?.value, "DRAW");
    assert.equal(await prisma.eventResult.count({ where: { eventId: event.id } }), 3);
    assert.equal(await prisma.eventResult.count({ where: { eventId: event.id, status: "EFFECTIVE" } }), 1);
  } finally {
    await prisma.eventResult.deleteMany({ where: { eventId: event.id } });
    await prisma.eventAuthorizedUser.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, manager.id] } } });
  }
});

test("a single Event manager cannot self-approve a correction", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for this integration test");
  const suffix = randomUUID();
  const owner = await prisma.user.create({ data: { email: `single-result-owner-${suffix}@example.test`, name: "Single result owner" }, select: { id: true } });
  const event = await prisma.event.create({
    data: {
      name: `Single result event ${suffix}`,
      scheduledAt: new Date(Date.now() - 60_000),
      eventType: "integration",
      ownerUserId: owner.id,
    },
    select: { id: true },
  });

  try {
    await setInitialEventResult(owner.id, event.id, "ATTACKER_WIN");
    const proposal = await proposeEventResultCorrection(owner.id, event.id, "DRAW");
    assert.equal(proposal.status, "PENDING");
    await assert.rejects(
      () => reviewEventResultCorrection(owner.id, event.id, proposal.id, "REJECT"),
      /proposer cannot review/i,
    );
    assert.equal((await getEventResultState(event.id)).effective?.value, "ATTACKER_WIN");
    assert.equal((await getEventResultState(event.id)).pending?.value, "DRAW");
  } finally {
    await prisma.eventResult.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  }
});
