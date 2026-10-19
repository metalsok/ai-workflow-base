import { readFile, mkdir, rmdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MigrationExecutor, DataSource } from 'typeorm';
import { databaseOptions } from './data-source.js';
import { LegacyMigration } from './history.entity.js';
import { inspectSchema, currentSchemaTables } from './schema.js';
import { legacySchema } from './legacy-schema.js';

export const legacyChecksums: Record<string, string> = {
  '001-accounts.sql':
    '109de8bdf1345d0d009ca263d8c0193f29a6a48ce9cba00a92645b714664ca98',
  '002-authentication-attempts.sql':
    'b1d7c4aa0eed2cc122ca6ff70033b6ea890a572a79f63c83a90a6e667fc76953',
  '003-catalog.sql':
    '9fb538f190875f3f20870bc4ff0c0e17ec04246cc191927652e9cfad9b11e5bf',
  '004-catalog-request-limits.sql':
    '3d7cd9c199df2620eaba4f000ae40c6fd61fa1256de665e39f558591c459c671',
};
const baselineName = 'Baseline1792368000000';

async function validateArchive() {
  for (const [name, checksum] of Object.entries(legacyChecksums)) {
    const bytes = await readFile(
      join(process.cwd(), 'db/legacy-migrations', name),
    );
    if (createHash('sha256').update(bytes).digest('hex') !== checksum)
      throw new Error(`Historical migration checksum mismatch: ${name}`);
  }
}
async function validateLegacy(db: DataSource, requireHistory: boolean) {
  const history = await db
    .getRepository(LegacyMigration)
    .find({ order: { name: 'ASC' } });
  if (!requireHistory && history.length === 0) return;
  if (
    history.length !== 4 ||
    history.some((row) => legacyChecksums[row.name] !== row.checksum)
  )
    throw new Error(
      'Legacy migration history is partial, unknown, or has a checksum mismatch.',
    );
}
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
      'Database migrations are pending. Run db:migrate, or db:handover for a legacy database, before starting the API.',
    );
  await validateLegacy(db, false);
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

export async function migrate(db: DataSource, handover = false) {
  return withMigrationLock(db, async () => {
    await validateArchive();
    const status = await migrationStatus(db);
    const runner = db.createQueryRunner();
    try {
      const tables = await currentSchemaTables(runner);
      const applicationTables = tables.filter(
        (t) => t.name.split('.').at(-1) !== 'typeorm_migrations',
      );
      if (handover) {
        await validateLegacy(db, true);
        if (
          JSON.stringify(await inspectSchema(runner)) !==
          JSON.stringify(legacySchema)
        )
          throw new Error(
            'Legacy schema drift detected; no handover changes were applied.',
          );
        if (status.executed.length) {
          if (status.executed[0].name !== baselineName)
            throw new Error('Baseline is missing.');
          return; // Idempotent; never fake-mark any later pending migration.
        }
        const baseline = db.migrations.find((m) => m.name === baselineName);
        if (!baseline)
          throw new Error('TypeORM baseline migration is missing.');
        const baselineOnly = await new DataSource({
          ...databaseOptions(
            String(db.options.type === 'postgres' ? db.options.url : ''),
          ),
          migrations: [baseline.constructor],
        }).initialize();
        try {
          await baselineOnly.runMigrations({ fake: true, transaction: 'all' });
        } finally {
          await baselineOnly.destroy();
        }
        return;
      }
      if (!status.executed.length && applicationTables.length)
        throw new Error(
          'Existing schema requires db:handover before db:migrate.',
        );
      if (status.executed.length) await validateLegacy(db, false);
      await db.runMigrations({ transaction: 'all' });
    } finally {
      await runner.release();
    }
  });
}
