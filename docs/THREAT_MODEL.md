# M1 threat model

Ticket 42, Aiden Slabiak, 2026-10-29. Assessed source baseline `86ac184`;
application baseline `e67ecb7`. This is a focused source/test assessment, not a
penetration-test certification or a new authorization policy.

## Assets and trust boundaries

Protect Auth.js sessions/accounts, Unit grants and delegation, private drafts and
manager configuration, immutable finalized Audits, database integrity, and server
secrets. Public Player game IDs, roster/history, approved Event participation and
final statistics are intentionally public under SYSTEM.md; internal relational
IDs are not credentials and must not replace game IDs in public navigation.

Untrusted browser input crosses Next Server Actions into server-resolved Auth.js
database sessions, then module-owned authorization/validation, Prisma and
PostgreSQL constraints. Google is an external identity provider. Local demo login
is a separate development-only identity entry point into the same Session table.
The database operator and local development host are trusted; browser callers are
not. Units owns Unit authority; Events owns Event management; neither permission
automatically grants the other or Audit submission. Statistics consumes approved
read contracts and has no independent result persistence.

## Threat register

Priority combines impact and likelihood; likelihood is qualitative for this local
M1 baseline and must be reassessed before hosting. Required actions are review or
deployment recommendations, not silent changes to product policy.

| Asset / scenario | Impact; likelihood; priority | Existing mitigation and source evidence | Required action / residual risk |
|---|---|---|---|
| Accounts: attacker invokes demo action in production or submits arbitrary User ID | Account impersonation; medium if misconfigured; high | `lib/dev-sign-in.ts` requires exact development + `true`, fixed identity allowlist; `app/dev/sign-in/actions.ts` repeats gate before DB; direct-action negative tests | Keep dev server loopback/private. Production cannot use demo login; a publicly exposed **development** server intentionally permits seeded privileged identities |
| Sessions: stolen/reused cookie, session fixation | Impersonation; medium; high | Demo action uses 32 random bytes, 24-hour expiry, HttpOnly/Lax cookie, deletes prior token; `auth.ts` uses Prisma database sessions; browser test verifies rotation and Auth.js resolution | HTTPS and strong AUTH_SECRET required when hosted. Demo HTTP cookie is deliberately non-Secure and only suitable for local development; no theft resilience claim |
| Google OAuth / secrets: stolen client secret or wrong callback origin | Account compromise; low locally, deployment-dependent; high | Google provider and PrismaAdapter in `auth.ts`; secrets are environment-only; `.gitignore` excludes `.env*` except example | Real OAuth, proxy/TLS and deployment secret rotation not exercised; review callback origins and avoid example secret in deployment |
| Unit grants: request edits another Unit, promotes itself or uses revoked ancestry | Privilege escalation/history damage; medium; high | `units/server/authorization.ts` validates scope, root, membership, lineage/revocation; workflow tests cover subordinate levels, protected Commander and history | Recheck negative cases after any policy change; concurrent revoke/write races need separate threat-driven investigation, not an unverified vulnerability claim |
| Roster: forged actor or wrong membership Unit | Unauthorized membership/history change; medium; high | Players actions resolve session; workflows call `canManageRoster`; partial unique index, conditional ending; real Player/roster/Event integration and Unit management denial tests | Public identity/history enables scraping; privacy/rate-limit policy remains a product decision |
| Events: requester approves itself, manager grants other managers | Unauthorized participation/management; medium; high | Events owner-only manager administration and `canManageEvent`; approval transitions and cross-Event tests | Maintain separation of Unit participation eligibility and Event authority; UI hiding alone is insufficient |
| Battle structure: cross-Event edges, cycles, public Unsorted disclosure | Corrupt/misleading results; medium; high | Audits command-group/atomic workflows call Events capability, validate tree/side; public DTO excludes Unsorted; battlefield integration tests | Public vs manager projections must remain separately tested |
| Draft/FINAL Audit: edit someone else's draft or rewrite history | Statistics integrity loss; medium; high | Creator + `canSubmitAudit`, transactional finalization; PostgreSQL immutability triggers; submission and statistics integration | Database owner can disable triggers. Test cleanup uses that privilege only in disposable QA; deploy app role must not be a schema owner/superuser |
| Public Player identity: internal row ID used as game ID | Wrong identity links/history, unintended disclosure; medium; medium | Player queries/Statistics source resolve public `playerId`; directory/roster/source tests | Internal IDs are not authorization secrets; no automatic Auth.js User/Player relationship exists |
| User input: SQL/script/URL injection | Data compromise or script execution; low in inspected paths; high impact | Prisma filters and tagged `$queryRaw` in statistics source; React text rendering; Unit URL/image validators; parser validation tests. Inspected unsafe SQL is fixed test cleanup DDL | No exhaustive dynamic injection scan performed. Audit row volume and unpaginated reads need resource limits/load testing before public exposure |
| Configuration/reset: developer resets wrong DB or leaks credentials | Data destruction/secret exposure; medium; high | `prisma/demo-reset.ts` checks production, loopback, DB/port/overrides and root count; `demo-seed.test.ts`; isolated QA Compose binds loopback | Existing default Compose publishes DB port broadly and uses disposable credentials. Restrict deployment network/roles; never run QA cleanup/reset on shared data |
| Dependencies and availability | Potential compromise/DoS; applicability varies; high | On 2026-11-01, updated direct framework dependencies to Next.js 16.4.3 and Prisma / client / PostgreSQL adapter 7.10.1; `npm ci`, `npm audit --json`, and `npm audit --omit=dev --json` | Production audit is now 0 findings (was 8, including 1 critical and 6 high). Full audit retains 19 moderate findings in development-only lint/coverage tooling; the proposed fixes require breaking ESLint/c8 major upgrades. App Router Server Actions exist; event/home banners use the Next image optimizer for repository-selected local artwork, while Unit image refs are `unoptimized`. Patched framework findings are not dismissed on an assumption that the optimizer is unused. Continue to reassess before hosting; an advisory count alone is not evidence of exploitability |
| Error handling/monitoring | Undetected abuse or sensitive logs; medium; medium | Actions generally return bounded validation messages; denial and rollback tests | No centralized security monitoring/rate-limit configuration found. Review logs/redaction and operational alerting before hosting |

