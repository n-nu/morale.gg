---
contract_id: events-audits-event-participation-management
path: docs/contracts/events-audits-event-participation-management.md
documentation_path: docs/contracts/events-audits-event-participation-management.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000020-001
---

# Events-to-Audits Event Participation and Management

## Purpose

Allow Audits to validate approved EventParticipation and use the Events-owned
Event-management decision without exposing Event authorization persistence or
allowing participation mutation.

## Producer

Events module.

## Consumers

- Audits module.

## Inputs

Server-resolved identifiers for EventParticipation, Event, User, and the
requested Event-management operation.

## Outputs

An approved participation context containing its Event and represented
persistent Unit identifiers, plus the semantic `canManageEvent(userId,
eventId)` boolean decision.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `getApprovedParticipationContext` | `(participationId) => Promise<context \| null>` | yes | Resolves only an approved participation and its Event/Unit identity |
| `canManageEvent` | `(userId, eventId) => Promise<boolean>` | yes | Events-owned authority for Event command-group administration |

## Semantics

Denied or requested participation is not eligible for atomic Event-unit
creation. The context does not expose Event manager rows. Audits cannot use
this contract to approve, deny, edit, or delete EventParticipation. Group
administration is allowed only when Events returns true for the Event.

## Guarantees

Events remains authoritative for participation state and Event management.
The returned Unit is descriptive participation context, not an authority
anchor. Event manager persistence and Unit authority details remain private.

## Constraints

- Server-only; client identity is never authoritative.
- Participation state is read-only to Audits.
- Event and participation identifiers must belong to the same persisted Event.
- The contract does not grant Audit submission authority.

## Compatibility Expectations

The existing EventParticipation uniqueness and REQUESTED/APPROVED/DENIED
lifecycle remain unchanged. Additive fields may be introduced only without
changing these semantics. Any authority or lifecycle change requires a new
architecture decision.

## Stability

Stable boundary approved by ADR-20260927-006 and BCR-20260927-004;
implementation remains pending the authorized Audit implementation ticket.

## Related Tickets

- TKT-20260927-000020-001

## Related ADRs

- ADR-20260921-004
- ADR-20260927-006