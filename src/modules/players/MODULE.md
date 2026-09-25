---
module_id: players
path: src/modules/players
status: active
version: 0.1
last_reviewed: 2026-09-25
updated_by_ticket: TKT-20260921-000014-001
---

# Players

## Purpose
Persistent Napoleonic Wars Player identity and history-preserving Unit rosters.

## Ownership
Player persistence, UnitMembership periods, active roster derivation, registration,
membership mutations, lookup, history, and their application presentation.

## Non-Ownership
Website identity, Unit identity/hierarchy/authority, Events, Audits, and statistics.

## Public Interface
Server-only registration, add/end membership workflows and Player/roster/history
queries. Application routes `/players`, `/players/[id]` and a roster section on
`/units/[unitId]`. No cross-module data contract is introduced.

## Inputs
Stable external game `playerId`, display name, internal Player/Unit/membership IDs.
Mutation authority comes exclusively from the server-resolved website session.

## Outputs
Persistent Players, active/ended membership periods, public identity and history,
and safe actionable validation errors.

## Dependencies
Shared Prisma and authentication helpers. Units supplies only the approved
`canManageRoster(userId, unitId)` semantic authorization contract.

## Invariants
Players have no User relationship or authority fields. Memberships reference the
internal Player primary key; external `Player.playerId` remains unique and stable.
Ending a membership only sets its end timestamp. Rejoining creates a new period.
The PostgreSQL partial unique index forbids duplicate active Player/Unit pairs.
Foreign keys restrict deletion of referenced Players and Units. Rosters derive
only from periods whose `endedAt` is null.

## Permissions / Authority
Reads are public. Registration requires authentication. Every add/end resolves
the session server-side and calls `canManageRoster` immediately before writing.
UI controls are convenience only; the server always enforces authorization.

## Internal Structure
`server/` contains persistence, workflows and server actions. `components/`
contains roster presentation and forms. `validation.ts` contains input rules.

## Extension Points
Local presentation, validation and queries may evolve within the approved scope.

## Limitations
Game IDs are treated as opaque, case-sensitive text (trimmed, 1–128 characters,
no whitespace/control characters); no unapproved numeric game-ID format is assumed.
Names are trimmed, 1–100 characters. Lookup returns at most 50 matches; exact
game-ID lookup is available. History and individual rosters are unpaginated.
Unit demo fixtures do not have persistent rosters and show no mutation controls.

## Related Contracts
- `docs/contracts/players-units-roster-authorization.md`

## Related ADRs
- ADR-20260915-002; approved boundary BCR-20260921-001.

## AI Working Rules
GREEN local implementation is allowed under an active ticket. Changes to identity,
history, ownership or the Units contract require explicit RED approval.
