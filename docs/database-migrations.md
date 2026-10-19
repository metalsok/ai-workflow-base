# Database migrations

Entities define the application's mapped tables, columns, relationships, and
constraints. TypeORM generates migrations from entity changes; migrations apply
those changes to PostgreSQL. Automatic synchronization and startup migrations
are disabled. There is no separate application schema snapshot to maintain.

## Everyday model operations

Accounts live next to `accounts.module.ts`; catalog entities live next to their
service. Columns explicitly preserve the database names. For example:

```ts
const account = await accounts.findOneBy({ email: normalizedEmail });
const safeIdentity = account && { id: account.id, email: account.email };
await games.upsert({ id, metadata, fetchedAt, eligible: true }, ['id']);
await games.update({ id }, { eligible: false });
```

Keep validation and authorization in the service/controller, and return explicit
safe fields. Use object criteria and TypeORM operators for cleanup and selection.
Use `manager.getRepository(Entity)` inside explicit transactions when changes
must commit together. Request counters use SERIALIZABLE transactions with bounded
whole-transaction retries. Rejected attempts commit before HTTP 429; IP counting
commits before email counting. Keep application clocks synchronized with NTP.

Session expiry retains its historical `timestamp(6)` without timezone and JSON
format. The store reads PostgreSQL's TimeZone through an ORM metadata model.
The timestamp transformer preserves calendar text through driver parsing and
bound parameters, including Node DST gaps. Keep the database timezone unchanged.
Use the same transformer for future timestamp-without-timezone models.

## Generate, review, apply

Use Node 26 and the locked npm dependencies. Change an entity, then generate
against a migrated disposable development database:

```bash
npm run db:generate -- apps/api/src/database/migrations/DescribeTheChange
# Review the generated file, especially destructive operations and defaults.
npm run typecheck
npm run db:status
npm run db:migrate
npm run build
npm run db:migrate:built -- status
```

For each deployment: back up the database, run migrations once, then start the
new API instances. Startup validates the TypeORM ledger and refuses pending,
missing, or unknown history. Clean installations apply the baseline directly.
PostgreSQL 17 supplies `gen_random_uuid()`; extension installation stays disabled.

Run migration commands on **one designated deployment host** using the same
canonical DATABASE_URL host and schema options. The atomic OS lock rejects
concurrent invocations. Migration containers must share a host-mounted writable
`MIGRATION_LOCK_DIRECTORY`. Do not run migrations on multiple hosts. A crashed
process leaves its empty lock directory: confirm no migration process remains,
inspect status, remove only that lock directory, and retry.

The built CLI requires production dependencies and the compiled migrations under
`dist/api/database/migrations`. Package fresh `dist/api`, `dist/web`, package.json,
and locked production dependencies. Keep archived migration sources in Git.
Application containers are covered by ticket 06 and must run migrations separately
before starting API instances. Do not use unguarded migration:run/revert commands
in deployment or revert the baseline against user data: its down operations drop
tables.

## Completed local handover and retained history

The local Compose database completed the TypeORM handover on 2026-10-19. Its
actual backup was restored into disposable PostgreSQL and verified with the
previous application before cutover. Every original row was preserved, existing
signed-session and cached-game access survived two new API starts, and generation
found no schema differences. See the [local rollout record](../.scratch/game-tracker-build/verification/09-local-rollout.md).

The one-time `db:handover` command, schema inspection/snapshot, and temporary
rehearsal tools were removed after that verified rollout. The complete handover
implementation and its validation tests remain in Git at **c2cac3b**. An additional
legacy database must first use that release and its runbook to back up, restore-test,
hand over, migrate, and validate before upgrading to this release. For example,
`git show c2cac3b:docs/database-migrations.md` displays the original procedure.
The current migrator rejects an unconverted legacy database with that pointer.

Keep `apps/api/src/database/migrations/1792368000000-Baseline.ts` and the immutable
SQL files in `db/legacy-migrations/`. `SHA256SUMS` records the original file hashes.
Existing `schema_migrations` rows and their application dates remain historical
records. Clean databases have an empty legacy ledger and the TypeORM ledger.

The real pre-handover backup and private validation metadata are retained only in
the ignored owner-only `.env.backups/typeorm-cutover-20261019/` directory.
To recover, stop all writers, retain a fresh incident backup, restore the verified
pre-handover backup into a replacement database, and run the previous application
at 6910e3c with the original session secret/origin. Verify authentication and
cached catalog reads before reopening access. Restoring the old backup loses
**all later writes**; make that recovery decision explicitly. Never drop the live
tables to reverse the baseline.
