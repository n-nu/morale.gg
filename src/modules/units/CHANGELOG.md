# Changelog: Units

## 2026-11-03 - Hover-only medal emphasis

- Mouse clicks no longer pin medals open through disclosure or pointer focus.
- Leaving the medal stops its motion and resets its pose; keyboard and touch
  retain access to details without hover animation. Held dragging is preserved.

## 2026-11-03 — Held medal drag

- Added bounded mouse/pen drag tilt while holding a medal, with pointer capture
  and a smooth return to center on release or cancellation.
- Preserve idle motion, normal clicks/taps, touch scrolling, and reduced motion.

## 2026-11-03 — TKT-20261103-000057-001

- Replaced pointer-follow tilt with a brief centered click/tap/keyboard tilt
  that returns to neutral, and added slow idle side-to-side angle motion.
- Pause ambient movement while a medal is pressed and disable both animations
  under reduced-motion preferences.

## 2026-11-03 — Player medal tilt range

- Increased pointer response and tilt caps: horizontal tilt is limited to 15
  degrees and vertical tilt to 12 degrees.

## 2026-11-03 — TKT-20261103-000056-001

- Kept the Player Award front artwork crisp by removing image filters/shadows
  from the front layer and moving subtle silhouette shadow to the darkest depth
  layer; expanded the stepped shallow extrusion to 6 CSS pixels.
- Changed fine-pointer tilt to use movement deltas, with direction-correct
  rotation, speed-sensitive clamping, and a short inactivity settle timer.
- Confirmed existing medal image sources are high-resolution originals rather
  than 48px assets; no image files or Award data were changed.

## 2026-11-03 — TKT-20261103-000055-001

- Added shallow, alpha-preserving depth and restrained perspective to Player
  medals while preserving the existing enlargement, neighbor shifts, and
  Award details behavior.
- Added smoothed, clamped fine-pointer tilt without per-move React renders;
  keyboard focus receives a stable emphasis, while touch and reduced-motion
  interactions avoid pointer-follow animation.

## 2026-11-03 — TKT-20261102-000050-001

- Refined public Player Award presentation into a compact medal gallery:
  images show by default, while hover, keyboard focus, or click reveals the
  title and description with a gentle lift animation. Medals are square,
  transparent, closely overlapped at rest, and smoothly grow/space apart over
  500ms while active; missing images retain a bordered placeholder.
- Kept medal slots fixed while enlarged images and details float above the
  page; nearby medals move horizontally without pushing content down.
  Increased resting overlap to 8px and removed the divider above Player Awards.
- Removed the remaining Player-header divider and metadata line below the
  medals; hover titles and descriptions now have no background panel or shadow.
- Preserved Unit Award presentation and scoped Player Award management
  actions; added motion-reduction and accessible interaction support.

## 2026-11-03 — TKT-20261103-000053-001

- Added a public batch Unit identity/image read for Player history rows.
- The read exposes no Unit authority, website Commander identity, or
  membership data and avoids per-row database queries.

## 2026-11-03 — scalable public Unit hierarchy

- Restricted `/units` to top-level visual Unit cards instead of rendering an
  expandable organization-wide directory.
- Focused detail trees on the selected Unit, with clickable ancestor
  breadcrumbs, informative collapsed branches, and wrapped sibling groups.
- Bounded detail hierarchy reads to the selected subtree and its ancestors;
  no Unit schema, hierarchy, membership, or authorization behavior changed.

## 2026-11-03 — TKT-20261103-000051-001

- Updated Player roster presentation to use cached Roblox username/headshot
  metadata while preserving stable Player IDs and membership history.
- Consumed the Players-owned identity-presentation read; no Roblox requests
  occur during Unit page rendering.

## 2026-11-02 — TKT-20261102-000050-001

- Replaced Medal definitions with RootUnit-scoped Player and Unit Award
  catalogs, preserving existing definitions and assigning deterministic
  initial order through a forward migration.
- Added current Player/Unit grant associations, derived recipient counts,
  category validation, and server-enforced hierarchy-scoped `MANAGE_AWARDS`.
- Added public Player/Unit Award presentation and scoped assignment controls;
  orphaned Player Award removal is restricted to the RootUnit owner or a
  full-root Award manager.
