# Database migrations and the TypeORM handover

The API uses entities and injected TypeORM repositories for accounts, sessions,
limits, and catalog caches. `synchronize` and automatic migration startup remain
disabled. Migrations are the only schema writer. PostgreSQL 17 supplies
`gen_random_uuid()` without installing uuid-ossp or requesting extension rights.
Keep the database's TimeZone unchanged across cutover: the historical session
expiry is a `timestamp(6)` without timezone. The adapter reads PostgreSQL's
TimeZone through an ORM metadata model and preserves its wall-time convention,
including when Node runs in a different timezone. Normal IANA timezone names
(such as UTC and Europe/Vienna) are supported by Node's Intl database.

## Everyday model operations

Accounts live next to `accounts.module.ts`; catalog entities live next to their
service. Columns explicitly preserve the existing database names. For example:

```ts
const account = await accounts.findOneBy({ email: normalizedEmail });
const safeIdentity = account && { id: account.id, email: account.email };
await games.upsert({ id, metadata, fetchedAt, eligible: true }, ['id']);
await games.update({ id }, { eligible: false });
```

Keep normalization, authorization, and validation in the service/controller.
Return explicit safe fields; never return an Account entity containing its hash.
TypeORM's `LessThanOrEqual`, `In`, and object criteria cover cleanup and selection.
Use `manager.getRepository(Entity)` inside an explicit transaction when changes
must commit together. Counter consumption uses SERIALIZABLE transactions and
bounded whole-transaction retries for PostgreSQL serialization/deadlock errors
and the specific absent counter's primary-key conflict. Never raise 429 inside
the transaction: rejected attempts must commit. The IP transaction precedes the
email transaction. Counting failures never permit the protected request.

## Generate, review, inspect, apply

Use Node 26, the locked npm dependencies, and a migrated disposable development
database. Change the entity, then:

```bash
npm run db:generate -- apps/api/src/database/migrations/DescribeTheChange
# Read the generated file: check names, types, defaults, constraints and data loss.
npm run typecheck
npm run db:status
npm run db:migrate
npm run build
npm run db:migrate:built -- status
```

The source CLI uses tsx; the built CLI uses only production dependencies and
compiled migrations under `dist/api/database/migrations`. Package `dist/api`,
`dist/web`, `package.json`, locked production dependencies, and
`db/legacy-migrations` together, with the repository layout as the working
directory. No application Dockerfile exists yet; issue 06 must use this separate
migration step before launching API containers. Do not run the unguarded TypeORM
migration:run/revert commands in deployment. In particular, never revert the
baseline against a database containing user data: its generated down operations
drop tables.

Run **one migration process on one designated deployment host**, while API
instances are stopped for this handover. The command obtains an atomic OS lock
keyed by database host/port/name and schema connection options, without including
credentials. Concurrent invocations fail promptly. Use the same canonical
DATABASE_URL host and connection options in all commands. Containers executing
migration commands must share a host-mounted `MIGRATION_LOCK_DIRECTORY`; it must
already exist and be writable by the migration user. Do not invoke migrations
from multiple hosts. A crashed process deliberately leaves its `.lock` directory:
confirm that no migration process remains, inspect status, then remove only that
empty lock directory and retry. Ordinary API instances do not take this lock
because they only validate migration state.

## Existing database: stop, back up, hand over

A brief shutdown is required. First rehearse these steps on a disposable restored
copy. Never use the development database for destructive experiments.

1. Retain the previous application checkout and its locked dependencies. Record
   the original PostgreSQL TimeZone, SESSION_SECRET, and cookie/origin settings.
   Keep secrets and backup files in ignored, owner-only local storage.
2. Stop **all** API instances, workers, maintenance writers, and ingress. Keep
   normal users blocked until the final validation checkpoint. Read-only
   validation requests below use a controlled local instance.
3. With matching PostgreSQL client tools, take a custom-format backup to an
   owner-only directory (`umask 077`): `pg_dump --format=custom --file=before.dump`.
   Supply connection information through a protected PGSERVICEFILE/.pgpass or
   PG environment; do not put passwords in shell history or command arguments.
   Inspect with `pg_restore --list before.dump`, then restore to a separate
   disposable database and verify it can run the previous application. A listing
   alone does not verify recoverability. Record the verified backup path locally.
4. Deploy the new files while ingress remains stopped. Run `npm run db:status`,
   then `npm run db:handover`, then `npm run db:migrate` once. Handover validates
   the four archived checksums, exact legacy history, and the inspected schema
   before writing its separate ledger. It marks **only** the generated baseline;
   any later migrations remain pending until `db:migrate`. Repeating the
   handover before later schema changes is safe. Unknown/partial history or drift
   stops the command; investigate instead of editing ledgers to force success.
5. Start a controlled local API instance with the same database, origin, and
   SESSION_SECRET. Keep ingress blocked. Verify an existing signed session and
   cached catalog reads, restart and repeat. Check `db:status` has no pending
   migrations and migration generation reports no unexpected schema difference.
   Do not permit normal mutations during this checkpoint.
6. **Resume normal writes only after these checks pass and the owner accepts the
   cutover.** Start the remaining API instances and reopen ingress. Retain the
   verified pre-handover backup under the local backup policy.

Clean installations use `npm run db:migrate` directly. They create the same
schema, including an empty legacy ledger, without inventing legacy dates.
Existing `schema_migrations.applied_at` values are never rewritten.

## Recover using the verified pre-handover backup

Keep ingress blocked, stop every new API instance/writer, and restore the verified
backup into a replacement database. For example, create an empty replacement
with the PostgreSQL administration tools and run
`pg_restore --no-owner --dbname=replacement before.dump` using protected
connection settings. Point the retained previous application at that restored
database, preserving its SESSION_SECRET/origin. Verify the old session, login,
and cached catalog through HTTP before reopening ingress. Do not reverse the
baseline by dropping the live tables. Keep the failed database intact for
inspection until recovery is accepted.

Restoring the pre-handover backup loses **all writes after that backup**. Blocking
writes through cutover validation avoids that loss; after normal writes resume,
a rollback needs an explicit data-recovery decision and a fresh incident backup.

The repeatable recovery rehearsal uses only newly created disposable databases:

```bash
# Prepare an isolated checkout of the pre-TypeORM commit and run npm ci there.
TZ=Europe/Vienna npm run db:rehearse -- /absolute/path/to/previous-checkout
```

It runs the real previous application to create an account, signed session,
catalog caches, and counters; stops it; creates and inspects a backup; hands over;
checks the original cookie and caches through two new application starts; restores
the backup to another disposable database; and runs the previous application
against that restore, verifying authentication, login, and cached details.
Unset TEST_DATABASE_URL for this command. Temporary backup files and clusters are
removed afterward. No production credentials or live IGDB calls are needed.
