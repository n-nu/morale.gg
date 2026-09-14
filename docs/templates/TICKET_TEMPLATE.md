---
ticket_id: TKT-YYYYMMDD-HHMMSS-XXX
state: DRAFT
priority: medium
owning_module: undecided
created: YYYY-MM-DD
updated: YYYY-MM-DD
parent_ticket: null
---

# Ticket: [short title]

## Main Success Scenario

1. [Actor] [starts the workflow].
2. [System] [performs the primary behavior].
3. [Actor] observes [completion result].

## Scope

```yaml
scope:
  read:
    - [path and reason recorded below]
  write:
    - [approved path]
```

Read-scope expansions must be logged immediately with a concrete reason. Write-scope expansions require authorization.

## Context Ledger

### Modules

- Declared: []
- Discovered: []
- Modified: []
- Created: []
- Externally modified: []

### Contracts

- Declared: []
- Discovered: []
- Modified: []
- Created: []

### Capabilities

- Declared: []
- Discovered: []

### Decisions

- Referenced: []
- Created: []

### Context Discoveries

| Artifact | Type | Reason discovered | Scope/log entry |
|---|---|---|---|
| [path or identifier] | [module/contract/etc.] | [reason] | [date/status] |

## Assumptions

| Statement | Status | Evidence or decision |
|---|---|---|
| [assumption] | unverified | [reference] |

Allowed final statuses: `CONFIRMED`, `REJECTED`, `ACCEPTED-AS-LIMITATION`.

## Acceptance Criteria

- [ ] [observable criterion]
- [ ] [observable criterion]

## Verification

- Command/check: [command or walkthrough]
- Expected result: [result]
- Actual result: [result]

## Boundary and Conflict Review

- Shared artifacts checked: [tickets/BCRs/paths]
- Boundary change required: [yes/no]
- BCR: [identifier or none]
- Scope-growth review: [result]

## Completion Record

Status: [COMPLETED/CANCELLED]
Completed: [YYYY-MM-DD]
Implementation commit: [reference or N/A]
Pull request: [reference or N/A]

### Result
[What changed and why.]

### Files Changed
- [path]

### Documentation Updated
- [path or none]

### Registries, Changelogs, and Decisions
- Registries: [updated/not applicable]
- Changelogs: [updated/not applicable]
- BCRs: [reference/not applicable]
- ADRs: [reference/not applicable]

### Deviations and Known Limitations
- [none or details]
