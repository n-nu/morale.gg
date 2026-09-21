import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Client } from "pg";

const migrationUrl = new URL(
  "../../../../prisma/migrations/20260921160000_event_ownership_authorization/migration.sql",
  import.meta.url,
);

test("backfills legacy Events to a real User before requiring ownership", async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL is required for the migration test");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query('CREATE SCHEMA "ticket16_migration_test"');
    await client.query('SET LOCAL search_path TO "ticket16_migration_test"');
    await client.query('CREATE TABLE "User" ("id" TEXT PRIMARY KEY)');
    await client.query(`
      CREATE TABLE "Event" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "scheduledAt" TIMESTAMP(3) NOT NULL,
        "eventType" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE "EventParticipation" (
        "id" TEXT PRIMARY KEY,
        "eventId" TEXT NOT NULL
      )
    `);
    await client.query('INSERT INTO "User" ("id") VALUES ($1)', ["real-development-user"]);
    await client.query(`
      INSERT INTO "Event" ("id", "name", "scheduledAt", "eventType", "updatedAt")
      VALUES ('legacy-event', 'Legacy Event', CURRENT_TIMESTAMP, 'internal', CURRENT_TIMESTAMP)
    `);
    await client.query(`
      INSERT INTO "EventParticipation" ("id", "eventId")
      VALUES ('legacy-participation', 'legacy-event')
    `);
    await client.query(
      "SELECT set_config('morale.event_owner_user_id', $1, true)",
      ["real-development-user"],
    );

    const migration = await readFile(migrationUrl, "utf8");
    await client.query(migration);

    const ownership = await client.query<{ ownerUserId: string }>(
      'SELECT "ownerUserId" FROM "Event" WHERE "id" = $1',
      ["legacy-event"],
    );
    assert.equal(ownership.rows[0]?.ownerUserId, "real-development-user");

    const ownerless = await client.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM "Event" WHERE "ownerUserId" IS NULL',
    );
    assert.equal(ownerless.rows[0]?.count, "0");

    const participations = await client.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM "EventParticipation"',
    );
    assert.equal(participations.rows[0]?.count, "1");

    await assert.rejects(
      () => client.query(`
        INSERT INTO "EventAuthorizedUser"
          ("id", "eventId", "userId", "addedByUserId", "updatedAt")
        VALUES
          ('owner-authorization', 'legacy-event', 'real-development-user',
           'real-development-user', CURRENT_TIMESTAMP)
      `),
      /owner cannot also be an explicitly authorized User/i,
    );
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }
});