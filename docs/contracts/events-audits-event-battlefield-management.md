---
contract_id: events-audits-event-battlefield-management
path: docs/contracts/events-audits-event-battlefield-management.md
documentation_path: src/modules/events/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-28
updated_by_ticket: TKT-20260928-000033-001
---

# Events -> Audits Event Battlefield Management

## Purpose

Authorize Event owners and EventAuthorizedUsers to manage the Event's
Audits-owned battlefield structure without granting Audit submission or
finalization authority.

## Producer

`events`

## Consumers

- `audits`

## Inputs

Server-resolved User ID, Event ID, approved EventParticipation ID, and a
requested atomic-unit or command-structure operation.

## Outputs

`canManageEvent(userId, eventId)` and approved participation context. The
contract exposes no Event manager persistence and no Unit authority records.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `canManageEvent` | `(userId, eventId) => Promise<boolean>` | yes | Existing Event-management decision |
| `getApprovedParticipationContext` | `(participationId) => Promise<context \| null>` | yes | Event, approved participation, and represented Unit context |

## Semantics

Audits may use the returned decision for atomic-unit create/configure/place/
remove and command-structure operations when the operation belongs to the
Event. Audits validates that the participation, Event, and target structure
are consistent. This contract does not authorize creating Audit drafts,
editing drafts, submitting, or finalizing Audits.

## Guarantees

Events remains authoritative for Event manager authorization and participation
status. Approved participation is acceptance only and does not assign a side.

## Constraints

- Server-only; client identity is never authoritative.
- Requested or denied participation returns no approved context.
- `canManageEvent` must not be implemented by inspecting Units authority.
- No operation mutates EventParticipation through this contract.

## Compatibility Expectations

Existing Event manager semantics and the EventParticipation lifecycle remain
unchanged. Any authority broadening requires a new BCR/ADR.

## Stability

Stable; approved by BCR-20260928-006 and ADR-20260928-008.

## Related Tickets

- TKT-20260928-000033-001
- TKT-20260928-000034-001

## Related ADRs

- ADR-20260921-004
- ADR-20260927-006
- ADR-20260928-008
