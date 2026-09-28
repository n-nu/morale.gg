import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { buildHierarchy, getVisibleRows, UnitTable, type UnitRow } from "./unit-table";
import { UnitOrganizationTree } from "./unit-organization-tree";

const units: UnitRow[] = [
  { id: "root", name: "Root", imageRef: null, parent: null },
  { id: "child", name: "Child", imageRef: null, parent: { id: "root", name: "Root" } },
  { id: "leaf", name: "Leaf", imageRef: null, parent: { id: "child", name: "Child" } },
  { id: "other", name: "Other", imageRef: null, parent: null },
];

test("Unit hierarchy defaults to roots and expands descendants by depth", () => {
  const { roots, children } = buildHierarchy(units);
  const collapsed = getVisibleRows(roots, children, new Set());
  const rootExpanded = getVisibleRows(roots, children, new Set(["root"]));
  const allExpanded = getVisibleRows(roots, children, new Set(children.keys()));

  assert.deepEqual(collapsed.map(({ unit }) => unit.id), ["root", "other"]);
  assert.deepEqual(rootExpanded.map(({ unit }) => unit.id), ["root", "child", "other"]);
  assert.deepEqual(allExpanded.map(({ unit }) => unit.id), ["root", "child", "leaf", "other"]);
  assert.deepEqual(allExpanded.map(({ depth }) => depth), [0, 1, 2, 0]);
});

test("Unit directory exposes accessible bulk controls and explicit counts", () => {
  const html = renderToStaticMarkup(<UnitTable units={units} />);

  assert.match(html, /aria-label="Expand all units"/);
  assert.match(html, /aria-label="Collapse all units"/);
  assert.match(html, /Direct subunits/);
  assert.match(html, /Showing 2 of 4 units/);
});

test("Unit detail tree renders nested descendants as linked organizational branches", () => {
  const html = renderToStaticMarkup(<UnitOrganizationTree selected={units[0]} units={units} />);

  assert.match(html, /Organization/);
  assert.match(html, /Selected Unit/);
  assert.match(html, /href="\/units\/child"/);
  assert.match(html, /href="\/units\/leaf"/);
  assert.ok((html.match(/<ul class="unit-org-children">/g) ?? []).length >= 2);
});
