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

## Ticket 43 combined M2 viewport verification — 2026-11-01

Playwright 1.64.1 / Chromium ran on the Next development server backed by the
isolated, seeded PostgreSQL 16 QA database. Each route check required HTTP 200,
a visible H1, no page-level horizontal overflow, and no browser runtime error.
Public routes were checked signed out; manager routes used the root demo
identity. The focused [Ticket 43 browser test](../../tests/browser/ticket43.spec.ts)
passed 3/3 viewport tests; the complete browser suite passed 7 tests with 2
production-only tests skipped.

| Route | Session | 390px | 768px | 1440px |
|---|---|---|---|---|
| `/dev/sign-in` | Public | PASS | PASS | PASS |
| `/statistics` | Public | PASS | PASS | PASS |
| `/leaderboard` | Public | PASS | PASS | PASS |
| `/events` | Public | PASS | PASS | PASS |
| `/events/demo-event-main-review` (includes public Battle Structure) | Public | PASS | PASS | PASS |
| `/units/demo-unit-french-army/manage` | Root manager | PASS | PASS | PASS |
| `/events/demo-event-main-review/manage` (manager Battle Structure) | Root manager | PASS | PASS | PASS |
| `/audits` | Root manager | PASS | PASS | PASS |

All 24 route/viewport checks passed without page-level horizontal overflow.
At each width the Leaderboard additionally passed sort-by-K/D, Commanders board,
all-time window, Units board, and Rifles branch interactions. The wide table
remained locally scrollable at 390px and 768px. Board tabs, filters and ranking
rows rendered; narrow widths require horizontal scrolling to inspect all table
columns. Desktop navigation remains horizontally clipped at narrow widths as
noted in the M1 matrix. Full-page screenshots and machine results are under
ignored `coverage/browser/`.

### QA42-UI1 recheck

The Event-manager Battle Structure at 390px still has the previously reported
dense indentation and excessive page height; it is **not fixed**. The browser
captured a 5,376px page with a 2,595px battle-structure region and nine open
groups. At 768px these heights were 3,397px / 1,347px; at 1440px they were
2,421px / 849px. Manual inspection of the 390px full-page screenshot confirms
the nested labels wrap into a narrow column. The route has no page-level
horizontal overflow, and the manager forms and actions remain present and
visible below the tree. This remains a known medium-priority, non-blocking
mobile usability limitation for the desktop-oriented Event editor, not a
Leaderboard or Milestone 2 release blocker. A compact/collapsible mobile tree
remains recommended follow-up; this QA review made no production UI changes.
