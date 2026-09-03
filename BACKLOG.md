# morale.gg Backlog

This backlog is the initial planning baseline for Milestone 0. Priorities may change slightly through the Agile process while the primary project scope remains stable.

Unless stated otherwise, every item is **Planned** and has not been implemented.

## High Priority / MVP

### US-01 — Authentication

- **Priority:** High
- **Status:** Planned
- **User story:** As a user, I want to authenticate using my Google account so that my identity can be associated with permissions and actions.
- **Description:** Establish Google-based identity for users and the authorization decisions that depend on it.
- **Acceptance criteria:**
  - A user can authenticate using a Google account.
  - The application can associate authenticated actions with that user.
  - Unauthenticated and authenticated states are distinguished.

### US-02 — Unit Management

- **Priority:** High
- **Status:** Planned
- **User story:** As a unit manager, I want to create and manage units so that my organization can be represented.
- **Description:** Support the creation and viewing of units, including the initial unit hierarchy.
- **Acceptance criteria:**
  - An authorized user can create a unit.
  - A user can view a unit.
  - A unit may reference an optional parent unit to represent a subunit.

### US-03 — Unit Membership

- **Priority:** High
- **Status:** Planned
- **User story:** As a unit manager, I want to add players to units so that an accurate roster can be maintained.
- **Description:** Associate players with units while enforcing authorization and membership uniqueness.
- **Acceptance criteria:**
  - A player can be added to an authorized unit.
  - Duplicate player/unit membership is prevented.
  - A player may belong to multiple different units.

### US-04 — View Roster

- **Priority:** High
- **Status:** Planned
- **User story:** As a user, I want to view a unit roster so that I can see its members.
- **Description:** Display the players belonging to a selected unit.
- **Acceptance criteria:**
  - A user can select a unit and view its roster.
  - The roster reflects the unit's current memberships.

### US-05 — Event Creation

- **Priority:** High
- **Status:** Planned
- **User story:** As an authorized user, I want to create events so that organized sessions can be recorded.
- **Description:** Create and view records for organized game sessions.
- **Acceptance criteria:**
  - An authorized user can create an event.
  - A user can view an event after it is created.

### US-06 — Unit Event Participation

- **Priority:** High
- **Status:** Planned
- **User story:** As an authorized user, I want to associate units with events so that participation can be recorded.
- **Description:** Record which units participated in an event.
- **Acceptance criteria:**
  - The event exists.
  - The unit exists.
  - Duplicate unit/event participation is prevented.

### US-07 — Audit Submission

- **Priority:** High
- **Status:** Planned
- **User story:** As a unit manager, I want to submit an audit for my unit's participation in an event so that its performance can be recorded.
- **Description:** Store one audit for an eligible unit-event participation.
- **Acceptance criteria:**
  - The event exists.
  - The unit participates in the event.
  - The user is authorized to manage the unit.
  - One audit is associated with the appropriate unit-event participation.
  - The submitted audit can later be viewed.

### US-08 — Player Audit Data

- **Priority:** High
- **Status:** Planned
- **User story:** As a unit manager, I want to record player statistics within an audit.
- **Description:** Capture initial player-level statistics for an audit.
- **Initial statistics:** Kills, deaths, and assists.
- **Acceptance criteria:**
  - Player statistics can be recorded for an audit.
  - The recorded data identifies the relevant player and audit.
  - Stored player audit data can later be viewed.

## Medium Priority

### US-09 — Unit Audit Data

- **Priority:** Medium
- **Status:** Planned
- **User story:** As a unit manager, I want to record unit-level statistics within an audit.
- **Description:** Capture unit-level performance measures.
- **Initial statistics:** Tickets, flag captures, flag losses, and stars.
- **Acceptance criteria:**
  - Unit statistics can be recorded for an audit.
  - Stored unit audit data can later be viewed with its audit.

### US-10 — Audit Role Assignments

- **Priority:** Medium
- **Status:** Planned
- **User story:** As a unit manager, I want to assign players to event-specific roles so that important responsibilities are recorded.
- **Description:** Record roles such as commander and flag bearer while allowing future dynamic roles.
- **Acceptance criteria:**
  - A player can be assigned an event-specific role within an audit.
  - Initial roles include commander and flag bearer.
  - The design can support future dynamic roles.

### US-11 — Historical Data

- **Priority:** Medium
- **Status:** Planned
- **User story:** As a user, I want to browse historical records so that I can review previous performance.
- **Description:** Browse previous events, audits, player performance, and unit performance.
- **Acceptance criteria:**
  - A user can browse previous events and audits.
  - Historical player and unit performance can be viewed from stored audit data.

## Future / Non-MVP

### US-12 — Advanced Analytics

- **Priority:** Future / Non-MVP
- **Status:** Planned
- **User story:** As a user, I want advanced historical and statistical analysis so that I can understand long-term trends.
- **Description:** Add analysis beyond the basic historical statistics required by the MVP.
- **Acceptance criteria:** To be defined after MVP scope and data quality are established.

### US-13 — Premium Analytics

- **Priority:** Future / Non-MVP
- **Status:** Planned
- **User story:** As a user, I want premium access to advanced analytics and visualizations so that I can use expanded insights.
- **Description:** Explore premium analytics access only after the MVP and its business requirements are established.
- **Acceptance criteria:** To be defined; premium access is outside the MVP.

### US-14 — Export / Reporting

- **Priority:** Future / Non-MVP
- **Status:** Planned
- **User story:** As an administrator or manager, I want future reporting or data-export functionality so that records can be used outside the application.
- **Description:** Provide reporting or export workflows after core records are stable.
- **Acceptance criteria:** To be defined; automated reporting and data exports are outside the MVP.
