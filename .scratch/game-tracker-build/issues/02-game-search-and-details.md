# 02: Search games and open details

Status: done
Blocked by: None
Outcome: Owner accepted functionality and the reviewed Angular/NestJS refactors
Parent: [First private release](../spec.md)

## What to build

A signed-in tester searches PC and console titles and opens a game to see the
agreed metadata. Catalog data flows from IGDB through NestJS to Angular, with
normalized saved metadata and predictable unavailable states.

## Acceptance criteria

- [x] Title search returns paginated eligible main games, remakes, and remasters; excluded entry types do not appear or bypass the restriction through direct details access.
- [x] Details show cover, summary, first release date, platforms, genres, developers, and publishers, with explicit missing-data fallbacks.
- [x] Credentials and provider tokens remain server-side; requests are bounded, cached, and rate-limited appropriately.
- [x] Browser interactions support search, result selection, details, loading, empty, and retry states on desktop and mobile.
- [x] Deterministic HTTP checks exercise mixed types, title aliases, unknown metadata, provider failure, and pagination.
- [x] Opt-in live validation confirms the actual IGDB classification filters against representative titles.


## Comments

### Implementation

Added an authenticated Catalog module and Angular search/detail screens. Search
returns up to 12 cards per page (maximum 50 pages), with canonical IGDB IDs and
properly escaped title queries. The production query and defensive response
checks enforce main games, remakes, and remasters; exclude editions; and require
a PC, computer, console, or portable-console platform. Direct game URLs enforce
the same scope and return 404 for excluded or unknown titles.

Details provide cover, summary, first release date, platforms, genres, developers,
and publishers, with visible missing-data fallbacks. Search pages and normalized
expanded metadata persist in PostgreSQL with separate refresh lifetimes. Outages
return a safe retry response or explicitly dated stale data. Confirmed excluded
titles cannot regain detail access through stale fallback.

Provider traffic is bounded by per-account PostgreSQL quotas, a paced eight-entry
queue, network timeouts, response-size limits, token expiry renewal, and one
refresh/retry for a revoked token. Credentials and tokens remain server-side.
The browser includes global search, pagination, deep links, cancellation, loading,
empty, failure/retry, and unknown metadata states in the purple responsive shell.

### TDD and verification

Used the agreed NestJS HTTP/PostgreSQL and browser seams. Only external
IGDB/Twitch/image responses and time are substituted in deterministic checks.
Observed red before green for missing search/details, authentication, mixed-type
filtering, direct-access exclusion, pagination, input validation, restart caching,
provider failure, stale fallback, reclassification, pacing/queue limits, token
expiry/revocation, malformed/oversized payloads, and per-account request limits.
The browser journey began red at the missing search field. Browser checks also
caught and corrected a one-day timezone shift when formatting date-only values.

Passed `npm run format:check`, `npm run typecheck`, `npm test` (26 HTTP tests and
4 browser journeys), and builds for both applications. Browser coverage includes
account access and catalog search/details at desktop/mobile widths and Vienna/
Los Angeles timezones. Re-ran browser checks after the review refactor. A separate
smoke check verified isolated external-PostgreSQL schemas and cleanup for
multiple suites. A compiled-app smoke check used real IGDB with a disposable
PostgreSQL database for registration, alias search, and expanded details, with
no browser/CSP errors. Desktop/mobile previews were inspected.

Live validation is opt-in: `npm run catalog:validate -- --live`. It passed using
the production adapter/filter against current game/platform classifications,
main games, remakes, remasters, title aliases, and representative excluded DLC,
mods, bundles, editions, and mobile-only games. The
[public metadata report](../catalog-validation.json) records the evidence and
its limited representative scope. Automated checks make no live IGDB calls.

### Standards review

No hard violations. An optional duplicated-request-lifecycle finding was resolved
by sharing the catalog request-state helper; the reviewer confirmed no remaining
findings.

### Spec review

No implementation gaps or scope creep found. Personal library operations and
Discover feeds remain in issues 03 and 04. The implementation is ready for the
owner to try after restarting `npm run dev`, which applies the new migrations.


### Owner code review and refactoring — 2026-10-19

The owner confirmed that ticket 02 works and requested a maintainability review
before accepting the code. They authorized the recommended refactors and the
optional replacement of the custom request lifecycle with Angular `resource`.
They also required a zoneless Angular app and explicit OnPush on every component.

- Moved catalog fetching, PostgreSQL caching, stale fallback, and account quota
  persistence into `CatalogService`; the controller retains HTTP validation and
  rate-limit response mapping. Existing endpoint, cache, and session contracts
  are preserved, with no database migration.
