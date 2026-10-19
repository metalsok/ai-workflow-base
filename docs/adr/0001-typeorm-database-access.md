# Use TypeORM for all application database access

Accepted by the owner on 2026-10-19 in [decision ticket 08](../../.scratch/game-tracker-build/issues/08-database-access-decision.md).
Use TypeORM models and repositories throughout the backend because the owner has
limited backend knowledge and prioritizes readable TypeScript over handwritten
SQL. This is an agreed target, implemented separately by [ticket 09](../../.scratch/game-tracker-build/issues/09-typeorm-migration.md)
before the personal library in ticket 03; the current application still uses pg.

## Scope and conventions

- Cover accounts, persistent sessions, authentication and catalog request limits,
  cached games/searches, cleanup, database lifecycle, and maintenance commands.
  Future Library relationships use the same approach.
- Use standard TypeORM entities, injected repositories, object criteria, and
  explicit transactions. Keep models near their NestJS modules and operations
  named for their purpose. Avoid speculative wrappers and hidden database work.
- No handwritten application SQL, raw-query escape hatches, SQL fragments in
  query builders, or exceptions for specialized operations. Retain pg only as
  TypeORM's PostgreSQL driver, not an application access API.
- ORM-generated SQL inside reviewed migration files is allowed. Existing SQL
  migrations remain immutable historical records, not the active executor.
  Test database provisioning and historical upgrade fixtures are infrastructure;
  they must not become an alternative application data-access path.
- Prefer compile-time checking of model properties and query inputs. This does
  not replace input validation, constraints, or PostgreSQL-backed behavior tests.

## Migration and behavior

TypeORM owns future schema migrations: change entities, generate a migration,
review it, then explicitly apply it. Keep automatic schema synchronization off.
Preserve existing tables, records, password hashes, active sessions, migration
files/checksums/history, and public HTTP contracts. Validate the existing schema
before marking the initial TypeORM migration applied without replaying its DDL;
the same initial migration must create a clean database. Unexpected drift must
stop the handover rather than trigger automatic schema changes.

Replace connect-pg-simple with an ORM-backed express-session Store while retaining
the existing session format, cookies, expiry, rotation, and revocation. Its SQL
implementation is incompatible with the owner's final all-ORM requirement.

Implement conditional request-limit updates as explicit ORM transactions with
safe concurrency handling. Several ORM operations and bounded transaction retries
are an accepted tradeoff for readability at private-test scale. Login limits may
use the synchronized backend clock, matching the catalog's existing clock source;
the limit values, windows, counting of rejected attempts, and Retry-After behavior
remain the same. A brief shutdown, backup, and tested recovery are accepted for
the handover. Do not require parallel old/new application deployments.

## Alternatives and tradeoffs

- **Direct pg:** smallest change and precise SQL control, but retains the SQL
  volume that motivated this decision. Rejected by the owner.
- **Drizzle / Kysely:** typed, SQL-oriented access would improve checking, but
  fits the owner's requested model-and-relationship style less closely. Drizzle
  can retain external migrations; that lower-disruption option does not outweigh
  the readability preference. [Drizzle migration workflows](https://orm.drizzle.team/docs/migrations),
  [Kysely overview](https://www.kysely.dev/).
- **Prisma:** generated model client is a credible style match. Its v7 documented
  Node support lists 20/22/24 rather than this project's Node 26, so it was not the
  cleanest supported fit. [Prisma v7 requirements](https://www.prisma.io/docs/orm/v7/reference/system-requirements).
- **MikroORM:** also supplies models and relationships, with identity-map,
  change-tracking, and flush concepts. Prefer TypeORM's explicit repository
  operations for this owner's learning needs. [MikroORM Unit of Work](https://mikro-orm.io/docs/unit-of-work).
- **TypeORM:** meets the selected style and has documented Nest integration,
  relationships, transaction isolation, and migration generation. It introduces
  entity mappings, migration handover work, a session adapter, and more steps for
  conditional counters. [Nest integration](https://docs.nestjs.com/data/typeorm),
  [transactions](https://typeorm.io/docs/transactions/),
  [migration generation](https://typeorm.io/docs/migrations/generating/).

## Compatibility evidence

Inspected project: Node 26.12.0, NestJS 12.1.3, TypeScript 6.0.3, pg 8.23.1,
PostgreSQL 17, connect-pg-simple 10.0.0, ESM/NodeNext, and legacy decorator metadata.
Representative existing operations are account lookup/registration, conditional
atomic counters, JSONB cache upserts, ordered cache pruning, and persistent
sessions. Existing migrations 001–004 use a checksum ledger and transaction lock.

The tagged [TypeORM 1.1.2 manifest](https://raw.githubusercontent.com/typeorm/typeorm/1.1.2/packages/typeorm/package.json)
allows Node >=24.11 and pg ^8.5.1. The tagged
[@nestjs/typeorm 12.0.2 manifest](https://raw.githubusercontent.com/nestjs/typeorm/12.0.2/package.json)
includes NestJS 12 and TypeORM 1 in its peer ranges. These are compatible release
candidates for implementation, not packages installed or tested by this decision.
Confirm registry availability, pin resolved versions in the lockfile, and verify
TypeScript 6 compilation, CLI execution, and real PostgreSQL behavior in ticket 09.
No framework upgrade or additional database service is required by this plan.

Use the documented [Express session Store contract](https://expressjs.com/en/resources/middleware/session/#session-store-implementation).
Transaction retries must cover the whole failed transaction, including concurrent
creation of a previously absent counter; see
[PostgreSQL 17 serialization failure handling](https://www.postgresql.org/docs/17/mvcc-serialization-failure-handling.html).
