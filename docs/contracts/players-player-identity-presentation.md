---
contract_id: players-player-identity-presentation
path: docs/contracts/players-player-identity-presentation.md
documentation_path: src/modules/players/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000051-001
---

# Players Public Identity Presentation Read

## Purpose

Provide cached Roblox username and headshot metadata for public Player
presentation without changing the stable game Player identity or exposing the
internal Player database key.

## Producer

`players`

## Consumers

- Audits Player result and role presentation
- Statistics Event Battle and Leaderboard presentation

## Inputs

An array of stable `Player.playerId` values. Inputs are trimmed and deduplicated
while preserving first-request order.

## Outputs

One row for each matching Player, in request order, containing:

| Field | Type | Meaning |
|---|---|---|
| `playerId` | string | Stable canonical external game Player identity |
| `robloxUsername` | string or null | Cached Roblox username; presentation metadata only |
| `robloxAvatarUrl` | HTTPS URL or null | Cached validated Roblox headshot URL |

`Player.id`, Auth.js User fields, Roblox display names, and synchronization
timestamps are not part of this presentation DTO. Profile URLs are derived
from `playerId`.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `getPlayerIdentityPresentationBatch` | `(playerIds) => Promise<PlayerIdentityPresentation[]>` | yes | One Players-owned database read for multiple stable Player IDs; returns only matching Players and never calls Roblox |

## Semantics

`Player.playerId` is the canonical identity. A username is mutable convenience
metadata, and an avatar URL is presentation metadata. The read uses only
cached database values. It never refreshes Roblox metadata or falls back to
`Player.name`, Auth.js `User.name`, or Auth.js `User.image`.

Consumers use a Roblox username when present and otherwise display
`Roblox ID {playerId}`. They use a neutral placeholder avatar when the URL is
absent or invalid.

## Guarantees

- The read does not expose internal `Player.id`.
- IDs and row relationships are not changed by presentation metadata.
- Empty input returns an empty array without a database query.
- Duplicate inputs result in one output row per matching canonical ID.
- The result is a single batch database read, not one read per Player.
- No Roblox network request occurs through this operation.

## Constraints

- Server-only; consumers must not query Players-owned persistence directly.
- The avatar URL must be HTTPS and use an `rbxcdn.com` host.
- Consumers must treat `playerId` as the identity and username/avatar only as
  optional presentation metadata.

## Compatibility Expectations

This is an additive read contract. Existing stable IDs, profile routes,
foreign keys, membership history, Audit history, and Statistics semantics
remain unchanged.

## Stability

Stable; approved by BCR-20261103-011.

## Related Tickets

- TKT-20261103-000051-001

## Related BCRs

- BCR-20261103-011
