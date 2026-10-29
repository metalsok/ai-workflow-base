# 01 — Skeleton, health and accounts

Status: ready-for-agent
Type: task

## What

Create `apps/api-java` (Maven Wrapper, Spring Boot 4, Java 25), Flyway
migrations for accounts and Spring Session tables, the Spring Security
configuration, `GET /api/health`, and register, login, logout and `me`.
Add `run.sh` and the README reading guide.

## Acceptance criteria

- Ports of `tests/api2/accounts.http.test.ts` and `health.http.test.ts` pass,
  adjusted for CSRF tokens instead of the Origin check.
- Email is trimmed and lower-cased; password 12–128 characters; duplicates 409;
  wrong or unknown credentials 401 `Email or password is incorrect.`
- Sign-in rotates the session id; logout clears the cookie; sessions survive a
  restart and expire after the configured timeout.
- Every `/api` response has `Cache-Control: no-store`.
- `./mvnw verify` passes.

## Comments

2026-10-29 — Implemented; `./mvnw verify` passes (18 tests). Checked against
the real `game_tracker_java` database on port 3001 with curl. Found and fixed:
logout removed the CSRF token, so signing in again straight away got 403; logout
now issues a fresh token (test `signingInAgainRightAfterLogoutWorks`). Pending:
manual check with the Angular app, and owner review.

2026-10-29 — Restructured from hexagonal to standard controller/service/
repository packages at the owner's request; ArchUnit removed. `./mvnw verify`
passes (14 tests).
