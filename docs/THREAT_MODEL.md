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
| Dependencies and availability | Potential compromise/DoS; applicability varies; high | Locked install and npm advisory evidence, reproducible build/test baseline | npm audit reports critical/high advisories; prioritize separate dependency remediation and rerun regression. Advisory presence is not proof an exploit is reachable |
| Error handling/monitoring | Undetected abuse or sensitive logs; medium; medium | Actions generally return bounded validation messages; denial and rollback tests | No centralized security monitoring/rate-limit configuration found. Review logs/redaction and operational alerting before hosting |

Residual risks are not accepted on behalf of the project owner. Reassess this
register after dependency upgrades, deployment configuration, privacy decisions
or authorization changes. Concrete evidence and limitations are linked from
[the control case](security-evidence/demo-auth.md).
