---
contract_id: events-public-presentation-batch
path: docs/contracts/events-public-presentation-batch.md
documentation_path: src/modules/events/MODULE.md
status: stable
version: 0.2
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000060-001
---

# Events Public Presentation Batch Read

## Purpose

Provide compact public Event identity and presentation metadata for
multi-Event consumers without exposing Event management data or issuing one
query per Event.

## Producer

`events`

## Consumers

- Public Player profile presentation

## Inputs

An array of Event IDs. IDs are trimmed, deduplicated in first-request order,
and empty IDs are ignored.

## Outputs

One row per matching Event, in request order:

| Field | Type | Meaning |
|---|---|---|
| `eventId` | string | Stable public Event route identity |
| `name` | string | Public Event name |
| `eventType` | string | Existing free-text Event type for the shared type presentation |
| `scheduledAt` | Date | Events-owned Event schedule/occurrence source |
| `map` | string or null | Public map label |
| `opponent` | string or null | Preserved legacy opponent label; new Event forms do not set it |
| `attackerName` | string or null | Optional Event-side display name for attackers |
| `defenderName` | string or null | Optional Event-side display name for defenders |
| `rallyMinutesBeforeStart` | integer | Minutes before `scheduledAt`; zero means rally at start |
| `durationMinutes` | positive integer or null | Planned duration; null for legacy Events with unknown duration |
| `invitePolicy` | `OPEN` or `CLOSED` | Whether eligible Units may request participation |

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `getPublicEventPresentationBatch` | `(eventIds) => Promise<PublicEventPresentation[]>` | yes | One Events-owned read for multiple public Event presentations |

## Semantics

The read returns only the named public presentation fields for matching
Events. Rally and expected-end timestamps are derived from `scheduledAt` and
the corresponding minute values; they are not independently persisted. The
read does not derive Statistics windows, inspect Audit data, determine Event
outcome, or make win/loss claims relative to a Player.

## Guarantees

- A non-empty request performs one database read.
- Empty input performs no database read.
- Returned Events follow request order and omit missing IDs.
- No owner, manager, or authorization information is exposed.

## Constraints

The operation is public and read-only. Consumers use Event IDs for navigation
and Events-provided values for display.

## Compatibility Expectations

The output extension is additive. Existing fields, including the legacy
`opponent` value, remain available. Existing Event list/detail reads and
management authorization are unchanged.

## Stability

Stable; additive field extension approved by BCR-20261103-013.

## Related Tickets

- TKT-20261103-000053-001
- TKT-20261103-000060-001

## Related BCRs

- BCR-20261103-012
- BCR-20261103-013
