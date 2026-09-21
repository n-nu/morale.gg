---
contract_id: events-units-event-creation-authorization
path: docs/contracts/events-units-event-creation-authorization.md
documentation_path: docs/contracts/events-units-event-creation-authorization.md
status: stable
version: 0.1
last_reviewed: 2026-09-21
updated_by_ticket: TKT-20260921-000016-001
---

# Events-to-Units Event-Creation Authorization

## Purpose

Provide the Events module with the semantic decision required to determine
whether an authenticated User may create a standalone Event.

## Producer

Units module, through its server-only authorization boundary.

## Consumers

- Events module Event-creation workflow.

## Inputs

A server-resolved Auth.js User ID. The consumer supplies no Unit ID and must
not accept a client-provided authority identity.

## Outputs

A `Promise<boolean>`: `true` when the User has at least one currently
effective `MANAGE_EVENTS` permission anywhere in Units authority; otherwise
`false`.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `canCreateEvent` | `(userId: string) => Promise<boolean>` | yes | Semantic eligibility decision for creating a new standalone Event |

The final implementation name may change only if the approved BCR preserves
this exact semantic boundary and updates this contract before consumption.

## Semantics

Events calls the operation immediately before its protected Event-creation
workflow. A false result denies creation. A true result permits Events to
continue its own validation and atomically persist the authenticated creator
as Event owner.

Eligibility is evaluated at decision time. The qualifying Unit, membership,
grant, scope, or authority path has no meaning after creation and grants no
management authority over the created Event.

## Guarantees

Units owns evaluation of current effective `MANAGE_EVENTS` authority. The
producer preserves its fail-closed rules for missing Users, malformed Unit or
RootUnit state, revoked grants, invalid memberships, and invalid or broken
delegation lineage.

The producer returns only the semantic boolean. It does not return or expose a
qualifying Unit, `PermissionGrant`, `PermissionScope`, membership,
`authorityLevel`, `RootUnit`, Commander, hierarchy record, delegation lineage,
or revocation detail.

## Constraints

- The operation is server-only.
- The User ID must come from the authoritative server authentication flow.
- Events supplies no Unit ID and does not inspect Units persistence.
- Events must not store the qualifying Unit or authority record on Event.
- This capability authorizes creation only. It does not authorize management
  of an existing Event.
- `canManageEvent` and Event-manager administration remain Events-owned and
  are not part of this contract.

## Compatibility Expectations

This is an additive boundary over the existing Units authority evaluator.
Changes to effective Unit-authority semantics or to the boolean contract
require the applicable approved RED decision. Existing Unit-targeted
capabilities remain unchanged.

## Stability

Stable for the approved MVP boundary under ADR-20260921-004 and
BCR-20260921-002. The semantic boolean surface is approved; implementation is
pending TKT-20260921-000016-001.

## Related Tickets

- TKT-20260920-000013-001
- TKT-20260921-000016-001

## Related ADRs / BCRs

- ADR-20260915-002
- ADR-20260921-004
- BCR-20260921-002