# 09: Move all application database access to TypeORM

Type: implementation
Status: done
Progress: Complete; owner accepted the verified local rollout and cleanup
Blocked by: None (08 accepted and complete)
Priority: Before 03
Parent: [First private release](../spec.md)
Decision: [Use TypeORM](../../../docs/adr/0001-typeorm-database-access.md)

## Outcome

Replace direct pg application access with readable TypeORM model operations for
accounts, sessions, catalog caching, limits, cleanup, and maintenance commands.
The owner requires all application database access through the ORM, without
handwritten SQL exceptions, because backend readability is a primary concern.
Preserve all existing data and public behavior; do not start the personal library.

## Implementation boundaries

Read AGENTS.md, docs/agents/framework-skills.md, the installed NestJS skill,
docs/development.md, and the decision above before implementation. Inspect current
versions and local changes. TypeORM 1.1.2 and @nestjs/typeorm 12.0.2 have compatible
declared ranges; verify published packages and actual TypeScript 6/ESM compilation
before committing the lockfile. Keep pg as the ORM driver; remove direct Pool
injection/access and connect-pg-simple plus its unused types.

Use conventional entities, injected repositories, object-based criteria, and
explicit transaction boundaries. Do not introduce generic data-access wrappers,
raw query calls, SQL strings in query builders, or raw expressions to disguise
handwritten SQL. Generated migration SQL and archived historical migrations are
allowed. Test provisioning/historical fixtures may retain infrastructure SQL,
but application behavior must exercise the new ORM access path.

## Schema and migration handover

1. Map the existing schema exactly, including table/column names, types,
   constraints, indexes, defaults, and cascade behavior. Preserve account UUID
   generation via gen_random_uuid(), session json and timestamp(6), catalog bigint
   identifiers/JSONB, and all timezone semantics. Do not introduce uuid-ossp or
   extension privileges simply because of ORM defaults. Check public numeric Game
   IDs remain numeric rather than leaking driver bigint strings into responses.
2. Archive migrations 001–004 unchanged with expected SHA256 checksums. Preserve
   all existing schema_migrations rows, including applied_at, as legacy history.
   Remove the old SQL executor from application startup and the migration command.
3. Generate and review one TypeORM baseline matching the current schema. For an
   empty database it creates the schema; for the existing database a handover
   command validates exact legacy history/checksums and schema through ORM/schema
   APIs, then marks only that baseline applied without replaying its DDL. Keep
   the new TypeORM ledger distinct. Never fake-mark other pending migrations or
   invent historical application dates on clean installations.
4. Reject partial/unknown migration history and schema drift before changing the
   existing database. Repeating a completed handover must be safe. Keep automatic
   synchronization disabled everywhere; migrations own schema changes.
5. Provide documented commands to generate/review/apply migrations, inspect status,
   and perform the existing-database handover. Use a single migration process
   before starting API instances; ordinary API startup must detect pending or
   incomplete migration state and fail clearly rather than modifying the schema.
   Update dev, test, build/container, and deployment entry points accordingly.
   Serialize deployment migration execution or reject a concurrent invocation.

## Accounts and sessions

Keep email normalization, password hashing/verification, safe account responses,
registration conflicts, Origin protection, cookie policy, and authorization intact.
Replace connect-pg-simple with a small ORM-backed express-session Store mapped to
the existing sessions table. Preserve signed session IDs and secret, stored JSON,
expiry precision/rounding, seven-day absolute lifetime, regeneration, save,
logout/revocation, and no sliding extension. Reads must ignore expired sessions;
cleanup must use ORM operations. Close adapter resources and the ORM connection
cleanly. Do not log credentials, password hashes, cookies, or session contents.

## Counters and cache

- Implement limit consumption using ORM SERIALIZABLE transactions or an equally
  safe ORM-only mechanism. Read/create/reset/increment/save explicitly. Handle
  absent-row creation races; a row lock on a nonexistent row alone is insufficient.
  Bound whole-transaction retries for serialization/deadlock errors and the
  specific counter-key initialization conflict; do not retry unrelated failures.
  Never allow a request through when safe counting fails.
- Commit counter changes before raising HTTP 429 so rejected attempts remain
  counted. Preserve IP-first then email authentication accounting: email rejection
  must not roll back the IP increment. Keep current maximums, windows, reset
  boundaries, cleanup semantics, and Retry-After response rules.
- Use an injectable backend clock for limit-window arithmetic. Moving login
  timing from PostgreSQL to the synchronized application clock is owner-approved;
  use deterministic tests and document the clock requirement.
- Read/write complete cached JSON payloads through ORM operations, retaining
  freshness, eligibility, provider failure fallback, and fetched timestamps.
  Keep search cache bounded to 500 entries with ORM selection and deletion;
  verify pruning behavior under concurrent writes. Keep IGDB transport unchanged.

## Recovery and rollout

A brief shutdown is approved. Rehearse on a disposable copy first: stop application
writes, create and verify a pre-handover database backup, apply the handover and
pending migrations once, start the new application, and verify account/session
continuity and catalog behavior. Keep secrets and data in ignored local storage.
Never use the real development database for destructive migration experiments.

