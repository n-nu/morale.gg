# Players changelog

## 2026-11-03 — TKT-20261103-000051-001

- Added nullable cached Roblox username, validated headshot URL, and sync time
  while preserving stable Player IDs, relational keys, memberships, and Audit
  history.
- Added server-only Roblox lookup/confirmation, cached batch presentation,
  batched Audit preview/resolution, and a bounded manual metadata backfill.
- Replaced global Player-name presentation with cached Roblox identity and
  neutral ID/avatar fallbacks; no Roblox calls occur during page rendering.
- Extended Players/Audits, Players/Units, and Statistics/Event Battle contracts
  under BCR-20261103-011.

## 2026-11-02 — TKT-20261102-000050-001

- Added the minimal current-Unit-ID read by stable Player ID for Units Award
  authorization; it returns distinct active memberships without exposing
  internal Player IDs or permitting roster mutation.
- Extended `players-units-roster-read` additively under BCR-20261102-010.

## 2026-11-02 — TKT-20261102-000048-001

- Added the approved count-only batch read for active Unit rosters, using one
  grouped query and preserving the existing `endedAt = NULL` semantics.
- Extended `players-units-roster-read` additively under BCR-20261102-008; no
  schema, membership, identity, or authorization behavior changed.

## 2026-09-26 — TKT-20260921-000014-001 post-merge verification

- Added a real-PostgreSQL integration regression covering authorized roster
  changes, unauthorized mutation rejection, and Event participation isolation.
- Verified the authenticated Player add/end flow in the browser, including
  persistent identity and ended membership history.

## 2026-09-25 — TKT-20260921-000014-001

- Added persistent external game identity independent of website Users.
- Added membership periods, restrictive foreign keys, valid-period checks and
  PostgreSQL partial uniqueness for active Player/Unit pairs.
- Added authenticated registration and transaction-backed, capability-protected
  add/end workflows; concurrent duplicate additions and removals fail safely.
- Added public Player search, identity/history pages and Unit roster integration,
  with server actions, manager controls, validation feedback and pending states.
- Added isolated PostgreSQL lifecycle/constraint tests and UI rendering tests.
- Preserved Unit demo browsing without querying or mutating fixture rosters.
