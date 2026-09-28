import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("demo seeding commands are defined and the demo seed script exists", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

  assert.equal(typeof packageJson.scripts["seed:demo"], "string");
  assert.equal(typeof packageJson.scripts["seed:demo:reset"], "string");

  const seedScript = readFileSync(join(process.cwd(), "prisma/seed-demo.ts"), "utf8");
  assert.match(seedScript, /DEMO/);
  assert.match(seedScript, /reset/i);
});
