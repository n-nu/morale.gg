---
contract_id: audits-statistics-effective-finalized-audit
path: docs/contracts/audits-statistics-effective-finalized-audit.md
documentation_path: src/modules/audits/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000024-001
---

# Audits -> Statistics Effective Finalized Audit

## Purpose
Expose Audits' semantic determination of the current effective finalized Audit
for an atomic Event unit as Statistics' single read-only source seam, without
exposing Audit persistence or permitting mutation.

## Producer
`audits`

## Consumers
- `statistics` module

## Inputs
A read request containing an atomic Event-unit identity and approved source
filters (Event, Player, Unit, or Audit Unit type), and a request for current
effective finalized results. Statistics applies its window policy to Event time
and does not delegate window inclusion to Audits.

## Outputs
Read-only observations containing atomic Event-unit identity, canonical Event
and represented persistent Unit references, mandatory status, current Audit
identity, Unit type, finalized Unit result values, Player result K/D/A rows,
Commander role assignment, and Event-command-group descendant structure.

## Fields / Operations
| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `getEffectiveFinalizedAuditObservations` | read operation | yes | Returns only current effective finalized Audit observations |
| `atomicEventUnitId` | stable identifier | yes | Battlefield appearance identity |
| `auditUnitType` | Regular/Rifles/Cavalry/Artillery | yes | Historical combat partition |
| `playerResults` | Player + K/D/A observations | yes | One result per Player per Audit |
| `commanderPlayerId` | Player identifier | yes | Battlefield Commander role, if selected |
| `commandGroupDescendants` | unique descendant atomic-unit references | when applicable | Source for General flattening |

## Semantics
Audits determines which finalized Audit is currently effective for an atomic
Event unit. MVP returns the sole finalized Audit. Future superseded revisions
remain historical but are excluded from the effective result by this
Audits-owned decision. Statistics consumes this operation and must not
reproduce Audit lifecycle or supersession predicates. Every returned Player
result is eligible for Ranker observation, including mercenaries and
never-rostered Players. The operation preserves Unit type and raw
numerators/denominators; it does not return pre-averaged statistics.

## Guarantees
Audits is the sole owner of effective-finalized-Audit determination. Finalized
records are immutable. No operation creates or changes Player,
UnitMembership, Unit, EventParticipation, or command-group history.

## Constraints
The contract does not expose draft data, submitting Auth.js User identity,
private authority persistence, or mutation operations. General descendant
atomic units are unique within each group observation and remain type
partitionable.

## Compatibility Expectations
Adding future Audit revisions must be handled behind this Audits-owned
operation. Statistics queries must consume its result and must not implement
their own effective-history logic.

## Stability
Stable; approved by BCR-20260927-005 and ADR-20260927-007.

## Related Tickets
- TKT-20260927-000024-001

## Related ADRs
- ADR-20260927-006
- ADR-20260927-007
