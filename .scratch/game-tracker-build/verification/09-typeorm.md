# Ticket 09 implementation record

Date: 2026-10-19. Starting commit: 6910e3c on main.

## Project profile and decisions

Node 26.12.0, TypeScript 6.0.3, ESM/NodeNext, NestJS 12.1.3, Express,
PostgreSQL 17 and pg 8.23.1. Kept the existing dynamic Nest modules, explicit
injection, HTTP contracts, validation, Passport, hashing and module-local models.
Loaded implement, tdd, code-review and nestjs-professional-software-engineering; the framework
skill supplies guidance while implement owns delivery and tdd owns test seams.
No Angular implementation changed, so the Angular skill was not needed.

Pinned released TypeORM 1.1.2 and @nestjs/typeorm 12.0.2, checked installed
manifests/types and the official Nest database, TypeORM migration and Express
Store documentation. No framework upgrade. Explicit injected repositories and
object criteria were selected over additional data-access wrappers. Transactions
show reads, resets, increments, saves, commit boundaries and bounded retries.
The only application SQL is the ORM-generated baseline migration. The four
historical SQL files moved unchanged to db/legacy-migrations with SHA256 values
pinned in the handover command; the original ledger remains untouched.

The startup regression initially failed because the old app migrated at startup.
The new API refuses pending/incomplete history and has no schema-writing startup
path. Existing HTTP behavior tests were retained during the persistence refactor.
New vertical checks cover handover/recovery and two-instance concurrency at the
agreed HTTP/PostgreSQL boundary. Historical SQL and fault injection are confined
to disposable test infrastructure. Existing browser journeys remain the browser
seam. No library implementation or live provider validation was added.

## Executed verification

- `npm run typecheck`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed (Node 26/TypeScript 6 ESM API and Angular bundle).
- `npm test`: passed, 43 HTTP/PostgreSQL tests and 4 desktop/mobile browser tests.
- Source CLI status/apply and built CLI status/apply: passed against disposable
  PostgreSQL. TypeORM migration:generate --check reports no schema difference.
- Populated handover, repeated handover, exact schema/history preservation,
  partial/unknown/checksum/drift rejection, pending/unknown ORM ledger rejection,
  later migration application and concurrent command rejection: passed.
- Two API instances against one database: duplicate registration, absent and
  expired counters, exact reset boundaries, rejected-attempt/IP-first accounting,
  whole-transaction serialization retries, unrelated conflict fail-closed, and
  concurrent pruning to the newest 500 searches: passed.
- Actual previous application at 6910e3c installed in an isolated /tmp checkout:
  `TZ=Europe/Vienna npm run db:rehearse -- /tmp/game-tracker-ticket09-previous`
  passed. Its original signed cookie and cached catalog survive handover and two
  new API starts. pg_dump backup was inspected and restored to a second disposable
  database; the previous app authenticates the original cookie and logs in again.
- Historical checksums match the original files. Application operations have no direct pg
  queries, raw query-builder expressions or SQL session adapter. The pg import
  is confined to configuring TypeORM driver timestamp parsing.

PostgreSQL's TypeORM schema inspection emits a pg deprecation notice about
concurrent queries on one client; checks still pass. No real development database,
credentials, container deployment or live IGDB endpoint was used. Application
containers are scheduled for ticket 06; their required separate migration step
and shared deployment-host lock directory are documented now.

## Standards

No findings. The followup timestamp adapter remains ORM driver configuration and
bound parameter transformation, consistent with ADR-0001.

## Spec

One DST preservation issue found and fixed. Both independent reviewers re-reviewed the fix and reported no
remaining findings. The HTTP regression failed against the original mapping
(401 instead of 200), then passed with lossless timestamp parameter binding;
it covers access, scheduled cleanup, and expiry with process Europe/Vienna and
PostgreSQL explicitly UTC. Full checks were rerun after the fix.

Review summary: Standards 0 findings; Spec 1 resolved finding, 0 remaining.

## Rollout state

Implementation is ready for owner review. Owner acceptance has not been recorded,
and ticket 09 is not marked done.
The actual database handover remains a deliberate deployment action under the
runbook: stop writers, verify a backup on a restored copy, hand over and migrate
once, validate the old cookie/cache with ingress blocked, then resume writes only
after owner acceptance. A later restore loses all writes after the backup.
