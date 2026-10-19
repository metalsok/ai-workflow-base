import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { legacyChecksums } from '../../apps/api/src/database/migrate.js';

// Infrastructure fixture only: application requests always use the active ORM.
export async function installLegacy(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      'CREATE TABLE schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const [name, checksum] of Object.entries(legacyChecksums)) {
      await client.query(
        await readFile(`db/legacy-migrations/${name}`, 'utf8'),
      );
      await client.query(
        'INSERT INTO schema_migrations (name, checksum, applied_at) VALUES ($1, $2, $3)',
        [name, checksum, '2026-10-01T12:00:00Z'],
      );
    }
  } finally {
    await client.end();
  }
}