- Published the Units-to-Players Award read contract and updated the
  Players-to-Units active-Unit-ID authorization read contract.

## 2026-11-02 - rank catalog layout and imagery

- Simplified rank rows to saved Order, Image, Rank short code, and Rank name.
- Moved add/edit forms out of narrow action cells into full-width disclosures.
- Added user-approved nullable rank abbreviation and image-reference fields;
  existing names, descriptions, ordering, and owner-only authorization are preserved.
- Kept rank descriptions editable without adding them to the compact list.

## 2026-11-02 — organization family tree refinement

- Replaced the selected-Unit horizontal descendant list with a full branch
  family tree rooted at the top-level organization.
- Centered the root, spaced each sibling subtree by its leaf count, and added
  SVG branch connectors with downward arrowheads.
- Kept oversized hierarchies in a local horizontal-scroll region and centered
  the initial view on the root.

## 2026-11-02 — TKT-20261102-000048-001 refinement

- Simplified directory and tree nodes to show Unit imagery, name, and commander
  by default; member and all-descendant counts animate into view on hover or
  keyboard focus.
- Removed audit-derived performance from compact Unit cards and tree nodes.
- Preserved a touch-friendly always-visible details fallback where hover is
  unavailable; the full Unit Statistics section remains on detail pages.

## 2026-11-02 — TKT-20261102-000048-001

- Replaced the text-heavy public hierarchy table with responsive Unit cards
  using existing profile imagery, commander identity, active roster counts,
  direct subunit counts, descriptions, and type-partitioned performance.
- Strengthened public Unit identity headers and descendant nodes while keeping
  visible tree branches, ancestor navigation, and local overflow handling.
- Added hover/focus previews and graceful missing-data states without adding
  Unit fields or changing authorization, hierarchy, roster, or statistics
  semantics.
- Consumed the approved Players batch roster-count read (BCR-20261102-008).

## 2026-09-26

- Date: 2026-09-26
- Ticket ID: TKT-20260926-000019-001
- Change: Added Unit profile metadata and public presentation; a protected Unit management route for profiles, authorized-user periods, authority levels, permission grants, child creation, and moves; and RootUnit-owner Rank/Medal catalogs.
- Reason: Deliver the approved Units management vertical slice while preserving existing permission, Commander, RootUnit, delegation, and history invariants.
- Affected contracts/modules: Units only. Players roster and Events ownership/contracts are unchanged. Two user-authorized compatibility updates keep the database seed and Event test fixtures using active-membership lookups.
- Commit reference: N/A

### Verification

- Unit authorization and validation: 17/17 passed.
- Unit PostgreSQL workflows: 9/9 passed.
- Ticket 14 Player/Roster PostgreSQL workflows: 8/8 passed.
- Ticket 14 roster UI: 3/3 passed.
- Event/shared-auth regressions: 32/32 passed.
- Prisma validate/generate/deploy/status, lint, type-check, production build, browser route smoke, and `git diff --check`: passed.

### Initial Blocker (Resolved 2026-09-27)

- The initial delivery left Unit deletion unimplemented pending a RED decision. The human-approved limited hard-delete policy and implementation are recorded below; archive/tombstone state remains excluded.

## 2026-09-27

- Date: 2026-09-27
- Ticket ID: TKT-20260926-000019-001
- Change: Added transactional hard deletion for otherwise-unused non-RootUnit leaf Units, with protected-history guards, bootstrap Commander membership cleanup, a management action/form, and deferred Commander-trigger support.
- Reason: Complete Ticket 19 under the approved limited-deletion decision while retaining Player, Event, membership, grant, and delegation history.
- Affected contracts/modules: Units and shared Prisma trigger behavior only. No cross-module contracts, Player/Event ownership, or authorization semantics changed.
- Commit reference: N/A

### Verification

- Units authorization/validation/workflows: 35/35 passed, including all safe-delete regressions.
- Ticket 14 Player workflows: 8/8 passed; roster UI: 3/3 passed.
- Event and website-admin regressions: 32/32 passed.
- Prisma validate/generate: passed; migration deploy/status: 12 migrations applied, schema up to date.
- Lint, type-check, production build, browser route smoke, and `git diff --check`: passed.
