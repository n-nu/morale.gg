---
contract_id: statistics-events-event-battle-reader
path: docs/contracts/statistics-events-event-battle-reader.md
documentation_path: src/modules/statistics/MODULE.md
status: stable
version: 0.3
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000051-001
---

# Statistics -> Events Event Battle Reader

## Purpose

Provide the public Event-scoped Battle Statistics read without allowing Event
presentation to query Audit persistence or reproduce aggregation semantics.

## Producer

`statistics`

## Consumers

- `events`
- public Event presentation

## Inputs

An Event ID and optional presentation-safe expansion request. No Auth.js
submitter or manager identity is required for public reads.

## Outputs

An Event Battle DTO containing:

- side-separated atomic and group hierarchy;
- atomic identity/name, side, approved participation and persistent Unit
  display, Audit Unit type, finalized/pending result state, effective Audit
  Commander, K/D/A, approved zero-death KDR, Tickets, Flag Captures, Flag
  Losses, and Stars;
- expanded Player rows with Audit position/role, stable `playerId`, cached
  Roblox username/headshot metadata, a presentation label (`@username` or
  `Roblox ID {playerId}`), and K/D/A/KDR;
- Audit and command-group commander Player references with stable ID and
  cached Roblox username/headshot metadata;
- per-Company Player count and average Kills/Deaths/Assists per finalized
  Player appearance, including zero-valued appearances;
- finalized side summaries with Tickets and Flag Captures totals and pooled
  K/D;
- optional raw group aggregates only when unique flattened atomic descendants
  can be used without recursive ratios or type merging.

Rank is intentionally absent. Roblox metadata is optional and is never
replaced by Auth.js identity or a manually managed global Player name.

## Semantics

Statistics consumes the approved Audits, Events, Players, and Units read seams.
It owns aggregation, ratio behavior, duplicate prevention, and pending versus
finalized result presentation. It never derives Event result from metrics.
Per-Company K/D/A averages divide finalized Player result totals by the
finalized Player appearance count; a Company with no finalized Player
appearances has no averages. Side summaries aggregate finalized Company
values. Side K/D is pooled finalized Kills divided by pooled finalized Deaths
and uses the approved zero-denominator behavior; it is not an average of
individual Player K/D ratios.

## Guarantees

The reader is public, query-time, and derived from authoritative source facts
plus the Players-owned batch identity read. It excludes private authorization
details and does not expose unrelated Event or Audit records. Roblox APIs are
never called by the reader.

## Constraints

- KDR uses the approved zero-death display behavior.
- Pending Companies do not contribute to side summaries or Player-appearance
  averages.
- Missing Company Tickets and Flag Captures contribute zero to side totals,
  consistent with existing Statistics total aggregation.
- Groups are organizational by default; any aggregate uses unique flattened
  atomic descendants and raw metrics.
- No historical Rank-at-Event or current Rank substitute is returned.
- Result outcome is read from the authoritative Event result history, not
  calculated by Statistics.
- Player identity remains the stable game ID; username and avatar are cached
  optional presentation metadata only.

## Compatibility Expectations

The DTO may grow additively. Any new metric, ownership transfer, persisted
aggregate, or change to ratio/result semantics requires a new architecture
decision. Version 0.2 adds query-time side summaries and per-Company averages;
existing fields and calculations remain unchanged under BCR-20261102-009.

## Stability

Stable; approved by BCR-20260928-006 and ADR-20260928-008. The additive 0.2
extension is approved by BCR-20261102-009; cached Player identity presentation
is approved by BCR-20261103-011.

## Related Tickets

- TKT-20260928-000033-001
- TKT-20260928-000035-001
- TKT-20261103-000051-001
