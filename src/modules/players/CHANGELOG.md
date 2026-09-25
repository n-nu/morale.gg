# Players changelog

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
