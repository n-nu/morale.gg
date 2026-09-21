---
contract_id: players-units-roster-authorization
path: docs/contracts/players-units-roster-authorization.md
documentation_path: docs/contracts/players-units-roster-authorization.md
status: stable
version: 0.1
last_reviewed: 2026-09-21
updated_by_ticket: TKT-20260921-000014-001
---

# Players-to-Units Roster Authorization

## Purpose
Provide the Players module with the approved semantic authorization check for
Unit roster mutations.

## Producer
Units module, through its server-only authorization boundary.

## Consumers
- Players module

## Inputs
A server-resolved Auth.js User ID and the target Unit ID. The caller must not
accept a client-provided authority identity.

## Outputs
A `Promise<boolean>`: `true` when the User may manage the target Unit roster;
otherwise `false`.

## Fields / Operations
| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `canManageRoster` | `(userId: string, unitId: string) => Promise<boolean>` | yes | Semantic allow/deny decision for roster management |

## Semantics
The Players module calls this operation immediately before protected roster
mutation. A false result denies the operation. A true result permits the
membership mutation to continue after target validation.

## Guarantees
The producer evaluates current Units authority according to its approved
semantics and returns only the semantic decision. The consumer does not receive
or depend on authority persistence details.

## Constraints
The operation is server-only. Consumers must not inspect or import
PermissionGrant, PermissionScope, RootUnit, Commander, delegation lineage,
revocation internals, or authorityLevel. The User ID must be resolved by the
server authentication pattern.

## Compatibility Expectations
This additive contract preserves the existing Units capability implementation.
Changes to authority semantics require a separate approved Units decision.

## Stability
Stable for the MVP consumer; the semantic boolean surface is the supported
contract, while producer internals remain private.

## Related Tickets
- TKT-20260920-000013-001
- TKT-20260921-000014-001

## Related ADRs
- ADR-20260915-002
