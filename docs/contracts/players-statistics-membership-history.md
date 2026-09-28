---
contract_id: players-statistics-membership-history
path: docs/contracts/players-statistics-membership-history.md
documentation_path: src/modules/players/MODULE.md
status: stable
version: 0.1
last_reviewed: 2026-09-27
updated_by_ticket: TKT-20260927-000024-001
---

# Players -> Statistics Membership History

## Purpose
Provide stable Player identity and authoritative historical UnitMembership
eligibility at a canonical Event time for attendance derivation.

## Producer
`players`

## Consumers
- `statistics` module

## Inputs
Player identity, persistent Unit identity, and canonical Event occurrence time.

## Outputs
Stable Player reference and whether each membership period was active for the
Unit at the Event time, including enough history to distinguish obligations
from current roster state.

## Fields / Operations
| Name | Type/shape | Required | Meaning |
|---|---|---|---|
| `playerId` | persistent game Player identifier | yes | Game identity, not Auth.js identity |
| `unitId` | persistent Unit identifier | yes | Attendance scope |
| `eventTime` | canonical timestamp | yes | Historical eligibility point |
| `isMembershipActiveAt` | boolean | yes | Event-date roster eligibility |
| `membershipPeriod` | read-only period reference | when applicable | Supports historical derivation |

## Semantics
A membership is active when it started by Event time and did not end before
that time. A Player joining after an Event has no obligation; later departure
does not remove an existing obligation. Statistics must not create, end, or
modify memberships. Mercenary Audit appearances do not alter this result.

## Guarantees
Player identity remains distinct from Auth.js User identity. Membership history
is authoritative and preserves rejoin periods.

## Constraints
No roster mutation, alias mutation, or authority decision crosses this
contract. Attendance remains scoped to Player + persistent Unit + Event.

## Compatibility Expectations
Membership-history representation may evolve behind the event-time eligibility
operation so Statistics does not duplicate roster semantics.

## Stability
Stable; approved by BCR-20260927-005 and ADR-20260927-007.

## Related Tickets
- TKT-20260927-000024-001

## Related ADRs
- ADR-20260927-006
- ADR-20260927-007
