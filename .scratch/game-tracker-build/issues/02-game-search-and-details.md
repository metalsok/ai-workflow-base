# 02: Search games and open details

Status: ready-for-human
Blocked by: None
Outcome: Implementation, automated acceptance checks, and representative live validation passed
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
