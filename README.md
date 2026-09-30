# morale.gg

morale.gg is a working information and statistics system for organized multiplayer gaming communities, initially focused on Napoleonic Wars. It brings organization hierarchies, historical rosters, Events, battlefield structure, immutable Audits, and derived statistics into one web application.

## Project Submission

- [Working Application / Run Instructions](#setup)
- [GitHub Repository](https://github.com/n-nu/morale.gg)
- [Requirements](docs/MVP_REQUIREMENTS.md)
- [Design / Architecture](docs/architecture.md)
- [Setup](#setup)
- [Verification](docs/VERIFICATION.md)
- [MVP Demonstration](docs/MVP_DEMO.md)

**Application availability:** No hosted deployment is configured or confirmed. Run the application locally at `http://localhost:3000`; the demonstration uses the repository's seeded local database.

## MVP

The MVP supports Google authentication, public Unit and Player records, hierarchical organization and roster management, Event creation and participation decisions, two-sided battlefield organization, atomic Event units and Event Command Groups, Audit drafting/finalization, Event Battle results, and Player/Unit/Ranker/Commander/General/attendance statistics. Public statistics are derived at query time from effective finalized Audits.

The canonical [MVP requirements](docs/MVP_REQUIREMENTS.md) distinguish implemented behavior from deferred work. The design decisions and domain flow are in [docs/architecture.md](docs/architecture.md).

## Setup

### Prerequisites

- Node.js `>=20.9.0` (Next.js requirement; verified here with `24.15.0`)
- npm (not pinned separately in the manifest; lockfile v3, verified here with `11.12.1`)
- Docker Desktop or Docker Compose, running the repository's PostgreSQL `16` service
- A Google OAuth client for local sign-in

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

### Install and configure

```bash
git clone https://github.com/n-nu/morale.gg.git
cd morale.gg
npm ci
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell), then set the values below. Generate a local Auth.js secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Set the Google OAuth redirect URI to `http://localhost:3000/api/auth/callback/google`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma and application PostgreSQL connection string; defaults to the local Compose database. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Local Compose database name, user, disposable password, and host port. Keep these values local. |
| `AUTH_SECRET` | Random Auth.js session/signing secret. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client credentials. |
| `ROOT_UNIT_COMMANDER_USER_ID` | Required only for the initial `db:seed`; set to the Auth.js `User.id` that will command the root Unit. |
| `ROOT_UNIT_NAME` | Optional display name for the initial root Unit. |
| `WEBSITE_ADMIN_USER_IDS` | Optional comma-separated Auth.js User IDs for bootstrap website administrators; server-side only. |

### Create the database and root Unit

Start PostgreSQL and prepare its schema:

```bash
docker compose up -d
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
```

For a fresh database, start the app with `npm run dev`, sign in once with Google to create an Auth.js User, and stop the dev server. Run `npm exec -- dotenv -e .env -- prisma studio`, copy that User row's `id` into `ROOT_UNIT_COMMANDER_USER_ID` in `.env`, then initialize the root Unit:

```bash
npm run db:seed
```

The seed requires an existing User and creates or updates the stable root Unit `root-morale-gg`. It does not create Player records.

### Reset and reseed demo data

```bash
npm run demo:reset
```

**Destructive to development data:** this removes application data other than the canonical RootUnit and designated Unit identity, its Commander User and linked Auth.js Accounts, the active Commander membership, and that User's existing login sessions. Other Users (and their accounts/sessions) are deleted. It recreates the demo organization, roster history, Events, participation, battlefield structure, Audits, and results; it leaves Prisma migration history unchanged. The command refuses production, non-loopback/non-Compose targets, or a database without exactly one RootUnit. It does not create the initial RootUnit.

Seeded manager identities are fixture data, not login credentials. Authentication is Google-only; there is no password login or impersonation flow. The reset does not create Google Accounts for those fixture identities.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For the guided 5-10 minute walkthrough, see [MVP Demonstration](docs/MVP_DEMO.md). Setup and verification commands are listed in [docs/VERIFICATION.md](docs/VERIFICATION.md).

