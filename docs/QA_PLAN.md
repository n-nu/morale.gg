# Milestone 1 QA baseline — Ticket 42

Owner: Aiden Slabiak. Baseline: `86ac184` on `qa/m2-foundation`, M1 application
at `e67ecb7`. This plan has no dependency on Ticket 41. Setup commands and actual
results live in [VERIFICATION.md](VERIFICATION.md); coverage scope and results
live in [COVERAGE.md](COVERAGE.md).

## Test layers

| Layer | Command / evidence | Required checks |
|---|---|---|
| Unit and regression | `npm test` | Input boundaries, date windows, ratios, public identity, presentation, negative authorization |
| Persistence integration | Included in `npm test`, one file at a time | Transactions, duplicate races, missing targets, membership history, final Audit immutability, migration/backfill and fixture cleanup |
| Authorization | Units/Event authorization suites; demo action test | Missing session, wrong Unit/Event, revoked/delegated grants, owner-only actions, creator-only drafts, production demo denial |
| Cross-module flows | Player/roster/Event integration; Audit submission integration | Real capability calls; roster removal preserves participation/history; battlefield to draft to finalized public statistics |
| Browser | `npm run test:browser` | Public browsing and manager pages at 390/768/1440, real Auth.js session, session rotation, limited-role denial and sign-out |
| Production | Build, `next start`, production browser test | Demo URL 404 and no demo navigation even when explicitly enabled; direct action denial also tested without HTTP |
| Static / schema | Existing lint, type-check, build and Prisma commands | No new errors; migration status current; `git diff --check` clean |

The runner discovers `src/**/*.test.ts(x)` and serializes files with Node's
`--test-concurrency=1`. React DOM tests and the calendar component test use client
React; server/domain tests use `react-server`. Add new presentation exceptions
to that small classification only if their imports require it. Test failure
produces a nonzero exit code. Missing database configuration is never a skip.

## Fixture safety

Use the dedicated temporary QA database from VERIFICATION, never a developer or
production database. Some legacy integration cleanup temporarily disables Audit
immutability triggers in a transaction; others create random schemas. Run the
whole suite serially, and do not run browser mutation checks or another suite
against that database concurrently. Fixture cleanup is in `finally` blocks;
inspect failures before retrying. The disposable container is the final cleanup
boundary if a process is interrupted. Never repair a test by weakening a production
constraint. Demo reset must retain its existing environment/host/database guards.

## Browser methodology

Run against seeded M1 with demo mode disabled for Units and development sign-in
explicitly enabled. Each viewport starts signed out; public routes are visited
first, then the fixed root demo identity accesses management routes. Tests check
HTTP 200, visible heading, whole-document overflow, and browser exceptions; save
full-page screenshots under ignored `coverage/browser/`. Inspect screenshots for
readability, overlap and unusable controls: geometry checks alone do not prove
visual quality. Inspect internal scrolling tables and the desktop-oriented battle
editor separately. The auth case also reads the ordinary Session table with a
parameterized query and verifies that signing in does not add grants. No tokens
or credentials belong in committed evidence. A second browser is optional.

## Definition of Done and defects

- Run all layers above and retain exact baseline, commands, results and limitations.
- Review security findings using [THREAT_MODEL.md](THREAT_MODEL.md) and
  [OWASP_BASELINE.md](OWASP_BASELINE.md); do not equate coverage with security.
- Record reproducible route/input, expected/actual behavior, impact and evidence
  for each defect. Prioritize privilege bypass/data loss first, blocked workflows
  next, then presentation. Assign follow-up ownership and rerun affected checks.
- Fix only authorized test/tooling issues here. Distinct production defects need
  child tickets; architecture or authority changes require the normal approval.
- Keep incomplete checks explicit; do not mark them passed or close the ticket
  while required evidence is absent. Reviewer decides acceptance of documented
  environment limitations and remaining product defects.
- Reconcile Ticket 42, its backlog row, scope and evidence. Follow
  [AGENT_WORKFLOW.md](../AGENT_WORKFLOW.md) for REVIEW and completion. Emil owns
  final M2 tagging; Ticket 43 owns post-merge M2 verification.

## Ticket 43 combined M2 follow-up — 2026-11-01

The combined regression plan adds the Leaderboard service/model/presentation
and finalized-Audit-to-Leaderboard integration fixture to the M1 checks above.
Do not run the complete suite, coverage command, or browser mutation cases
unless a disposable database is available. The Ticket 43 run used
database-independent tests plus lint, type-check, build, Prisma validation and
generation. Docker and the configured local PostgreSQL endpoint were
unavailable, so database-backed integration, coverage, migration-status,
fresh-setup, and viewport/browser reruns remain unverified; see
[VERIFICATION.md](VERIFICATION.md#ticket-43-post-merge-integration--2026-11-01).
