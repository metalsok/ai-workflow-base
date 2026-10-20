# Development and testing

## Start locally

Prerequisites: Node 26, npm, and Docker Compose with permission to use Docker.
Angular 22.2, NestJS 12.1, and TypeScript 6.0 are locked in `package-lock.json`.
Run all commands from the repository root.

The Angular app runs zoneless using Angular 22's bootstrap default, without
Zone.js. Every application component explicitly declares OnPush; future
components must retain that declaration. Project conventions are recorded in
[framework guidance](agents/framework-skills.md#project-angular-requirements).
The persistent authenticated shell hosts lazy routed feature pages. Catalog
pages own `httpResource` reads, and the library page owns edits and filtering.
A shell-scoped `LibraryState` shares library data and save actions with pages
and the connected spotlight widget. Presentation controls use inputs/outputs.
Account services return cold Observables; the account page and router own their
subscriptions. A scoped interceptor handles expired catalog/library sessions.
See [request ownership](adr/0003-routed-feature-pages.md) for the decision.
Session cookies and the backend's Origin checks retain the same contract.

`npm run dev` serves Angular's development configuration with runtime debug APIs
and source maps. `npm run build` defaults to the optimized production
configuration with source maps disabled. Both are declared in `angular.json`;
restart the frontend dev server after changing these configurations.

Frontend forms use Angular Signal Forms: typed signal models, schema validation,
and `[formField]` bindings. This applies to account access, catalog search, and
Play status editing, and is required for future form features. Explicit user
actions retain Observable HTTP handling; field edits never automatically run
mutations through effects or resources. See the
[forms convention](agents/framework-skills.md#frontend-forms) and
[migration notes](frontend-forms.md).

```bash
npm ci
node scripts/setup-dev.mjs
npm run db:up
npm run db:migrate
npm run dev
```

Open **http://127.0.0.1:4200**. Use this exact origin: `localhost` is a different
origin. Angular proxies `/api` to NestJS on loopback port 3000. Registration
immediately signs you in. Use **Search games** in the header to search IGDB and
open details. Save games from search or details, then use My Library to change
Play status, filter (including Played), or remove games. Discover shows a
spotlight, Popular now, and recent releases with visible feed freshness.
Restart `npm run dev` after backend changes; run `npm run db:migrate` separately before starting the API. Startup refuses pending migrations.

The setup script generates database and session secrets in the ignored `.env`
with owner-only permissions. Existing nonempty settings are preserved; existing
IGDB credentials are untouched. Keep the same `SESSION_SECRET` across restarts.
`.env.example` lists configuration keys and contains no usable credentials.

`npm run db:up` starts PostgreSQL 17 with a named data volume and a health check.
Port 5433 is exposed on loopback for development only. `docker compose stop db`
preserves data; `docker compose down -v` deletes that local database volume.
The full application container deployment is covered by issue 06.

## Migrations and built application

TypeORM 1.1.2 and @nestjs/typeorm 12.0.2 own database access and generated
migrations. `pg` is only the ORM driver. Run `npm run db:migrate` once before
starting API instances. Startup checks the ledger and fails on pending, missing,
or unknown migration history; it never creates tables. Automatic synchronization
and extension installation are disabled.

The local database has completed its TypeORM handover. Any additional legacy
database must first use handover release `c2cac3b`; the
[migration and recovery guide](database-migrations.md) documents this path.
The historical SQL files are immutable under `db/legacy-migrations/`; their
checksum ledger and original application dates are retained. Clean installations
have an empty legacy ledger and a separate TypeORM migration ledger.

```bash
npm run db:status
npm run db:generate -- apps/api/src/database/migrations/DescribeTheChange
# Review the generated up/down operations before applying them.
npm run db:migrate
```

Generation compares entities with a disposable migrated development database;
never use synchronization to apply model changes. Read the runbook for examples,
concurrency requirements, packaging, backup, and recovery.

```bash
npm run build
APP_ORIGIN=http://127.0.0.1:3000 npm start
```

The built Angular app and API are served together at loopback port 3000.
Deep links return Angular's index; unknown `/api` routes retain API 404 responses.
Angular critical CSS inlining is disabled so the server's script policy can
remain `script-src 'self'` without an inline stylesheet-loader script.

## Styling

Tailwind CSS v4 is compiled by Angular's build through the root `.postcssrc.json`.
The entry is `apps/web/src/styles.css`; it contains Tailwind imports, shared theme
values, the original 800px/1100px responsive variants, and document-wide defaults.
Presentation uses utility classes in templates and the cover component's host.
There is no CDN or browser-time Tailwind dependency. Keep complete utility names
in source so the scanner can find them. Future frontend tickets use this approach.

After changing presentation, compare desktop and phone layouts, including labels,
keyboard focus, empty/error states, and image fallbacks. Run the browser journey
and the other checks below. The approved purple design is preserved; a styling
migration does not imply a redesign.

## Checks

```bash
npm run format:check
npm run typecheck
npm run build
npx playwright install chromium # once per browser version
npm run test:api                # real HTTP + PostgreSQL
npm run test:browser            # builds, then desktop and mobile browser journey
npm test                       # both suites
```

The API and browser tests use separate, disposable PostgreSQL 17 processes from
platform-specific binaries installed through the development dependency
`embedded-postgres`. No database is mocked, and no Docker daemon is required for
these checks. Run as a non-root user with permission to bind loopback ports.
The helper launches binaries directly because the package's lifecycle wrapper
can hide a failing Node test runner's exit status. Each process is stopped and
its temporary directory is removed after the suite. Its trust authentication is
restricted to this temporary loopback-only test server.

Alternatively set `TEST_DATABASE_URL` to an **empty disposable PostgreSQL 17
database** with permission to create schemas. Each test process creates and drops
a unique temporary schema so suites and repeated runs remain isolated. The
caller owns the external database. Do not use a personal, shared, or production database.

The API tests assert responses and cookies, including account/session continuity
across NestJS restarts. The Playwright journey uses accessible controls and runs
at desktop and phone widths. Failures retain traces under ignored `test-results`.
Automated tests replace only the external IGDB/Twitch HTTP boundary and image
responses with deterministic fixtures. They never use live credentials or call
IGDB. Browser coverage runs in Vienna and Los Angeles timezones to catch
date-only rendering errors.

## Authentication contract

All account operations go through `/api/accounts`:

| Method | Path        | Behavior                                                                         |
| ------ | ----------- | -------------------------------------------------------------------------------- |
| POST   | `/register` | Valid email and 12–128-character password; creates and signs in an account (201) |
| POST   | `/login`    | Email/password verification; replaces the current session (200)                  |
| GET    | `/me`       | Returns only account ID and normalized email, or 401                             |
| POST   | `/logout`   | Revokes the current persisted session and expires the cookie (204)               |

Registration/login accept JSON `{ "email": "…", "password": "…" }`.
Emails are trimmed and normalized to lowercase. Duplicate registration returns
409; invalid fields return 400. Wrong passwords and unknown emails share the
same 401 response and both perform Argon2 verification. Passwords are stored as
Argon2id hashes; password fields and hashes never appear in account responses.
Passport Local handles verification, and Express Session with the ORM-backed
store persists revocable sessions in PostgreSQL. The browser receives a signed opaque ID.

Sessions have a fixed seven-day lifetime, enforced on the server as well as by
the cookie and database expiry. Sign-in rotates the session ID and destroys the
previous session. Logout deletes the current session. Restarting the app retains
sessions when the database and secret are retained. Expired sessions are rejected
on access and pruned periodically by the store.

The cookie is HttpOnly, SameSite=Lax, and Secure when `APP_ORIGIN` uses HTTPS.
Every API mutation requires an exact matching `Origin` header, including login,
registration, and logout; missing or foreign origins receive 403. This is the
CSRF defense, together with same-origin hosting and explicit cookie policy.
API responses use `Cache-Control: no-store`. Helmet supplies security headers.

Authentication attempts are bounded in PostgreSQL over 15-minute windows:
60 combined registration/login attempts per address and 10 login attempts per
normalized email. Limits count successful attempts too. A blocked request
returns 429 with `Retry-After`. Restarting the API does not clear these counters.
Forwarding headers are ignored by default.

For a local HTTPS proxy, set `APP_ORIGIN` to the exact HTTPS origin and trust
only the proxy source with `TRUST_PROXY_LOOPBACK` or `TRUST_PROXY_CIDRS`; configure
it to overwrite forwarding headers. Secure cookies are not issued over plain
HTTP. The [private deployment guide](deployment.md) covers Docker and Tailscale.

Email ownership is **not verified** for this private test. Application accounts
are independent of ChatGPT and Tailscale. Administrator password recovery is
documented below; no self-service recovery or outbound email is available in
this slice.

## Verification limits for issue 01

The implementation session could not access the host Docker socket. The HTTP
and browser checks use the real disposable PostgreSQL process described above.
Compose configuration was validated during implementation. The owner subsequently
confirmed local Compose startup, registration, sign-in/out, and the restart check
for PostgreSQL and the app. These manual confirmations resolve the issue 01
container verification gap; they are separate from the automated test results.

Version compatibility reference: [Angular's supported versions](https://angular.dev/reference/versions).
Session integration: [NestJS session documentation](https://docs.nestjs.com/techniques/session)
and [Express session cookie and storage options](https://expressjs.com/en/resources/middleware/session/).

## Catalog search and details

The API reads `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` from the server environment.
Keep them in the ignored `.env`; no credentials or provider access tokens are
sent to Angular. If credentials are missing or the provider is unavailable,
uncached catalog requests return a retry state. Cover images come from
`https://images.igdb.com`, explicitly allowed by the server's image policy.

All catalog endpoints require an authenticated application session:

| Method | Path                             | Behavior                                                                              |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/api/catalog/search?q=…&page=1` | Up to 12 game cards, page number, optional next page, fetch timestamp, stale flag     |
| GET    | `/api/catalog/games/:id`         | Expanded normalized game, fetch timestamp, stale flag; 404 for missing/excluded games |

Queries contain 2–100 characters; pages are integers from 1 to 50. Search terms
are escaped as APICalypse strings. Game IDs must be positive safe integers.
The provider receives the same scope filter for search and direct details;
returned records are also checked defensively. Only main games, remakes, and
remasters are eligible, with `version_parent = null`. Supported platforms include
computer, console, and portable-console types plus Windows, macOS, and Linux
explicitly; Android/iOS-only games and unknown classifications are excluded.
Standalone expansions, separately indexed ports, episodes, and other game types
remain outside this initial scope. Title spelling is not identity: the alias
“Baldur's Gate 3” may return the canonical “Baldur's Gate III” with ID 119171.

Details expose cover, summary, first release date, platforms, genres, developers,
and publishers. Nulls and empty lists become visible unavailable states in the
UI. Covers have an intentional placeholder, including when image loading fails.
First release dates are calendar dates, not platform-specific release dates;
formatting them preserves the calendar day across browser timezones.

Search pages are cached in PostgreSQL for five minutes, with at most 500 cached
search pages. Expanded normalized metadata is stored separately in
`catalog_games` and refreshed after 24 hours; fetching cards never overwrites
expanded detail metadata. Cache hits and metadata survive API restarts. During
provider failure, a previously cached response is returned with `stale: true` and
its original timestamp, displayed explicitly by the UI. A game subsequently
confirmed excluded is marked ineligible, preventing stale detail fallback from
restoring access while retaining stored metadata for future library rendering.

Each account has 60 catalog requests per minute, counted in PostgreSQL, including
cache hits. Excess requests return 429 with `Retry-After`. Each API process paces
upstream IGDB request starts at least 300 ms apart, serializes network requests,
and accepts at most eight pending requests. Excess work gets a safe 503/retry
response. Network requests have an eight-second timeout; provider JSON is bounded
to 2 MiB and token JSON to 64 KiB. Upstream 429 cooldowns are respected. Tokens are
kept in memory, refreshed before expiry, and refreshed/retried once on a 401.
Provider diagnostics and request credentials are never forwarded to clients.

### Opt-in live validation

```bash
npm run catalog:validate -- --live
```

Without `--live`, this command stops before making requests. With it, stored
server credentials are used to validate current game/platform type records,
the actual production filter, representative main games, remakes, remasters,
alias matching, and exclusion of DLC, mods, bundles, editions, and mobile-only
games. It writes only public metadata to
`.scratch/game-tracker-build/catalog-validation.json`. This is separate from
`npm test` and does not validate discovery feeds or the whole IGDB catalog.

The report records the successful live checks for issue 02. Current API fields
and limits are documented in [IGDB's official API documentation](https://api-docs.igdb.com/).

## Backend clocks and ORM tests

Authentication windows now use an injected backend clock, as catalog windows
already did. Keep all API hosts synchronized with NTP; limits are persisted in
PostgreSQL and transaction retries preserve increments across instances. Windows
reset at `expiresAt <= now`, and rejected attempts remain counted. IP consumption
commits before email consumption. Retry-After uses ceiling seconds, at least one.

The API harness explicitly migrates its disposable PostgreSQL database before
booting. Migration tests also require PostgreSQL client tools (`pg_dump` and
`pg_restore`, version 17 or newer). Recovery backups are temporary and removed
after the tests. Historical fixtures alone use infrastructure SQL; application
requests exercise repositories and the ORM session store. No live IGDB checks
run in the automated suites.

## Private Library contract

Run `npm run db:migrate` before starting the updated API. The PersonalLibrary
migration adds `library_entries` with a composite account/Game primary key,
account and cached Game relationships, and the four allowed Play statuses.
Existing accounts, sessions, and catalog data are preserved. Apply migrations
once through the designated migration process; automatic synchronization stays off.

All `/api/library` endpoints require a live application session. Mutations use
the same exact-Origin protection as account operations. The API derives ownership
from the session, ignoring any account identifier supplied by the caller.

| Method | Path                          | Behavior                                                                                      |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/api/library`                | Returns `{ items: [{ game, status }] }` using stored metadata                                 |
| GET    | `/api/library?status=playing` | Filters by one Play status; `played` combines all three started statuses                      |
| POST   | `/api/library/games/:id`      | Saves an eligible catalog Game as `want-to-play`; duplicate saves preserve the current status |
| PATCH  | `/api/library/games/:id`      | Changes an owned entry with JSON `{ "status": "completed" }`                                  |
| DELETE | `/api/library/games/:id`      | Removes an owned entry (204)                                                                  |

Status values are `want-to-play`, `playing`, `completed`, and `stopped-playing`.
Invalid identifiers/filters/statuses return 400. Updating or removing an entry
absent from the caller's library returns 404, including when another account
owns the same Game. Responses contain normalized Game metadata and status only.
The Game ID identifies the catalog title; each account independently owns its
entry for that title. Concurrent additions are deduplicated by PostgreSQL.

Adding a new entry resolves an eligible Game through Catalog and consumes the
existing per-account catalog request budget. Rendering the library, changing
status, removing, and re-saving an existing entry need no provider request.
Saved metadata remains in the shared Catalog table when an entry is removed;
no other account's entry or metadata is deleted. Library state persists through
sessions and application restarts in the same PostgreSQL database.

## Discovery feeds

Run `npm run db:migrate` before starting the updated API. The DiscoveryFeeds
migration adds `catalog_feeds`, separate from cached searches and private
Library entries. It preserves existing tables and history. The cache has two
application-owned keys, `popular` and `recent`.

Authenticated `GET /api/catalog/discovery/popular` and `/recent` return
`{ items, source, fetchedAt, stale }`. These requests consume the existing
per-account catalog request budget, including cached responses. Invalid feed
names return 400. The JSON payload contains normalized public Game metadata
plus `artworkUrl`; credentials and raw popularity diagnostics stay server-side.

Popular now ranks eligible games from a bounded sample of the 100 highest
IGDB Visits primitives (verified type 1). Metadata is fetched in one batch and
returned in Visits order, up to 12 titles. Visits measure page interest, not
sales, player counts, or a weekly chart. Recent releases returns up to 12 eligible
games by first release date within the last 90 days, excluding future dates.
Both apply the same PC/console/type/edition rules as search and details. No
studio-size classifier or editor-maintained rankings are introduced.

Successful feeds are cached in PostgreSQL for 24 hours; requests arriving during
a refresh share that work in the same API process. A provider outage returns
stored results marked stale with their original timestamp, or a safe 503 with
Retry-After when nothing is cached. The discovery page loads and retries each Angular shelf
independently, and spotlight selection falls back to the available shelf.
Missing/failed artwork uses the purple hero background; covers retain their
existing placeholder. No provider request is made for each rendered card.

Automated checks replace only external IGDB/Twitch and image responses. To opt
into real provider verification using the local server-side credentials:

```bash
npm run discovery:validate -- --live
```

This verifies Visits access, both implemented feed queries, the date window, and
Indie metadata, then records public sample metadata in
`.scratch/game-tracker-build/verification/04-live-feeds.json`. It does not label
studio size or call live providers during the deterministic test suites.

Primary source: [IGDB PopScore documentation](https://api-docs.igdb.com/#popscore).

## Administrator password recovery

Apply migrations first, then run the local-only administrator command:

```bash
npm run account:reset -- tester@example.com
```

The terminal prompts for the new password twice with input hidden. Passwords
must contain 12–128 characters. The password is read from standard input, never
from command arguments. For automation, pipe one password line from a trusted
secret source; avoid putting a literal password in shell history. The compiled
command is `node dist/api/accounts/reset.cli.js tester@example.com`.

The command hashes the password with Argon2 and atomically increments that
account's session version. Every authenticated API request verifies the stored
version, so all earlier sessions (including a login verified before the reset)
are rejected. Other accounts and their sessions remain valid. Revoked session
rows are cleaned up through ordinary expiry; resetting a password does not erase
account or Library data. Existing sessions without a version retain version zero
after the additive migration. Authentication attempt limits still apply.

This operation requires administrator access to the database configuration and
is deliberately absent from the public HTTP API. Database diagnostics and
passwords are suppressed from command output. Existing local credentials are
not reset by development or test commands.

Saved statuses and the library page share one shell-scoped full-library resource.
The library page derives filters locally and refetches after edits. Discover
spotlight/cards, search, and details therefore agree with My Library. Shell
teardown clears the state between accounts; failed reads expose a retry.
