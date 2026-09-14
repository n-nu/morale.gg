# Repository Agent Workflow

**Status:** Active operational procedure  
**Scope:** morale.gg repository

This is the operational execution document for repository work. Policy and rationale live in `docs/DEVELOPMENT_STANDARD.md`. System-wide principles and invariants live in `docs/SYSTEM.md`.

Exact repository paths in this document are relative to the repository root.

If this document conflicts with `docs/SYSTEM.md` or an approved architecture decision, stop and request resolution rather than choosing silently.

---

## 1. Request Classification

Classify every request before doing work.

### 1.1 ADVISORY MODE

Use ADVISORY MODE when the user asks for analysis, planning, comparison, design exploration, recommendations, decomposition, use-case work, ticket drafting, or other read-only assistance without authorizing repository mutation.

In ADVISORY MODE, the agent may:

- read repository documentation;
- inspect implementation read-only when useful;
- analyze architecture;
- propose modules or contracts;
- propose tickets;
- propose BCRs or ADRs;
- compare design alternatives;
- generate implementation plans;
- identify likely risks, assumptions, or dependencies.

In ADVISORY MODE, the agent must not:

- modify repository files;
- change current-truth documentation;
- create an approved BCR or ADR;
- treat a recommendation as an accepted decision;
- modify code;
- complete or archive tickets.

A ticket is not required solely for advisory discussion.

If the user accepts a proposal and asks for repository changes, leave ADVISORY MODE and enter the applicable repository mode below.

### 1.2 Repository-Mode Detection

For mutation requests, repository-mode detection is the first operational step.

#### BOOTSTRAP MODE

Use BOOTSTRAP MODE when one or more required governance artifacts are missing, especially:

- `AGENT_WORKFLOW.md`
- `docs/DEVELOPMENT_STANDARD.md`
- `docs/SYSTEM.md`
- `docs/templates/`
- `docs/registry/`
- `docs/decisions/`
- `tickets/OPEN/`
- `tickets/COMPLETED/`

BOOTSTRAP MODE is authorized only for creating or normalizing governance infrastructure.

Missing governance files are expected in BOOTSTRAP MODE and do not cause fail-closed behavior.

Do not implement product features during bootstrap.

#### NORMAL MODE

Use NORMAL MODE when the required governance structure exists.

Missing mandatory governance artifacts in NORMAL MODE are a blocking condition. Fail closed, report the missing artifact, and do not begin implementation until the repository is repaired.

---

## 2. Bootstrap Procedure

During bootstrap:

1. Review the repository structure.
2. Read all existing project-planning and governance documentation, including `README.md`, `BACKLOG.md`, and `docs/architecture.md` when present.
3. Preserve useful documents and reconcile duplicate roles.
4. Create or normalize the canonical governance structure.
5. Do not invent modules, contracts, product features, or undecided architecture.
6. Verify paths, YAML syntax, required sections, and required directory existence.
7. Report any remaining blockers to NORMAL MODE.

Bootstrap is complete when future mutation requests can enter NORMAL MODE without governance ambiguity.

---

## 3. Normal Startup Sequence

For every meaningful repository mutation in NORMAL MODE:

1. Detect repository mode.
2. Determine whether an active ticket already authorizes the requested work.
3. If no ticket exists, create one from `docs/templates/TICKET_TEMPLATE.md` under `tickets/OPEN/`.
4. Ask only for information that cannot be established from repository documentation.
5. Read the active ticket completely and verify its state.
6. Read `docs/SYSTEM.md`.
7. Read the relevant project/product planning documents when the ticket depends on them, such as `BACKLOG.md` or `docs/architecture.md`.
8. Read `docs/registry/MODULES.yaml`.
9. Determine the ticket's scope owner.
10. If the scope owner is an existing module, read that module's `MODULE.md`.
11. Read `docs/registry/CONTRACTS.yaml`.
12. Read `docs/registry/CAPABILITIES.yaml`.
13. Read only the initially relevant contracts.
14. Record the ticket's read/write scope before editing.
15. Move the ticket to `ACTIVE` before implementation.

---

## 4. Scope Owner

Every ticket must identify its primary scope owner.

Recommended values:

```yaml
scope_owner:
  type: module | architecture | governance | repository
  id: units
```

### 4.1 Module-Owned Work