Document and exercise recovery on a disposable database: stop the new application,
restore the pre-handover backup, and run the previous application version against
it. Do not reverse the baseline by dropping live tables. Prevent writes during
cutover validation; explain that restoring the backup loses any later writes.
Document the checkpoint at which normal writes can resume.

## Acceptance criteria

- [x] Compatible released packages are locked; Node 26/TypeScript 6 ESM application
      build and migration CLI work without an unrelated framework upgrade.
- [x] Every application database operation uses TypeORM; direct pg access and the
      SQL-backed session adapter are removed. No raw application SQL fragments
      remain; generated migrations and historical/infrastructure SQL are distinct.
- [x] All existing tables and account/hash/session/cache/limit data survive a
      populated upgrade. Old migration files/checksums/history are unchanged.
- [x] Clean install, populated upgrade, repeated handover, schema drift, partial
      or unknown history, checksum mismatch, pending migrations, and concurrent
      migration attempts have verified outcomes. Generation after handover finds
      no unexpected schema diff. Recovery is tested on a disposable database.
- [x] A pre-upgrade signed session still authenticates after upgrade and restart;
      expiry, logout, revocation, and account security contracts remain intact.
- [x] HTTP/PostgreSQL checks exercise simultaneous requests through two application
      instances sharing one database, including absent/expired counters, boundary
      resets, rejected-attempt accounting, and retry handling without lost counts.
- [x] HTTP/PostgreSQL checks preserve account conflicts, cache upserts/freshness,
      pruning, stale fallback, eligibility, numeric Game IDs, and safe failures.
- [x] Existing desktop/mobile browser journeys pass with persistent sessions and
      catalog behavior unchanged. No live IGDB credentials are required; live
      provider validation remains opt-in.
- [x] Development, test, migration, container, backup/restore, and deployment
      instructions match the new workflow. Readable entity/model examples explain
      everyday reads/writes and migration generation for the owner.
- [x] Run npm run typecheck, npm run format:check, npm run build, and npm test with
      disposable PostgreSQL and permitted loopback binding. Record results and
      obtain owner review before marking implementation done.

## Comments

### Approved — 2026-10-19

The owner selected TypeORM, generated/reviewed migrations, all-ORM application
access without specialized SQL exceptions, preservation of existing data/history,
application-clock limit timing, and a brief shutdown with backup/tested recovery.
Ticket 08 records the discussion and accepted decision. This ticket implements it
before ticket 03; it does not authorize building Library features.

### Implementation — 2026-10-19

Implemented the TypeORM entities/repositories, session store, transactional
counters, cache operations, generated baseline, validated handover, migration
commands, and recovery runbook. No real development database was altered.

Verification: Node 26.12.0/TypeScript 6.0.3; typecheck, format:check, build,
43 HTTP/PostgreSQL tests and four desktop/mobile browser journeys passed.
Source and built migration CLIs passed on disposable PostgreSQL; schema
generation found no diff. Recovery with previous commit 6910e3c passed, including
its original signed session, new-app restarts, real pg_dump/pg_restore, and login
on the old application after restoration. The rehearsal also used a non-UTC
application timezone. Live IGDB checks remain opt-in.

See [the implementation record](../verification/09-typeorm.md) and
[the migration runbook](../../../docs/database-migrations.md). The last acceptance
item remains unchecked because owner review is pending; no acceptance is inferred.

### Code review — 2026-10-19

Independent Standards review reported no findings. Spec review identified a DST
gap bug in the session timestamp mapping. Added a failing HTTP regression and
fixed it with a lossless ORM timestamp transformer/driver parser. Both reviewers
confirmed the fix and reported no remaining findings. The updated full suite
contains 43 HTTP/PostgreSQL tests and the same four browser journeys.

### Local rollout and cleanup — 2026-10-19

The owner requested execution of the full rollout and removal of the temporary
handover tooling, with local commits only. The real backup was restored and
verified using the previous app before migration. The real local database now
has its TypeORM baseline applied; every original row was unchanged immediately
after handover, generation found no diff, and its original session and cached
game survived two API starts. The development app was restarted successfully.

The one-time handover command and schema inspection/snapshot are retired after
that successful cutover. Entities and versioned migrations remain; immutable SQL
history and checksums are retained. Additional legacy copies must use the full
handover release c2cac3b first. See the [local rollout record](../verification/09-local-rollout.md).

### Cleanup verification — 2026-10-19

Cleanup release cbdfc49 passed typecheck, formatting, production build, 38 current
HTTP/PostgreSQL tests and four desktop/mobile browser journeys. Both independent
review axes reported no remaining material findings. The final restarted app at
http://127.0.0.1:4200 still authenticates the original pre-upgrade session. The real
database has zero pending migrations and no entity/schema difference. The verified
pre-handover backup remains in ignored owner-only storage. No changes were pushed.

### Owner acceptance — 2026-10-19

After the verified local rollout, cleanup, restart, and completion report, the
owner responded: “wonderful so we are ready for our next ticket?” This records
acceptance of ticket 09. All acceptance criteria are complete, and ticket 03's
TypeORM dependency is satisfied.
