# Changelog: morale.gg

## 2026-10-31

- Date: 2026-10-31
- Ticket ID: TKT-20261027-000041-001
- Change: Added the public Leaderboard (`/leaderboard`) with Players, Commanders, Generals, and Units boards; per-branch rankings; 14-day, 30-day, and all-time windows; sortable columns with competition ranks; and a ranking guide. Added the Statistics-owned `getDirectUnitPerformanceForAllUnits` reader. Linked the Leaderboard from the header and `/statistics`. Finite ratios across Statistics presentation now display rounded to two decimals with raw totals on hover.
- Reason: Milestone 2 Leaderboard feature; the existing per-Unit reader would re-read the full Audit source once per Unit for a Unit ranking.
- Affected contracts/modules: statistics (read-only consumption of existing contracts; no contract, schema, or ownership change).
- Commit reference: N/A
