# Changelog: morale.gg

## 2026-10-31

- Date: 2026-10-31
- Ticket ID: TKT-20261027-000041-001
- Change: Added the public Leaderboard (`/leaderboard`) with Players, Commanders, Generals, and Units boards; per-branch rankings; 14-day, 30-day, and all-time windows; sortable columns with competition ranks; and a ranking guide. Added the Statistics-owned `getDirectUnitPerformanceForAllUnits` reader. Linked the Leaderboard from the header and `/statistics`. Finite ratios across Statistics presentation now display rounded to two decimals with raw totals on hover.
- Reason: Milestone 2 Leaderboard feature; the existing per-Unit reader would re-read the full Audit source once per Unit for a Unit ranking.
- Affected contracts/modules: statistics (read-only consumption of existing contracts; no contract, schema, or ownership change).
- Commit reference: N/A

## 2026-11-01

- Date: 2026-11-01
- Ticket ID: TKT-20261027-000043-001
- Change: Added a database-backed integration assertion for finalized Audit to Ranker to Leaderboard values and stable public Player identity. Consolidated post-merge M2 verification, coverage limitations, viewport status, Leaderboard threat/OWASP reassessment, dependency audit, peer-review history, and release-tag state in the evidence index.
- Reason: Provide a truthful combined Milestone 2 evidence handoff after Tickets 41 and 42 merged.
- Affected contracts/modules: Statistics integration tests; repository QA/security documentation. No production behavior, schema, contract, or ownership change.
- Commit reference: `7bb7a5c`
