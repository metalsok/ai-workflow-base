import { mkdir, rmdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MigrationExecutor, type DataSource } from 'typeorm';

export async function migrationStatus(db: DataSource) {
  const executor = new MigrationExecutor(db);
  const executed = (await executor.getExecutedMigrations()).sort(
    (a, b) => a.id! - b.id!,
  );
  const known = [...db.migrations].sort(
    (a, b) => Number(a.name!.slice(-13)) - Number(b.name!.slice(-13)),
  );
  if (
    executed.some(
      (row, index) =>
        row.name !== known[index]?.name ||
        row.timestamp !== Number(row.name.slice(-13)),
    )
  )
    throw new Error('Unknown or incomplete TypeORM migration history.');
  return { executed, pending: await executor.getPendingMigrations() };
}
export async function assertMigrationsApplied(db: DataSource) {
  const { executed, pending } = await migrationStatus(db);
  if (!executed.length || pending.length)
    throw new Error(
      'Database migrations are pending. Run db:migrate before starting the API. Legacy databases must first use handover release c2cac3b.',
    );
}

// All deployment migration commands must run on ONE designated host, sharing
// this OS lock directory. See the rollout runbook for containers/multiple hosts.
// mkdir is atomic across processes; fail promptly instead of waiting on DDL.
export async function withMigrationLock<T>(
  db: DataSource,
  work: () => Promise<T>,
): Promise<T> {
  const url = new URL(
    String(db.options.type === 'postgres' ? db.options.url : ''),
  );
  url.username = '';
  url.password = '';
  const identity = `${url.hostname.toLowerCase()}:${url.port || '5432'}${url.pathname}?${url.searchParams.get('options') ?? ''}`;
  const lock = join(
    process.env.MIGRATION_LOCK_DIRECTORY ?? tmpdir(),
    `game-tracker-migration-${createHash('sha256').update(identity).digest('hex')}.lock`,
  );
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new Error(
        'Another migration process holds the deployment lock. See the migration runbook if a process crashed.',
      );
    throw error;
  }
  try {
    return await work();
  } finally {
    await rmdir(lock);
  }
}

export async function migrate(db: DataSource) {
  return withMigrationLock(db, async () => {
    const { executed } = await migrationStatus(db);
    const runner = db.createQueryRunner();
    try {
      if (!executed.length && (await runner.hasTable('schema_migrations'))) {
        throw new Error(
          'This legacy database requires the handover release c2cac3b before upgrading. See docs/database-migrations.md.',
        );
      }
      await db.runMigrations({ transaction: 'all' });
    } finally {
      await runner.release();
    }
  });
}
