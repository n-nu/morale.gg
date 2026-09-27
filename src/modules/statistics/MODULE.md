---
module_id: statistics
path: src/modules/statistics
status: active
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000027-001
---

# Statistics

## Purpose
Provide public, read-derived MVP performance and attendance statistics over
authoritative historical domains.

## Ownership
Aggregation semantics, shared trailing 14-day (default), trailing 30-day, and
all-time window policy, raw numerator/denominator metric derivation, and public
Statistics query/read services. Statistics applies its window policy to
Events-owned canonical, normalized Event occurrence time and consumes the
Audits-owned current-effective-finalized-Audit decision; it owns neither source
decision.

## Non-Ownership
Audits, Player identity, UnitMembership, persistent Units and hierarchy, Events,
EventParticipation, command groups, Event dates, Auth.js identity, and all
authoritative gameplay history. Statistics owns no mutable aggregate state.

## Public Interface
Approved public read services for Ranker, Commander, General, Direct Unit
Performance, Organizational Unit Performance, Average Unit Performance, and
Player + Unit attendance. These services are implemented as public query-time
reads and key Player results only to stable game identity. Exact routes and DTOs
remain implementation choices.

## Inputs
Read-only source contracts from Audits, Events, Players, and Units; a requested
window, optional Unit type partition, Player/Unit/Event filters, and public game
identifiers.

## Outputs
Derived totals, counts, averages, raw ratio populations, zero-denominator ratio
states, type-partitioned combat results, named Unit perspectives, and attendance
obligation/status summaries. Auth.js submitter identity is not an output.

## Dependencies
- `audits-statistics-effective-finalized-audit`
- `events-statistics-event-time`
- `players-statistics-membership-history`
- `units-statistics-hierarchy-read`
- server-side PostgreSQL aggregation through approved application boundaries

## Invariants
Use Events-owned canonical, normalized Event occurrence time for every window
and apply one shared Statistics window policy. Consume the Audits-owned
current-effective-finalized-Audit seam; never reproduce Audit lifecycle or
supersession predicates. Count distinct Events per Player, deduplicate General
descendant atomic units, preserve Regular/Rifles/Cavalry/Artillery partitions,
aggregate raw numerators and denominators, and never recursively average
aggregates. Attendance is one obligation per Player + persistent Unit + Event
when any mandatory atomic unit exists; pending is not absent. Mercenaries do not
create or satisfy roster obligations.

## Permissions / Authority
All MVP reads are public. Statistics performs no protected mutations and does
not infer authority from Audit submitters, persistent Unit Commanders, or
membership records.

## Internal Structure
`windows.ts` implements the shared Event-time window policy; `ratios.ts`
preserves raw numerator/denominator and zero-death state. `ranker.ts`,
`commander.ts`, `general.ts`, `unit.ts`, and `attendance.ts` consume the
Audits/Events sources and relevant Players/Units semantic operations to derive
public query-time results.

## Extension Points
Future Audit supersession remains Audits-owned and may change the producer's
effective-result decision through its contract. Query caches or materialization
may be considered only under separate approval and while preserving metric
semantics. Correction workflows and richer analytics require separate approval.

## Limitations
No charts, trends, percentile/ELO/rating, predictive, premium, scheduled,
materialized, or cached analytics are in MVP. Ratios explicitly represent a
zero denominator and expose the approved `K` or `K+A` display form.

## Related Contracts
- `audits-statistics-effective-finalized-audit`
- `events-statistics-event-time`
- `players-statistics-membership-history`
- `units-statistics-hierarchy-read`

## Related ADRs
- ADR-20260927-007 (accepted)
- ADR-20260927-006 (accepted Audit source architecture)

## AI Working Rules
This manifest establishes approved ownership but does not itself authorize
implementation. Local query changes may proceed only under an implementation
ticket. Schema, ownership, contract, persistence, cache, supersession, and
metric-semantic changes require renewed governance.
