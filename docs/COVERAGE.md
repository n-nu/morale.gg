# M1 coverage baseline

Ticket 42, Aiden Slabiak, 2026-10-29. Source baseline `86ac184` plus this ticket's
test/tooling changes. Node 22.22.3, PostgreSQL 16, c8 12.0.0, existing Node/tsx
tests. No Leaderboard code or tests are required.

## Reproduce

Follow the isolated database setup in [VERIFICATION.md](VERIFICATION.md), then:

```text
npm run test:coverage
```

The command runs the same serial suite as `npm test`; failure remains nonzero.
c8 uses V8 data with source maps and `all: true` so unexecuted included files
remain in the denominator. Configuration is explicit in `tests/c8.json`.
HTML detail is `coverage/index.html`; machine summary is
`coverage/coverage-summary.json`. These generated files are ignored, while this
dated summary is the durable report. Browser runs are separate and are **not**
added to these percentages.

## Measured result

All 164 tests passed: 131 server/domain and 33 presentation/calendar; zero failed
or skipped. The initial runner incorrectly classified the calendar component
test as server React; the final run corrects that classification.

| Metric | Covered / total | Percent |
|---|---:|---:|
| Statements | 5,241 / 6,575 | 79.71% |
| Lines | 5,241 / 6,575 | 79.71% |
| Functions | 528 / 630 | 83.80% |
| Branches | 1,279 / 1,649 | 77.56% |

| Critical file | Statement coverage | Branch coverage |
|---|---:|---:|
| `src/lib/dev-sign-in.ts` | 100% | 87.50% |
| Units authorization | 94.71% | 80.09% |
| Units workflows | 92.05% | 69.49% |
| Events authorization | 95.87% | 85.36% |
| Players workflows | 98.86% | 88.63% |
| Audit submission | 88.61% | 70.29% |
| Statistics Ranker reader | 100% | 87.50% |

## Target and exclusions

Target at least **70% statements** over this fixed domain/server scope and no
unexplained decrease from this baseline. The measured 79.71% supports that floor;
it is not permission to lose security cases while staying above a percentage.
This is a review target rather than a blanket per-file gate. Prioritize missing
authorization branches, transactions and failure behavior over superficial tests.

Included: all `.ts` under `src/lib` and `src/modules`, plus the development
sign-in action. Module server actions and untested readers are deliberately
included (for example Units queries are currently 0%). Excluded: test/type-only
files, React `.tsx` presentation and App Router pages/layouts, generated Prisma
client, dependencies, test tooling and seed/migration scripts. React tests still
run; page/session/browser behavior has separate evidence. Schema migration and
seed correctness is demonstrated by PostgreSQL checks, not TS coverage. `auth.ts`
framework wiring is assessed via source inspection and the session browser test.

Limitations: V8 statement/line counts reflect executable source ranges, not
semantic path completeness; TypeScript/source-map tooling affects totals.
The direct-action denial test substitutes only Next navigation to run outside
Next's bundler; it does not simulate session success. Real cookie/session success
is tested in the browser. Existing unit tests mock persistence; integration tests
exercise real PostgreSQL and production capability functions separately.

## Ticket 43 combined M2 result — 2026-11-01

The complete `npm run test:coverage` run used the isolated PostgreSQL 16
container from [VERIFICATION.md](VERIFICATION.md#ticket-43-final-review--2026-11-01),
not the configured developer database. All **187/187 tests passed** (145
server/domain and 42 presentation/calendar); none failed or were skipped.

| Metric | Covered / total | Percent |
|---|---:|---:|
| Statements | 5,749 / 7,090 | 81.08% |
| Lines | 5,749 / 7,090 | 81.08% |
| Functions | 576 / 680 | 84.70% |
| Branches | 1,430 / 1,806 | 79.18% |

The meaningful statement-coverage target is at least 70%; it is **met**.
Compared with the historical M1 result of 79.71% statements, the combined
result is higher by **1.37 percentage points**. The denominator changed with
the combined code and the additional tests; the historical M1 figures above
remain dated baseline evidence, not the current result. The new finalized
Audit → Ranker → Leaderboard PostgreSQL integration assertions were executed
in this run and passed.
