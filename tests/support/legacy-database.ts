import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Infrastructure fixture only: application requests always use the active ORM.
export async function installLegacy(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      'CREATE TABLE schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const archive = await readFile('db/legacy-migrations/SHA256SUMS', 'utf8');
    for (const line of archive.trim().split('\n')) {
      const [checksum, name] = line.split(/\s+/);
      const sql = await readFile(`db/legacy-migrations/${name}`, 'utf8');
      assert.equal(createHash('sha256').update(sql).digest('hex'), checksum);
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name, checksum, applied_at) VALUES ($1, $2, $3)',
        [name, checksum, '2026-10-01T12:00:00Z'],
      );
    }
  } finally {
    await client.end();
  }
}
