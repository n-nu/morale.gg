---
contract_id: units-audits-submission-authorization
path: docs/contracts/units-audits-submission-authorization.md
documentation_path: docs/contracts/units-audits-submission-authorization.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000020-001
---

# Units-to-Audits Submission Authorization

## Purpose

Provide Audits with the narrow Unit-scoped semantic decision required for
atomic Event-unit creation, Audit draft creation, and Audit finalization.

## Producer

Units module.

## Consumers

- Audits module.

## Inputs

Server-resolved Auth.js User ID and persistent Unit ID.

## Outputs

`Promise<boolean>` from an operation conceptually equivalent to
`canSubmitAudit(userId, unitId)`.

## Fields / Operations

| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `canSubmitAudit` | `(userId, unitId) => Promise<boolean>` | yes | Effective `SUBMIT_AUDITS` authority for the target persistent Unit |

## Semantics

For MVP, true authorizes creation of an atomic Event unit under that Unit's
approved EventParticipation, creation of an Audit draft for that atomic unit,
and finalization/submission of that Audit. Editing an existing draft additionally
requires creator ownership enforced by Audits. The capability does not grant
Event command-group management.

## Guarantees

Units evaluates current effective `SUBMIT_AUDITS` authority, including its
existing fail-closed membership, hierarchy, scope, delegation, and revocation
rules. Only the boolean decision crosses the boundary.

## Constraints

- Server-only and fail-closed for missing/invalid identities.
- Audits supplies no client-provided authority path or grant details.
- The capability does not expose Unit memberships, grants, scopes, or
  hierarchy records.
- It does not authorize Event management, participation decisions, roster
  mutation, or command-group administration.

## Compatibility Expectations

The existing `SUBMIT_AUDITS` permission remains the authority source. Changes
to permission meaning, scope, delegation, or revocation require a new approved
boundary decision. The operation is additive to existing Unit capabilities.

## Stability

Stable boundary approved by ADR-20260927-006 and BCR-20260927-004;
implementation remains pending the authorized Audit implementation ticket.

## Related Tickets

- TKT-20260927-000020-001

## Related ADRs

- ADR-20260915-002
- ADR-20260927-006