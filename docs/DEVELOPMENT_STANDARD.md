# AI-Human Modular Development Standard

**Status:** Active policy for repository development  
**Scope:** morale.gg repository

---

## 1. Purpose

This document defines the policy and rationale for bounded, ticket-driven development.

Repository governance is divided by responsibility:

- `docs/SYSTEM.md` defines system-wide architectural principles, invariants, and global source-of-truth rules.
- `docs/DEVELOPMENT_STANDARD.md` defines development policy and governance.
- `AGENT_WORKFLOW.md` defines operational execution.
- Active tickets define the scope and requirements authorized for a specific change.
- `MODULE.md` files define current module-local truth.
- `CONTRACT.md` files define current cross-module interface truth.

This standard may not override `docs/SYSTEM.md`.

When authoritative documents conflict, implementation must stop until the conflict is explicitly resolved. Operational details should follow `AGENT_WORKFLOW.md`; policy conflicts are resolved by human architectural authority and the applicable higher-authority source.

---

## 2. Core Principles

1. **Tickets carry intent and execution history.**  
   Every meaningful repository change that affects implementation, behavior, architecture, module boundaries, contracts, schema, or governed documentation must have a stable ticket with a Main Success Scenario, acceptance criteria, scope, assumptions, and verification.

2. **Modules carry local truth.**  
   A module owns a bounded responsibility, documents its public behavior, and does not silently absorb neighboring ownership.

3. **Contracts carry integration truth.**  
   Cross-module communication uses documented contracts rather than private implementation details.

4. **Registries provide discovery.**  
   Registry files are indexes of module, contract, and capability metadata. Authoritative detail remains in the source manifests and contract documents.

5. **Context is incremental.**  
   Newly discovered modules, contracts, capabilities, assumptions, and decisions are logged in the active ticket when discovered.

6. **Boundaries require consent.**  
   Shared contract, schema, authority, ownership, public API, cross-module dependency, and system-invariant changes require explicit human approval.

7. **Local needs do not create global architecture.**  
   Missing ownership, schema, contracts, cardinality, permissions, or architectural structure must not be invented solely to make a local implementation easier.

8. **Verification proves completion.**  
   Written code or documentation alone is not proof that a ticket is complete.

9. **Git preserves exact history.**  
   Tickets, changelogs, BCRs, and ADRs explain intent and context. Git records the exact implementation history.

10. **Governance should be proportional to impact.**  
    Local GREEN changes should carry minimal process overhead. Additional governance is introduced as work approaches or crosses module and system boundaries.

---

## 3. Repository Modes

The repository may operate in either **BOOTSTRAP** or **NORMAL** mode as defined in `AGENT_WORKFLOW.md`.

### BOOTSTRAP Mode

BOOTSTRAP mode exists only to establish missing governance infrastructure required for normal operation.

Missing governance artifacts during BOOTSTRAP mode are expected and do not trigger fail-closed behavior.

BOOTSTRAP mode must not be used to bypass normal ticketing for product implementation.

### NORMAL Mode

NORMAL mode applies once the required governance infrastructure exists.

All meaningful implementation, architecture, module, contract, schema, and governed documentation changes follow the normal ticket-driven process.

---

## 4. Bounded Contexts

A module must document:

- purpose;
- ownership;
- non-ownership;
- public interface;
- dependencies;
- inputs;
- outputs;
- invariants;
- authority concerns;
- internal structure;
- limitations;
- extension points;
- related contracts;
- related architecture decisions;
- AI working rules.

A module may implement freely inside its approved boundary, subject to its ticket and documented invariants, but it may not silently widen that boundary.

A module is not considered established until:

- its `MODULE.md` exists;
- its ownership and non-ownership are explicit;
- its discovery metadata is registered;
- its public boundary has been considered.

Required contracts should be created when real cross-module communication requires them. Speculative contracts should be avoided.

