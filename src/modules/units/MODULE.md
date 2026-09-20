---
module_id: units
path: src/modules/units
status: active
version: 0.1
last_reviewed: 2026-09-14
updated_by_ticket: TKT-20260914-000004-001
---

# Units

## Purpose
Provide public, read-only browsing of persisted organizational Units and their hierarchy.

## Ownership
Unit identity, name, parent/child hierarchy, hierarchy queries/traversal, and public read-side Unit presentation.

## Non-Ownership
Unit ownership, delegated permissions, Unit creation, child-unit invites, Player identity, UnitMembership, rosters, Events, EventParticipation, Audits, and statistics are outside this initial module boundary.

## Public Interface
Public pages: `/units` displays existing Units in an expandable hierarchy table; `/units/[unitId]` displays a Unit, its optional parent, and direct children. Roots start collapsed; arrow buttons reveal children, names open details, and expand/collapse-all controls manage the table. Repeated navigation supports arbitrary depth.
The route adapters consume `server/queries.ts` (`listUnits`, `getUnit`) as the module's server-side application entry point. No public cross-module contract is currently required: there are no cross-module consumers.

## Inputs
An existing persisted Unit ID from the detail route. No authentication or mutation input.
For a sample-data preview, explicitly set `UNITS_DEMO_MODE=true` in local `.env.local` and restart the development server if needed. Remove the flag or set it to `false` to restore database reads. The flag defaults to off.

## Outputs
Read-only Unit names, identities, hierarchy links, and empty/not-found/error states. No persistence writes.

## Dependencies
Shared server-only `src/lib/prisma.ts` and the existing Prisma Unit model; Next.js route rendering. No other product module dependency.

## Invariants
Persistence access stays server-only. Pages query through the module boundary. Reads reflect stored relationships without inventing hierarchy or authority semantics. Missing IDs return not-found; persistence failures remain errors, not empty results. No depth limit is imposed by navigation.

## Permissions / Authority
Browsing is public and requires no session. Write authority and ownership behavior remain outside scope and require separately approved work.

## Internal Structure
`src/app/units/units.css` scopes a minimal neutral-dark table and detail presentation to the Units shell, with bright interaction accents and a visible sample-data label. The table shows names and direct-child counts; indentation communicates parent relationships.
`server/demo.ts` contains sample country roots and nested units reaching four levels, plus opt-in mode selection. Country names are ordinary Unit fixtures, not a persisted country classification. Demo pages show a sample-data label. Queries select fixtures before loading Prisma; database errors never switch to fixtures automatically. Sample IDs do not represent persisted Units.
`server/queries.ts` selects only public read fields, ordering lists by name then ID. `components/unit-links.tsx` renders reusable hierarchy links. Route adapters and route-specific states live in `src/app/units/`.

## Extension Points
Local read presentation and query improvements may preserve this boundary. Future cross-module consumers require an approved documented contract before integration.

## Limitations
Lists are unpaginated. The table assembles the loaded hierarchy client-side and guards traversal against repeated IDs; it does not validate or repair stored hierarchy cycles. Detail pages show one level at a time. Management and roster functionality are not implemented.

## Related Contracts
- None currently.

## Related ADRs
- ADR-20260914-001.

## AI Working Rules
GREEN local changes and logged YELLOW internal changes may proceed within an active ticket. Do not alter schema, ownership, permission, invite, or contract semantics without explicit authorization. Never import persistence into client components or route pages directly.
