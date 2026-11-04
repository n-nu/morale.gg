---
contract_id: statistics-player-profile-performance
path: docs/contracts/statistics-player-profile-performance.md
documentation_path: src/modules/statistics/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000053-001
---

# Statistics Public Player Profile Performance Read

## Purpose

Provide canonical timeframe- and Unit-type-filtered Player, Commander, and
General summaries with chronological Event history for the public Player
profile.

## Producer

`statistics`

## Consumers

- Public route `/players/[id]`

## Inputs

- Stable game `playerId`.
- Existing Statistics window: `14d`, `30d`, or `all-time`.
- Optional Audit Unit type: `REGULAR`, `RIFLES`, `CAVALRY`, or `ARTILLERY`.
- Independent one-based detail page numbers for Player, Commander, and General
  history.

## Outputs

- The selected `playerId` and window.
- Player summary partitioned by Unit type, including Audit appearances, Kills,
  Deaths, Assists, K/D, and K+A/D.
- Commander summary partitioned by Unit type, including battles commanded,
  combat totals, pooled K/D, Tickets, Flag Captures/Losses, Stars, and average
  Player count per battle.
- General summary using the canonical qualifying-command, distinct-Event,
  Company-count, and per-type distribution semantics.
- Player, Commander, and General history pages with Event identity, canonical
  Event occurrence time, relevant Unit identity, and role-specific metrics.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `getPlayerProfileStatistics` | `(options) => Promise<PlayerProfileStatistics>` | yes | One Statistics-owned profile read using the shared Event-time window policy |
| `playerSummary` | Ranker metrics grouped by Audit Unit type | yes | Full selected-window Player totals; never a cross-type aggregate |
| `commanderSummary` | Commander metrics grouped by Audit Unit type | yes | Full selected-window Commander totals; never a cross-type aggregate |
| `generalSummary` | canonical General aggregate or null | yes | Full selected-window General metrics across the represented type distribution |
| `playerHistory` | page of Player Audit rows | yes | One row per matching current-effective-finalized Audit appearance |
| `commanderHistory` | page of Commander rows | yes | One row per matching current-effective-finalized Audit commanded by the Player |
| `generalHistory` | page of qualifying command rows | yes | One row per General-command group with at least two unique descendants |

History pages contain at most 50 rows and report `page`, `pageSize`,
`totalRows`, and `pageCount`. Each role has an independent page.

## Semantics

Statistics consumes canonical Event occurrence times and Audits'
current-effective-finalized observations. It alone applies the selected
window, optional Unit-type filter, aggregation, and ratio rules. The Unit-type
filter applies to Player and Commander summaries/history; General summary and
history always preserve the complete Company type distribution.

Player and Commander summaries remain partitioned by Unit type. Selecting
`All` returns those type partitions rather than introducing a cross-type
aggregate. Player appearances and Commander battles follow their existing
Ranker and Commander reader definitions. General summaries and qualifying
groups preserve the existing General reader definitions.

Rows are ordered newest first by canonical Event occurrence time, with
descending Event ID and stable ascending Unit/record IDs as tie breakers.
Summary values always cover the complete selected window and are independent
of the requested history page. Ratios preserve raw numerators/denominators and
the established zero-denominator representation.

General command rows may contain a side only when every known descendant
observation has the same non-null side. No Event victory/defeat is inferred.

## Guarantees

- One public Statistics read produces all three role summaries and histories
  from the same selected Event set and effective finalized Audit source.
- The read does not expose Auth.js identity, Audit submitter identity, drafts,
  internal Player database IDs, or `AtomicEventUnit` terminology.
- Histories are bounded per response; `totalRows` and page metadata make older
  records discoverable.
- No Roblox network request or mutable aggregate state is used.

## Constraints

- Existing Ranker, Commander, General, Event-time, Audit lifecycle, ratio,
  zero-denominator, and Unit-type semantics must not change.
- Event/Unit display metadata remains owned by Events and Units.
- No filtering or result outcome is reconstructed in presentation code.

## Compatibility Expectations

This is an additive query-time read. Existing Statistics readers and consumers
remain unchanged. No schema migration, stored aggregate, or source-record
mutation is required.

## Stability

Stable; approved by BCR-20261103-012.

## Related Tickets

- TKT-20261103-000053-001

## Related BCRs

- BCR-20261103-012