If no public contract is currently required, that state should be explicit.

---

## 5. Contract Policy

A contract documents the legal communication boundary between modules.

A contract should define:

- producer;
- consumers;
- purpose;
- inputs;
- outputs;
- fields or operations;
- semantics;
- guarantees;
- constraints;
- compatibility expectations;
- stability.

Consumers may rely on a documented contract. They may not rely on the private implementation of the producing module.

Contracts are expected to evolve incrementally as real integration needs emerge.

Tickets do not need to predict every contract before implementation begins. When a contract is discovered during implementation, it must be logged in the active ticket when first used.

Existing contracts should expose the minimum information necessary for legitimate consumers rather than speculative future data.

Discovering or reading a contract does not grant permission to modify it.

---

## 6. Ticket Lifecycle

Trivial non-semantic maintenance, such as typo correction,
formatting-only changes, or generated-file refreshes caused by
an already-authorized ticket, does not require a separate ticket.

Such changes must not alter behavior, requirements, architecture,
ownership, contracts, or public documentation meaning.

Tickets use the state machine defined in `AGENT_WORKFLOW.md`:

```text
DRAFT -> READY -> ACTIVE -> REVIEW -> COMPLETED
```

Additional states and transitions include:

```text
ACTIVE -> BLOCKED -> ACTIVE
REVIEW -> ACTIVE
DRAFT / READY / ACTIVE / BLOCKED -> CANCELLED
```

Tickets are live execution records, not merely initial plans.

Their role evolves over time:

```text
Ticket creation:
Expected work and known context

Ticket execution:
Discovered dependencies, assumptions, contracts, and scope expansion

Ticket completion:
Authoritative record of what was actually changed, referenced, created, and verified
```

Completed tickets should preserve the distinction between:

- declared context;
- discovered context;
- modified artifacts;
- created artifacts.

---

## 7. Scope and Discovery

Read and write scope must be recorded in the active ticket.

### Read Scope

Read-only scope may expand when a concrete implementation or debugging need requires additional context.

Each meaningful read-scope expansion must:

- have a concrete reason;
- be logged in the active ticket.

Reading or discovering another module, contract, or implementation does not authorize modification and does not establish a valid dependency on private implementation.

### Write Scope

Write scope may not silently expand.

Changes outside the authorized write scope require the appropriate approval and ticket update.

### Discovery Order

When external context is needed, prefer:

```text
registry
-> contract
-> module manifest
-> read-only neighboring implementation
-> human escalation if ambiguity remains
```

The smallest sufficient context should be used.

---

## 8. Assumptions

Implementation assumptions that are not guaranteed by existing authoritative documentation must be recorded in the active ticket.

Before completion, each assumption must be:

- confirmed;
- rejected; or
- explicitly accepted as a known limitation.

An assumption may not substitute for an architectural decision.

If an assumption would establish ownership, schema, permissions, cardinality, or another architectural rule, the work must stop and the missing decision must be escalated.

---

## 9. Change Classes

### GREEN — Local Implementation

Examples include:

- styling;
- private components;
- helper functions;
- local state;
- module-local tests;
- internal refactoring that preserves the public boundary.

GREEN changes may proceed within the approved ticket and module scope.

### YELLOW — Module-Internal Design

Examples include:

- new private abstractions;
- significant internal reorganization;
- internal design changes that preserve public behavior and ownership.

YELLOW changes may proceed when permitted by module policy, but they must be documented in the ticket.

### RED — Boundary or Architecture

Examples include:

- shared contract changes;
- new cross-module dependencies;
- ownership changes;
- global state;
- permission models;
- schema relationships;
- relationship cardinality;
- public APIs;
- system invariants;
- system-wide architectural structure.

RED changes require explicit human approval.

Use the appropriate decision artifact:

- boundary or shared-contract changes normally require a **BCR**;
- system-wide architecture decisions normally require an **ADR**;
- some changes require both when a boundary change also establishes or alters system-wide architecture.

