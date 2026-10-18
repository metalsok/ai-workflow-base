# 01: Create an account and sign in

Status: ready-for-human
Blocked by: Docker-capable host verification of Compose startup and database volume persistence
Parent: [First private release](../spec.md)

## What to build

A tester can start the local app, register, sign in, see an authenticated Angular
screen, and sign out. This is the first complete Angular–NestJS–PostgreSQL slice,
with runnable project tooling and the selected visual foundation.

## Acceptance criteria

- [x] Angular and NestJS run from the same repository with compatible supported versions, static checks, formatting, and build commands.
- [x] Registration and login operate on PostgreSQL-backed accounts with password hashes and persisted sessions.
- [x] Cookies, request protection, session expiry/revocation, and bounded sign-in attempts support the agreed authentication model.
- [x] Invalid input, duplicate registration, failed login, authenticated identity, and logout are covered through HTTP behavior checks.
- [x] The responsive app shell has the selected purple design, Discover and My Library navigation, and functional account forms.
- [x] A basic browser check demonstrates registration, sign-in, identity, and logout.
- [ ] A local PostgreSQL container and repeatable schema migrations support development and tests.

## Comments

### Implementation — 2026-10-18

Implemented the account-access slice in `apps/api` and `apps/web`, using
Angular 22.2, NestJS 12.1, TypeScript 6.0, and PostgreSQL 17. Accounts use Passport
Local, Argon2id hashes, PostgreSQL-backed Express sessions, fixed seven-day
expiry, rotation on sign-in, logout revocation, explicit cookie flags, strict
request-origin checks, and persisted per-address/per-email attempt limits.
The responsive purple shell includes functional account forms and navigation.
Catalog feeds, library operations, administrator recovery, and the full container
deployment remain in their existing later tickets.

TDD used the pre-agreed seams: real HTTP requests to NestJS backed by disposable
real PostgreSQL, then a browser journey. Registration initially failed with 404;
validation with 500 instead of 400; duplicates with 500 instead of 409; login
and logout with missing endpoints; foreign origins incorrectly succeeded;
expired cookies still authenticated; excess attempts were not bounded; HTTPS
cookies were missing until explicit loopback-proxy trust was configured. Each
slice passed before proceeding. Browser checks started against a minimal Angular
screen, then passed registration, identity, navigation, reload, logout, failed
login feedback, and sign-in again on desktop and mobile. Browser investigation
also corrected navigation synchronization and CSP-blocked stylesheet loading.

Verification: `npm run format:check`, `npm run typecheck`, `npm run build`,
`npm test` (10 HTTP tests and 2 browser journeys), `git diff --cached --check`,
and Compose configuration validation with a disposable placeholder password.
Migrations were applied repeatedly across application restarts in the API tests.
A smoke check of the compiled `dist/api/main.js` verified same-origin registration,
Angular deep links, API 404 responses, and absence of browser/CSP errors. Desktop
and mobile previews were visually inspected. The setup script was smoke-checked
for preservation of existing settings, secret generation, owner-only file permissions,
and idempotence.

### Standards review

No hard repository-standard violations. One duplicated-session-creation finding
was resolved by sharing a private controller helper between registration/login.

### Spec review

No implementation findings or scope creep. One acceptance-verification limit:
the Docker socket is inaccessible in this session, including elevated execution.
Compose configuration and migrations are supplied, and real PostgreSQL tests
pass, but actual container startup and volume persistence have not been exercised.
The final criterion remains unchecked and the ticket is ready for human verification.
See [development instructions](../../../docs/development.md) for startup/checks.
