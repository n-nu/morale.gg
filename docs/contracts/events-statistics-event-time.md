---
contract_id: events-statistics-event-time
path: docs/contracts/events-statistics-event-time.md
documentation_path: src/modules/events/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000024-001
---

# Events -> Statistics Canonical Event Time

## Purpose
Provide Events-owned canonical Event occurrence time and normalization to
Statistics. Statistics owns window policy and applies it to this time so every
family selects the same historical period.

## Producer
`events`

## Consumers
- `statistics` module

## Inputs
An Event identity or source observation set for which canonical occurrence
time is requested.

## Outputs
Canonical Event identity and its Events-normalized occurrence timestamp.

## Fields / Operations
| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `eventId` | stable Event identifier | yes | Event identity |
| `occurredAt` | Events-owned timestamp | yes | Canonical time for inclusion |

## Semantics
Events determines the canonical Event occurrence time and owns its
normalization. Statistics owns the trailing 14-day (default), trailing 30-day,
and all-time window policy, and applies it to the supplied canonical time.
Events does not select a Statistics window or decide window inclusion. Audit
creation, draft, finalization, correction, and supersession times never affect
inclusion.

## Guarantees
The timestamp is the canonical, Events-normalized occurrence time. All
Statistics families apply the same Statistics-owned window policy to it.

## Constraints
The contract does not expose Event-manager authorization, select Statistics
windows, decide inclusion, or permit Event or EventParticipation mutation.

## Compatibility Expectations
Changes to temporal representation must preserve one canonical, normalized
occurrence timestamp or require a new approved contract version. Changes to
Statistics window policy belong to Statistics and do not change this contract.

## Stability
Stable; approved by BCR-20260927-005 and ADR-20260927-007.

## Related Tickets
- TKT-20260927-000024-001

## Related ADRs
- ADR-20260927-007
