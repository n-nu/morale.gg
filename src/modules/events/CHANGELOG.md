# Events — Changelog

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
