# M1 viewport evidence

2026-10-29, Ticket 42, Aiden Slabiak. Playwright 1.64.1, Chromium 156.0.8078.4,
Windows; Next development webpack server, isolated seeded QA database. Height
900px; widths below are CSS pixels. Browser test:
`tests/browser/baseline.spec.ts`. No Leaderboard route was visited or required.

PASS in this matrix means HTTP 200, visible H1, no document-width overflow,
and no browser runtime exception. Public rows run signed out; manager rows run
as the fixed root demo identity. It does not mean exhaustive interaction or
accessibility certification. Screenshots are full-page, so their heights differ.

| Route | Session | 390 | 768 | 1440 |
|---|---|---|---|---|
| `/` | Public | PASS | PASS | PASS |
| `/units` | Public | PASS | PASS | PASS |
| `/units/demo-unit-french-line-1` | Public | PASS | PASS | PASS |
| `/players` | Public | PASS | PASS | PASS |
| `/players/demo-player-001` | Public | PASS | PASS | PASS |
| `/events` | Public | PASS | PASS | PASS |
| `/events/demo-event-main-review` | Public | PASS | PASS | PASS |
| `/statistics` | Public | PASS | PASS | PASS |
| `/units/demo-unit-french-army/manage` | Root manager | PASS | PASS | PASS |
| `/events/demo-event-main-review/manage` | Root manager | PASS* | PASS | PASS |
| `/events/create` | Root manager | PASS | PASS | PASS |
| `/audits` | Root manager | PASS | PASS | PASS |

36 route/viewport combinations passed. Four representative screenshots were
visually inspected and retained:

- [Player detail, 390px](images/player-390.png): readable stacked statistics and history.
- [Event management, 390px](images/event-manager-390.png): *manual usability FAIL
  for the densely nested battle tree*. Repeated indentation leaves little text
  width, wraps names heavily and creates a 5,376px page. Form sections remain
  inside the viewport. Record **QA42-UI1**, medium priority, Events presentation
  follow-up recommended: evaluate compact/collapsible nesting at mobile widths.
  This is an existing desktop-oriented editor limitation; no product redesign
  is included in this QA ticket.
- [Public Event, 768px](images/event-768.png): hierarchy and results remain readable.
- [Statistics discovery, 1440px](images/statistics-1440.png): clear aligned rows and navigation.

At 390px the header's horizontal navigation shows only part of its contents at
once; this matrix checks whole-document overflow, not whether every navigation
item is initially visible. Keyboard/screen-reader/touch target testing and a
second browser are not claimed. Other route screenshots were generated but not
individually given a manual visual-quality verdict. The reproducible full set
and JSON results are under ignored `coverage/browser/` and
`coverage/browser-results.json`. A rerun replaces that local output.

## Ticket 43 combined M2 viewport rerun — 2026-11-01

The post-merge browser matrix was **not run**. Docker Desktop's engine was
unavailable and the configured PostgreSQL endpoint at `localhost:5432` was
unreachable. No browser server was started against the existing non-disposable
`morale_gg` target. This table records the current result honestly; `NOT RUN`
is not a pass or a reproduced failure.

| Route | 390px | 768px | 1440px | Reason |
|---|---|---|---|---|
| `/dev/sign-in` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/units` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/units/demo-unit-french-line-1` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/units/demo-unit-french-line-1/manage` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/events` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/events/demo-event-main-review` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/events/demo-event-main-review/manage` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/audits` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/statistics` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |
| `/leaderboard` | NOT RUN | NOT RUN | NOT RUN | No isolated database/server |

Ticket 41 previously inspected all four Leaderboard boards at these widths and
reported no page-level overflow or sticky-column overlap after two fixes
(documented in [VERIFICATION.md](../VERIFICATION.md#leaderboard-verification-2026-10-31-tkt-20261027-000041-001)).
That is useful prior evidence, but it is not an independent Ticket 43 rerun.
Ticket 43's static Leaderboard presentation regression passed 9/9, including
the locally scrolling table, sticky columns, and horizontally scrollable board
tabs; it does not establish live-browser geometry.
