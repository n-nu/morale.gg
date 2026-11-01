# Milestone 2 evidence handoff

This index consolidates Ticket 43 evidence for Emil; it is not the final
submission report or a release record.

## Starting point and prerequisite reviews

- Ticket 43 started on `qa/m2-final-integration` at
  `1a34fda7357f384cd438bda4149d54ec64241589`, equal to `main` and `origin/main`.
- Ticket 43 PR [#29](https://github.com/n-nu/morale.gg/pull/29) merged from
  `qa/m2-final-integration` at final head
  `ce8403f6266452b524727367f5b564e6ab8511c8`, as merge commit
  `522b8485bf685db67c47ad83ea04bf8809cb51c5`.
- Emil submitted a substantive COMMENT review on the final PR head. As PR
  author, the comment is not an independent peer review.
- [Ticket 41 completion record](../tickets/COMPLETED/2026/11/TKT-20261027-000041-001.md)
  documents PR #27, merged as `758bb5d3e0392633a14d70e87cc7c103d3c6fbf5`.
  GitHub records Emil's substantive APPROVED review; no requested changes.
- [Ticket 42 completion record](../tickets/COMPLETED/2026/11/TKT-20261027-000042-001.md)
  documents PR #28, merged as `0a310e88463f8037c418bb1cffbbd3500d166e46`.
  GitHub rejected author self-approval; Emil left a substantive COMMENT review.
  It was not an independent approval.
- [Ticket 44 dependency-remediation record](../tickets/COMPLETED/2026/11/TKT-20261101-000044-001.md)
  is a completed child of Ticket 42.

## Feature and integration evidence

- The merged `/leaderboard` uses approved Ranker, Commander, General, and Direct
  Unit Statistics readers. Ratios pool raw totals, zero-death ratios remain
  explicit, Player identity uses the stable game ID and safe name fallback,
  and supported boards partition by Unit type.
- [Ticket 41 verification](VERIFICATION.md#leaderboard-verification-2026-10-31-tkt-20261027-000041-001)
  records 286 live reader-equivalence checks and the original 390/768/1440px
  Leaderboard inspection. These are prior evidence, not Ticket 43 browser work.
- Ticket 43 added live PostgreSQL integration assertions to
  `src/modules/statistics/ranker.integration.test.ts`; they prove finalized
  Audit -> Ranker -> Leaderboard metrics and public Player identity. The
  focused integration case passed against isolated PostgreSQL 16. Full
  `npm run test:coverage` passed 187/187 tests; exact results are in
  [COVERAGE.md](COVERAGE.md).

## QA, coverage, security, and setup

- [QA plan](QA_PLAN.md) and [coverage report](COVERAGE.md) document scope and
  measured results: 81.08% statements, 79.18% branches, 84.70% functions,
  and 81.08% lines. Statement coverage is 1.37 points above the historical
  M1 baseline (79.71%) and meets the 70% target.
- [Viewport evidence](security-evidence/viewports.md#ticket-43-combined-m2-viewport-verification--2026-11-01)
  records 24/24 required route/viewport checks passing at 390/768/1440px,
  Leaderboard interactions and local table scrolling passing, plus the
  rechecked QA42-UI1 limitation.
- [Threat model](THREAT_MODEL.md) and [OWASP baseline](OWASP_BASELINE.md)
  contain the M2 Leaderboard reassessment. No vulnerability was substantiated.
- [Demo-auth control evidence](security-evidence/demo-auth.md) contains the
  historical reproducible before/control/after browser case and the final
  browser session-rotation/limited-authority regression. Production-only
  browser cases were skipped because the development server was used.
- The [MVP demo walkthrough](MVP_DEMO.md) includes the public Leaderboard path
  and supported board/window interactions.
- Current dependency audits: production 0 findings; full tree 19 moderate
  development-tool findings, no high/critical. See
  [verification results](VERIFICATION.md#ticket-43-final-review--2026-11-01).
- Fresh setup, migrations, demo reset, database-backed coverage, and browser
  regression were performed against the loopback-only tmpfs QA database.
  `localhost:5432/morale_gg` was not used. Exact setup and static-check outcomes
  are in [VERIFICATION.md](VERIFICATION.md#ticket-43-final-review--2026-11-01).

## Release and remaining handoff

- Existing tags: `milestone-0` at `c0420382ba63403983ca4a2d781cfdf9ccb6fbcc`
  and `milestone-1` at `e67ecb78f7e982172b789d8243de71bc5723ebd6`. The two-tag
  minimum is met. No `milestone-2` or final release tag exists.
- Changelog entry: [CHANGELOG.md](../CHANGELOG.md).
- PR #29 final review and merge are complete; Ticket 43 is archived as
  COMPLETED. Milestone tagging, the final report/PDF, and submission remain
  Emil's next phase; no `milestone-2` tag or final submission report/PDF was
  created.