Use `type: module` when the work primarily belongs to one existing product module.

The owning module's `MODULE.md` is mandatory context.

### 4.2 Architecture-Owned Work

Use `type: architecture` for work whose primary output is architecture analysis, an ADR, cross-cutting design, schema design, module decomposition, or another system-level design artifact.

Such tickets do not require an owning `MODULE.md` unless they also modify a module.

### 4.3 Governance-Owned Work

Use `type: governance` for changes to repository process, templates, agent rules, or development standards.

### 4.4 Repository-Owned Work

Use `type: repository` for cross-cutting repository maintenance that does not belong to a product module or architecture decision.

A non-module scope owner does not waive ticketing, acceptance criteria, scope, or verification requirements.

---

## 5. New-Module Exception

A ticket may explicitly authorize creation of a new module.

In that case, the absence of the new module's `MODULE.md` is not a blocking condition.

Before substantive module implementation:

1. Read `docs/templates/MODULE_TEMPLATE.md`.
2. Read the relevant system, backlog, architecture, and use-case context.
3. Define the initial module purpose, ownership, non-ownership, and public boundary.
4. Create the module's `MODULE.md`.
5. Create its `CHANGELOG.md` when required by repository conventions.
6. Register the module in the module registry.
7. Create only the contracts justified by actual cross-module needs.
8. Continue implementation under the newly documented module boundary.

Do not invent speculative contracts simply because the module may need them later.

---

## 6. Ticket and Scope Rules

Every implementation ticket must contain:

- objective;
- Main Success Scenario;
- acceptance criteria;
- verification;
- assumptions;
- scope;
- Live Context Ledger.

Scope is stored directly inside the ticket:

```yaml
scope:
  read:
    - docs/SYSTEM.md
    - docs/architecture.md
  write:
    - tickets/OPEN/TKT-...md
    - src/example/**
```

### 6.1 Read Scope

Read scope may expand incrementally for understanding, debugging, or contract discovery.

A meaningful semantic expansion must:

- have a concrete reason;
- be logged in the ticket;
- remain read-only unless separate write authorization is granted.

Reading another module does not authorize:

- modification;
- private-internal imports;
- dependency on private implementation;
- ownership changes.

Do not log every individual file opened. Log meaningful context expansion, such as:

> Inspected Units module internals read-only to understand behavior not defined by `UnitSummary`.

### 6.2 Write Scope

Write scope may not silently expand.

Any expansion must be:

- justified;
- authorized at the appropriate change level;
- recorded in the ticket.

Any changed artifact must be recorded as modified or created.

---

## 7. Context and Boundary Discovery

When more context is required, prefer the smallest sufficient expansion:

```text
registry
-> contract
-> MODULE.md
-> read-only neighboring implementation
-> human escalation
```

Read-only neighboring implementation inspection does not require prior human approval, but meaningful inspection outside the original context should be logged in the ticket.

If ambiguity remains after inspection, stop and ask for resolution.

A contract must be used instead of depending on a producer's private implementation.

---

## 8. Live Context Ledger

Log context when it becomes relevant, not only at completion.

The active ticket should distinguish:

- declared modules;
- discovered modules;
- modified modules;
- externally modified modules;
- declared contracts;
- discovered contracts;
- modified contracts;
- created contracts;
- declared capabilities;
- discovered capabilities;
- referenced decisions;
- created decisions;
- assumptions and their final status.

Example:

```yaml
contracts:
  declared:
    - EventParticipationSummary

  discovered:
    - UnitSummary

  modified: []

  created: []
```

Discovery grants permission to read/consume only. It does not grant permission to modify.

Before completion, reconcile the ledger with the actual work performed.

---

## 9. Ticket States

Legal transitions are:

```text
DRAFT -> READY -> ACTIVE -> REVIEW -> COMPLETED
ACTIVE -> BLOCKED -> ACTIVE
REVIEW -> ACTIVE
DRAFT / READY / ACTIVE / BLOCKED -> CANCELLED
```

A ticket may not skip directly from `READY` to `COMPLETED`.

Completion requires verification and documentation synchronization.

---

## 10. Change Classification

### GREEN — Local Implementation

Examples:

- styling;
- private components;
- local state;
- helpers;
- module-local tests;
- internal refactors that preserve the public boundary.

GREEN changes may proceed within approved ticket scope.

