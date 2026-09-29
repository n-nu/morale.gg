---
contract_id: statistics-events-event-battle-reader
path: docs/contracts/statistics-events-event-battle-reader.md
documentation_path: src/modules/statistics/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-28
updated_by_ticket: TKT-20260928-000033-001
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
- expanded Player rows with Audit position/role, Unit-local alias when safely
  resolvable, otherwise stable PlayerID, and K/D/A/KDR;
- optional raw group aggregates only when unique flattened atomic descendants
  can be used without recursive ratios or type merging.

Rank is intentionally absent.

## Semantics

Statistics consumes the approved Audits, Events, Players, and Units read seams.
It owns aggregation, ratio behavior, duplicate prevention, and pending versus
finalized result presentation. It never derives Event result from metrics.

## Guarantees

The reader is public, query-time, and derived from authoritative source facts.
It excludes private authorization details and does not expose unrelated Event
or Audit records.

## Constraints

- KDR uses the approved zero-death display behavior.
- Groups are organizational by default; any aggregate uses unique flattened
  atomic descendants and raw metrics.
- No historical Rank-at-Event or current Rank substitute is returned.
- Result outcome is read from the authoritative Event result history, not
  calculated by Statistics.

## Compatibility Expectations

The DTO may grow additively. Any new metric, ownership transfer, persisted
aggregate, or change to ratio/result semantics requires a new architecture
decision.

## Stability

Stable; approved by BCR-20260928-006 and ADR-20260928-008.

## Related Tickets

- TKT-20260928-000033-001
- TKT-20260928-000035-001
