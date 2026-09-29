import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { assertSafeDatabaseTarget, requireSingleRootUnit } from "../../prisma/demo-reset";

test("demo seeding commands are defined and the demo seed script exists", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

  assert.equal(typeof packageJson.scripts["demo:reset"], "string");
  assert.equal(typeof packageJson.scripts["seed:demo"], "string");
  assert.equal(typeof packageJson.scripts["seed:demo:reset"], "string");
  assert.equal(packageJson.scripts["seed:demo"], "npm run demo:reset");
  assert.equal(packageJson.scripts["seed:demo:reset"], "npm run demo:reset");

  const seedScript = readFileSync(join(process.cwd(), "prisma/seed-demo.ts"), "utf8");
  const resetScript = readFileSync(join(process.cwd(), "prisma/demo-reset.ts"), "utf8");
  assert.match(seedScript, /runDemoReset/);
  assert.match(resetScript, /DEMO_USER_IDS/);
  assert.match(resetScript, /clearResettableData/);
  assert.match(resetScript, /name: null/);
  assert.doesNotMatch(resetScript, /playerHandles|playerName\(/);
});

test("database safety accepts only the configured local Compose database", () => {
  assert.deepEqual(
    assertSafeDatabaseTarget({
      DATABASE_URL: "postgresql://demo:secret@localhost:5432/morale_gg?schema=public",
      POSTGRES_DB: "morale_gg",
      POSTGRES_PORT: "5432",
    }),
    { environment: "development (NODE_ENV unset)", host: "localhost", databaseName: "morale_gg" },
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ NODE_ENV: "production", DATABASE_URL: "postgresql://localhost/morale_gg" }),
    /disabled.*production/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ NODE_ENV: " Production ", DATABASE_URL: "postgresql://localhost/morale_gg" }),
    /disabled.*production/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ DATABASE_URL: "postgresql://db.example.com:5432/morale_gg" }),
    /not a verified local/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ DATABASE_URL: "postgresql://localhost:5432/production" }),
    /does not match.*Compose/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({ DATABASE_URL: "postgresql://localhost:5432/morale_gg?host=db.example.com" }),
    /connection overrides.*ambiguous/i,
  );
  assert.throws(
    () => assertSafeDatabaseTarget({}),
    /DATABASE_URL is required/i,
  );
});

test("root selection refuses zero or multiple RootUnits and identifies candidates", () => {
  assert.deepEqual(requireSingleRootUnit([{ unitId: "root-a", name: "A" }]), { unitId: "root-a", name: "A" });
  assert.throws(() => requireSingleRootUnit([]), /found 0: none/i);
  assert.throws(
    () => requireSingleRootUnit([{ unitId: "root-a", name: "A" }, { unitId: "root-b", name: "B" }]),
    /root-a \(A\).*root-b \(B\)/i,
  );
});
