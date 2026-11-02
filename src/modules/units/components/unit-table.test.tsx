import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getUnitDescendantCounts,
  type UnitDirectoryRow,
} from "../public-presentation";
import { buildHierarchy, getVisibleRows, UnitTable, type UnitRow } from "./unit-table";
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

test("Unit hierarchy defaults to roots and expands descendants by depth", () => {
  const hierarchyRows: UnitRow[] = units.map(({ id, name, imageRef, parent }) => ({
    id,
    name,
    imageRef,
    parent,
  }));
  const { roots, children } = buildHierarchy(hierarchyRows);
  const collapsed = getVisibleRows(roots, children, new Set());
  const rootExpanded = getVisibleRows(roots, children, new Set(["root"]));
  const allExpanded = getVisibleRows(roots, children, new Set(children.keys()));

  assert.deepEqual(collapsed.map(({ unit }) => unit.id), ["root", "other"]);
  assert.deepEqual(rootExpanded.map(({ unit }) => unit.id), ["root", "child", "sibling", "other"]);
  assert.deepEqual(allExpanded.map(({ unit }) => unit.id), ["root", "child", "leaf", "sibling", "other"]);
  assert.deepEqual(allExpanded.map(({ depth }) => depth), [0, 1, 2, 1, 0]);
});

test("Unit directory cards keep identity minimal and reveal roster details without audit metrics", () => {
  const html = renderToStaticMarkup(<UnitTable units={units} />);

  assert.match(html, /aria-label="Expand all units"/);
  assert.match(html, /aria-label="Collapse all units"/);
  assert.match(html, /Commander One/);
  assert.match(html, /unit-directory-reveal/);
  assert.match(html, /Members/);
  assert.match(html, /Descendants/);
  assert.match(html, />3</);
  assert.doesNotMatch(html, /audits|K\/D|Tickets|Flag captures/i);
  assert.match(html, /A public root organization\./);
  assert.match(html, /href="\/units\/root"/);
  assert.match(html, /Showing 2 of 5 units/);
});

test("Unit cards render graceful missing-image, commander, and roster states", () => {
  const html = renderToStaticMarkup(<UnitTable units={units} />);

  assert.match(html, /unit-directory-mark/);
  assert.doesNotMatch(html, /No image/);

  const leafHtml = renderToStaticMarkup(<UnitTable units={[units[4]]} />);
  assert.match(leafHtml, /Unassigned/);
  assert.match(leafHtml, /Members/);
  assert.match(leafHtml, /—/);
  assert.match(leafHtml, /Descendants/);
});

test("Unit detail tree renders current identity and linked descendants with visible branches", () => {
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={units[0]} units={units} />,
  );

  assert.match(html, /Organization/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /href="\/units\/root"/);
  assert.match(html, /href="\/units\/child"/);
  assert.match(html, /href="\/units\/sibling"/);
  assert.match(html, /href="\/units\/leaf"/);
  assert.match(html, /unit-org-tree-canvas/);
  assert.match(html, /unit-org-connectors/);
  assert.match(html, /Commander Two/);
  assert.match(html, /unit-org-reveal/);
  assert.match(html, /42/);
  assert.match(html, /Descendants/);
  assert.doesNotMatch(html, /audits|K\/D/i);
});

test("organization tree starts at the hierarchy root and highlights a selected descendant", () => {
  const html = renderToStaticMarkup(
    <UnitOrganizationTree selected={units[1]} units={units} />,
  );

  assert.match(html, /aria-label="Organization family tree"/);
  assert.match(html, /role="tree"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /href="\/units\/root"/);
  assert.match(html, /href="\/units\/sibling"/);
  assert.match(html, /href="\/units\/leaf"/);
  assert.doesNotMatch(html, /href="\/units\/other"/);
});