### YELLOW — Module-Internal Design

Examples:

- significant internal reorganization;
- new private abstractions;
- internal design changes preserving ownership and public behavior.

YELLOW changes may proceed if permitted by module policy, but must be logged.

### RED — Boundary or Architecture

Examples:

- shared contract changes;
- new cross-module dependencies;
- ownership changes;
- schema relationships;
- relationship cardinality;
- permission-model changes;
- public APIs;
- system invariants;
- system-wide architecture.

RED changes require explicit human approval.

Use the appropriate artifact:

- **BCR** for shared-contract, module-boundary, or cross-module dependency changes;
- **ADR** for system-wide architectural decisions;
- **both** when a boundary change also establishes or alters system-wide architecture.

Do not implement a RED change before the required approval is recorded.

---

## 11. Conflict Handling

Before changing a shared artifact, check open tickets, BCRs, and relevant architecture work.

Shared artifacts include:

- contracts;
- module boundaries;
- shared schemas;
- public APIs;
- architecture decisions.

If another active change touches the same boundary:

1. stop;
2. identify the conflicting ticket/artifact;
3. describe the overlap;
4. recommend coordination.

Do not create competing boundary definitions independently.

---

## 12. Scope-Growth Control

Split work into parent/child tickets when:

- the Main Success Scenario materially changes;
- multiple independent outcomes emerge;
- multiple unrelated modules require modification;
- significant new contracts are needed;
- the primary owner is no longer clear;
- the change can no longer be reviewed coherently as one unit.

Each child ticket should have:

- one primary scope owner;
- its own Main Success Scenario;
- its own acceptance criteria;
- its own completion history.

Do not continue simply because the agent is technically capable of doing more.

---

## 13. Boundary Change Requests

Use `docs/templates/BCR_TEMPLATE.md` for module-boundary, shared-contract, and cross-module dependency changes.

A BCR should identify:

- requesting ticket;
- requesting module or scope owner;
- affected module;
- current boundary/contract;
- missing capability;
- proposed change;
- alternatives considered;
- affected consumers;
- compatibility/risk;
- approval decision;
- decision owner;
- result.

Do not implement the boundary change before explicit approval.

---

## 14. Architecture Decision Records

Use `docs/templates/ADR_TEMPLATE.md` when a ticket establishes or changes system-wide architecture.

An ADR should capture:

- context;
- decision;
- alternatives;
- consequences;
- affected modules/contracts;
- related tickets.

An ADR may be required together with a BCR when a local boundary change has system-wide architectural consequences.

---

## 15. Validation and Completion

The future canonical validation command is:

```text
npm run validate:repo
```

If it does not exist, do not create tooling solely to satisfy this workflow unless a ticket authorizes that work.

Use the manual completion checklist instead.

Before moving a ticket to `REVIEW` or `COMPLETED`, verify:

- ticket exists and is in the correct state;
- Main Success Scenario works;
- acceptance criteria are satisfied;
- read/write scope matches changed artifacts;
- Live Context Ledger is current;
- no unauthorized RED change occurred;
- shared-artifact conflicts were checked when applicable;
- assumptions are confirmed, rejected, or accepted as limitations;
- relevant tests, type checks, lint, build, or walkthrough verification ran;
- affected `MODULE.md` and `CONTRACT.md` files are synchronized;
- changelogs and registries are updated when applicable;
- BCRs and ADRs are recorded when required;
- completion record is filled.

Completed tickets move to:

```text
tickets/COMPLETED/YYYY/MM/
```

The eventual validator should detect, where practical:

- implementation changes without an active ticket;
- write-scope violations;
- undocumented modules/contracts;
- stale registries;
- unauthorized RED changes;
- unresolved assumptions;
- missing verification;
- invalid ticket completion.

---

## 16. Authority

Humans retain architectural authority.

Do not:

- approve your own RED change;
- invent missing architecture;
- silently widen write scope;
- treat advisory recommendations as approved decisions;
- commit, push, merge, rebase, delete branches, or tag releases unless explicitly authorized.

When required information is missing, contradictory, stale, or outside authorized scope:

1. identify the blocker;
2. identify the affected artifact or decision;
3. explain why proceeding would require inference;
4. ask for resolution.

The preferred failure mode is controlled interruption, not silent architectural invention.