---

## 10. Scope Growth and Ticket Splitting

A ticket should remain a coherent, reviewable unit of change.

Split work when:

- the Main Success Scenario materially changes;
- multiple independent user or system outcomes emerge;
- unrelated modules require modification;
- significant new contracts are required;
- the original owning module is no longer clearly primary;
- implementation can no longer be reviewed as one coherent change.

Parent/child tickets may be used when a larger goal decomposes into independently implementable outcomes.

Ticket splitting is preferred over silently expanding a narrow ticket into a multi-module project.

---

## 11. Conflict Handling

Before modifying a shared artifact, the developer or agent must check active tickets and BCRs for overlapping changes.

Shared artifacts include:

- contracts;
- module boundaries;
- schema relationships;
- architecture decisions;
- other shared public interfaces.

If another active change affects the same boundary or shared artifact:

- stop;
- report the collision;
- coordinate before continuing.

Competing boundary definitions should not be created independently.

---

## 12. Documentation and Current Truth

Current truth belongs in:

- `docs/SYSTEM.md`;
- module `MODULE.md` files;
- shared `CONTRACT.md` files;
- approved ADRs where they establish current architecture.

Operational execution belongs in:

- `AGENT_WORKFLOW.md`.

Historical context belongs in:

- active and completed tickets;
- changelogs;
- BCRs;
- ADR history;
- Git.

Do not turn current-truth documents into chronological journals.

### Registry Policy

Registries are discovery indexes derived from authoritative module and contract metadata.

Source manifests remain authoritative.

Registries may be maintained manually until generation tooling exists, but they must not disagree with their authoritative sources.

Canonical locations are:

- architecture decisions: `docs/decisions/`
- templates: `docs/templates/`
- registries: `docs/registry/`
- open tickets: `tickets/OPEN/`
- completed tickets: `tickets/COMPLETED/`

---

## 13. Security and Authority

The repository establishes planned Google authentication, authorization concerns, and administrator/unit-manager authority contexts, but it does not yet define a complete security model.

Do not infer permission rules beyond documented requirements.

Frontend visibility is not an authorization boundary. When server-side behavior exists, security-sensitive actions must ultimately be enforced by the authoritative application/backend layer.

Humans retain architectural authority.

Agents may not approve their own:

- RED changes;
- boundary changes;
- contract changes;
- ownership changes;
- system invariant changes;
- security model changes.

In NORMAL mode, agents must fail closed when required information is missing, contradictory, stale, or outside authorized scope.

---

## 14. Completion Standard

Completion requires:

- acceptance criteria satisfied;
- appropriate verification completed;
- Main Success Scenario validated;
- live context ledger reconciled;
- assumptions resolved or classified;
- affected current-truth documentation synchronized;
- contract and module changes recorded;
- registries updated or regenerated when applicable;
- changelogs updated when applicable;
- BCRs and ADRs recorded where required;
- completion record filled;
- implementation references recorded when available.

The canonical future validation command is:

```text
npm run validate:repo
```

Until that validator exists, use the mandatory manual validation checklist in `AGENT_WORKFLOW.md`.

Written code alone is not completion.

---

## 15. Governing Development Principle

> The system should permit high local implementation freedom while maintaining deliberate control over boundaries, ownership, contracts, and architecture.

> Tickets authorize change.  
> Modules define local truth.  
> Contracts define integration truth.  
> Registries enable discovery.  
> ADRs and BCRs record approved architectural change.  
> Git preserves exact implementation history.  
> Humans retain architectural authority.

---

## 16. Advisory Work

Read-only analysis, planning, comparison, design exploration, and
recommendation do not require an implementation ticket when no
repository mutation is requested.

Advisory work may propose tickets, modules, contracts, BCRs, or ADRs,
but proposals do not become approved repository decisions until the
normal workflow is entered.