Residual risks are not accepted on behalf of the project owner. Reassess this
register after dependency upgrades, deployment configuration, privacy decisions
or authorization changes. Concrete evidence and limitations are linked from
[the control case](security-evidence/demo-auth.md).

## M2 Leaderboard reassessment — 2026-11-01

This source-level reassessment covers the merged `/leaderboard` surface and
does not claim a penetration test or a fresh browser/database run.

| Surface | Assessment and evidence | Residual risk |
|---|---|---|
| Public data exposure | Leaderboard reads are public, consistent with the system's public Statistics policy. Its subjects expose the stable game Player ID and public display-name fallback, or a Unit route identifier/name; the output does not include Audit, Event, participation, or internal Player-row identifiers. Reader tests check DTO identity boundaries; the added PostgreSQL integration assertions cover the Player DTO when run. | Public Player/Unit statistics are scrapeable. Privacy policy and rate limits are not configured. |
| Query parameters | `parseLeaderboardQuery` allowlists board, Unit type, sort column, direction, and the shared window; unknown/repeated values resolve to safe defaults. It does not construct SQL. Model tests cover invalid, repeated, and board-incompatible parameters. | These checks bound accepted options, not request rate or total source-row volume. |
| Access assumptions | The page performs public read-only Statistics queries; no protected write or authority check is bypassed. Draft data is excluded through the Audits-owned effective-finalized-Audit source contract. | Production authentication and management authorization were not browser-regressed in this run because the database was unavailable. |
| Links/navigation | Player links use encoded stable game Player IDs; Unit links use the existing public `/units/[unitId]` route. Presentation tests cover both links and URL encoding. | Existing public Unit route identifiers are addressable; they are not treated as authorization secrets. |
| Query cost/availability | Windows are limited to 14 days, 30 days, and all time, and board/type/sort options are finite. All-time reads and unpaginated statistics remain dependent on the full relevant source population; this is consistent with existing Statistics behavior. | No pagination, rate limit, or load test establishes a safe maximum dataset/request rate. Treat growth/abuse as an availability risk before public hosting; no exploit or denial-of-service finding was reproduced. |
| Error behavior | The server page renders the existing Statistics error state if a reader fails; it does not display partial fabricated results. | Browser loading/error behavior was not rechecked against a live database in this run. |

No new vulnerability was substantiated. The current direct demo sign-in guard
test passed; the earlier production-server/browser control evidence remains
historical and was not reproduced against this checkout.
