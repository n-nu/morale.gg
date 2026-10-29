import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name).replaceAll("\\", "/");
    return entry.isDirectory() ? findTests(path) : /\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

const files = findTests("src").sort();
const presentation = files.filter((file) =>
  (file.endsWith(".tsx") && file !== "src/app/auth-nav-view.test.tsx") ||
  file === "src/app/events/calendar/calendar-grid.test.ts",
);
const server = files.filter((file) => !presentation.includes(file));
let failed = false;

// Separate React server exports from React DOM rendering; serialize database fixtures.
for (const [name, conditions, tests] of [
  ["server/domain", ["--conditions=react-server"], server],
  ["presentation", [], presentation],
]) {
  console.log(`Running ${tests.length} ${name} test files`);
  const result = spawnSync(process.execPath, [
    ...conditions, "--import=tsx", "--test", "--test-concurrency=1", ...tests,
  ], { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) failed = true;
}

process.exitCode = failed ? 1 : 0;
