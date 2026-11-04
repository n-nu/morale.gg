---
contract_id: players-audits-player-resolution
path: docs/contracts/players-audits-player-resolution.md
documentation_path: docs/contracts/players-audits-player-resolution.md
status: stable
version: 0.2
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000051-001
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
newly created. Internal relational keys are only returned to Audits.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `resolveOrCreatePlayerByGameId` | `(playerId) => Promise<{ id, playerId }>` | yes | Reuses an existing Player or creates identity-only Player persistence |
| `resolveOrCreatePlayersForAudit` | `(playerIds) => Promise<Array<{ id, playerId }>>` | yes | Batch reuses existing Players and verifies all new Roblox IDs before creating any |
| `previewAuditPlayerIdentities` | `(playerIds) => Promise<Preview[]>` | yes | Resolves cached or Roblox presentation for Audit confirmation without creating Players |

## Semantics

`Player.playerId` is the unique canonical Roblox User ID. Existing rows are
reused without requiring Roblox availability. Every new ID is validated and
resolved through Roblox in a batch before any new row is created; invalid IDs
or unavailable Roblox block finalization with an identifying error. Audit
drafts remain available without verification. After manager confirmation,
finalization creates missing Players with cached username/headshot metadata.
UnitMembership is never created, ended, or modified. Mercenary and
never-rostered Players remain supported.

## Guarantees

Player identity is persistent and unique by game PlayerID. Existing Player
values are preserved. The operation is idempotent for the same valid PlayerID
and does not create website User relationships.

## Constraints

- Server-only; new input IDs must be positive numeric Roblox User IDs.
- No Unit ID, membership, alias, or Auth.js User is accepted as an identity
  substitute.
- The nullable legacy `Player.name` field is not emitted or used for Player
  presentation.

## Compatibility Expectations

Existing non-null `Player.name` values remain in storage during compatibility
migration but are not used in Player presentation. Existing Audit rows,
foreign keys, and history remain unchanged.

## Stability

Stable boundary approved by ADR-20260927-006 and BCR-20260927-004, extended by
BCR-20261103-011.

## Related Tickets

- TKT-20260927-000020-001
- TKT-20261103-000051-001

## Related ADRs

- ADR-20260927-006
- BCR-20261103-011