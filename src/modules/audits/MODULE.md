---
module_id: audits
path: src/modules/audits
status: active
version: 0.1
last_reviewed: 2026-09-28
updated_by_ticket: TKT-20260928-000034-001
---

# Audits

## Purpose

Own immutable battlefield result history and the Event-scoped structures that
give those results their historical context.

## Ownership

- Atomic Event-unit identity, battlefield name, nullable side (`UNSORTED`,
  ATTACKER, or DEFENDER),
  Audit Unit type, and mandatory/optional participation metadata;
- Audit drafts, finalization, Unit type, Unit statistics, and player results;
- Audit Player role assignments;
- Event command groups and their strict tree, including durable Unsorted
  configuration state; and
- public finalized Audit and command-structure reads; and
- Event-manager battlefield-structure mutations through the Events-owned seam.

## Non-Ownership

Events owns Event identity, EventParticipation, Event management, and Event
authorization. Units owns persistent Unit identity and authority. Players owns
Player identity, aliases through UnitMembership, and roster history. Audits
does not mutate any of those records, own persistent Unit hierarchy, or provide
statistics aggregation.

## Public Interface

Server-only workflows create and configure atomic Event units through the
Events-owned manager seam or existing Audit workflow, create/edit
creator-owned drafts, parse PlayerID results, finalize Audits, and manage
Event command groups. Finalized Audit results and assigned-side Event
structures are publicly readable. The manager structure reader requires
Events-owned `canManageEvent` and is the only read that returns Unsorted nodes.
`getEffectiveFinalizedAuditObservations` exposes the approved
Statistics source read, including only the effective finalized Audit, raw
result/role facts, and command-group descendants. Drafts and draft-management
data are private. Exact DTOs and routes remain implementation choices within
these guarantees.

## Inputs

Authenticated website User identity, Event and approved EventParticipation
identifiers, persistent Unit identifiers, raw `playerId,kills,deaths,assists`
rows, Unit statistics, Unit type, role assignments, and command-tree edges.

## Outputs

Persistent atomic Event units, creator-owned drafts, immutable finalized Audits,
Player result/role records, and Event-scoped command-group history. Finalized
public reads contain result and structure data but do not automatically expose
the submitting Auth.js User identity.

## Dependencies

- `events-audits-event-participation-management` for approved participation
  validation and Events-owned `canManageEvent`;
- `units-audits-submission-authorization` for `canSubmitAudit`;
- `players-audits-player-resolution` for stable PlayerID resolve-or-create;
- Auth.js server session resolution; and
- shared server-only Prisma persistence.

## Invariants

- Each atomic Event unit belongs to exactly one approved EventParticipation;
  one EventParticipation may have many atomic units.
- Atomic units and command groups may be Unsorted (`side = null`) or assigned
  to ATTACKER/DEFENDER. Unsorted is manager-only configuration state.
- A group and every descendant have the same side. Organizer moves update the
  moved subtree atomically; an unassigned group cannot contain an assigned
  descendant.
- Each atomic Event unit has zero or one Audit. The atomic unit, not the Audit,
  is the stable battlefield identity.
- Only the creator edits an unfinished draft. Submission finalizes atomically;
  finalized Audit data, Player results, and roles cannot be edited or deleted.
- A Player result references persistent Player identity, never UnitMembership.
  Player resolution never creates or changes roster membership or aliases.
- Unit type is retained on the atomic result and remains partitionable for
  future Ranker, Commander, and General statistics.
- Every finalized Audit has exactly one Commander; Regular also has exactly
  one Flag Bearer. One Player may hold both Regular roles.
- A group and every atomic unit belong to one Event. Each has at most one
  immediate parent, and cycles, overlap, and cross-Event edges are rejected.
- Event-group changes never mutate or delete atomic units or finalized Audits.
- Finalized references protect Event, EventParticipation, Unit, and Player
  history from unsafe deletion. Drafts may be discarded by their creator;
  empty atomic units may be deleted when no command-group dependency exists.
- EventParticipation is the authoritative represented Unit claim for atomic
  units and command groups; duplicate descriptive Unit identities are not
  authoritative.

## Permissions / Authority

`canSubmitAudit(userId, unitId)` authorizes Audit draft creation and Audit
finalization for an approved participation of that Unit. Event-manager
atomic-unit construction and battlefield placement use Events-owned
`canManageEvent` through the approved Events -> Audits seam. The two decisions
never imply one another. Editing an existing draft additionally requires
creator ownership. Group administration uses Events-owned `canManageEvent`,
regardless of the represented Unit.

## Internal Structure

Server-only persistence and validation are organized around atomic units,
Audits, Player results/roles, and command groups. `server/statistics-source.ts`
implements the Audits-owned effective-finalized-Audit and raw observation read.
Parser, route, and component names are intentionally not part of this module
contract.

## Extension Points

Future rejection/replacement workflows, attendance derivation, Ranker,
Commander, General, and other statistics may consume the immutable source
records. Future stricter command-tree finalization may be added without
changing persistent Unit hierarchy semantics.

## Limitations

Statistics calculation, leaderboards, attendance calculation, Player profile
alias derivation, Audit correction/replacement, and Event-manager Audit
approval are out of scope for Ticket 20.

## Related Contracts

- `events-audits-event-participation-management`
- `units-audits-submission-authorization`
- `players-audits-player-resolution`
- `audits-statistics-effective-finalized-audit`
- `events-audits-event-battlefield-management`
- `audits-events-public-battlefield-structure`
- `statistics-events-event-battle-reader`

## Related ADRs

- ADR-20260927-006 (accepted Audit domain and Event-scoped structures)
- ADR-20260928-008 (accepted Event Battlefield sides, results, and reads)

## AI Working Rules

Local Audit validation and presentation may proceed under an active authorized
implementation ticket. Persistence, authorization, contract, ownership,
immutability, and cross-module changes require the approved Ticket 20 boundary
and must not mutate Events, Units, Players, or finalized history implicitly.