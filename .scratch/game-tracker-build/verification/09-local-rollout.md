# Local TypeORM rollout — 2026-10-19

The owner authorized the full local rollout and cleanup, with local commits only
and no push. No Git remote is configured. Existing unrelated drafts were retained.
NestJS guidance: nestjs-professional-software-engineering.

## Verified cutover

1. Identified and gracefully stopped the existing development API and its
   supervised frontend. PostgreSQL's Compose container remained running.
2. Created a custom-format pre-handover backup in the ignored owner-only
   `.env.backups/typeorm-cutover-20261019/` directory. Backup, private verification
   metadata, and temporary tools are excluded from source control. No credentials,
   session contents, account identity, or password hashes are recorded here.
3. Restored the actual backup into disposable PostgreSQL. Compared every original
   table with the source, then ran the previous application from commit 6910e3c
   against the restore. Its existing signed session and cached game were usable.
4. Applied the handover from implementation release c2cac3b to the real local
   database, then applied pending TypeORM migrations. Baseline1792368000000 is now
   recorded. No migrations remain pending.
5. Confirmed every original row in all seven tables was unchanged immediately
   after handover, including legacy checksums and application dates. Entity-based
   schema generation found no differences.
6. Started the new API twice in controlled validation, preserving configuration
   and session secret. The pre-upgrade session authenticated on both starts and
   cached game metadata remained unchanged. No live provider calls were needed.

The actual backup is retained locally for recovery. Restoring it later discards
writes made after the backup, so the live database must be stopped and backed up
again before any recovery decision. The source database has not been reset or
restored. Cleanup follows as a separate commit after this successful handover.

The repository's only known persistent database is the local Compose database.
Clean installations continue to apply the TypeORM baseline. Any independently
retained legacy database must use release c2cac3b for handover before upgrading
to the cleanup release; that complete implementation remains available in Git.

## Cleanup release

Removed `schema.ts`, `legacy-schema.ts`, the one-time handover command and its
metadata model, and temporary previous-server/rehearsal tools. Entities and the
TypeORM baseline remain. Archived SQL migrations are unchanged; their SHA256
checksums now live alongside them in SHA256SUMS. There is no additional schema
configuration to update for future entity changes.

Normal migration/startup history checks and deployment locking remain. A legacy
database that missed handover receives a clear pointer to c2cac3b. The archived
handover-specific tests remain at that release; current tests cover clean
installs, existing handed-over data, backup recovery, future/pending/unknown
migrations, and concurrency. A new regression failed before the cleanup and
passed afterward for the retained-release pointer.

After cleaning stale compiled output, typecheck, formatting and production build
passed. All 38 current HTTP/PostgreSQL tests passed. The built CLI reports the
real database up to date, and entity migration generation --check reports no
changes. The desktop/mobile browser suite and independent cleanup reviews are
being completed before the final restart and completion record.
