---
contract_id: players-units-roster-read
path: docs/contracts/players-units-roster-read.md
documentation_path: src/modules/players/MODULE.md
status: stable
version: 0.4
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000051-001
---

# Players -> Units Public Roster Read

## Purpose

Provide the public Unit roster presentation with active membership rows and
stable public Player identity without exposing the internal Player primary
key as a Player reference.

## Producer

`players`

## Consumers

- `units` public roster composition and presentation
- application route adapters rendering the public Unit roster
- `units` Award authorization, which checks current Unit membership without
  reading Players-owned persistence directly

## Inputs

The persistent Unit ID whose current roster is requested. Reads are public;
roster mutation authority is separate and remains server-enforced.

The batch count operation accepts a list of persistent Unit IDs and returns
count-only summaries without Player or membership identities.

## Outputs

One read row per currently active Player/Unit membership, containing the
membership reference needed by the existing authorized end-membership action
and a presentation-safe Player reference. The additive count operation returns
one aggregate row per distinct requested Unit ID without roster identities.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `membershipId` | opaque internal membership identifier | yes | Identifies the membership action target; it is not a Player identity and does not authorize mutation. |
| `player.playerId` | stable game Player identifier | yes | Public Player identity for roster display, search, and profile navigation. |
| `player.robloxUsername` | string or null | yes | Cached mutable Roblox username; presentation metadata, not identity. |
| `player.robloxAvatarUrl` | HTTPS URL or null | yes | Cached validated Roblox headshot URL; presentation metadata, not identity. |
| `startedAt` | timestamp | yes | Start of this active membership period. |
| `getCurrentRosterCounts(unitIds)` | array of `{ unitId, memberCount }` | yes | Count-only batch read for the active roster of each distinct requested Unit ID. |
| `getCurrentUnitIdsForPlayer(playerId)` | array of Unit ID strings | yes | Minimal server-side authorization read of the Player's current active Unit memberships. |

`Player.id` is not part of the presentation DTO. Internal Player FKs remain
available only inside the Players-owned persistence/read boundary.

## Semantics

Only active membership periods are returned. Player identity is the stable,
canonical Roblox `playerId`; current roster membership does not define or
change Player identity. `Player.name` is not a global presentation source.
The public profile path is `/players/[playerId]`.
Mercenary or never-rostered Players are not excluded from other public Player
reads by this roster-specific contract.

`getCurrentRosterCounts` counts rows whose `endedAt` is null, matching
`getCurrentRoster`. It returns one row per distinct requested Unit ID,
including zero for an ID with no active memberships, in first-requested order.
An empty input returns an empty array. Counts do not reveal roster identities.
`getCurrentUnitIdsForPlayer` resolves the stable external `playerId`, returns
distinct active Unit IDs sorted by ID, and returns an empty array when the
Player has no active Unit memberships. It is an internal server-side read for
authorization; it does not expose a membership ID or the internal Player key.

## Guarantees

- The DTO does not expose the internal `Player.id`.
- A Roblox username or avatar URL never becomes a Player key.
- No Auth.js/Google name or image is used as Player presentation.
- A `playerId` identifies the same persistent Player in all public Player
  routes and links.
- The membership reference is an opaque action target only. The server must
  revalidate the session, membership, and roster authority before mutation.
- Player membership periods, rejoin behavior, attendance, and historical
  semantics are unchanged.
- Batch counts are derived from active membership rows at read time; no count
  is persisted or cached.
- The Unit-ID authorization read does not grant authority and does not permit
  roster mutation.

## Constraints

- This read does not grant roster mutation authority.
- Units and presentation code must not construct a Player profile URL from
  `Player.id` or `membershipId`.
- Audit and other internal relational FKs continue to use `Player.id` within
  their owning persistence boundary.
- This contract does not include Ranker, Attendance, or other Statistics
  aggregates; those remain Statistics-owned reads.

## Compatibility Expectations

The existing Unit roster membership actions remain available. The route value
used for Player navigation remains stable `playerId`; internal Player database
IDs are not accepted as a compatibility route alias. Cached Roblox identity
fields are additive, and the count-only batch operation and current-Unit-ID
authorization read do not change roster mutation semantics.

## Stability

Stable; the public/internal identity boundary and roster DTO were approved by
BCR-20260928-007. The additive count-only operation was approved by
BCR-20261102-008.

## Related Tickets

- TKT-20260928-000037-001
- TKT-20261102-000048-001
- TKT-20261102-000050-001
- TKT-20261103-000051-001

## Related BCRs

- BCR-20260928-007
- BCR-20261102-008
- BCR-20261102-010
- BCR-20261103-011