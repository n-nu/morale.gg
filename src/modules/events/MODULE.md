---
module_id: events
path: src/modules/events
status: active
version: 0.1
last_reviewed: 2026-09-18
updated_by_ticket: TKT-20260914-000005-001
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
- the domain-level Event creation path and its Event Time Rule (no creation
  in the past);
- public Event presentation (`/events`, `/events/[eventId]`,
  `/events/calendar`).

## Non-Ownership

- Unit participation requests and EventParticipation;
- participation approval;
- Unit authority and Event-manager permissions;
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
- No public programmatic contract is currently exposed to other modules.
  That state is explicit: no cross-module consumer exists yet.

## Inputs

- Route parameters (`eventId`) from public navigation.
- `CreateEventInput` on the server-only domain creation path (not reachable
  by application users; used for controlled server-side verification until
  an authorized management flow exists).

## Outputs

- Server-rendered public pages listing and detailing Events.
- Persisted `Event` rows via the server-only creation path.

## Dependencies

- `src/lib/prisma.ts` (shared server-only Prisma client) for persistence
  access, per ADR-20260914-001.
- No dependency on any other product module.

## Invariants

- All Prisma access happens in server-only code (`src/modules/events/server/`).
- The persisted Event shape stays within the minimal representation approved
  by TKT-20260914-000005-001; any relationship or additional model requires
  escalation.
- The domain creation path rejects Events scheduled in the past.
- Public browsing requires no authentication.

## Permissions / Authority

Undecided. No authorization behavior exists in this module; Event
management permissions are being designed separately. The creation path
deliberately performs no authorization and is not exposed to users.

## Internal Structure

- `server/queries.ts` — server-only read/query functions.
- `server/create-event.ts` — server-only domain creation path (verification
  use only until a permission model exists).
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

## Limitations

- Event type is a plain string with presentation-level styling for the
  well-known values (internal, external, mixed, grand battle); no persisted
  taxonomy.
- Times render in the visitor's local time zone on the client; the server
  render (and no-JS view) shows UTC.
- No pagination; acceptable at MVP data volumes.

## Related Contracts

- None currently.

## Related ADRs

- ADR-20260914-001 (Next.js server-side application layer as the MVP
  backend boundary).

## AI Working Rules

- GREEN: styling, presentation helpers, query refinements, empty/error
  states inside this module.
- YELLOW: internal reorganization of `src/modules/events/`; log it in the
  active ticket.
- RED (stop and escalate): any new persistent field, model, or
  relationship; any Unit/Event coupling; any contract; any authorization
  behavior; exposing creation/editing to users.
