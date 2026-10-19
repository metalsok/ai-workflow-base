import { createDataSource } from './data-source.js';
import { migrate, migrationStatus } from './migrate.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const command = process.argv[2] ?? 'apply';
if (!['apply', 'handover', 'status'].includes(command))
  throw new Error('Use apply, handover, or status');
const database = await createDataSource(process.env.DATABASE_URL).initialize();
try {
  if (command === 'status') {
    const status = await migrationStatus(database);
    for (const migration of status.executed)
      console.log(`[applied] ${migration.name}`);
    for (const migration of status.pending)
      console.log(`[pending] ${migration.name}`);
  } else {
    await migrate(database, command === 'handover');
    console.log(
      command === 'handover'
        ? 'Baseline handover complete. Run db:migrate next.'
        : 'Database migrations are up to date.',
    );
  }
} finally {
  await database.destroy();
}
