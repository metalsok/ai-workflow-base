# 03 — Library

Status: ready-for-agent
Type: task
Blocked by: 02

## Before starting

Read `.scratch/api-java/spec.md`, `apps/api-java/README.md` and the
"Before starting" section of `02-catalog.md`; the same conventions apply. The
Node source to port is `apps/api/src/library/` (about 180 lines); its tests are
`tests/api2/library.http.test.ts`.

## What

A new `library` package: each signed-in account's saved games and Play status.
All endpoints require sign-in (the default in `SecurityConfiguration`) and use
the signed-in account id in every query, so one account can never see or
change another account's entries. Never take an account id from the request.

| Method | Path                      | Answer                                          |
| ------ | ------------------------- | ----------------------------------------------- |
| GET    | `/api/library?status=`    | `{items: [{game, status}]}`, ordered by game id |
| POST   | `/api/library/games/{id}` | `{game, status}`; saves as `want-to-play`       |
| PATCH  | `/api/library/games/{id}` | body `{status}` → `{game, status}`              |
| DELETE | `/api/library/games/{id}` | 204                                             |

- Statuses: `want-to-play`, `playing`, `completed`, `stopped-playing` (a Java
  enum whose JSON form is these strings). Anything else → 400
  `Choose a valid Play status.`
- `status` filter: missing (all), one of the four, or `played`, which means
  `playing` + `completed` + `stopped-playing`.
- Game id rules as in the catalog (400 `Use a valid game ID.`).
- POST: if already saved, return the existing entry unchanged (keeps its
  status). Otherwise load the game through the catalog service's details
  method (stores it in `catalog_games`; 404 if out of scope), then insert with
  `ON CONFLICT DO NOTHING`, so two simultaneous saves create one entry.
- PATCH/DELETE on a game that is not saved → 404 `Saved game not found.`
- `game` in answers comes from `catalog_games.metadata`, so the library works
  while IGDB is down.

Table (Flyway `V4__library.sql`):
`library_entries (account_id uuid, game_id bigint, status text, PRIMARY KEY (account_id, game_id))`
with a CHECK on the four statuses, `account_id` → `accounts(id) ON DELETE CASCADE`,
`game_id` → `catalog_games(id) ON DELETE RESTRICT`. The entity has a composite
key (`@IdClass` or `@EmbeddedId`) and a `@ManyToOne` to the catalog game entity.

## Acceptance criteria

- Port the cases from `tests/api2/library.http.test.ts` to `LibraryApiTest`:
  save, status changes and filters, two users isolated (including tampering
  with ids), repeated and concurrent saves, data surviving a restart and an
  IGDB outage, and rejection of anonymous access, missing CSRF token, invalid
  ids, invalid statuses and out-of-scope games.
- `./mvnw verify` passes, from `apps/api-java`.
- README: add the library to "Read in this order" and to the implemented
  endpoints.
