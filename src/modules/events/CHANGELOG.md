# Events — Changelog

## 0.8 — 2026-11-03 — TKT-20261103-000060-001

- Added Event-side labels, rally offsets, planned duration, and explicit
  Open/Closed Invite policy with forward-only migration defaults that preserve
  legacy opponent values.
- Added Ceremony and Other as additive Event types; rally and expected-end
  times derive from the canonical scheduled start.
- Ceremony uses a solid silver badge with dark text and silver accents;
  Other uses dark-gray accents with readable badge text across Event presentation.
- Grouped Rally, Event start, and Expected end into one ordered schedule
  timeline, with planned duration alongside it on Event detail and in the
  create/edit schedule preview.
- Isolated shared schedule derivation in a dedicated client-safe module so the
  editor preview does not depend on a named export from the broader
  presentation module.
- Closed Invite now blocks new requests in the Events server request path
  without changing Unit authorization or the EventParticipation lifecycle.
- Extended the public Event batch contract additively; Statistics and Audit
  contracts and semantics remain unchanged.

## 0.7 — 2026-11-03 — TKT-20261103-000053-001

- Added a public batch presentation read for Event name, type, time, map, and
  opponent; missing IDs are omitted and no manager data is exposed.
- Player history rows can present Event identity without per-row queries.

## 0.6 — 2026-11-03 — TKT-20261103-000051-001

- Event Battle Player and commander references now render cached Roblox
  usernames/headshots with stable Player ID routes and neutral fallbacks.
- The Statistics-owned batch read supplies identity metadata; public Event
  rendering performs no Roblox requests and does not use `Player.name`.

## 0.5 — 2026-11-02 — TKT-20261102-000049-001

- Added a standalone public Event Unit leaderboard with the requested metric
  order, secondary per-Player averages, and side Tickets/pooled K/D/Flag
  Captures summaries from the Statistics-owned Event Battle read.
- Applied subtle winner/loser/draw side treatments only for effective
  conclusions and removed the duplicate Company-statistics disclosure while
  retaining structural Unit links and collapsible Player results.
- Preserved Event result, Audit finalization, and metric-calculation
  semantics; the additive Statistics DTO extension is recorded by
  BCR-20261102-009.

## 0.4 — 2026-11-02 — TKT-20261102-000047-001

- Reworked the public Event Battle Structure for reading and comparison:
  contained Command Groups, distinct Company cards, collapsible group contents,
  side navigation, Company-scoped statistics, and responsive side summaries.
- Public Event pages now use the existing Unit image reference for approved
  represented Units, with a consistent fallback icon, and link Unit and public
  Player identities to their existing routes.
- Preserved the public Event Battle and battlefield readers, result
  semantics, approved-participation boundary, and authorization behavior.

## 0.3 — 2026-09-26 — TKT-20260921-000017-001 post-merge stabilization

- Removed the calendar's render-time clock read; current-day highlighting and
  upcoming filtering now share a post-mount time snapshot.
- Added calendar cutoff coverage and a real-PostgreSQL Players/Roster/Event
  integration regression, including the rule that participation authority does
  not grant Event-management authority.
- Verified Event creation, owner manager administration, REQUESTED review,
  approval, and public approved-Unit visibility in the authenticated browser.

## 0.2 — 2026-09-23 — TKT-20260921-000017-001

Event Management and Participation Approval vertical slice.

- Added Event-side participation decisions (`decideEventParticipation`,
  `approveEventParticipation`, `denyEventParticipation`), authorized through
  `canManageEvent`, with a status-guarded write so terminal records fail
  safely under concurrent decisions.
- Added `server/management.ts`: manageable-Event reads, the Event-management
  view, ordinary Event-information updates preserving the Event Time Rule
  (no rescheduling into the past; an unchanged past time stays editable),
  and email-based manager addition over the Ticket 16 owner-only boundary.
- Added the authenticated management workflow: `/events/manage` (Events the
  User owns or manages, with pending-request counts) and
  `/events/[eventId]/manage` (event settings, owner-only manager
  administration, participation review and approval/denial), with
  server-side gating and no client-trusted authority.
- Public Event detail now lists APPROVED participating Units and links to
  management for authorized viewers; pending and denied participation stays
  management-only. Public list surfaces a Manage shortcut for organizers.
- Focused tests: participation decisions (authorization, transitions,
  concurrency) and management (updates, Event Time Rule, listing,
  email-based manager addition).

## 0.1 — 2026-09-21 — TKT-20260914-000005-001 … TKT-20260921-000016-001

- Events module established: minimal Event persistence and public browsing
  (list, detail, calendar) — TKT-000005.
- Authenticated Event creation via Units' `canCreateEvent` contract —
  TKT-000013 follow-on work.
- EventParticipation persistence, Unit-side request path, and lifecycle
  validation — TKT-000015.
- Event ownership, explicit Event managers, `canManageEvent`, and owner-only
  manager administration — TKT-000016.