- Added provider-record parsing before exposing typed games to Catalog. Scope
  checking now operates on parsed data rather than claiming to validate the
  entire provider shape. Malformed optional metadata retains usable fallbacks.
- Correction to the initial review: null optional genres/company entries were
  already handled by optional chaining. The added HTTP regression passed before
  changes; it is coverage of existing behavior, not evidence of a repaired crash.
- Replaced state synchronization effects with `linkedSignal` for the editable
  search term and the cover error state. Replaced manual request signals and
  cancellation with `resource`, keeping parameters separate from the loader,
  forwarding the abort signal, guarding failed value reads, and hiding results
  during reload to preserve the existing clear-on-retry UI.
- All six application components now explicitly declare OnPush. Angular 22's
  existing zoneless bootstrap remains in use. The browser journey asserts that
  Zone.js is absent. Persistent instructions and the build spec record both
  requirements. Angular CLI's OnPush default is explicit in `angular.json`;
  future generated components still need the declaration added because Angular
  22 omits default component metadata.

Loaded `angular-developer`, `nestjs-professional-software-engineering`,
`writing-for-agents`, and the TDD guidance for the agreed HTTP/PostgreSQL seam.
Passed type checking, formatting, `npm test` (27 HTTP/PostgreSQL tests and four
browser journeys across desktop/mobile), and both builds through the browser
suite. Tests required permission for disposable PostgreSQL and loopback servers.
No live IGDB requests were made. Human acceptance remains pending; this entry
does not mark the ticket approved or complete.


### Angular HTTP transport follow-up — 2026-10-19

At the owner's request, authentication and Catalog now use Angular `HttpClient`
instead of direct browser `fetch`. `provideHttpClient()` is configured at
bootstrap. Authentication keeps awaitable action methods and the route guard's
explicit account check; catalog reads retain `resource` and connect its abort
signal to HTTP unsubscription. Shared error-message extraction accepts only a
nonempty string from an HTTP error body and otherwise uses a readable fallback.
No direct `fetch` calls remain under `apps/web/src`. Backend provider transport
and HTTP test clients remain appropriate outside Angular.

The browser journey now replaces an in-flight search and verifies its HTTP
request is cancelled and only the latest result appears. Existing checks also
exercise incorrect-password messages, cookies, account reload, logout, search,
metadata, 404 handling, and retry behavior. Transport conventions are recorded
in framework guidance and development documentation. No new interceptors,
authentication protocols, or server changes were introduced.

Validation passed: `npm run typecheck`, `npm run format:check`, and `npm test`
(27 HTTP/PostgreSQL tests, four desktop/mobile browser journeys, and both builds).
Browser cancellation checks passed at both viewport sizes. No live IGDB calls
were made. Changes remain uncommitted and await owner acceptance.


### Observable service contracts — 2026-10-19

The owner requested cold Observable service contracts and signal-based state,
replacing the preceding Promise-based frontend orchestration. This supersedes
the earlier awaitable-auth and resource/abort-bridge implementation notes.

`Auth.load()` returns `Observable<Account | null>` from HttpClient: a subscriber
starts the request; `tap` updates the account signal on the response. A 401 emits
null and clears the account. Other failures remain errors. Login and logout also
return cold Observables and update account state only on successful responses.
The route guard returns the account-check pipeline directly, letting Angular's
router subscribe and cancel it. Account and shell components subscribe to actions
with `takeUntilDestroyed`, use `finalize` for pending state, and compose successful
navigation with RxJS operators, without nested subscriptions.

Catalog also returns HttpClient Observables. Its request helper now uses Angular
22's `rxResource` to manage subscriptions, signal state, retries, and cancellation;
there is no Promise conversion or manual AbortSignal bridge. Frontend source has
no `async`/`await`, `firstValueFrom`, or `lastValueFrom`. Native Router navigation
Promises are consumed through RxJS or have an explicit rejection handler.
Framework guidance and development documentation record this owner preference
for future frontend work. Backend async code and test runners are outside this
frontend convention.

Validation after the Observable refactor passed: type checking, formatting, both
builds, all 27 HTTP/PostgreSQL tests, and all four desktop/mobile browser journeys
including cancellation. No live IGDB checks were run. Changes remain uncommitted.


### Owner acceptance — 2026-10-19

The owner accepted the final Observable/signal implementation and asked to finish
this ticket before starting a separate Tailwind migration. Ticket 02 is complete.
The final checks passed: type checking, formatting, both builds, 27 HTTP tests,
and four desktop/mobile browser journeys including cancellation. Live catalog
validation remains the separately recorded evidence from the original work.
