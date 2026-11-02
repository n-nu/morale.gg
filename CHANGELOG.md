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

- Date: 2026-11-01
- Ticket ID: TKT-20261101-000045-001
- Change: Redesigned the Event manager Battle Structure organizer with distinct side markers, explicit Command Group and Company labels, compact commander/type metadata, responsive hierarchy rails, clearer drag handles and drop targets, and accessible node-action disclosures. Added 390/768/1440 browser checks and refreshed the MVP demo walkthrough.
- Reason: Improve battlefield hierarchy scanning and narrow-screen usability without changing Event or battlefield behavior.
- Affected contracts/modules: Events presentation and shared Event-route drag/drop UI. No schema, domain semantics, authorization, persistence, or contract change.
- Commit reference: N/A

## 2026-11-02

- Date: 2026-11-02
- Ticket ID: TKT-20261102-000047-001
- Change: Redesigned the public Event Battle Structure as a responsive Attacker/Defender comparison with contained, collapsible Command Groups, distinct Company cards, Company-scoped statistics, and side jump links. Linked represented Units and public Player/Commander pages; reused already-public Unit image references with a consistent fallback icon.
- Reason: Make public Event hierarchy, finalized results, and available statistics easier to scan and navigate without changing their canonical readers or domain meaning.
- Affected contracts/modules: Events presentation and approved-Unit read-side. No Statistics DTO, Audit calculation, schema, permission, persistence, route, or contract change.
- Commit reference: N/A

- Date: 2026-11-02
- Ticket ID: TKT-20261102-000046-001
- Change: Replaced Battle Structure tree rails and dedicated drag grips with nested rounded node surfaces that drag by their bodies. Group shells now accept drops across the full container, while interactive controls and nested nodes are excluded from parent drag starts. Added responsive browser coverage for node containment, Move actions, validation feedback, and real Company/group moves with restoration.
- Reason: Make hierarchy containment clearer and node movement easier without changing battlefield behavior.
- Affected contracts/modules: Events presentation and shared Event-route drag/drop UI. No schema, domain semantics, authorization, persistence, or contract change.
- Commit reference: N/A
