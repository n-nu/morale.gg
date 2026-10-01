# MVP Demonstration

**Target duration:** 5-10 minutes. This walkthrough uses the seeded local database and avoids changing important demo records.

## A. Start

1. Complete the [README quick start](../README.md#quick-start-for-grading-no-google-credentials-needed) if this is a fresh clone.
2. Run `npm run demo:reset` to create the demo world, then `npm run dev` and open `http://localhost:3000`.
3. For authenticated surfaces, open [`/dev/sign-in`](http://localhost:3000/dev/sign-in) (header: **Demo sign-in**) and choose **Demo Root Commander**. This development-only sign-in needs no Google credentials and is disabled in production builds. Public browsing works without sign-in.

The reset is destructive to development application data and preserves the existing RootUnit, its Commander User and linked Google account, active Commander membership, and sessions. On an empty database it first creates the RootUnit and its `demo-user-root-commander` Commander. It recreates the demo dataset without changing migration history.

## B. Organization and roster

1. Open [`/units`](http://localhost:3000/units) and browse the nested organization structure.
2. Open [`/units/demo-unit-british-line-1`](http://localhost:3000/units/demo-unit-british-line-1) to see the 42nd Highland Regiment profile, roster, and Direct, Organizational, and Average Unit Performance sections.
3. Open [`/players/demo-player-001`](http://localhost:3000/players/demo-player-001) to see a stable public PlayerID, performance categories, attendance, and membership history.
4. Signed in as Demo Root Commander, open [`/units/demo-unit-french-army/manage`](http://localhost:3000/units/demo-unit-french-army/manage) for Unit administration, access, and roster management.

## C. Event and battlefield

1. Browse [`/events`](http://localhost:3000/events), then open [`/events/demo-event-main-review`](http://localhost:3000/events/demo-event-main-review), “Austerlitz: The Pratzen Heights.”
2. Point out approved participating Units, the effective Defender win, and the separate ATTACKER/DEFENDER Battle Structure.
3. Expand an Atomic Event Unit's Battle details to inspect finalized or pending status, Player rows, roles, K/D/A, and Unit results. Event Command Groups organize the atomic battlefield leaves; they are not persistent Unit hierarchy.
4. Signed in as Demo Root Commander (the Event owner), open [`/events/demo-event-main-review/manage`](http://localhost:3000/events/demo-event-main-review/manage) for participation decisions and the battlefield organizer.

## D. Audit

The main Event contains seeded finalized Audits, so the public Battle details are the no-mutation Audit demonstration. [`/audits`](http://localhost:3000/audits) is the authenticated Unit-authorized discovery and editing surface. Signed in as Demo Root Commander (or a French/Coalition Audit Submitter for a narrower scope), it lists eligible atomic units and their draft or finalized Audits. Finalizing an Audit is irreversible until the next `npm run demo:reset`.

## E. Statistics

1. Open [`/statistics`](http://localhost:3000/statistics) for the public statistics directory.
2. Return to the Player route for Ranker, Commander, General, attendance, and membership history.
3. Return to the British Unit route for Direct, Organizational, and Average Unit Performance.
4. Return to the Event route for Event Battle result/statistics and finalized Audit detail.

These statistics are derived at query time from effective finalized Audits and related Event, Player membership, and Unit hierarchy facts. The Event winner is a separately recorded Event result, not a statistic.

## MVP Completion

The MVP demonstrates structured organizations and historical rosters, Event participation, battlefield organization, Audit capture/finalization, and derived Event, Player, and Unit statistics. The public seeded scenario is runnable locally; authenticated management surfaces are reachable through the development-only demo sign-in, and Google OAuth remains the production sign-in.