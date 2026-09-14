# System Constitution

**Status:** Initial and active  
**Scope:** morale.gg

---

## 1. Purpose

morale.gg is a planned web platform for statistics, rosters, events, audits, and organizational management for structured multiplayer-game communities.

The initial supported use case is **Napoleonic Wars**.

This constitution defines current accepted **system-wide principles, boundaries, and invariants**. It does not define detailed implementation, database schema, or completed behavior unless those decisions are explicitly established elsewhere in the repository.

---

## 2. Product Boundary

morale.gg is intended to provide structured organizational and statistical tooling for multiplayer-game communities.

The system is concerned with application-level functions such as:

- player and organizational information;
- rosters and memberships;
- hierarchical units;
- events and participation;
- audits and historical records;
- statistics and analytics;
- permissions and administrative workflows.

The system is **not** intended to provide:

- game execution;
- game-server hosting;
- matchmaking;
- direct control of the underlying game.

Napoleonic Wars is the initial domain and may influence early terminology and requirements. Game-specific assumptions must not automatically become system-wide assumptions unless explicitly approved.

---

## 3. Core Domain Concepts

The system currently recognizes the following major conceptual areas:

- users/accounts;
- players;
- organizational units;
- hierarchical unit relationships;
- memberships between players and units;
- events;
- unit participation in events;
- audits associated with event participation;
- player-level audit information;
- unit-level audit information;
- role assignments;
- statistics and analytics;
- administrative and unit-scoped authority.

These are **conceptual domains**, not final database tables or implementation structures.

Exact persistence models, relationships, cardinalities, and schemas must be established through the normal architecture and ticketing process.

---

## 4. Established Architectural Principles

### 4.1 Layer Separation

Preserve a clear separation between the major architectural layers described in `docs/architecture.md`, including:

- browser/client behavior;
- future application/backend behavior;
- future persistence/data behavior;
- external identity services.

The exact implementation of these layers may evolve, but responsibilities should not be collapsed casually across boundaries.

### 4.2 Modular Ownership

System behavior should be divided into bounded modules with explicit ownership.

Each module must document:

- what it owns;
- what it does not own;
- what it accepts;
- what it exposes;
- what it guarantees;
- what dependencies it is allowed to use.

### 4.3 Contract-Controlled Integration

Modules communicate across boundaries through documented public contracts.

A module may rely on another module's documented contract.

A module must not depend on another module's private implementation merely because that implementation is visible in the repository.

Read-only inspection of neighboring implementation may occur according to `AGENT_WORKFLOW.md`, but inspection does not establish a valid dependency.

### 4.4 Small, Reviewable Changes

Prefer small, reviewable, ticket-driven changes with:

- one clear owning module;
- a Main Success Scenario;
- explicit read/write scope;
- incremental context logging;
- observable acceptance criteria;
- verification before completion.

### 4.5 No Architectural Inference From Convenience

Do not infer final:

- database fields;
- cardinalities;
- module ownership;
- permission rules;
- contracts;
- global state;
- schema structure;
- deployment design;

merely because a local implementation would be easier with them.

When repository documentation marks an area as provisional or undecided, implementation must not silently convert it into established architecture.

---

## 5. Data Principles

### 5.1 Authoritative Source Data

Where practical, historical source records should remain authoritative.

Derived information such as:

- totals;
- summaries;
- rankings;
- trends;
- performance metrics;
- analytics;

should originate from underlying source records rather than becoming independent competing sources of truth.

Cached or precomputed derived values may later be introduced for performance, but their relationship to authoritative source data must remain explicit.

### 5.2 Historical Integrity

Historical event and audit records should not silently change meaning because current organizational data changes.

When historical interpretation requires preserving the state that existed at the time of an event or audit, the design must explicitly account for that requirement.

The implementation method for historical preservation is not yet established.

---

## 6. Identity Principles

Authentication identity and game-domain identity are separate concepts unless explicitly unified by an approved design.

Google authentication is planned for website access.

A Google-authenticated account represents a website user/account.

A player record represents a participant within the application domain.

Any relationship between a website account and one or more player records must be modeled explicitly rather than assumed.

---

## 7. Security and Authority

Google authentication is planned.

Authorization is expected to affect areas including:

- unit management;
- memberships;
- audit submission or modification;
- administrative actions;
- system-wide configuration.

The system currently anticipates at least three broad authority contexts:

- ordinary users/members;
- unit-scoped management authority;
- system-wide administrative authority.

Exact roles, permission combinations, authentication flows, threat models, privacy rules, audit-security rules, and authorization structures remain **undecided**.

### 7.1 Authorization Enforcement

User-interface visibility is not an authorization boundary.

When server-side behavior exists, permission-sensitive operations must ultimately be enforced by the authoritative application/backend layer.

Frontend gating may improve user experience but must not be treated as sufficient security.

### 7.2 Architectural Authority

Humans retain architectural authority.

AI agents and lower-level implementers may not approve their own:

- cross-module boundary changes;
- contract changes;
- ownership changes;
- system invariant changes;
- security model changes;
- architecture decisions requiring human approval.

---

## 8. Source-of-Truth Precedence

