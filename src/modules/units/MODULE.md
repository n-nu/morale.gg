---
module_id: units
path: src/modules/units
status: active
version: 0.1
last_reviewed: 2026-09-28
updated_by_ticket: TKT-20260928-000037-001
---

# Units

## Purpose
Own Unit profile and organizational hierarchy, RootUnit-bounded authority and
membership history, Units-owned management workflows, RootUnit organization
catalogs, and public browsing of persisted Units. Unit pages may compose the
Players-owned roster presentation without taking roster ownership.

## Ownership
Unit identity and profile metadata (name, description, image/flag/icon
reference, Discord invite, and external group link), parent/child hierarchy,
RootUnit designation and isolation, required Commander persistence,
authorized-user membership periods, permission grants and delegation lineage,
hierarchy queries/traversal, and public read-side Unit presentation are
Units-owned. Units also owns the approved server-enforced profile,
authorized-user/grant, and operation-specific structural workflows and their
management UI (TKT-20260926-000019-001). RootUnit-scoped Rank and Medal
catalogs and the narrow RootUnit settings capability are Units-owned under
ADR-20260926-005.

## Non-Ownership
Player identity, Player-to-Unit `UnitMembership`, roster persistence and
mutations, Events, EventParticipation, Audit persistence, statistics, and
generalized site-wide RBAC are outside this module boundary. Units may compose the
Players-owned roster read-side but must not modify or own it.

## Public Interface
Public pages: `/units` displays the Unit hierarchy; `/units/[unitId]` displays
public profile metadata, parent/child structure, and the Players-owned roster.
Authenticated management lives at `/units/[unitId]/manage`. It provides
Units-owned profile, authorized-user/grant, structural create/move, and
RootUnit-catalog workflows. The structural delete workflow hard-deletes only
otherwise-unused non-RootUnit leaf Units; its server-side transaction rejects
protected history and removes the sole bootstrap Commander membership only
with the Unit. No archive/tombstone workflow exists.

Server-only capabilities in `server/authorization.ts` include
`canManageUnit`, `canManageRoster`, `canManageAuthorizedUsers`,
`canRequestEventParticipation`, `canCreateEvent`, `canCreateChildUnit`,
`canMoveUnit`, `canDeleteUnit`, and `canManageRootSettings`. Structural
operations use operation-specific contextual checks; no generic structure
boolean is the sole authorization boundary. `canManageAuthorizedUsers` remains
permission coverage only; mutation workflows also enforce hierarchy, scope,
authority level, delegation, and Commander invariants. RootUnit settings are
restricted to the designated RootUnit's current Commander and its catalogs.
`canSubmitAudit` authorizes atomic-unit creation, Audit draft creation, and
Audit finalization for a target Unit through the Audits consumer contract; it
does not authorize command-group management.

## Inputs
Public reads accept a persisted Unit ID. Management actions resolve the
authenticated website User server-side; client-provided identity is never
authoritative. Forms submit only operation data and target IDs.
For a sample-data preview, explicitly set `UNITS_DEMO_MODE=true` in local `.env.local` and restart the development server if needed. Remove the flag or set it to `false` to restore database reads. The flag defaults to off.

## Outputs
Public outputs include Unit identity, profile metadata, hierarchy links, and
empty/not-found/error states. Management reads include authorized-user periods,
authority levels, grant/scope/revocation history, RootUnit catalogs, and valid
move destinations. The Unit detail route composes the Players-owned roster
view; demo fixtures remain read-only and have no management workflows.

## Dependencies
Shared server-only `src/lib/prisma.ts` and Prisma persistence; Next.js route
rendering. Players and Events consume only their approved Units capabilities
without transferring Unit identity, roster, Event, or authority ownership.

## Invariants
Persistence access stays server-only. Protected mutations resolve the session
server-side and re-evaluate operation authority in the write transaction.
Active authorized-user periods have `endedAt = NULL`; ended periods remain
persisted and are never reused. A partial unique index permits at most one
active `(userId, unitId)` period. Membership end transactionally revokes active
grants while retaining all membership, grant, and delegation history; grants
on ended memberships are ineffective and source revocation invalidates their
delegated descendants. Ordinary removal cannot end the current
Commander/level-0 membership. Hard deletion is atomic and allowed only for a
non-RootUnit leaf with no Player membership, EventParticipation, other
protected references, additional or historical authorized-user memberships,
or PermissionGrant/delegation history. Exactly one active level-0 membership
for the current Commander is bootstrap state and may be removed only in that
Unit deletion transaction. Root settings are restricted to the current
RootUnit owner and do not confer operational permissions. Each Rank and Medal
definition belongs to exactly one RootUnit. No depth limit is imposed by
navigation.

