---
contract_id: units-players-awards
path: docs/contracts/units-players-awards.md
documentation_path: src/modules/units/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-11-02
updated_by_ticket: TKT-20261102-000050-001
---

# Units -> Players Public Award Read

## Purpose

Provide the current Player Awards needed by public Player profile presentation
without transferring Award persistence, grant ownership, or authorization to
Players.

## Producer

`units`

## Consumers

- `players` public Player profile presentation
- application route adapters composing the public Player profile

## Inputs

The stable external game `playerId`. The read is server-side and returns only
current Player Award associations.

## Outputs

One presentation row per current Player Award association, ordered by RootUnit
ID, Award order, Award name, and Award ID.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `id` | Award ID string | yes | Stable Award-definition identity for presentation and action targeting; it is not a grant ID. |
| `rootUnitId` | Unit ID string | yes | RootUnit that owns the Award definition. |
| `name` | string | yes | Public Award name. |
| `description` | string or null | yes | Optional public Award description. |
| `imageRef` | safe site path, HTTPS URL, or null | yes | Optional validated image reference. |
| `sortOrder` | integer | yes | RootUnit-local Player Award ordering value. |
| `getPlayerAwards(playerId)` | array of rows above | yes | Current Player Awards for the stable external Player ID. |

`Player.id`, grant IDs, issuer identity, dates, citations, and historical
revocation data are not part of this presentation contract.

## Semantics

Only grants whose Award definition category is `PLAYER` are returned. The
ordering is deterministic and RootUnit-local. A Player with no current grants
receives an empty array. The read does not expose available definitions or
manager controls; those are resolved separately by the Units management
workflow.

## Guarantees

- Award definitions and grant associations remain Units-owned.
- Player identity remains the stable external `playerId`; no internal Player
  primary key is exposed.
- The result represents current associations only; removal deletes the current
  association and does not create revocation history.
- Rendering the result grants no authority. All grant and removal operations
  revalidate the session and `MANAGE_AWARDS` scope in Units.
- Images use the existing safe site-path/HTTPS reference rules; uploads are not
  supported.

## Constraints

- Players must not query Award or grant tables directly.
- The contract does not define Award dates, citations, issuer attribution,
  repeat awards, history, Event links, or derived statistics.
- Unit Awards are presented by Units and are not included in this contract.

## Compatibility Expectations

The read is additive to the Players profile. No existing Player identity,
roster, or history behavior changes.

## Stability

Stable; the Award domain and cross-module read were approved by
BCR-20261102-010.

## Related Tickets

- TKT-20261102-000050-001

## Related BCRs

- BCR-20261102-010
