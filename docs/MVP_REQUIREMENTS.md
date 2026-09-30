# morale.gg MVP Requirements

## Product Purpose

morale.gg is a structured information and statistics system for multiplayer gaming organizations, initially targeting Napoleonic Wars communities. It replaces disconnected roster, event, and performance records with linked organization, participation, battlefield, and Audit history.

## Actors and Domain Concepts

- **Website Users:** Authenticate through Auth.js and Google OAuth. Website `User` identity is separate from game `Player` identity; authentication alone does not grant Unit permissions.
- **Players:** Persistent game identities. `Player.id` is the internal database key; `Player.playerId` is the stable public/game identity used in public routes and statistics.
- **Root organization and Units:** A designated RootUnit bounds an arbitrary-depth Unit hierarchy.
- **Unit roster:** Player-to-Unit memberships preserve join/leave history and are distinct from authorized-user memberships.
- **Unit authorization:** Server-enforced delegated permissions control Unit operations; roster membership does not grant management authority.
- **Events and participation:** Events are owned by website Users. EventParticipation records a Unit's requested, approved, or denied participation.
- **Battlefield structure:** Each Event has fixed ATTACKER and DEFENDER sides. Atomic Event Units are auditable battlefield leaves; Event Command Groups organize those leaves and do not replace persistent Unit hierarchy.
- **Audits:** A creator-owned draft records an atomic unit's results. Submission finalizes and makes the Audit immutable in the MVP.
- **Statistics:** Public Player, Unit, Ranker, Commander, General, attendance, and Event Battle views are derived from authoritative source records.

## Implemented MVP

- Authenticate with Google OAuth and maintain database-backed sessions.
- Browse RootUnit/Unit hierarchy and public Unit profiles; manage authorized Unit access and supported Unit settings when permitted.
- Register/find Players by stable game PlayerID; manage active rosters while retaining membership history.
- Create/manage Events and administer Event managers; request, review, approve, or deny Unit participation.
- Build and present Event battlefield structure with fixed sides, Atomic Event Units, and nested Event Command Groups.
- Create and edit eligible Audit drafts, record Player K/D/A, Unit tickets/flag captures/flag losses/stars, Unit type, Commander, and Flag Bearer; finalize immutable Audits for approved participation.
- Record and present Event results separately from computed statistics.
- Browse Event Battle results; view query-derived Ranker, Commander, General, Player, Unit performance, and attendance statistics.

Protected writes require the applicable server-side authorization. Public reads do not require authentication unless the route is explicitly a management surface. See [Design / Architecture](architecture.md) for ownership and data-flow details.

## Deferred and Out of Scope

- Hosted deployment; the supported submission environment is local.
- Non-Google authentication, local password login, or demo-user impersonation.
- Audit correction/replacement after finalization, and Event-manager Audit submission authority.
- Player account claiming/linking, arbitrary in-Unit positions, and historical Rank-at-Event.
- Advanced analytics, trends, predictive/rating systems, advanced visualizations, premium/payment features, exports/reporting, and third-party game integration.
- Generalized multi-game support and native mobile applications.

The [backlog](../BACKLOG.md) preserves original planning stories and historical status labels; it is not the source of current implementation status.