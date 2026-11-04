import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getUnitDescendantCounts,
  getTopLevelUnitDirectoryEntries,
  type UnitDirectoryRow,
} from "../public-presentation";
import { UnitTable } from "./unit-table";
import { UnitOrganizationTree } from "./unit-organization-tree";

const units: UnitDirectoryRow[] = [
  {
    id: "root",
    name: "Root",
    imageRef: null,
    parent: null,
    description: "A public root organization.",
    discordInvite: null,
    groupLink: null,
    commander: { name: "Commander One", image: null },
    memberCount: 42,
    descendantCount: 3,
  },
  {
    id: "child",
    name: "Child",
    imageRef: null,
    parent: { id: "root", name: "Root" },
    description: null,
    discordInvite: null,
    groupLink: null,
    commander: { name: "Commander Two", image: null },
    memberCount: 8,
    descendantCount: 1,
  },
  {
    id: "sibling",
    name: "Sibling",
    imageRef: null,
    parent: { id: "root", name: "Root" },
    description: null,
    discordInvite: null,
    groupLink: null,
    commander: null,
    memberCount: 7,
    descendantCount: 0,
  },
  {
    id: "leaf",
    name: "Leaf",
    imageRef: null,
    parent: { id: "child", name: "Child" },
    description: null,
    discordInvite: null,
    groupLink: null,
    commander: null,
    memberCount: 0,
    descendantCount: 0,
  },
  {
    id: "other",
    name: "Other",
    imageRef: null,
    parent: null,
    description: null,
    discordInvite: null,
    groupLink: null,
    commander: null,
    memberCount: null,
    descendantCount: 0,
  },
];

test("Unit descendant counts include every nested Unit, not only direct children", () => {
  const counts = getUnitDescendantCounts(units);

  assert.equal(counts.get("root"), 3);
  assert.equal(counts.get("child"), 1);
  assert.equal(counts.get("leaf"), 0);
  assert.equal(counts.get("other"), 0);
});

test("top-level directory entries skip a single-child wrapper to the first branching level", () => {
  const entries = getTopLevelUnitDirectoryEntries(units);

  assert.deepEqual(entries.map(({ id }) => id), ["child", "sibling", "other"]);
});

test("Units directory renders visual cards for roots without descendant trees", () => {
  const html = renderToStaticMarkup(<UnitTable units={units} />);

  assert.match(html, /aria-label="Top-level Unit directory"/);
  assert.match(html, /href="\/units\/child"/);
  assert.match(html, /href="\/units\/sibling"/);
  assert.match(html, /href="\/units\/other"/);
  assert.doesNotMatch(html, /href="\/units\/root"/);
  assert.doesNotMatch(html, /href="\/units\/leaf"/);
  assert.match(html, /unit-directory-reveal/);
  assert.match(html, /Members/);
  assert.match(html, /Subunits/);
  assert.match(html, /Descendants/);
  assert.doesNotMatch(html, /Expand all units|Collapse all units/);
  assert.doesNotMatch(html, /audits|K\/D|Tickets|Flag captures/i);
});

test("Unit cards render graceful missing-image, commander, and roster states", () => {
  const leafHtml = renderToStaticMarkup(<UnitTable units={[units[4]]} />);

  assert.match(leafHtml, /unit-directory-mark/);
  assert.doesNotMatch(leafHtml, /No image/);
  assert.match(leafHtml, /Unassigned/);
  assert.match(leafHtml, /Members/);
  assert.match(leafHtml, /—/);
  assert.match(leafHtml, /Descendants/);
});

test("Unit detail tree roots at the selected Unit and expands only its direct children", () => {
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={units[0]} units={units} />,
  );

  assert.match(html, /aria-label="Organization family tree"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /data-root="true"/);
  assert.match(html, /Current Unit/);
  assert.match(html, /href="\/units\/root"/);
  assert.match(html, /href="\/units\/child"/);
  assert.match(html, /href="\/units\/sibling"/);
  assert.doesNotMatch(html, /href="\/units\/other"/);
  assert.doesNotMatch(html, /href="\/units\/leaf"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /unit-org-children/);
  assert.match(html, /Commander Two/);
  assert.match(html, /42 members/);
  assert.match(html, /3 descendants/);
  assert.doesNotMatch(html, /unit-org-tree-canvas|unit-org-connectors|audits|K\/D/i);
});

test("focusing a descendant removes its ancestors and unrelated branches from the tree", () => {
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={units[1]} units={units} />,
  );

  assert.match(html, /aria-label="Child hierarchy"/);
  assert.match(html, /href="\/units\/child"/);
  assert.match(html, /href="\/units\/leaf"/);
  assert.doesNotMatch(html, /href="\/units\/root"/);
  assert.doesNotMatch(html, /href="\/units\/sibling"/);
  assert.doesNotMatch(html, /href="\/units\/other"/);
});

test("wide sibling groups render as a wrapped group instead of an oversized canvas", () => {
  const wideRoot = { ...units[0], descendantCount: 10 };
  const siblings = Array.from({ length: 10 }, (_, index): UnitDirectoryRow => ({
    ...units[1],
    id: `child-${index}`,
    name: `Child ${index}`,
    parent: { id: wideRoot.id, name: wideRoot.name },
    descendantCount: 0,
  }));
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={wideRoot} units={[wideRoot, ...siblings]} />,
  );

  assert.equal((html.match(/class="unit-org-node-link"/g) ?? []).length, 11);
  assert.match(html, /unit-org-children/);
  assert.doesNotMatch(html, /width:26646|unit-org-tree-canvas/);
});

test("very large direct sibling groups start collapsed but remain expandable", () => {
  const wideRoot = { ...units[0], descendantCount: 13 };
  const siblings = Array.from({ length: 13 }, (_, index): UnitDirectoryRow => ({
    ...units[1],
    id: `child-${index}`,
    name: `Child ${index}`,
    parent: { id: wideRoot.id, name: wideRoot.name },
    descendantCount: 0,
  }));
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={wideRoot} units={[wideRoot, ...siblings]} />,
  );

  assert.equal((html.match(/class="unit-org-node-link"/g) ?? []).length, 1);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Show 13 subunits/);
});

test("leaf Units have no meaningless expansion control", () => {
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={units[3]} units={[units[3]]} />,
  );

  assert.match(html, /Leaf/);
  assert.doesNotMatch(html, /unit-org-expand/);
});
