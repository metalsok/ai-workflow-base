# 03 — Catalog and discovery

Status: needs-triage
Type: task
Blocked by: 01

## What

Port `apps/api/src/catalog`: IGDB `RestClient` client with access tokens,
search, game details, popular and recent discovery feeds, and the database
cache with `fetchedAt` / `stale`. Without IGDB credentials the catalog answers
503. Port `tests/api2/catalog.http.test.ts` and `discovery.http.test.ts` with a
fake IGDB client.
