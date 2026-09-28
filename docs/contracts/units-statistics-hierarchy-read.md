---
contract_id: units-statistics-hierarchy-read
path: docs/contracts/units-statistics-hierarchy-read.md
documentation_path: src/modules/units/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000024-001
---

# Units -> Statistics Hierarchy Read

## Purpose
Provide persistent Unit identity and direct/descendant subtree resolution for
named Unit performance perspectives without transferring Unit ownership.

## Producer
`units`

## Consumers
- `statistics` module

## Inputs
A persistent Unit identifier and a read request for direct identity or its
complete descendant subtree.

## Outputs
Public Unit references, parent/child relationships, and a deduplicated set of
selected Unit identities suitable for raw observation filtering.

## Fields / Operations
| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `unitId` | persistent Unit identifier | yes | Selected organization |
| `getDirectUnit` | read operation | yes | Direct-performance anchor |
| `getSubtreeUnitIds` | read operation | yes | Selected Unit plus descendants |
| `parentId` | Unit identifier/null | when applicable | Organizational relationship |
| `descendantUnitIds` | unique identifiers | when applicable | Organizational scope |

## Semantics
Direct Performance selects only observations directly represented by the
selected Unit. Organizational Performance selects the Unit and every
descendant. Average Unit Performance resolves qualifying Units directly in the
subtree, derives each Unit metric from raw observations, and applies equal
Unit-level weight. Persistent Units never receive historical battlefield Unit
type.

## Guarantees
Hierarchy resolution is read-only, preserves organizational identity, and does
not calculate or return recursive averages.

## Constraints
The contract does not expose permission grants, delegation lineage, private
authority rows, or mutation operations. Unit type remains in Audit/result data.

## Compatibility Expectations
Hierarchy traversal may evolve internally while preserving stable identity and
subtree semantics. Statistics must not copy hierarchy history.

## Stability
Stable; approved by BCR-20260927-005 and ADR-20260927-007.

## Related Tickets
- TKT-20260927-000024-001

## Related ADRs
- ADR-20260927-006
- ADR-20260927-007
