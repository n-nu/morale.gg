# morale.gg

morale.gg is a planned web-based platform for statistics, rosters, events, and organizational management for structured multiplayer-game communities. The initial use case is Napoleonic Wars, while the architecture is intended to remain useful for similar organized games.

## Problem

Organized multiplayer communities often maintain rosters, hierarchical units, event records, performance statistics, and audits across disconnected spreadsheets or manually maintained systems. morale.gg is intended to centralize those records in one consistent platform.

## Target Users

- **Regular users / players:** View units, rosters, events, and stored audit information.
- **Unit managers:** Manage units and memberships, record event participation, and submit audits.
- **Website administrators:** Maintain the platform and oversee its organizational data.

## Core Concepts

- **Players:** People whose memberships and event performance are recorded.
- **Units:** Organizations with optional parent-child subunit relationships.
- **Events:** Organized game sessions in which units may participate.
- **Audits:** Records of a unit's participation and performance in an event.
- **Statistics:** Player-level and unit-level measures captured by audits, with basic historical browsing planned.

## Planned MVP

The Milestone 1 target MVP is planned to include:

- Google authentication
- Creating and viewing units
- Unit and subunit hierarchy
- Creating and viewing players
- Assigning players to units
- Viewing rosters
- Creating and viewing events
- Associating units with events
- Submitting one audit for a unit's event participation
- Recording player audit data
- Recording unit audit data
- Recording audit role assignments
- Viewing stored audits

These are planned capabilities, not completed implementation in this repository.

## Out of MVP Scope

The following are explicitly outside the MVP:

- Premium or payment systems
- Advanced analytics
- Predictive analytics
- Advanced visualizations
- Advanced leaderboards
- Automated reporting
- Data exports
- Third-party game integrations

## Planned Technology Stack

This is the planned architecture and does not imply that these technologies are currently implemented:

- **Frontend:** Next.js, React, TypeScript, and Tailwind CSS
- **Application layer:** Node.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Google accounts
- **Project management and version control:** GitHub and Git

## Architecture

The initial system-context and domain relationship models are documented in [docs/architecture.md](docs/architecture.md). They describe the intended architecture, not a final database schema.

## Development Process

The initial development process uses one-week sprints, GitHub Issues and the [prioritized backlog](BACKLOG.md), feature branches, pull requests, and peer review. The `main` branch should remain runnable as implementation begins in later milestones.

## Current Project Status

**Project Milestone 1 — Application Foundation**

A minimum runnable Next.js/React/TypeScript/Tailwind CSS application shell now exists. It establishes project structure only; no domain functionality (units, players, events, audits, statistics, authentication, database) has been implemented yet. Those will be added incrementally by future tickets.

## Development

Requirements: Node.js and npm.

```bash
npm install       # install dependencies
npm run dev       # start the development server (http://localhost:3000)
npm run lint      # run ESLint
npm run type-check # run the TypeScript compiler (no emit)
npm run build     # produce a production build
npm run start     # run a built production server
```

## Shared Backend Setup

The MVP backend runs inside the Next.js server-side application layer. Browser/client code
must not access Prisma, PostgreSQL, authentication credentials, secrets, or privileged business
logic directly.

Requirements:

- PostgreSQL database available locally or through a development connection string;
- Google OAuth client credentials;
- Node.js and npm.

Create a local `.env` file from `.env.example` and set:

- `DATABASE_URL`: PostgreSQL connection string;
- `AUTH_SECRET`: random secret used by Auth.js;
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`: Google OAuth credentials;
- `ROOT_UNIT_NAME`: optional name for the development root unit.

For local Google OAuth, configure this redirect URI in the Google Cloud OAuth client:
`http://localhost:3000/api/auth/callback/google`.

After PostgreSQL is available, initialize the database and development root unit:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

For an environment where migrations already exist, use `npm run db:migrate:deploy` instead of
`db:migrate`. The seed performs an idempotent upsert of the root Unit with the stable ID
`root-morale-gg` and does not create a Player.

Authentication is provided by Auth.js/NextAuth with Google OAuth, the Prisma adapter, and
database-backed sessions. Auth.js `User` is the persistent website identity corresponding to
the conceptual `UserAccount`; it remains distinct from the game-domain `Player`. The current
foundation intentionally does not implement authorization, unit ownership, memberships,
invites, events, participation, audits, or product UI.

Application source lives under `src/app` (Next.js App Router). Future feature modules should be added as new route/module directories under `src/app` (and any accompanying non-route code under `src/`), following the module process described in `AGENT_WORKFLOW.md` and `docs/DEVELOPMENT_STANDARD.md`.

## Repository Structure

- [BACKLOG.md](BACKLOG.md): Prioritized user stories and acceptance criteria.
- [docs/architecture.md](docs/architecture.md): Initial system-context and domain relationship models.
- `src/app`: Next.js application (App Router). Current contents are a minimal application shell only.
- `public/`: static assets served by Next.js.
- Repository governance: [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md), [docs/DEVELOPMENT_STANDARD.md](docs/DEVELOPMENT_STANDARD.md), [docs/SYSTEM.md](docs/SYSTEM.md).

## Team

- Emil Estrada (Lead)
- Aiden Slabiak
- Chandler Lovely

