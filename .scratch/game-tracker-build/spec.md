# First private game-tracker release

Status: ready-for-agent

## Problem Statement

Gamers need a place to discover PC and console games, understand what they are,
and keep track of what they want to play, are playing, have completed, or have
stopped playing. The first release serves the owner and a few friends on phones
and computers, with private personal lists and independent accounts.

## Solution

Build a responsive, self-hosted Angular application with a NestJS backend and
PostgreSQL. After signing in, users land on an attractive Discover page with a
cinematic featured game, popular games, recent releases, and prominent search.
My Library is a separate destination. Use the approved prototype D layout with
C's purple palette as the visual reference, rewriting it as production Angular.

The owner runs the app and database with Docker Compose. Friends connect through
Tailscale and then use the app's own email/password login. The final deployment
host can be selected later between the workstation and a Ugreen NAS.

## User Stories

1. As a tester, I want to create an email/password account, so that my game lists belong to me.
2. As a returning tester, I want to sign in and out, so that I control access to my account.
3. As a tester, I want my session to survive an application restart, so that routine maintenance does not unnecessarily sign me out.
4. As a signed-in user, I want to land on Discover, so that I can find something interesting to play.
5. As a user, I want a featured game with artwork and a clear action, so that I can explore it or save it immediately.
6. As a user, I want both major-studio and indie titles represented, so that discovery is not restricted to one kind of game.
7. As a user, I want to browse popular games, so that I can see what is attracting attention.
8. As a user, I want to browse recent releases, so that I can find newly available games.
9. As a user, I want to search by game title, so that I can find a particular game.
10. As a user, I want useful empty, loading, and failure states, so that I understand whether to wait, try another search, or retry.
11. As a user, I want to open game details, so that I can see the cover, description, first release date, platforms, genres, developers, and publishers.
12. As a user, I want unavailable metadata to be clearly represented, so that missing provider fields do not break the page or mislead me.
13. As a user, I want to add a game to Want to play from Discover, search, or details, so that saving a game takes little effort.
14. As a user, I want to change a game's Play status, so that my library reflects my current relationship to the game.
15. As a user, I want to filter My Library by the four Play statuses, so that I can focus on the relevant games.
16. As a user, I want a Played view combining Playing, Completed, and Stopped playing, so that I can see everything I have started.
17. As a user, I want to remove a game from My Library, so that I can correct or change my choices.
18. As a user, I want a saved game to have one current status rather than duplicate entries, so that my lists stay consistent.
19. As a user, I want my library to persist across visits, devices, and container restarts, so that I can trust it as my record.
20. As a user, I want my library to remain private even if another user knows a record identifier, so that account boundaries are enforced by the backend.
21. As a phone user, I want readable cards, usable navigation, and touch controls, so that I can use the app without horizontal scrolling.
22. As a keyboard user, I want labeled controls, visible focus, and usable dialogs, so that I can complete the same journeys without a mouse.
23. As the administrator, I want a documented password-reset command, so that I can recover a tester's account during the private test without outbound email.
24. As the administrator, I want persistent storage and documented backup/restore, so that I can maintain or move the deployment without losing account and library data.
25. As the administrator, I want IGDB credentials to remain server-side and untracked, so that deploying the app does not expose catalog access credentials.

## Implementation Decisions

