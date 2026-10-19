# 03: Save games and manage a private library

Status: done
Blocked by: [09 — TypeORM migration](09-typeorm-migration.md) (08 decision accepted; 02 and 07 complete)
Parent: [First private release](../spec.md)

## What to build

Complete the TypeORM migration in ticket 09 first. Use TypeORM entities and
relationships for Library persistence, following the
[database access decision](../../../docs/adr/0001-typeorm-database-access.md).

A tester adds a game to Want to play, changes its Play status, browses My Library
and its filters, and removes a game. The library remains private and persists
across devices, sign-ins, and application restarts.

## Acceptance criteria

- [x] Adding from search or details creates one entry per user and Game; repeated additions do not duplicate it.
- [x] The four Play statuses and the combined Played view match the glossary.
- [x] My Library supports status filtering, status changes, removal, and intentional empty states on desktop and mobile.
- [x] The backend enforces ownership for every library read and mutation, independently of Angular navigation.
- [x] PostgreSQL-backed HTTP checks cover two users, identifier tampering, duplicates, transitions, filtering, removal, and persisted results.
- [x] Saved-game rendering remains usable from stored metadata during an IGDB outage.
- [x] The browser journey covers save, status change, Played, removal, and signing in again.


## Comments

### Implementation and verification — 2026-10-19

Implemented saving from search/details, account-scoped Library reads and
mutations, all four Play statuses, Played, status changes, removal, and responsive
loading/error/empty states. Persistence uses TypeORM entities/relationships and
a generated additive migration. Repeated additions preserve the existing status.
Saved cards use stored Catalog metadata, including during provider outages.

Verification passed: `npm run typecheck`, `npm run format:check`, `npm run build`,
and `npm test` (45 HTTP/PostgreSQL tests and six desktop/mobile browser journeys).
Clean/populated migration checks, no schema drift, and rollback/reapplication
with preserved accounts/sessions were verified on disposable PostgreSQL.
Both independent code-review axes reported no remaining findings after fixing
the migration rollback ordering. Angular and NestJS framework skills were loaded.

See [the implementation record](../verification/03-personal-library.md).
No changes were pushed or deployed, and the real development database was not
changed. Run `npm run db:migrate`, then restart the API before using the new UI.

All technical acceptance criteria are verified. Owner review/acceptance remains
pending; retain `Status: ready-for-agent` until accepted, per tracker policy.


### Owner acceptance — 2026-10-19

The owner approved the implementation, requested consistent Angular component
organization and `@Service()` decorators, then accepted those follow-up changes:
“looks good! lets proceed all green from my side”. Ticket 03 is complete.
The follow-up passed typecheck, formatting, build, 45 HTTP/PostgreSQL checks and
six desktop/mobile browser journeys. No changes were pushed or deployed.
