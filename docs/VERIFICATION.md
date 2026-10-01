# Setup and Verification

Use the [README setup](../README.md#setup) for prerequisites, the no-credential quick start, optional Google OAuth configuration, and the local development URL. The commands below are the repository's actual package scripts or installed Prisma/tsx commands. No aggregate test script is currently defined.

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

There is no aggregate test script. Run the existing focused checks:

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