Repository artifacts have different authority depending on the subject.

### System-Wide Principles

`docs/SYSTEM.md`

Governs:

- system-wide architectural principles;
- global invariants;
- ownership philosophy;
- security principles;
- source-of-truth rules;
- AI authority rules.

### Specific Architecture Decisions

`docs/decisions/ADR-*.md`

Approved ADRs govern specific architecture decisions that refine or extend this constitution.

### Module Truth

Each module's `MODULE.md`

Governs:

- current module ownership;
- non-ownership;
- invariants;
- allowed dependencies;
- current public responsibilities.

### Contract Truth

Each shared `CONTRACT.md` and associated public contract definition

Governs:

- what may cross a module boundary;
- input/output semantics;
- guarantees;
- compatibility expectations.

### Active Change Authority

`tickets/OPEN/`

An active ticket governs:

- the authorized scope;
- Main Success Scenario;
- acceptance criteria;
- approved read/write boundaries;
- implementation-specific requirements.

### Historical Context

`tickets/COMPLETED/`, `CHANGELOG.md`, ADRs, BCRs, and Git history

Preserve:

- what changed;
- why it changed;
- who or what authorized it;
- what implementation produced the change.

### Implementation Code

Implementation code reflects current behavior but does not independently override documented architecture.

If authoritative sources conflict, implementation must stop and the conflict must be resolved explicitly rather than choosing one silently.

---

## 9. Decision Maturity

System information should be interpreted using the following maturity levels.

### Established

Currently authoritative.

Changes require explicit review appropriate to the affected scope.

### Provisional

Accepted working direction that may evolve as implementation reveals new requirements.

A provisional idea must not be treated as permanently fixed architecture.

### Undecided

No authoritative architecture decision has been made.

Agents and developers must not invent a decision to satisfy a local implementation need.

Where useful, module, contract, architecture, and planning documents should identify the maturity of important decisions explicitly.

---

## 10. Current Architecture

The high-level planned architecture and domain concepts are documented in:

- `docs/architecture.md`
- `README.md`
- current approved ADRs;
- current module and contract documentation.

The planned stack described in repository planning documents represents intended direction rather than immutable implementation specification.

Neither `README.md` nor `docs/architecture.md` should be interpreted as silently overriding later approved architecture decisions.

---

## 11. Governance

Operational AI/developer execution is defined in:

`AGENT_WORKFLOW.md`

Policy and rationale are defined in:

`docs/DEVELOPMENT_STANDARD.md`

Canonical templates live under:

`docs/templates/`

Discovery registries live under:

`docs/registry/`

Architecture decisions live under:

`docs/decisions/`

Active tickets live under:

`tickets/OPEN/`

Completed tickets live under:

`tickets/COMPLETED/`

The repository, not an AI agent's prior conversational memory, is the authoritative source of project continuity.

---

## 12. Constitution Evolution

This constitution represents current accepted system-wide truth.

It is **stable but not immutable**.

Ordinary feature work should rarely require modification of this file.

A change to this constitution is appropriate when an approved decision alters a system-wide:

- invariant;
- ownership principle;
- architectural boundary;
- data principle;
- identity principle;
- security principle;
- authority rule;
- source-of-truth rule.

Changes require explicit human architectural approval and should reference the originating ticket and ADR where appropriate.

Module-specific or contract-specific evolution should normally be documented in the relevant `MODULE.md`, `CONTRACT.md`, ticket, changelog, BCR, or ADR instead of modifying this constitution.

---

## 13. Current Project State

The repository is currently in an early planning and architecture stage.

Some documented concepts describe intended direction rather than implemented behavior.

Project phase information is informational and may change without altering the constitutional principles above.

---

## 14. Undecided Areas

The following areas are intentionally unresolved and must be established deliberately through future tickets and architecture decisions:

- final module decomposition;
- final contract set;
- detailed database schema;
- final relationship cardinalities;
- detailed authorization model;
- authentication implementation details;
- account-to-player identity relationships;
- historical snapshot strategy;
- deployment model;
- validation tooling;
- implementation directory layout;
- caching and derived-data strategy;
- API/application-layer design;
- detailed privacy and threat model.

These areas must not be treated as decided merely because an implementation task encounters them.

---

## 15. Governing Principle

> The system should remain easy to change locally without allowing local convenience to silently redefine global architecture.

> Modules own internal truth.  
> Contracts define legal integration.  
> Tickets authorize change.  
> ADRs record architectural decisions.  
> Git preserves implementation history.  
> Humans retain architectural authority.

---

## 16. Established Product Rules

- The MVP is exclusively scoped to Napoleonic Wars.
- Public application data is viewable without authentication unless explicitly restricted.
- Authentication is required for write operations.
- Units have one owner and may have additional users with delegated permissions.
- New non-root units are created through an invite issued by an existing parent unit.
- Unit hierarchy may have arbitrary depth.
- Player identity is based on a persistent game-specific PlayerID.
- Players may belong to multiple units simultaneously.
- Removing a player from an active roster does not destroy historical membership.
- Event participation requires a request and explicit approval.
- Submitted audits are immutable in the MVP.
- Historical/statistical data is derived from submitted audits.