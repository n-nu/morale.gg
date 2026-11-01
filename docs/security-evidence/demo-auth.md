# Demo authentication control evidence

Ticket 42 — 2026-10-29, Aiden Slabiak. Source baseline `86ac184` plus this ticket's
tests; Windows, Node 22.22.3, npm 10.9.8, PostgreSQL 16, Playwright 1.64.1 /
Chromium 156.0.8078.4. Fresh database: isolated `morale_gg_qa`, loopback port
5542. No Google credentials were needed for these checks.

## Before / control / after

**Initial risk:** the fixed demo Root Commander can perform privileged actions.
If its login endpoint worked in production, an unauthenticated visitor could
impersonate that seeded identity. This describes a threat, not a claim that a
vulnerable production version existed. The positive “before” comparison is the
intentionally enabled local development endpoint; no control was removed.

**Specific control:** `src/lib/dev-sign-in.ts` requires both
`NODE_ENV === "development"` and `DEV_SIGN_IN_ENABLED === "true"`; it accepts
only fixed seeded IDs. `src/app/dev/sign-in/actions.ts` checks those conditions
before any database/cookie work, independently of the page's 404 gate. A successful
action creates an ordinary Auth.js Session with a cryptographically random token,
24-hour expiry, HttpOnly/Lax cookie, and removes the prior session token. It does
not write authority grants. The separate diagnostic page is also development-only.

| Experiment | Observed result |
|---|---|
| Local `next dev`, enablement true, root demo identity | Login redirects to Units; `/api/auth/session` recognizes Demo Root Commander; cookie maps to that User in the ordinary Session table |
| Change identity to Limited Roster Manager | Previous Session token is gone; new Session maps to limited identity; grant count unchanged |
| Limited identity opens French Army management | HTTP 404, no profile edit input; possession of a valid session does not confer Unit management |
| Sign out | `/api/auth/session` returns null |
| Direct action function with production/test mode or absent/false/malformed flag | Throws disabled error before database read; exact development/true case is the only enabled combination |
| Direct action function with development/true but unknown/missing/whitespace identity | Throws unknown identity before database read |
| Built production server with explicit enablement true | `/dev/sign-in` and `/dev/auth-diagnostic` return 404; header has no demo link |
| Direct POST to real production action ID from this build, valid fixed identity | HTTP 500 (disabled action), no session cookie, Session row count unchanged |

The production POST uses the build's actual action manifest, not a made-up or
stale action ID. Combined with the direct-function assertion, it distinguishes
an action guard from simply hiding a route. Error details are intentionally not
asserted in the production HTTP response. It is expected to log the disabled
action exception on the local server.

## Reproduce and results

Follow [VERIFICATION](../VERIFICATION.md#ticket-42-isolated-reproduction-powershell).
Run `npm run test:dev-sign-in` (3/3 passed), the development browser suite
(4/4 applicable cases passed), then the production browser suite (2/2 applicable
cases passed). Opposite-environment browser cases are intentionally skipped.
The production suite also needs the isolated `DATABASE_URL`; the manifest must
belong to the server being tested. Set `QA_BASE_URL` if using a port other than
3100 (this run used dev 3100 and production 3101).

The full Node suite passed 164/164 and measured 79.71% statements. Production
webpack build passed; the default Turbopack build failed locally while starting
its CSS worker (process exited before connection, exit code 0). This limitation
is retained, not reported as a passing default build. All 20 migrations deployed
on the empty QA database; migration status is current. Demo reset bootstrapped
the root and seeded 41 Units, 132 Players, 10 Events, 29 FINAL / 7 DRAFT Audits;
its reader smoke passed. After tests, no Players/Units test schemas remained and
all three Audit immutability triggers were enabled (`tgenabled=O`). Lint,
type-check and `git diff --check` passed.

## Residual risk and limits

Enabled development sign-in is intentionally unauthenticated and must remain
private/loopback. This does not prove Google OAuth, hosted TLS/proxy configuration,
rate limiting, expired-session behavior, or every authorization mutation. Browser
success uses real sessions and persistence; the direct denial unit test substitutes
only Next navigation so it can run outside Next's bundler. No real user tokens,
cookies, secrets or traces are committed. Dependency advisories and follow-up
priorities remain in [OWASP_BASELINE](../OWASP_BASELINE.md).
