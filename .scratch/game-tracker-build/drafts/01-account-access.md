# 01: Create an account and sign in

Status: draft
Blocked by: None
Parent: [First private release](../spec.md)

## What to build

A tester can start the local app, register, sign in, see an authenticated Angular
screen, and sign out. This is the first complete Angular–NestJS–PostgreSQL slice,
with runnable project tooling and the selected visual foundation.

## Acceptance criteria

- [ ] Angular and NestJS run from the same repository with compatible supported versions, static checks, formatting, and build commands.
- [ ] Registration and login operate on PostgreSQL-backed accounts with password hashes and persisted sessions.
- [ ] Cookies, request protection, session expiry/revocation, and bounded sign-in attempts support the agreed authentication model.
- [ ] Invalid input, duplicate registration, failed login, authenticated identity, and logout are covered through HTTP behavior checks.
- [ ] The responsive app shell has the selected purple design, Discover and My Library navigation, and functional account forms.
- [ ] A basic browser check demonstrates registration, sign-in, identity, and logout.
- [ ] A local PostgreSQL container and repeatable schema migrations support development and tests.