- One repository contains the Angular frontend, NestJS backend, and Docker Compose configuration. PostgreSQL supplies durable storage. Use current mutually compatible supported package versions and commit the dependency lockfile.
- Use Tailwind CSS v4 utilities for presentation in Angular templates and component hosts. Retain a small global entry for Tailwind setup, shared theme tokens, and document-wide defaults; preserve the approved visual design and responsive behavior.
- Keep Angular zoneless, with explicit `ChangeDetectionStrategy.OnPush` on every application component. Use signals and Angular notification mechanisms for asynchronous UI updates.
- Organize the backend around Accounts, Catalog, and Library modules. Accounts owns credentials and sessions; Catalog owns provider access, normalization, and shared game metadata; Library owns the authenticated user's game entries and statuses.
- Use TypeORM entities/repositories for all application database access, including sessions, caching, limits, and cleanup; no handwritten application SQL exceptions. Generate, review, and explicitly apply migrations with automatic schema synchronization disabled. Preserve existing data and migration history through the [approved handover](issues/09-typeorm-migration.md) before ticket 03; see the [accepted decision](../../docs/adr/0001-typeorm-database-access.md).
- Serve the frontend and API under one origin. Use the API for every account and library operation; Angular route guards are navigation aids, not authorization boundaries.
- Use email/password authentication with a maintained NestJS-compatible implementation, database-backed revocable sessions, and HttpOnly cookies. Use secure cookies for HTTPS deployment, explicit same-site settings, request-origin/CSRF protection for mutations, and bounded authentication attempts. Store password hashes only.
- Outbound verification and recovery emails are deferred for this private test. Self-service registration is available to visitors who can reach the private deployment. Document that email ownership is not verified. Administrator recovery changes a password without revealing it in process arguments or logs and revokes existing sessions.
- A Library entry belongs to one authenticated user and one Game, with a unique user/game relationship. Repeated additions do not create duplicates. Each entry has one Play status: Want to play, Playing, Completed, or Stopped playing.
- A Game is tracked across its listed platforms as one catalog title. Distinct remakes and remasters can be separate Game entries. Separate per-platform playthroughs and history are deferred.
- Use IGDB IDs as external identities, keeping Catalog metadata separate from user-owned Library entries. Store the normalized metadata needed to render saved games so that a provider outage does not erase a user's library.
- Search permits PC and console main games, remakes, and remasters. Exclude DLC, mods, bundles, special editions, and other game types initially. Discover IGDB's current type IDs and platform classifications; do not rely on deprecated category enums. Validate the resulting filters against live samples before relying on them.
- Search by title with bounded, paginated results. Fetch expanded details when opening a game. Do not equate display-title spelling with identity: the validated search for “Baldur's Gate 3” returned “Baldur's Gate III.”
- Apply the same catalog scope to discovery and direct game-detail access. Handle missing images with an intentional placeholder, missing text with a concise unavailable state, and unknown dates explicitly. Display the first release date as such, without implying a platform-specific release date.
- Use “Popular now,” not an unvalidated weekly-chart claim. As an initial implementation default, rank eligible games using IGDB Visits popularity data, refresh at most daily, and show the data's freshness. Do not describe the result as sales, active players, or a seven-day trend.
- As an initial implementation default, recent releases cover the last 90 days ordered by first release date, restricted to released eligible games. Feature an eligible game from the discovery results. Do not invent a major-studio classification or require a paid editorial dashboard.
- Cache and bound IGDB requests server-side, respect documented rate limits, and avoid one provider request per visible card. If a discovery feed is unavailable, show cached results with their age or an explicit retry state, rather than presenting fixture games as live data.
- The purple D design is the current direction: cinematic hero, desktop sidebar, compact discovery cards, separate My Library, and responsive mobile navigation. The owner explicitly wants room to revise the visuals after real use. Deliver the functional discovery experience first; keep catalog/feed logic separate from Angular presentation, use focused components and centralized theme values, and defer detailed visual polish. Do not build an elaborate theming system. Prototype sample rankings, working branding, switcher, and debug panels are not production features.
- Containerize the application and PostgreSQL using Compose, persistent database storage, health checks, runtime secrets, and repeatable schema migrations. The frontend's built assets may be served by the application or a small proxy; the precise service layout is an implementation detail.
- Bind the development app locally by default. Configure Tailscale sharing and HTTPS for the selected host at deployment time. The database is private to the container network. Verify NAS model/architecture before claiming compatibility; moving hosts includes a data backup/restore, not only moving images.

## Testing Decisions

The owner accepted API-level behavior tests with PostgreSQL plus a browser test
of the complete user journey. There is no existing application test suite.

- Make NestJS's HTTP API the primary behavior seam, backed by a disposable real PostgreSQL instance. Assert public responses, cookies, persisted outcomes, and ownership boundaries rather than private service calls or ORM implementation details.
- Cover account creation, login failures, session continuity, logout/revocation, and administrator recovery. Confirm that password hashes do not leave the account boundary.
- Cover add/update/filter/remove behavior, duplicate additions, persistence, and two-user isolation, including attempts to access another user's records.
- Replace only the external IGDB boundary with deterministic representative responses for automated tests. Include title aliases, mixed entry types, missing metadata, empty results, rate limiting, and provider failure.
- Keep live IGDB validation opt-in and separate from deterministic checks. Verify the final catalog filters and popularity/feed assumptions using real access before inviting testers.
- Add a small browser journey covering registration/login, Discover, search, game details, Want to play, status changes, My Library filters, removal, logout, and sign-in again. Exercise desktop and mobile viewports and use accessible controls as selectors.
- Add formatting, static type checks, and builds for Angular and NestJS. Treat authorization and persisted behavior as required checks, not as conclusions from a successful visual preview.
- Verify the documented Compose startup, restart persistence, and backup/restore procedure before calling the release ready for friends.

## Out of Scope

- Public profiles, social following, community ratings/reviews, and recommendations based on friends.
- Native mobile apps, mobile-only game coverage, DLC/mod/bundle/special-edition tracking, and multiple playthroughs or per-platform histories.
- ChatGPT-dependent accounts, Sites hosting, or managed account/database services.
- Public internet exposure or Tailscale Funnel for the friends test.
- Outbound account emails, social login, a web-based administration dashboard, and monetization.
- A verified weekly popularity chart, a dedicated major-studio classifier, and hand-managed editorial publishing tools.
- Selecting the physical deployment host now. The app must be portable; host-specific Tailscale and NAS setup follow when the owner chooses the target.

## Further Notes

The user-approved scope and primary planning sources are in the
[Wayfinder map](../game-tracker/map.md). The approved design is preserved on the
local `prototype/game-discovery` branch. Live IGDB access has passed a three-game
metadata check; that check does not validate final search filters or discovery feeds.

The owner accepted the proposed ticket breakdown and testing approach, with
visual design intentionally revisitable after the first functional friends test.

Popularity ranking and the recent-release window above are explicit initial
implementation defaults, not claims that IGDB supplies a prebuilt weekly chart.
Keep them easy to revise without changing the public account or Library contracts.
