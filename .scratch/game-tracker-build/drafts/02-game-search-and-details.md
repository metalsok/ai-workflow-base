# 02: Search games and open details

Status: draft
Blocked by: 01 — Create an account and sign in
Parent: [First private release](../spec.md)

## What to build

A signed-in tester searches PC and console titles and opens a game to see the
agreed metadata. Catalog data flows from IGDB through NestJS to Angular, with
normalized saved metadata and predictable unavailable states.

## Acceptance criteria

- [ ] Title search returns paginated eligible main games, remakes, and remasters; excluded entry types do not appear or bypass the restriction through direct details access.
- [ ] Details show cover, summary, first release date, platforms, genres, developers, and publishers, with explicit missing-data fallbacks.
- [ ] Credentials and provider tokens remain server-side; requests are bounded, cached, and rate-limited appropriately.
- [ ] Browser interactions support search, result selection, details, loading, empty, and retry states on desktop and mobile.
- [ ] Deterministic HTTP checks exercise mixed types, title aliases, unknown metadata, provider failure, and pagination.
- [ ] Opt-in live validation confirms the actual IGDB classification filters against representative titles.
