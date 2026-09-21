---
module_id: units
path: src/modules/units
status: active
version: 0.1
last_reviewed: 2026-09-20
updated_by_ticket: TKT-20260920-000011-001
---

# Units

## Purpose
Own organizational Unit hierarchy and its RootUnit-bounded authority
persistence, while currently providing public, read-only browsing of persisted
Units and their hierarchy.

## Ownership
Unit identity, name, parent/child hierarchy, RootUnit designation and
isolation, required Commander persistence, authorized-user memberships, permission
grants and delegation lineage, hierarchy queries/traversal, and public
read-side Unit presentation. Effective authority resolution and structural
authorization are also Units responsibilities when separately implemented
under ADR-20260915-002.

## Non-Ownership
Player identity, UnitMembership, rosters, Events, EventParticipation, Audits,
statistics, generalized site-wide RBAC, and authority-management workflows/UI
are outside this module boundary. Unit creation, child-unit invites, structural
workflows, and effective authorization remain unimplemented and require their
own approved tickets.

## Public Interface
Public pages: `/units` displays existing Units in an expandable hierarchy table; `/units/[unitId]` displays a Unit, its optional parent, and direct children. Roots start collapsed; arrow buttons reveal children, names open details, and expand/collapse-all controls manage the table. Repeated navigation supports arbitrary depth.
The route adapters consume `server/queries.ts` (`listUnits`, `getUnit`) as the module's server-side application entry point. No public cross-module contract is currently required: there are no cross-module consumers.
Server-only capability consumers use `server/authorization.ts`:
`canManageUnit`, `canManageRoster`, `canManageAuthorizedUsers`, and
`canRequestEventParticipation` return semantic allow/deny results without
exposing authority records. `canManageAuthorizedUsers` establishes permission
coverage only; user-management mutations must apply their own applicable
hierarchy, scope, and local authority-level comparison. Event management
remains deferred because Event has no approved Unit ownership or manager
relationship.

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
Browsing is public and requires no session. ADR-20260915-002 assigns
RootUnit-bounded authority persistence and future server-side authority
resolution to this module. The currently implemented public routes do not
perform writes or authorization. The server-only Commander bootstrap uses the
bounded website-administrator capability from ADR-20260915-003; it does not
create Unit authority or generalized RBAC.

## Internal Structure
`src/app/units/units.css` scopes a minimal neutral-dark table and detail presentation to the Units shell, with bright interaction accents and a visible sample-data label. The table shows names and direct-child counts; indentation communicates parent relationships.
`server/demo.ts` contains sample country roots and nested units reaching four levels, plus opt-in mode selection. Country names are ordinary Unit fixtures, not a persisted country classification. Demo pages show a sample-data label. Queries select fixtures before loading Prisma; database errors never switch to fixtures automatically. Sample IDs do not represent persisted Units.
`server/queries.ts` selects only public read fields, ordering lists by name then ID.
`server/authorization.ts` resolves current Unit ancestry, RootUnit consistency,
memberships, grants, revocation, delegation lineage, and scope at decision time;
Commander status does not bypass operational grants. `components/unit-links.tsx`
renders reusable hierarchy links. Route adapters and route-specific states live
in `src/app/units/`.

## Extension Points
Local read presentation and query improvements may preserve this boundary. Future cross-module consumers require an approved documented contract before integration.

## Limitations
Lists are unpaginated. The table assembles the loaded hierarchy client-side and guards traversal against repeated IDs; it does not validate or repair stored hierarchy cycles. Detail pages show one level at a time. Management and roster functionality are not implemented. Commander bootstrap is server-only and has no public UI.

## Related Contracts
- None currently.

## Related ADRs
- ADR-20260914-001.
- ADR-20260915-002.
- ADR-20260915-003.

## AI Working Rules
GREEN local changes and logged YELLOW internal changes may proceed within an active ticket. Authority persistence, schema, ownership, permission, invite, and contract semantics require the applicable approved RED ticket and ADR authority. Never import persistence into client components or route pages directly.
