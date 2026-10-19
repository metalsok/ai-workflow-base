# Ticket 04: discovery feeds and cinematic home

Implemented and accepted on 2026-10-19. Technical acceptance criteria and owner
review are complete; ticket 04 is done.

## Result and boundaries

Discover now features an eligible game from the available feed, with a cinematic
artwork/gradient hero and links to the same catalog details used by search.
Popular now and Recent releases render independent loading, error, empty, stale,
and retry states. The spotlight falls back to the other available shelf. Missing
or failed artwork retains the purple hero; cards use the existing cover fallback.

Catalog owns provider queries and normalization. `DiscoveryService` owns the
persistent feed cache and shares in-flight refreshes per feed within the API
process. Angular uses the existing `@Service()` CatalogApi, Observable reads,
rxResource lifecycles, explicit OnPush, and focused components with class/template
pairs in their own folders. No dependencies or framework versions changed.
The Angular and NestJS framework skills were loaded and applied.

Popular now fetches up to 100 IGDB Visits primitives, fetches Game metadata in one
batch, filters to eligible catalog titles, preserves Visits ranking, and returns
up to 12 titles. Recent releases applies the same catalog scope and a rolling
90-day first-release window, excludes future dates, and sorts newest first.
There is no studio-size classification or editorial ranking. The feature game
comes from these results, without another provider request for each visible card.

The generated DiscoveryFeeds migration adds only `catalog_feeds`. Its two
application-owned cache keys are separate from search pruning and private library
entries. Successful results remain fresh for 24 hours; provider outages return
stored normalized metadata with its original timestamp and `stale: true`, or a
safe retryable 503 without cached data. All feed endpoints require authentication
and consume the existing per-account Catalog request budget.

Saving from Discover and consistent saved-state presentation belong to ticket 05,
as does administrator recovery. Existing search/details saving remains available.

## Evidence

- `npm run typecheck`, `npm run format:check`, and `npm run build` passed.
- `npm test` passed: 51 HTTP/PostgreSQL tests and eight desktop/mobile browser
  journeys. The new HTTP tests cover Visits ordering, eligibility, bounded batch
  lookups, date-window boundaries, daily cache reuse across restart, outage/stale
  fallback and recovery, malformed rankings, empty feeds, and shared refreshes.
- Migration checks passed for clean installs with no schema difference, existing
  accounts/sessions/cache/history preservation, and rollback/reapplication of the
  Library and feed migrations. PostgreSQL processes/databases were disposable.
- The discovery browser journey covers the spotlight, both shelves, freshness
  labels, detail identity, keyboard activation, reload, and image failures. Both
  screenshots were visually inspected; desktop/mobile did not scroll horizontally.
- Automated checks replace only the external IGDB/Twitch boundary and images.
  Live checks remain an explicit opt-in command.

## Live verification

`npm run discovery:validate -- --live` passed using the implemented loader and
existing server-side credentials. No tokens, client secrets, or private provider
diagnostics were logged or recorded. The public sample is in
[04-live-feeds.json](04-live-feeds.json), observed at 2026-10-19T12:06:12.791Z.
Both feeds returned 12 eligible titles; the sample includes Indie metadata and
established publishers without adding an unsupported classifier.

Verified Visits type 1 and external popularity source 121 against the live type
endpoint. The query and honest-interest label follow the primary
[IGDB PopScore documentation](https://api-docs.igdb.com/#popscore).
The live sample is evidence of access and query behavior, not a fixture shipped
in the application or a guarantee of future feed contents.

## Independent review

The code-review skill reviewed the diff from
`29e1e6cfa789160ff78ddbd138711f9b16a986e0` (after ticket 03 owner acceptance).
Standards reported zero material violations or baseline smells. Spec reported
zero missing, partial, out-of-scope, or incorrect requirements. Both reviewers
applied the Angular and NestJS skills and current framework conventions.

## Local preview

Run `npm run db:migrate`, then restart the API/development app. The new migration
is additive; follow the migration runbook for backups and deployment. No real
development database was changed, no development server was restarted, and no
changes were pushed or deployed during implementation.


### Preview follow-up and owner acceptance — 2026-10-19

The development API still running from before ticket 04 returned 404 for both
new routes. The database already had all three migrations applied. Restarting
`npm run dev` loaded the new routes; unauthenticated checks on ports 3000 and
4200 returned the expected 401 for both popular and recent. No source-code
change was needed. The owner then confirmed the application looked solid and
accepted ticket 04.
