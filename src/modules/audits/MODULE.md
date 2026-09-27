---
module_id: audits
path: src/modules/audits
status: active
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000020-001
---

# Audits

## Purpose

Own immutable battlefield result history and the Event-scoped structures that
give those results their historical context.

## Ownership

- Atomic Event-unit identity and mandatory/optional participation metadata;
- Audit drafts, finalization, Unit type, Unit statistics, and player results;
- Audit Player role assignments;
- Event command groups and their strict tree; and
- public finalized Audit and command-structure reads.

## Non-Ownership

Events owns Event identity, EventParticipation, Event management, and Event
authorization. Units owns persistent Unit identity and authority. Players owns
Player identity, aliases through UnitMembership, and roster history. Audits
does not mutate any of those records, own persistent Unit hierarchy, or provide
statistics aggregation.

## Public Interface

Server-only workflows create atomic Event units, create/edit creator-owned
drafts, parse PlayerID results, finalize Audits, and manage Event command
groups. Finalized Audit results and Event command structures are publicly
readable. Drafts and draft-management data are private. Exact DTOs and routes
remain implementation choices within these guarantees.

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

## Permissions / Authority

`canSubmitAudit(userId, unitId)` authorizes atomic-unit creation, Audit draft
creation, and Audit finalization for an approved participation of that Unit.
Editing an existing draft additionally requires creator ownership. It does not
authorize Event command groups. Group administration uses Events-owned
`canManageEvent`, regardless of the represented persistent Unit.

## Internal Structure

Future server-only persistence and validation may be organized around atomic
units, Audits, Player results/roles, and command groups. Parser, route, and
component names are intentionally not part of this module contract.

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

## Related ADRs

- ADR-20260927-006 (accepted Audit domain and Event-scoped structures)

## AI Working Rules

Local Audit validation and presentation may proceed under an active authorized
implementation ticket. Persistence, authorization, contract, ownership,
immutability, and cross-module changes require the approved Ticket 20 boundary
and must not mutate Events, Units, Players, or finalized history implicitly.