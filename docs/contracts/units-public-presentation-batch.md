---
contract_id: units-public-presentation-batch
path: docs/contracts/units-public-presentation-batch.md
documentation_path: src/modules/units/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-11-03
updated_by_ticket: TKT-20261103-000053-001
---

# Units Public Presentation Batch Read

## Purpose

Provide public Unit identity and image metadata for multi-row presentation
consumers without exposing Unit authority data or issuing one query per Unit.

## Producer

`units`

## Consumers

- Public Player profile presentation

## Inputs

An array of persistent Unit IDs. IDs are trimmed, deduplicated in
first-request order, and empty IDs are ignored.

## Outputs

One row per matching Unit, in request order:

| Field | Type | Meaning |
|---|---|---|
| `unitId` | string | Stable public Unit route identity |
| `name` | string | Public Unit name |
| `imageRef` | string or null | Existing Unit image/icon reference |

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `getPublicUnitPresentationBatch` | `(unitIds) => Promise<PublicUnitPresentation[]>` | yes | One Units-owned read for multiple public Unit presentations |

## Semantics

The operation returns only public Unit identity and image fields. It does not
expose website Commander identity, permissions, membership counts, or
authority history. An absent image remains null so consumers can show a neutral
fallback.

## Guarantees

- A non-empty persisted-data request performs one database read.
- Empty input performs no database read.
- Returned Units follow request order and omit missing IDs.
- The configured Units demo mode returns only its existing read-only demo
  presentation records.

## Constraints

The operation is public and read-only. Consumers derive navigation from
`unitId` and do not infer historical Unit type from the persistent Unit.

## Compatibility Expectations

This is an additive read operation. Existing Unit directory, hierarchy,
membership, authority, and management reads are unchanged.

## Stability

Stable; approved by BCR-20261103-012.

## Related Tickets

- TKT-20261103-000053-001

## Related BCRs

- BCR-20261103-012
