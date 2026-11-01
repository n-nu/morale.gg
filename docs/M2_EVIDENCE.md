# Milestone 2 evidence handoff

This index consolidates Ticket 43 evidence for Emil; it is not the final
submission report or a release record.

## Starting point and prerequisite reviews

- Ticket 43 started on `qa/m2-final-integration` at
  `1a34fda7357f384cd438bda4149d54ec64241589`, equal to `main` and `origin/main`.
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
  Audit -> Ranker -> Leaderboard metrics and public Player identity when run.
  The new database-backed assertions were not executed because no disposable
  PostgreSQL service was available.
- Current database-independent tests passed 68/68 across Leaderboard,
  Statistics, source contracts, authentication, and demo-seed safety. Exact
  commands and limits are in [VERIFICATION.md](VERIFICATION.md#ticket-43-post-merge-integration--2026-11-01).

## QA, coverage, security, and setup

- [QA plan](QA_PLAN.md) and [coverage report](COVERAGE.md) document scope and
  the unrerun status. The historical M1 coverage result is 164/164 tests and
  79.71% statements; no combined M2 percentages are claimed.
- [Viewport evidence](security-evidence/viewports.md#ticket-43-combined-m2-viewport-rerun--2026-11-01)
  records the complete route/viewport matrix as NOT RUN due to unavailable
  Docker/PostgreSQL. Static Leaderboard presentation coverage passed 9/9.
- [Threat model](THREAT_MODEL.md) and [OWASP baseline](OWASP_BASELINE.md)
  contain the M2 Leaderboard reassessment. No vulnerability was substantiated.
- [Demo-auth control evidence](security-evidence/demo-auth.md) contains the
  historical reproducible before/control/after browser case and the current
  3/3 direct-guard and 5/5 auth-navigation checks. The production browser
  demonstration was not repeated in Ticket 43.
- The [MVP demo walkthrough](MVP_DEMO.md) includes the public Leaderboard path
  and supported board/window interactions.
- Current dependency audits: production 0 findings; full tree 19 moderate
  development-tool findings, no high/critical. See
  [verification results](VERIFICATION.md#ticket-43-post-merge-integration--2026-11-01).
- Fresh-environment reproduction, database-backed coverage, migration status,
  and browser regression remain unverified. Docker was unavailable and
  `localhost:5432/morale_gg` was unreachable; the configured database was not
  treated as disposable.

## Release and remaining handoff

- Existing tags: `milestone-0` at `c0420382ba63403983ca4a2d781cfdf9ccb6fbcc`
  and `milestone-1` at `e67ecb78f7e982172b789d8243de71bc5723ebd6`. The two-tag
  minimum is met. No `milestone-2` or final release tag exists.
- Changelog entry: [CHANGELOG.md](../CHANGELOG.md).
- Emil remains responsible for final review/merge, milestone tagging, the final
  report/PDF, and submission. No Ticket 43 merge, release tag, or final report
  is authorized by this evidence index.
