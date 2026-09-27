# Changelog: Units

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