## Permissions / Authority
Hierarchy browsing is public and requires no session. ADR-20260915-002 assigns
RootUnit-bounded authority persistence and server-side authority resolution to
this module. Ordinary Unit operations require their applicable existing
operational permission; Commander/Unit-owner status grants none. Structural
create, move, and delete use operation-specific Units workflows enforcing the
approved `MANAGE_STRUCTURE` territory and contextual invariants. Deletion
rejects RootUnits, non-leaves, and any protected history; the narrowly approved
bootstrap Commander teardown applies only when the Unit itself is deleted.
The RootUnit settings capability authorizes only Rank/Medal catalog operations
for the current RootUnit owner. Players owns and enforces roster mutations
through `canManageRoster`. The server-only Commander bootstrap uses the bounded
website-administrator capability from ADR-20260915-003; it does not create Unit
authority or generalized RBAC.

## Internal Structure
`src/app/units/units.css` scopes a minimal neutral-dark table and detail presentation to the Units shell, with bright interaction accents and a visible sample-data label. The table shows names and direct-child counts; indentation communicates parent relationships.
`server/demo.ts` contains sample country roots and nested units reaching four levels, plus opt-in mode selection. Country names are ordinary Unit fixtures, not a persisted country classification. Demo pages show a sample-data label. Queries select fixtures before loading Prisma; database errors never switch to fixtures automatically. Sample IDs do not represent persisted Units.
`server/queries.ts` selects only public read fields, ordering lists by name then ID.
`server/authorization.ts` resolves current Unit ancestry, RootUnit consistency,
memberships, grants, revocation, delegation lineage, and scope at decision time;
Commander status does not bypass operational grants. `components/unit-links.tsx`
renders reusable hierarchy links. Route adapters and route-specific states live
in `src/app/units/`.
`server/statistics-source.ts` provides read-only direct Unit identity and
deduplicated descendant subtree resolution for Statistics perspectives.

## Extension Points
Local read presentation and query improvements may preserve this boundary. Future cross-module consumers require an approved documented contract before integration.

The approved `events-units-event-creation-authorization` contract is limited
to Event creation eligibility. Existing Event ownership, manager authority,
and manager administration remain Events responsibilities and must not be
implemented in Units.
Units also produces `units-audits-submission-authorization`; Audits consumes
only its semantic boolean and never receives authority persistence details.

## Limitations
Lists are unpaginated. The table assembles the loaded hierarchy client-side and
guards traversal against repeated IDs; it does not validate or repair stored
hierarchy cycles. Detail pages show one level at a time. Historically used
Units cannot be deleted in MVP; no archive/tombstone state or history cascade
is provided. Player roster persistence and mutations are owned by Players;
demo Units have no persistent rosters. Commander bootstrap is server-only and
has no public UI.

## Related Contracts
- `docs/contracts/players-units-roster-read.md` (stable).
- `docs/contracts/units-statistics-hierarchy-read.md` (stable).
- `events-units-event-creation-authorization` (stable).
- `units-audits-submission-authorization` (stable).

## Related ADRs
- ADR-20260914-001.
- ADR-20260915-002.
- ADR-20260915-003.
- ADR-20260921-004 (accepted; amends only Event-specific `MANAGE_EVENTS`
	semantics).
- ADR-20260926-005 (accepted; RootUnit catalogs, management authority, Unit
	profile metadata, and authorized-user membership lifecycle).
- ADR-20260927-006 (accepted; Audit submission authority boundary).

## AI Working Rules
GREEN local changes and logged YELLOW internal changes may proceed within an
active ticket. Authority persistence, schema, ownership, permission, and
contract semantics require the applicable approved RED authority; Ticket 19
and ADR-20260926-005 authorize only their recorded scope. Never import
persistence into client components or route pages directly.
