# api-java: the game tracker API in idiomatic Java

Status: ready-for-agent

## Problem Statement

The game tracker backend exists only as NestJS (`apps/api`). The owner, a
frontend engineer learning backend development, wants to see how a senior Java
developer would build the same API, and to be able to run either backend
behind the same Angular app.

## Solution

Build `apps/api-java/`: a standalone Spring Boot application with the same
HTTP contract as `apps/api`, written the Java way. It is not a drop-in twin:
it has its own database, its own sessions and its own CSRF protection. Only
one backend runs at a time; both listen on port 3000 so the Angular dev proxy
works unchanged.

## Agreed decisions (2026-10-29)

- **Purpose.** A learning port the owner may run instead of the Node API. It
  is not wired into root `package.json` scripts, Docker or the browser journey.
- **Toolchain.** Java 25 LTS (Homebrew `openjdk@25`), latest stable Spring Boot
  4.x, Maven with the Maven Wrapper (`./mvnw`). Versions pinned in `pom.xml`.
- **Contract with Angular.** Same URLs, JSON shapes and status codes as
  `apps/api` (see `apps/api/README.md`). Errors are Spring `ProblemDetail`
  (RFC 9457) with an extra `message` property, which Angular displays
  (`apps/web/src/http-error.ts`). Not signed in is `401`.
- **Architecture.** Standard Spring layering, one package per feature with one
  class per role: `*Controller`, `*Service`, `*Repository` (Spring Data JPA),
  entity, and `*Request`/`*Response` records; `shared/` for security and error
  handling. Hexagonal was built first and dropped on 2026-10-29 as too complex
  for the owner to learn from; ArchUnit went with it.
- **Code style.** Records for DTOs, no Lombok, constructor injection only,
  Bean Validation for request input.
- **Database.** Its own database `game_tracker_java` in the existing Postgres
  container. Flyway owns the schema with plain SQL migrations; Hibernate runs
  with `ddl-auto=validate` and never changes tables. Spring Data JPA for access.
- **Security.** Spring Security: `Argon2PasswordEncoder`, access rules in one
  `SecurityFilterChain`, security headers, and CSRF tokens through the
  `XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header that Angular's HttpClient sends by
  default. No Origin-header check.
- **Sessions.** Spring Session JDBC (tables created by Flyway), 7-day timeout.
  No `session_version` column; revoking all of a user's sessions uses Spring
  Session's per-user lookup when a password reset is added.
- **IGDB.** An `IgdbClient` interface with a Spring `RestClient` implementation,
  so tests can swap in a fake. Cached games and
  feeds live in database tables, so `fetchedAt` and `stale`
  keep working.
- **Configuration.** Same environment variable names as Node: `DATABASE_URL`,
  `SESSION_SECRET`, `APP_ORIGIN`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`,
  `PORT` (default 3000). `apps/api-java/run.sh` loads the root `.env` and points
  `DATABASE_URL` at `game_tracker_java`.
- **Tests.** JUnit 5, Spring Boot Test and Testcontainers (disposable
  PostgreSQL in Docker), porting the cases from `tests/api2/*.http.test.ts`.
  IGDB is replaced by a fake client. Plus one manual check with the Angular app.
- **Scope.** Parity with the current `apps/api`: all 12 endpoints, IGDB
  catalog, discovery feeds with database caching. Out of scope: password-reset
  command, rate limits, deployment.
- **Docs.** `apps/api-java/README.md` is a reading guide like `apps/api/README.md`.

## Delivery

Built in three vertical slices, each stopping for the owner's review:

1. `issues/01-skeleton-and-accounts.md`
2. `issues/02-library.md`
3. `issues/03-catalog.md`
