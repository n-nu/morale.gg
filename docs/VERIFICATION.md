# Setup and Verification

Use the [README setup](../README.md#setup) for application setup. The canonical
[QA plan](QA_PLAN.md) defines test layers and completion criteria. For Ticket 42
evidence, use the disposable database procedure below rather than resetting a
developer database. Historical submission results below remain dated evidence.

## Database

With PostgreSQL running and `.env` configured:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
npm exec -- dotenv -e .env -- prisma migrate status
```

Expected migration status: the database schema is up to date.

## Tests

`npm test` discovers and serializes all existing Node/tsx tests. It requires a
migrated, seeded disposable database. `npm run test:coverage` runs the same suite
with the [documented coverage scope](COVERAGE.md). Focused checks remain available:

```bash
npm run test:website-admin
npm run test:dev-sign-in
npm run test:auth-nav
npm run test:demo-seed
```

For the database-backed MVP integration surfaces, run these one at a time against the configured local database. They mutate isolated fixture rows and should not be run as parallel files against the same database:

```bash
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/audits/server/battlefield-structure.integration.test.ts
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/audits/server/command-groups.integration.test.ts
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/statistics/ranker.integration.test.ts
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/statistics/event-battle.integration.test.ts
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/statistics/attendance.integration.test.ts
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/units/server/workflows.test.ts
npm exec -- dotenv -e .env -- tsx --conditions react-server --test src/modules/units/server/authorization.test.ts
```

MVP presentation tests can be run together:

```bash
npm exec -- tsx --test src/modules/units/components/management.test.tsx src/modules/players/components/roster.test.tsx src/modules/players/components/directory.test.tsx "src/app/events/[eventId]/battle-structure.test.tsx" src/app/events/battle-structure-public.test.tsx src/modules/statistics/player-presentation.test.tsx src/modules/statistics/unit-presentation.test.tsx src/modules/statistics/presentation.test.tsx
```

Leaderboard tests (Milestone 2). The reader test mocks Prisma and needs no database:

```bash
npm exec -- tsx --conditions react-server --test src/modules/statistics/leaderboard-model.test.ts src/modules/statistics/leaderboard.test.ts
npm exec -- tsx --test src/modules/statistics/leaderboard-presentation.test.tsx
```

On Windows PowerShell, replace `npm` with `npm.cmd` if script execution policy blocks `npm.ps1`.

## Static Checks and Build

```bash
npm run lint
npm run type-check
npm run build
git diff --check
```

## Demo Database and Browser Smoke Check

`npm run demo:reset` destructively replaces local application data except for the preserved RootUnit and its Commander identity/session. Review its safeguards and preservation behavior in the [README](../README.md#reset-and-reseed-demo-data) before running it. Then start `npm run dev`, open `http://localhost:3000/dev/sign-in`, sign in as a demo identity, and follow [MVP_DEMO.md](MVP_DEMO.md). Development sign-in requires `npm run dev` and `DEV_SIGN_IN_ENABLED="true"`; it is unavailable in production builds.

## Submission Verification Results (2026-09-30)

- `npm ci`: passed; installed from the lockfile. npm reported 7 dependency advisories (1 moderate, 5 high, 1 critical); no dependency changes were made.
- `docker compose up -d`: passed; PostgreSQL 16 service remained running.
- `npm run db:validate`: passed.
- `npm run db:generate`: passed with Prisma Client 7.10.0.
- `npm run db:migrate:deploy`: passed; no pending migrations.
- `npm exec -- dotenv -e .env -- prisma migrate status`: passed; schema up to date, 20 migrations.
- `npm run db:seed`: passed using the preserved Commander User ID for the idempotent root upsert.
- `npm run demo:reset`: passed on `localhost/morale_gg`; its reader smoke covered Units, Event detail, public/manager Battle, `/audits`, Ranker 14-day/30-day/all-time, Commander, General, Unit, and attendance. Result: 1 RootUnit, 41 Units, 132 Players, 10 Events, 56 approved participations, 48 atomic Event Units, 34 Event Command Groups, 29 FINAL and 7 DRAFT Audits, and 5 effective Event results.
- Focused scripts: website authorization 7/7 passed; authentication navigation 4/4 passed; demo-seed safety 4/4 passed.
- MVP integration files: one combined invocation reported 44 passed and one PostgreSQL `40001 TransactionWriteConflict` while multiple database-mutating files ran together. The failed battlefield-structure file passed when rerun alone (1/1). This is test-fixture contention, not a reproduced behavior failure; run database-backed files one at a time as listed above.
- MVP presentation tests: 29/29 passed.
- `npm run lint`: passed.
- `npm run type-check`: passed (`tsc --noEmit`).
- `npm run build`: passed; Next.js compiled, type-checked, collected page data, and generated the app routes.
- `git diff --check`: passed. Repository-relative Markdown links in the changed submission documents resolve.
- Browser smoke: authenticated local session; `/units`, `/units/demo-unit-french-line-1`, `/units/demo-unit-french-line-1/manage`, `/units/demo-unit-british-line-1`, `/players/demo-player-001`, `/events`, `/events/demo-event-main-review`, `/events/demo-event-main-review/manage`, `/audits`, and `/statistics` returned HTTP 200 with expected page headings. The dev-server log showed no 500 responses or runtime errors.

No hosted deployment was found or claimed. Google OAuth works for the existing local session; seeded manager fixture Users do not have credentials or Google Accounts of their own.

## Grading-Access Verification (2026-09-30, TKT-20260930-000040-001)

- Fresh scratch database (`morale_gg_fresh_check`, dropped afterward): `npm run db:migrate:deploy` then `npm run demo:reset` with no RootUnit, no `ROOT_UNIT_COMMANDER_USER_ID`, and no Google credentials passed; it bootstrapped `root-morale-gg` with `demo-user-root-commander`, reseeded the full demo world, and its reader smoke passed.
- `npm run dev` + `/dev/sign-in`: signing in as Demo Root Commander reached `/units/demo-unit-french-army/manage`, `/events/demo-event-main-review/manage`, `/events/create`, and `/audits`; sign-out cleared the session; the Limited Roster Manager was denied French Unit management.
- `next start` with `DEV_SIGN_IN_ENABLED="true"`: `/dev/sign-in` returned 404, the header showed no demo link, and invoking the server action directly failed with "Development sign-in is disabled." without setting a cookie.
- `npm run test:dev-sign-in` 2/2, `npm run test:auth-nav` 5/5, `npm run test:demo-seed` 4/4, `npm run lint`, `npm run type-check`, and `npm run build` passed.

## Ticket 42 isolated reproduction (PowerShell)

Do not run these suites against an existing developer database. The separate
Compose project below uses PostgreSQL 16, loopback port 5542, and temporary
in-memory storage; stopping/removing that QA container discards only its data.
It does not use the application's named volume or container. Keep the database
up until all tests and screenshots are collected. Environment variables below
are process-local and override `.env`/`.env.local`; no local file is overwritten.

```powershell
npm ci
docker compose -p morale-qa -f tests/compose.qa.yaml up -d --wait
$env:DATABASE_URL='postgresql://morale_gg:qa-local-only@127.0.0.1:5542/morale_gg_qa'
$env:POSTGRES_DB='morale_gg_qa'
$env:POSTGRES_PORT='5542'
$env:DEV_SIGN_IN_ENABLED='true'
$env:UNITS_DEMO_MODE='false'
$env:AUTH_SECRET = node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
npx prisma migrate status
npm run demo:reset
npm test
npm run test:coverage
npx next typegen
npm run lint
npm run type-check
git diff --check
npx playwright install chromium
npm run dev -- --webpack --hostname 127.0.0.1 --port 3100
```

In a second terminal set the same QA `DATABASE_URL`, then run
`npm run test:browser`. The server must have `DEV_SIGN_IN_ENABLED=true`, seeded
QA data, and no conflicting `NODE_ENV`. Tests never seed/reset a database.
Wait for all database integration tests to finish before browser mutation tests.
The dev server uses webpack here to permit a comparison if the local Turbopack
worker fails; it is not a change to the application's default bundler.

After stopping the dev server, in the configured terminal:

```powershell
npm run build
# If the local Turbopack worker crashes, record the failure and separately try:
npm run build -- --webpack
npm start -- --hostname 127.0.0.1 --port 3100
```

In the second terminal set `$env:QA_PRODUCTION='true'`, then run
`npm run test:browser`. The production server must still have the explicit demo
enablement flag: the check proves NODE_ENV isolation, not merely a disabled flag.
The development and production tests intentionally skip the opposite environment;
both runs are required. `npm run test:dev-sign-in` separately exercises direct
action rejection in production/test/disabled development and unknown identities.

Raw coverage, browser JSON, screenshots and optional logs belong under ignored
`coverage/`; selected reviewed screenshots and concise durable results belong in
`docs/security-evidence/`. Do not commit traces/cookies/session tokens or `.env`.
After stopping the test servers, remove only the QA container/network with:

```powershell
docker compose -p morale-qa -f tests/compose.qa.yaml down
```

### Branch/review/release audit — 2026-10-29

- Work branch: `qa/m2-foundation`, tracking `origin/qa/m2-foundation`; starting
  commit `86ac18400c59565a0090d2167ea27974afd888c2`. M1 application baseline and
  fetched `origin/main`: `e67ecb78f7e982172b789d8243de71bc5723ebd6`.
- `git ls-remote --tags origin` confirms two meaningful releases: annotated
  `milestone-0` peels to `89875adba3a8b04e679685adf04a6801a134c0d0`
  (Milestone 0 artifacts); lightweight `milestone-1` points to `e67ecb7`
  (M1 merge PR #26). Local tags agree. No M2 tag was created.
- No project-level CHANGELOG or `.github` workflow/review template was found;
  module changelogs, completed tickets and Git preserve history. Recommend a
  concise M2 release note assembled by Emil from reviewed tickets, rather than
  treating a template as release evidence.
- Follow AGENT_WORKFLOW's ticket scope, ACTIVE → REVIEW → COMPLETED lifecycle,
  validation and explicit authorization for commit/push/merge/tag. Use a focused
  PR referencing Ticket 42, exact checks and limitations; obtain substantive peer
  review before merge. Git history proves prior PR merges, not approval quality
  or enforced branch protection. GitHub branch-protection settings and Ticket 42
  PR/reviewer state were not independently verified. No peer review is claimed.
## Leaderboard Verification (2026-10-31, TKT-20261027-000041-001)

- Database: fresh local schema, `npm run db:migrate:deploy`, then `npm run demo:reset` (29 FINAL Audits, 132 Players, 10 Events); reader smoke passed.
- Leaderboard tests: model 9/9, readers 5/5 (mocked Prisma), presentation 9/9. Existing presentation suite plus Leaderboard presentation: 38/38. Existing Statistics unit tests (Commander, General, Unit, windows, ratios, attendance): 8/8.
- Live reader equivalence against the demo database (14-day, 30-day, all-time): 286 checks passed — every Players, Commanders, and Generals row equals its Ranker, Commander, or General reader entry; `getDirectUnitPerformanceForAllUnits` equals `getDirectUnitPerformance` for every Unit; no internal `Player.id` appears in any board payload.
- Responsive (all four boards, all-time data): 390px, 768px, and 1440px have no page-level horizontal overflow and no sticky-column overlap; tables scroll locally at 390px (and at 768px for the wider boards) and fit at 1440px. Two defects found and fixed during the check: the rank column rendered narrower than the sticky name column's offset (overlapping the first metric), and the added header link compressed the development-only sign-in button at 768px.
- Browser: window switching keeps board and branch; header highlights Leaderboard; `/statistics` links to each board; Player pages show `KDR 2.07` instead of the raw float. No server errors or browser console errors.
- `npm run lint`, `npm run type-check`, `npm run build` (route `/leaderboard` generated), and `git diff --check` passed. Prisma schema unchanged.

### Milestone 2 reconciliation — 2026-11-01

- Ticket 41 PR #27 merged to `main` as `758bb5d3e0392633a14d70e87cc7c103d3c6fbf5`;
  final source branch HEAD was `7fa52a357f89549865e83ff0338fa0a19952b477`.
  GitHub recorded an APPROVED substantive review by Emil (`n-nu`) on
  implementation commit `e1e8973809a68c6084801c71e252d53e95544ac0`; no checks
  were configured on the PR. Its completion record is archived separately.
- Ticket 42 dependency remediation upgraded Next.js / eslint-config-next to
  16.4.3 and Prisma / client / PostgreSQL adapter to 7.10.1. On the remediated
  branch, `npm ci`, lint, type-check, build, Prisma validate/generate, focused
  auth/security tests, and `git diff --check` passed. Production audit is 0;
  full audit retains 19 moderate development-tool findings. Docker was
  unavailable, so database-backed coverage was not rerun; the documented
  164-test / 79.71% M1 baseline remains historical evidence.
- After merging PR #27 into `qa/m2-foundation`, the combined production build
  passed and included `/leaderboard`; Leaderboard reader/model tests passed
  14/14 and presentation tests passed 9/9. Combined lint, type-check, and
  `git diff --check` also passed.
- Ticket 42 PR #28 merged from `qa/m2-foundation` at source HEAD
  `b80b901043ff6b7807d79c481b9b6ac0f06352dd`; merge commit is
  `0a310e88463f8037c418bb1cffbbd3500d166e46`. No CI checks or branch
  protection were configured. GitHub rejected an APPROVE review because Emil
  (`n-nu`) authored the PR; Emil submitted a substantive COMMENT review and,
  at his explicit direction, proceeded with merge without waiting for
  `ChanMan64`. The comment is not represented as an approval.
- Both blockers were complete and merged when Ticket 43 became READY for its
  post-merge integration handoff. Execution began on
  `qa/m2-final-integration` at `1a34fda7357f384cd438bda4149d54ec64241589`;
  current results follow.

## Ticket 43 final review — 2026-11-01

### Refreshed state and implementation review

- The refreshed PR #29 head before final-review evidence corrections was
  `cd8a02b100e86970ef2fc496e6730513bf38a35b`, branch
  `qa/m2-final-integration`, base `main`; PR was OPEN with merge state CLEAN.
  Ticket 43 remained in REVIEW. Ticket 41 and 42 merge commits remain ancestors.
- Source review confirmed `getLeaderboard` composes approved Ranker,
  Commander, General, and all-Units Direct readers. Windows use canonical Event
  times and the Audits-owned effective-finalized source. Player K/D and
  (K+A)/D are pooled from raw totals, per-Audit averages remain arithmetic
  averages of raw counts, and zero-denominator states are preserved. Supported
  boards partition by Regular/Rifles/Cavalry/Artillery; Generals are not
  type-partitioned. Query values are allowlisted, Player links use the stable
  public game ID with safe name fallback, and Unit rows use the existing public
  Unit route. The PR contains no production-code changes, and no material
  Leaderboard implementation defect was substantiated.

### Isolated database and integration results

- `npm ci` succeeded. Docker Desktop 29.8.0 ran project
  `morale-m2-ticket43` from `tests/compose.qa.yaml`: PostgreSQL 16, loopback-only
  `127.0.0.1:5542`, tmpfs-backed disposable storage. The existing `.env`
  database at `localhost:5432/morale_gg` was not used.
- Applied the 20 project migrations and ran Prisma migration status:
  **Database schema is up to date**. `npm run demo:reset` completed with 41
  Units, 132 Players, 10 Events, and 29 FINAL / 7 DRAFT Audits; the seeded
  Statistics reader smoke succeeded.
- The Ticket 43 finalized Audit → Ranker → Leaderboard integration case passed,
  including pooled values, window/type behavior, and stable public Player
  identity. The full `npm run test:coverage` suite passed **187/187 tests**
  (145 server/domain; 42 presentation/calendar), zero failed/skipped. Broader
  database-backed Statistics/Audit integration tests were included in that
  suite and passed.
- Measured combined coverage: statements **81.08%** (5,749/7,090), branches
  **79.18%** (1,430/1,806), functions **84.70%** (576/680), lines **81.08%**
  (5,749/7,090). The 70% statement target is met. Statements are 1.37 points
  above the historical M1 79.71% baseline; see [COVERAGE.md](COVERAGE.md).

### Browser, fresh setup, and security evidence

- The focused Ticket 43 Playwright matrix passed **3/3** viewport tests and the
  complete `npm run test:browser` passed **7**, with **2 production-only tests
  skipped** because the tested server was `next dev`. At 390/768/1440px, the
  required public routes (`/dev/sign-in`, `/statistics`, `/leaderboard`,
  `/events`, and the public Event/Battle Structure) and root-manager routes
  (Unit management, Event management/Battle Structure, `/audits`) returned
  HTTP 200, rendered H1s and had no page-level horizontal overflow or browser
  runtime errors. Leaderboard sort, board, window, and branch interactions
  passed at all three widths; the wide table was locally scrollable at mobile
  and tablet widths. Details and QA42-UI1 assessment are in
  [viewport evidence](security-evidence/viewports.md#ticket-43-combined-m2-viewport-verification--2026-11-01).
- Fresh setup used `npm ci`, the isolated database, Prisma validate/generate,
  migrations/status, and `npm run demo:reset`. Development `/dev/sign-in`,
  session creation/rotation/sign-out, root management routes, and limited-user
  Unit-management denial were exercised in Chromium. Production `next start`
  demo-auth cases were not rerun; the earlier Ticket 42 production-mode
  evidence remains the latest.
- Final `npm run lint`, `npm run type-check`, `npm run build`,
  `npm run db:validate`, `npm run db:generate`, and `git diff --check` all
  passed, run sequentially. The production build includes `/leaderboard`.
- Current dependency audit: production **0** findings; complete dependency
  tree **19 moderate**, **0 high/critical**, all documented development-tool
  advisories. No dependency changes were made during this final review.

### Security, limitations, and release state

- The M2 Leaderboard threat and OWASP reassessments are recorded in
  [THREAT_MODEL.md](THREAT_MODEL.md) and [OWASP_BASELINE.md](OWASP_BASELINE.md).
  They document public-data/query boundaries and all-time/unpaginated load risk;
  no Critical/High production security issue or other new vulnerability was
  substantiated.
- Existing release tags are `milestone-0` at
  `c0420382ba63403983ca4a2d781cfdf9ccb6fbcc` and `milestone-1` at
  `e67ecb78f7e982172b789d8243de71bc5723ebd6`; the two-tag minimum is met.
  There is no `milestone-2` tag.
- Before final review submission, PR #29 remained open from
  `qa/m2-final-integration` to `main`; the final review and merge decision are
  recorded in the Ticket 43 record and [M2_EVIDENCE.md](M2_EVIDENCE.md).
- Remaining limitations are the 19 moderate development-tool advisories, no
  fresh production-mode demo-auth browser run, and the rechecked QA42-UI1
  narrow Event-manager layout issue. QA42-UI1 remains a known, non-blocking
  mobile usability limitation; its current evidence is in
  [viewport evidence](security-evidence/viewports.md).
