---
contract_id: audits-events-public-battlefield-structure
path: docs/contracts/audits-events-public-battlefield-structure.md
documentation_path: src/modules/audits/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-28
updated_by_ticket: TKT-20260928-000033-001
---

# Audits -> Events Public Battlefield Structure

## Purpose

Provide safe Event-scoped battlefield hierarchy and manager options without
making Events depend on Audits private persistence.

## Producer

`audits`

## Consumers

- `events`
- public Event presentation

## Inputs

Event ID and, for protected manager options, server-resolved manager identity.

## Outputs

Side-separated groups and atomic units, approved participation-backed Unit
display, names, mandatory state, Audit type/finalized state, group Commander
display, parent/child structure, and safe move/create option data. Private
Audit drafts, submitter identity, authority rows, and raw IDs not needed by a
server route are excluded from public DTOs.

## Semantics

Sides are only `ATTACKER` and `DEFENDER`. The reader preserves the strict tree,
unique atomic descendants, and pending-versus-finalized result state. Public
reads do not expose requested/denied participation or unrelated units.

## Guarantees

Audits remains the owner of atomic-unit/group persistence and hierarchy
invariants. Events may render the returned structure but does not calculate
Audit metrics or mutate Audits records directly.

## Constraints

- No historical Rank-at-Event is returned.
- Atomic Commander is returned only from the authoritative finalized Audit role.
- A group is not an Audit submission target and does not grant Audit authority.
- Public reads remain unauthenticated and safe for finalized/pending states.

## Compatibility Expectations

Legacy Events without explicit side configuration return a safe
`Battle sides not configured` state rather than inferred placement.

## Stability

Stable; approved by BCR-20260928-006 and ADR-20260928-008.

## Related Tickets

- TKT-20260928-000033-001
- TKT-20260928-000034-001
- TKT-20260928-000035-001
