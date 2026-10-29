# 02 — Catalog and discovery

Status: ready-for-agent
Type: task
Blocked by: 01

## Before starting

Read `.scratch/api-java/spec.md` (agreed decisions) and `apps/api-java/README.md`
(layout, how to run). Follow the existing `accounts/` package: one class per
role (`*Controller`, `*Service`, `*Repository`, entity, `*Request`/`*Response`
records), constructor injection, no Lombok, errors through
`shared/web/ApiExceptionHandler` with a `message` field. Keep it simple: no
hexagonal layers. Java comes from Homebrew `openjdk@25`; if `./mvnw` cannot find
it, set `JAVA_HOME="$(brew --prefix openjdk@25)/libexec/openjdk.jdk/Contents/Home"`.

The Node source to port is `apps/api/src/catalog/` (about 600 lines including
`igdb/`); its tests are `tests/api2/catalog.http.test.ts` and
`tests/api2/discovery.http.test.ts`. This comes before the library because a
saved library game is fetched and stored through the catalog.

## What

A new `catalog` package with these endpoints, all requiring sign-in (already
the default in `SecurityConfiguration`):

| Method | Path                            | Answer                                                     |
| ------ | ------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/catalog/search?q=&page=`  | `{items, page, nextPage, fetchedAt, stale}`, 12 per page   |
| GET    | `/api/catalog/games/{id}`       | `{game, fetchedAt, stale}`; 404 `Game not found.`          |
| GET    | `/api/catalog/discovery/{kind}` | `popular` or `recent`: `{items, source, fetchedAt, stale}` |

Shapes (copy field names exactly; unknown values are `null` or `[]`):

- **Game:** `id` (IGDB id), `title`, `kind` (`main`/`remake`/`remaster`),
  `coverUrl`, `firstReleaseDate` (`YYYY-MM-DD`), `platforms`, `summary`,
  `genres`, `developers`, `publishers` (string lists).
- **Search item:** `id, title, kind, coverUrl, firstReleaseDate, platforms`.
- **Discovery item:** a game plus `artworkUrl`.

Input rules (400, checked before calling IGDB):

- `q`: trimmed 2–100 characters, no control characters →
  `Search for a title using 2–100 characters.`
- `page`: missing means 1; otherwise a whole number 1–50 →
  `Choose a page from 1 to 50.` `nextPage` is null on page 50 or when IGDB has
  no more results (ask IGDB for 13 to know).
- game `id`: whole number ≥ 1 → `Use a valid game ID.`
- `kind` other than popular/recent → `Choose a valid discovery feed.`

Caching (new Flyway migration `V3__catalog.sql`):

- `catalog_games (id bigint PK, metadata jsonb, fetched_at timestamptz, eligible boolean default true)`:
  game details are reused for 24 hours, otherwise fetched from IGDB and upserted.
- `catalog_feeds (kind text PK, payload jsonb, fetched_at timestamptz)`: each
  feed is rebuilt from IGDB at most once a day. `source` is
  `igdb-rating-count` for popular and `first-release-date` for recent; a cached
  feed with another source is rebuilt.
- Search is not cached. `stale` is always `false` for now.
- Map `jsonb` with Hibernate's `@JdbcTypeCode(SqlTypes.JSON)` on a record field.
- Read "now" from an injected `java.time.Clock` bean so tests can move time.

IGDB:

- An `IgdbClient` interface with a Spring `RestClient` implementation (the only
  code that calls IGDB), so tests can swap in a fake.
- Token: POST `https://id.twitch.tv/oauth2/token` with `client_id`,
  `client_secret`, `grant_type=client_credentials`; keep it until 30 seconds
  before `expires_in`, then fetch a new one.
- Queries: POST `https://api.igdb.com/v4/games` with headers `Client-ID` and
  `Authorization: Bearer <token>`, body in IGDB's query language. Copy the scope
  filter and field lists from `apps/api/src/catalog/igdb/igdb.queries.ts` and the
  four queries from `igdb.adapter.ts` (search with limit/offset, one game by id,
  popular sorted by `rating_count desc`, recent by a rolling 90-day
  `first_release_date` window).
- Mapping: port `igdb.mapper.ts`. Malformed optional fields become `null`/`[]`
  instead of failing the request.
- Failure, timeout or 429 from IGDB → 503 with a `Retry-After` header (IGDB's
  value clamped to 1–3600 seconds, default 2) and a safe message, never
  provider details. Missing `IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET` → 503 as well.
- Credentials come from the env vars above and must never be logged.

## Acceptance criteria

- Port the cases from the two Node test files to `CatalogApiTest` and
  `DiscoveryApiTest` (extending `support/ApiTest`), using a fake `IgdbClient`
  bean instead of the network. Include: sign-in required, scope filtering,
  pagination, input validation without IGDB calls, 503 + Retry-After on
  failures, token refresh after expiry, malformed metadata, feed caching that
  survives a restart, and the cache-source replacement.
- `./mvnw verify` passes, from `apps/api-java`.
- README: add the catalog to "Read in this order" and to the implemented
  endpoints.
