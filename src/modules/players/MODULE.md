---
module_id: players
path: src/modules/players
status: active
version: 0.4
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000054-001
---

# Players

## Purpose
Persistent Roblox game Player identity, cached Roblox presentation metadata,
and history-preserving Unit rosters.

## Ownership
Player persistence, cached Roblox username/headshot metadata, UnitMembership
periods, active roster derivation, registration, membership mutations, lookup,
history, and Player presentation.

## Non-Ownership
Website identity, Unit identity/hierarchy/authority, Events, Audit persistence,
and statistics.

## Public Interface
Server-only registration, add/end membership workflows, Player/roster/history
queries (including count-only roster reads and the batch identity-presentation
read), explicit Roblox lookup/confirmation, and batch Player resolution and
preview operations for Audits. A bounded manual backfill refreshes metadata for
existing numeric Player IDs without creating Players; use
`npm run players:backfill-roblox-identities -- --dry-run --limit=100` to inspect
a bounded batch before writing.
Application routes `/players`, `/players/[id]` and a roster section on
`/units/[unitId]` remain stable; the Player profile composes the Units-owned
current Player Awards read.

## Inputs
Stable external Roblox User ID for new Player creation, existing stable
`playerId` values for historical records, and internal Player/Unit/membership
IDs. Website identity is used only for authorization.
Mutation authority comes exclusively from the server-resolved website session.

## Outputs
Persistent Players, active/ended membership periods, public identity and history,
and safe actionable validation errors.

## Dependencies
Shared Prisma and authentication helpers, plus explicit server-side calls to
Roblox Users and Thumbnails APIs. Units supplies the approved
`canManageRoster(userId, unitId)` semantic authorization contract and the
Units-to-Players Award read. Units consumes the Players-owned
`players-units-roster-read` contract for active Unit IDs when validating Award
grant scope. Audits consumes Players' batch resolution, preview, and cached
identity-presentation contracts.

## Invariants
Players have no User relationship or authority fields. Memberships reference the
internal Player primary key; external `Player.playerId` remains unique and stable.
New IDs must be positive, safe-integer numeric Roblox User IDs. Existing legacy
IDs remain resolvable by exact ID and are never rewritten. Roblox username,
headshot URL, and sync timestamp are mutable nullable metadata, not identity.
No Auth.js/Google name or image is used as Player presentation. Ending a
membership only sets its end timestamp. Rejoining creates a new period.
The PostgreSQL partial unique index forbids duplicate active Player/Unit pairs.
Foreign keys restrict deletion of referenced Players and Units. Rosters derive
only from periods whose `endedAt` is null.

## Permissions / Authority
Reads are public. Registration requires authentication. Every add/end resolves
the session server-side and calls `canManageRoster` immediately before writing.
UI controls are convenience only; the server always enforces authorization.

## Internal Structure
`server/` contains persistence, workflows and server actions.
`server/queries.ts` owns per-Unit roster rows, grouped active roster counts,
minimal active Unit-ID lookup, and the batch cached identity-presentation read;
all membership reads derive current membership from `endedAt = NULL`.
`server/statistics-source.ts` accepts the stable game Player ID, resolves its
internal Player key inside Players, and evaluates the matching UnitMembership
period at canonical Event time without exposing the internal key to Statistics.
`components/` contains roster presentation and forms. Stacked public-profile
identity keeps the avatar primary and displays the cached username as subdued
secondary text; inline identity remains unchanged. `validation.ts` contains
input rules.

## Extension Points
Local presentation, validation and queries may evolve within the approved scope.

## Limitations
New IDs must be canonical positive numeric Roblox User IDs that fit a safe
integer. Existing legacy IDs remain exact, case-sensitive text (trimmed,
1–128 characters, no whitespace/control characters) and are reusable without
Roblox verification.
`Player.name` is retained as nullable compatibility data only and must not be
used for global presentation. Cached metadata becomes stale after 14 days and
refreshes only during explicit lookup, confirmation, or manual backfill; normal
page rendering uses cached metadata and never calls Roblox. Lookup returns at
most 50 matches; history and individual rosters are unpaginated.
Unit demo fixtures do not have persistent rosters and show no mutation controls.

## Related Contracts
- `docs/contracts/players-units-roster-read.md`
- `docs/contracts/players-player-identity-presentation.md`
- `docs/contracts/units-players-awards.md`
- `docs/contracts/players-statistics-membership-history.md`
- `docs/contracts/players-units-roster-authorization.md`
- `docs/contracts/players-audits-player-resolution.md`

## Related ADRs
- ADR-20260915-002; approved boundary BCR-20260921-001; ADR-20260927-006.

## Related BCRs
- BCR-20261102-010 (approved; Units-owned Awards and the active Unit-ID read).
- BCR-20261103-011 (approved; cached Roblox identity metadata and confirmation).

## AI Working Rules
GREEN local implementation is allowed under an active ticket. Changes to identity,
history, ownership or the Units contract require explicit RED approval; the
count-only batch roster read is approved by BCR-20261102-008.
