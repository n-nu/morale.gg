# Focused OWASP baseline

Ticket 42; initially assessed 2026-10-29 at baseline `86ac184`, dependency
follow-up verified 2026-11-01 on `qa/m2-foundation`. Uses the
[OWASP Top 10:2025 taxonomy](https://top10.owasp.org/2025/). The ticket's
“Identification and Authentication Failures” corresponds to 2025 Authentication
Failures. This review covers the requested categories, with supply-chain and
logging observations added because the repository evidence warrants them.

| Category | Relevance / mitigation | Repository evidence | Remaining concern |
|---|---|---|---|
| A01 Broken Access Control | All protected writes need server identity plus operation-specific authority | Units authorization/workflow tests, Events owner/manager/participation tests, Player roster integration, Audit creator/finalization tests | Public/private projections and revocation races warrant ongoing regression; no authorization guarantee comes from frontend visibility |
| A02 Security Misconfiguration | Demo sign-in and destructive seeds must remain development-only | `dev-sign-in.ts`, direct action test, production browser case; demo reset guard tests | Do not expose `next dev`; local default DB credentials/port and example secret are unsuitable for deployment |
| A04 Cryptographic Failures | Session tokens and provider secrets | `randomBytes(32)`, HttpOnly/Lax session cookie, normal Auth.js database sessions, `.env` exclusion | Hosted TLS, encrypted backups, least-privilege secret access and rotation not verified; local demo cookie intentionally lacks Secure |
| A05 Injection | Form values, Audit CSV, external links, database queries | Prisma parameterized operations, tagged raw source SQL, React escaping, Unit image/URL validation and Audit parser tests | No full dynamic injection scan; large inputs/unpaginated reads remain availability risks. Test-only unsafe SQL is constant DDL, not user-supplied SQL |
| A06 Insecure Design | Separate Unit/Event/Audit rights and immutable history | Module contracts; real authorization and database constraints tested; draft data excluded from public statistics | No formal abuse-rate/privacy policy; DB owner can override triggers. Deploy with restricted app credentials |
| A07 Authentication Failures | Google login, demo identity, stolen/expired sessions | Google + PrismaAdapter in `auth.ts`; exact demo environment/identity gating; ordinary session/rotation/sign-out browser checks | Google OAuth and production reverse-proxy behavior need deployment-specific verification |
| A03 Software Supply Chain Failures | Runtime/framework and tooling dependencies | `npm ci`; patched Next.js 16.4.3 and Prisma 7.10.1; `npm audit --json`; `npm audit --omit=dev --json` | The initial 29 findings (20 moderate, 8 high, 1 critical) fell to zero production findings. Full-tree audit retains 19 moderate findings in development tooling (ESLint/Next lint integrations and c8/glob/minimatch); npm proposes breaking major updates for ESLint and c8. No high/critical findings remain; do not apply breaking tooling upgrades without a separate compatibility review |
| A09 Security Logging and Alerting Failures | Detect repeated denials and abuse | Source inspection of actions/error logging | No central security monitoring evidence; define deployment logging/redaction/alerts |

The initial advisory set included `next`, `sharp`, `prisma`, `@prisma/config`,
`mysql2`, `deepmerge-ts`, `brace-expansion`, `source-map-js`, `zod`, and
`fast-uri`. Next.js 16.4.3 removes the affected runtime framework advisories;
Prisma 7.10.1 updates its nested `@prisma/config`, MySQL tooling and `fast-uri`
to patched releases. Event/home banners use the Next image optimizer for
repository-selected local artwork; Unit image references explicitly use
`unoptimized`. The framework image-optimizer advisory is covered by the patched
Next.js release rather than by assuming the optimizer is unused.
After `npm audit fix` limited to compatible lockfile updates, the production
audit is 0 findings; the complete audit is 19 moderate findings, all in
development tooling. Fixing those would require major ESLint/c8 upgrades and is
deferred. Reproduce with `npm ci`, `npm audit --json`, and
`npm audit --omit=dev --json`; the reports are ignored under `coverage/`.
Findings, impact and follow-up priorities are in [THREAT_MODEL.md](THREAT_MODEL.md); reproducible evidence is in
[security-evidence/demo-auth.md](security-evidence/demo-auth.md).
