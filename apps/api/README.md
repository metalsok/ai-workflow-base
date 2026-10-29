# api — reading guide

A simpler rewrite of `apps/api` with the same HTTP contract and database
tables. Plan and tickets: `.scratch/api-rewrite/`.

## How a request flows

```
browser ─► app.ts middleware ─► guard ─► controller ─► service ─► repository (TypeORM) ─► PostgreSQL
           (helmet, no-store,   (signed   (HTTP: read     (rules)    or IgdbClient ─► IGDB
            Origin check,        in?)      params, status
            session cookie)                codes)
```

## Read in this order

1. `src/app.ts` — builds the server and its middleware.
2. `src/app.module.ts` — database connection and the list of feature modules.
3. `src/accounts/` — register, login, logout, `me`; `signed-in.guard.ts` is
   what other features use to require a signed-in user.
4. `src/catalog/game.ts` — application game types. The catalog and discovery
   services own caching. `src/catalog/igdb/igdb.adapter.ts` exposes game operations,
   `igdb.queries.ts` holds provider query fields, `igdb.mapper.ts` validates and
   converts provider data, and `igdb.client.ts` handles HTTP and access tokens.
5. `src/library/` — the user's saved games.

Every feature folder has the same roles:

| File           | Role                                       |
| -------------- | ------------------------------------------ |
| `*.controller` | HTTP routes: parse input, call the service |
| `*.service`    | The feature's rules                        |
| `*.entity`     | One database table                         |
| `*.module`     | Wires the above together for NestJS        |

## Endpoints

| Method | Path                           | Notes                               |
| ------ | ------------------------------ | ----------------------------------- |
| GET    | `/api/health`                  | No sign-in needed                   |
| POST   | `/api/accounts/register`       | `{email, password}` → `{id, email}` |
| POST   | `/api/accounts/login`          | `{email, password}` → `{id, email}` |
| POST   | `/api/accounts/logout`         | 204                                 |
| GET    | `/api/accounts/me`             | `{id, email}` or 401                |
| GET    | `/api/catalog/search?q=&page=` | 12 per page                         |
| GET    | `/api/catalog/games/:id`       | `{game, fetchedAt, stale}`          |
| GET    | `/api/catalog/discovery/:kind` | `popular` or `recent`               |
| GET    | `/api/library?status=`         | four statuses or `played`           |
| POST   | `/api/library/games/:id`       | save as want-to-play                |
| PATCH  | `/api/library/games/:id`       | `{status}`                          |
| DELETE | `/api/library/games/:id`       | 204                                 |

## Two NestJS details worth knowing

- Constructor parameters use explicit `@Inject(...)` / `@InjectRepository(...)`:
  the `tsx` runner does not emit the type metadata NestJS would otherwise use.
- TypeORM 1.x throws if a `where` value is `undefined` (so a forgotten filter
  can never match every row); add optional conditions only when present.

## Commands

- `npm run test:api` — HTTP tests against a disposable PostgreSQL.
- `npm run dev:api` — run it locally instead of `dev:api` (same port, same
  `.env`); `npm run db:migrate` (from `apps/api`) still creates the tables.

## Discovery ranking

The `popular` feed is Most rated: games ordered by IGDB user `rating_count`,
using one games request. This measures accumulated ratings, not recent Visits.
The response source is `igdb-rating-count`; older Visits caches are refreshed.
The recent feed and the 24-hour cache lifetime are unchanged.
