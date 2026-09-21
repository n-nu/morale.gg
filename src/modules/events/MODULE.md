---
module_id: events
path: src/modules/events
status: active
version: 0.1
last_reviewed: 2026-09-21
updated_by_ticket: TKT-20260921-000016-001
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
- public Event presentation (`/events`, `/events/[eventId]`,
  `/events/calendar`).

## Non-Ownership

- Unit participation requests and EventParticipation;
- participation approval;
- Unit authority and creation-eligibility evaluation;
- Audit lifecycle and audit statistics;
- leaderboards;
- event-management UI;
- general Event create/edit/delete controls for application users;
- the shared site shell and theme (owned at the app level).

## Public Interface

- Route `/events`: public, unauthenticated list of all Events (upcoming and
  past), with presentation-level event-type filtering via query parameters.
- Route `/events/[eventId]`: public, unauthenticated Event detail. Its
  statistics and participation sections are static placeholders labeled as
  future functionality.
- Route `/events/calendar`: public, unauthenticated month-calendar view of
  the same Event data.
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
- `presentation.ts` — client-safe formatting helpers (event-type styling,
  UTC fallback formatting).
- `map-art.ts` — client-safe map-name → banner artwork lookup
  (`public/maps/`).
- Route components live under `src/app/events/`, including client
  components for local-time-zone display and the calendar grid.

## Extension Points

- EventParticipation, event authorization, event-management UI, and Audits
  are expected to build on this module through future tickets and, where
  cross-module needs arise, explicit contracts.
- Event editing, participation approval/denial, Audit approval/denial, and
  management UI are future consumers of the implemented authority boundary.

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
  relationship; any Unit/Event coupling; any contract; any authorization
  behavior; exposing creation/editing to users.
