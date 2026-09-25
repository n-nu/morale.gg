import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

// Render client forms in Node without evaluating the server-only marker.
// Server security is exercised separately against PostgreSQL.
const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = { exports: {} } as NodeModule;

test("public roster links Players and hides mutation controls", async () => {
  const { Roster } = await import("./roster");
  const html = renderToStaticMarkup(<Roster unitId="unit-a" canManage={false} entries={[
    { id: "membership", startedAt: new Date("2026-09-25T12:00:00Z"), player: { id: "internal", playerId: "123", name: "Player One" } },
  ]} />);
  assert.match(html, /href="\/players\/internal"/);
  assert.match(html, /Game ID: 123/);
  assert.doesNotMatch(html, /End membership|Add to roster/);
});

test("manager sees add and end controls with membership and Unit targets", async () => {
  const { Roster } = await import("./roster");
  const html = renderToStaticMarkup(<Roster unitId="unit-a" canManage entries={[
    { id: "membership", startedAt: new Date(), player: { id: "internal", playerId: "123", name: "Player One" } },
  ]} />);
  assert.match(html, /End membership for Player One/);
  assert.match(html, /name="membershipId" value="membership"/);
  assert.match(html, /name="unitId" value="unit-a"/);
  assert.match(html, /Add to roster/);
});

test("empty roster and registration form provide a usable starting point", async () => {
  const { Roster } = await import("./roster");
  const { RegisterPlayerForm } = await import("./forms");
  assert.match(renderToStaticMarkup(<Roster unitId="unit-a" canManage entries={[]} />), /No active memberships/);
  const html = renderToStaticMarkup(<RegisterPlayerForm />);
  assert.match(html, /Game Player ID/);
  assert.match(html, /Player name/);
  assert.match(html, /Register Player/);
  assert.doesNotMatch(html, /name="userId"/);
});
