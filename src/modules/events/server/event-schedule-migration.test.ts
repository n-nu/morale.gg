import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Client } from "pg";

const migrationUrl = new URL(
  "../../../../prisma/migrations/20261103140000_event_schedule_and_invite_policy/migration.sql",
  import.meta.url,
);

test("Event scheduling migration preserves opponent and supplies legacy defaults", async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, "DATABASE_URL is required for the migration test");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query('CREATE SCHEMA "event_schedule_migration_test"');
    await client.query('SET LOCAL search_path TO "event_schedule_migration_test"');
    await client.query(`
      CREATE TABLE "Event" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "scheduledAt" TIMESTAMP(3) NOT NULL,
        "eventType" TEXT NOT NULL,
        "opponent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `);
    await client.query(`
      INSERT INTO "Event"
        ("id", "name", "scheduledAt", "eventType", "opponent", "updatedAt")
      VALUES
        ('legacy-event', 'Legacy Event', CURRENT_TIMESTAMP, 'Internal',
         'Undetermined side', CURRENT_TIMESTAMP)
    `);

    await client.query(await readFile(migrationUrl, "utf8"));

    const legacy = await client.query<{
      opponent: string | null;
      attackerName: string | null;
      defenderName: string | null;
      rallyMinutesBeforeStart: number;
      durationMinutes: number | null;
      invitePolicy: "OPEN" | "CLOSED";
    }>(`
      SELECT
        "opponent",
        "attackerName",
        "defenderName",
        "rallyMinutesBeforeStart",
        "durationMinutes",
        "invitePolicy"
      FROM "Event"
      WHERE "id" = 'legacy-event'
    `);

    assert.deepEqual(legacy.rows[0], {
      opponent: "Undetermined side",
      attackerName: null,
      defenderName: null,
      rallyMinutesBeforeStart: 0,
      durationMinutes: null,
      invitePolicy: "OPEN",
    });

    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
});
