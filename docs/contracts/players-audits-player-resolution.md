---
contract_id: players-audits-player-resolution
path: docs/contracts/players-audits-player-resolution.md
documentation_path: docs/contracts/players-audits-player-resolution.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000020-001
---

# Players-to-Audits Player Resolution

## Purpose

Allow the Audit parser to reuse or create persistent Player identity from the
stable game PlayerID without coupling battlefield results to roster membership.

## Producer

Players module.

## Consumers

- Audits module.

## Inputs

Validated stable game PlayerID from an authenticated Audit workflow.

## Outputs

The persistent Player identifier and stable game PlayerID, whether reused or
newly created. The optional legacy display-name field is not populated by this
operation.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `resolveOrCreatePlayerByGameId` | `(playerId) => Promise<{ id, playerId }>` | yes | Reuses an existing Player or creates identity-only Player persistence |

## Semantics

`Player.playerId` is the unique, trimmed, opaque game identity. Existing rows
are reused. Missing rows are created with no canonical name and no alias.
UnitMembership is never created, ended, or modified. Audit parsing does not
change roster state and accepts mercenary and never-rostered Players.

## Guarantees

Player identity is persistent and unique by game PlayerID. Existing Player
values are preserved. The operation is idempotent for the same valid PlayerID
and does not create website User relationships.

## Constraints

- Server-only; input validation follows Players' opaque game-ID rules.
- No Unit ID, membership, alias, or Auth.js User is accepted as an identity
  substitute.
- The nullable legacy `Player.name` field is compatibility data only and is
  not a canonical-name requirement.

## Compatibility Expectations

Existing non-null Player names remain unchanged. `Player.name` becomes nullable
through a forward migration so identity-only Players are valid. Future profile
presentation may derive a preferred display alias from UnitMembership aliases;
that behavior is outside this contract.

## Stability

Stable boundary approved by ADR-20260927-006 and BCR-20260927-004;
implementation remains pending the authorized Audit implementation ticket.

## Related Tickets

- TKT-20260927-000020-001

## Related ADRs

- ADR-20260927-006