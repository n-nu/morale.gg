---
module_id: events
path: src/modules/events
status: active
version: 0.2
last_reviewed: 2026-09-23
updated_by_ticket: TKT-20260925-000019-001
---

# Events

## Purpose

Own the Event concept for morale.gg: what an Event is, how it is persisted,
how it is read, and how it is publicly presented. Establishes the foundation
that later EventParticipation, event authorization, and Audit work will build
against.

## Ownership

- Event identity (`Event.id`);
- Event name;
- scheduled date/time;
- basic Event metadata (simple string event type, optional description,
  opponent, and map);
- Event read/query behavior;
- authenticated Event creation and its Event Time Rule (no creation in the
  past);
- Event ownership by exactly one Auth.js User;
- explicit Event-authorized Users and owner-only manager administration;
- semantic Event-management authorization;
- ordinary Event-information management (owner/manager editing within the
  Event Time Rule);
- Event-side EventParticipation review and the REQUESTED -> APPROVED/DENIED
  decision boundary, including the side/team assigned at approval;
- named event sides (`hostSide` plus the existing `opponent`) and the public
  versus presentation of approved sides;
- the authenticated Event-management workflow (`/events/manage`,
  `/events/[eventId]/manage`);
- public Event presentation (`/events`, `/events/[eventId]`,
  `/events/calendar`), including the approved-participation read-side.

## Non-Ownership

- Unit-side participation request authorization (Units owns
  `canRequestEventParticipation`);
- Unit authority and creation-eligibility evaluation;
- Audit lifecycle and audit statistics;
- leaderboards;
- the shared site shell and theme (owned at the app level).

## Public Interface

- Route `/events`: public, unauthenticated list of all Events (upcoming and
  past), with presentation-level event-type filtering via query parameters.
- Route `/events/[eventId]`: public, unauthenticated Event detail. Its
  statistics and participation sections are static placeholders labeled as
  future functionality.
- Route `/events/calendar`: public, unauthenticated month-calendar view of
  the same Event data.
- Route `/events/manage`: authenticated list of Events the User owns or
  explicitly manages.
- Route `/events/[eventId]/manage`: authenticated Event-management workflow
  (event settings, owner-only manager administration, participation review
  and approval/denial), gated server-side by `canManageEvent`.
- Public Event detail exposes APPROVED participating Units only; pending and
  denied participation stays management-only.
- Events consumes the server-only
  `events-units-event-creation-authorization` contract. It exposes no
  cross-module data contract; future Event workflows consume its server-only
  semantic capabilities within the Events boundary.

## Inputs

- Route parameters (`eventId`) from public navigation.
- `CreateEventInput` plus the authenticated server session on the protected
  creation path.
- Auth.js User and Event identifiers for server-only Event authorization and
  manager-administration operations.

## Outputs

- Server-rendered public pages listing and detailing Events.
- Persisted `Event` rows via the server-only creation path.
- Boolean Event-management and owner-only administration decisions.
- Persisted explicit Event manager authorizations.

## Dependencies

- `src/lib/prisma.ts` (shared server-only Prisma client) for persistence
  access, per ADR-20260914-001.
- Units' server-only `canCreateEvent` capability through the
  `events-units-event-creation-authorization` contract.

## Invariants

- All Prisma access happens in server-only code (`src/modules/events/server/`).
- Every Event has exactly one real User owner; no Unit ownership or authority
  anchor is stored.
- Explicit Event authorization is unique by Event/User, excludes the owner,
  and records the adding User.
- The domain creation path rejects Events scheduled in the past.
- Creation resolves the owner from the server session and requires current
  `canCreateEvent` eligibility.
- Existing Event management is allowed only for the owner or an explicitly
  authorized User. Only the owner administers explicit managers.
- Participation decisions are authorized exclusively through
  `canManageEvent`; the only valid transitions are REQUESTED -> APPROVED and
  REQUESTED -> DENIED, terminal records are immutable (including under
  concurrent decisions), and participation grants no Event authority.
- A participation's side/team is stored only on approval, through the same
  decision boundary; denial never stores a side.
- An Event may not be rescheduled into the past; a past Event's unchanged
  time stays valid so its other information remains editable.
- Pending and denied participation is never exposed through public reads.
- Public browsing requires no authentication.

## Permissions / Authority

Events owns `canManageEvent`, which allows only the Event owner or an
explicitly authorized Event User. `canManageEventAuthorizedUsers` allows only
the owner. Add/revoke workflows enforce that boundary server-side. Units owns
`canCreateEvent`, which answers only whether the User has effective
`MANAGE_EVENTS` authority somewhere; it grants no authority over an existing
Event.

## Internal Structure

- `server/queries.ts` — server-only read/query functions.
- `server/create-event.ts` — server-only domain creation path (verification
  and authenticated authorization boundary).
- `server/authorization.ts` — owner/explicit-manager decisions and owner-only
  manager administration.
- `server/event-participation.ts` — participation persistence reads, the
  request path (consuming Units' capability), and the Event-side
  approve/deny decision boundary.
- `server/management.ts` — management reads (manageable Events, the
  management view), ordinary Event-information updates, and email-based
  manager addition over the owner-only boundary.
- `presentation.ts` — client-safe formatting helpers (event-type styling,
  UTC fallback formatting).
- `map-art.ts` — client-safe map-name → banner artwork lookup
  (`public/maps/`).
- Route components live under `src/app/events/`, including client
  components for local-time-zone display and the calendar grid, plus the
  management routes (`manage/`, `[eventId]/manage/`) with their server
  actions and the local-time schedule input.

## Extension Points

- Audits and audit statistics are expected to build on approved
  participation through future tickets and, where cross-module needs arise,
  explicit contracts.
- Post-MVP participation workflows (reversal, re-request) require a RED
  decision before any lifecycle change.

## Limitations

- Event type is a plain string with presentation-level styling for the
  well-known values (internal, external, mixed, grand battle); no persisted
  taxonomy.
- Times render in the visitor's local time zone on the client; the server
  render (and no-JS view) shows UTC.
- No pagination; acceptable at MVP data volumes.

## Related Contracts

- `events-units-event-creation-authorization` (stable).

## Related ADRs

- ADR-20260914-001 (Next.js server-side application layer as the MVP
  backend boundary).
- ADR-20260921-004 (accepted; standalone User-owned Event authorization).

## AI Working Rules

- GREEN: styling, presentation helpers, query refinements, empty/error
  states inside this module.
- YELLOW: internal reorganization of `src/modules/events/`; log it in the
  active ticket.
- RED (stop and escalate): any new persistent field, model, or
  relationship; any Unit/Event coupling; any contract; changing
  `canManageEvent` or owner-only manager-administration semantics; changing
  the EventParticipation lifecycle (reversal, re-request, duplicates); Event
  ownership transfer.
