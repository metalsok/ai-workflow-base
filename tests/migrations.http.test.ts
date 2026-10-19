import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres } from './support/postgres.js';

test('API startup refuses an unmigrated database without creating application tables', async () => {
  const postgres = await startPostgres();
  try {
    await assert.rejects(
      (async () => {
        const app = await createApp({
          databaseUrl: postgres.url,
          origin: 'http://127.0.0.1:4200',
          sessionSecret: 'disposable-migration-test-secret-at-least-32',
        });
        await app.close();
      })(),
      /migration|handover/i,
    );
  } finally {
    await postgres.stop();
  }
});

import { createDataSource } from '../apps/api/src/database/data-source.js';
import {
  migrate,
  migrationStatus,
  withMigrationLock,
} from '../apps/api/src/database/migrate.js';
import { inspectSchema } from '../apps/api/src/database/schema.js';
import { legacySchema } from '../apps/api/src/database/legacy-schema.js';
import {
  LegacyMigration,
  AppliedMigration,
} from '../apps/api/src/database/history.entity.js';
import { installLegacy } from './support/legacy-database.js';
import { Client } from 'pg';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHmac, createHash } from 'node:crypto';
import { hash } from 'argon2';
import { Account } from '../apps/api/src/accounts/account.entity.js';
import { StoredSession } from '../apps/api/src/accounts/session.entity.js';
import { CachedGame } from '../apps/api/src/catalog/catalog-game.entity.js';
import { CachedSearch } from '../apps/api/src/catalog/catalog-search.entity.js';
import { CatalogRequestLimit } from '../apps/api/src/catalog/catalog-request-limit.entity.js';
import { AuthenticationAttempt } from '../apps/api/src/accounts/authentication-attempt.entity.js';
import { normalizeGame } from '../apps/api/src/catalog/game.js';
import { baldursGate, IgdbFixture } from './support/igdb.js';

const origin = 'http://127.0.0.1:4200';
const secret = 'disposable-migration-test-secret-at-least-32';
const options = (databaseUrl: string) => ({
  databaseUrl,
  origin,
  sessionSecret: secret,
});

test('clean migration is repeatable, has no invented legacy dates, and matches the historical schema', async () => {
  const postgres = await startPostgres();
  const db = await createDataSource(postgres.url).initialize();
  const runner = db.createQueryRunner();
  try {
    await migrate(db);
    await migrate(db);
    assert.equal(await db.getRepository(LegacyMigration).count(), 0);
    assert.equal((await migrationStatus(db)).executed.length, 1);
    assert.deepEqual(
      JSON.parse(JSON.stringify(await inspectSchema(runner))),
      legacySchema,
    );
    assert.equal(
      (await db.driver.createSchemaBuilder().log()).upQueries.length,
      0,
    );
    const app = await createApp(options(postgres.url));
    try {
      await app.listen(0, '127.0.0.1');
      assert.equal(
        (await fetch(`${await app.getUrl()}/api/accounts/me`)).status,
        401,
      );
    } finally {
      await app.close();
    }
  } finally {
    await runner.release();
    await db.destroy();
    await postgres.stop();
  }
});

test('populated handover preserves every table, signed sessions, hashes and cache through restart; backup restores the legacy database', async () => {
  const postgres = await startPostgres();
  const restore = await startPostgres();
  const directory = await mkdtemp(join(tmpdir(), 'game-tracker-recovery-'));
  const db = createDataSource(postgres.url);
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  try {
    await installLegacy(postgres.url);
    await db.initialize();
    const account = await db.getRepository(Account).save({
      email: 'legacy@example.com',
      passwordHash: await hash('legacy-long-passphrase'),
    });
    const expiresAt = Date.now() + 86_400_000;
    const sid = 'pre-upgrade-session';
    const cookie = `game_tracker.sid=${encodeURIComponent(`s:${sid}.${createHmac('sha256', secret).update(sid).digest('base64').replace(/=+$/, '')}`)}`;
    await db.getRepository(StoredSession).save({
      sid,
      expire: new Date(Math.ceil(expiresAt / 1000) * 1000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', ''),
      sess: {
        accountId: account.id,
        expiresAt,
        cookie: {
          expires: new Date(expiresAt),
          originalMaxAge: 86_400_000,
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        },
      },
    });
    const game = normalizeGame(baldursGate);
    const fetchedAt = new Date();
    await db
      .getRepository(CachedGame)
      .save({ id: game.id, metadata: game, fetchedAt, eligible: true });
    await db.getRepository(CachedSearch).save({
      cacheKey: createHash('sha256').update('legacy|1').digest('hex'),
      payload: {
        items: [game],
        page: 1,
        nextPage: null,
        fetchedAt: fetchedAt.toISOString(),
        stale: false,
      },
      fetchedAt,
    });
    await db.getRepository(CatalogRequestLimit).save({
      accountId: account.id,
      attempts: 7,
      windowEnd: new Date(Date.now() + 60_000),
    });
    await db.getRepository(AuthenticationAttempt).save({
      key: 'legacy-key',
      attempts: 3,
      expiresAt: new Date(Date.now() + 900_000),
    });
    const models = [
      Account,
      StoredSession,
      CachedGame,
      CachedSearch,
      CatalogRequestLimit,
      AuthenticationAttempt,
      LegacyMigration,
    ];
    const snapshot = async () =>
      Promise.all(models.map((model) => db.getRepository(model).find()));
    const before = await snapshot();
    const backup = join(directory, 'before.dump');
    // Real pg_dump/pg_restore rehearsal, always against disposable databases.
    await promisify(execFile)('pg_dump', [
      '--format=custom',
      '--file',
      backup,
      postgres.url,
    ]);
    await promisify(execFile)('pg_restore', ['--list', backup]);
    await assert.rejects(migrate(db), /handover/);
    await migrate(db, true);
    await migrate(db, true);
    await migrate(db);
    assert.deepEqual(await snapshot(), before);
    assert.equal(
      (await db.driver.createSchemaBuilder().log()).upQueries.length,
      0,
    );
    for (let restart = 0; restart < 2; restart++) {
      const provider = new IgdbFixture();
      provider.status = 503;
      app = await createApp({
        ...options(postgres.url),
        igdb: {
          clientId: 'fixture',
          clientSecret: 'fixture',
          fetch: provider.fetch,
        },
      });
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const get = (path: string) =>
        fetch(`${base}${path}`, { headers: { Cookie: cookie } });
      assert.deepEqual(await (await get('/api/accounts/me')).json(), {
        id: account.id,
        email: 'legacy@example.com',
      });
      assert.equal(
        (await (await get('/api/catalog/games/119171')).json()).game.id,
        119171,
      );
      assert.equal(
        (await (await get('/api/catalog/search?q=legacy')).json()).items[0].id,
        119171,
      );
      const login = await fetch(`${base}/api/accounts/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({
          email: 'legacy@example.com',
          password: 'legacy-long-passphrase',
        }),
      });
      assert.equal(login.status, 200);
      const freshCookie = login.headers.get('set-cookie')!;
      assert.equal(
        (
          await fetch(`${base}/api/accounts/logout`, {
            method: 'POST',
            headers: { Cookie: freshCookie, Origin: origin },
          })
        ).status,
        204,
      );
      assert.equal(
        (
          await fetch(`${base}/api/accounts/me`, {
            headers: { Cookie: freshCookie },
          })
        ).status,
        401,
      );
      await app.close();
      app = undefined;
    }
    await promisify(execFile)('pg_restore', [
      '--no-owner',
      '--dbname',
      restore.url,
      backup,
    ]);
    const restored = await createDataSource(restore.url).initialize();
    try {
      assert.deepEqual(await restored.getRepository(Account).find(), before[0]);
      assert.deepEqual(
        await restored.getRepository(StoredSession).find(),
        before[1],
      );
      assert.deepEqual(
        await restored.getRepository(LegacyMigration).find(),
        before[6],
      );
      const runner = restored.createQueryRunner();
      try {
        assert.equal(await runner.hasTable('typeorm_migrations'), false);
      } finally {
        await runner.release();
      }
    } finally {
      await restored.destroy();
    }
  } finally {
    await app?.close();
    if (db.isInitialized) await db.destroy();
    await postgres.stop();
    await restore.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

for (const [label, sql] of [
  [
    'partial history',
    "DELETE FROM schema_migrations WHERE name = '004-catalog-request-limits.sql'",
  ],
  [
    'unknown history',
    "UPDATE schema_migrations SET name = '999-unknown.sql' WHERE name = '004-catalog-request-limits.sql'",
  ],
  [
    'checksum mismatch',
    "UPDATE schema_migrations SET checksum = 'changed' WHERE name = '001-accounts.sql'",
  ],
  ['schema drift', 'ALTER TABLE sessions ALTER COLUMN expire TYPE timestamptz'],
  ['extra table', 'CREATE TABLE unexpected (id integer)'],
  [
    'constraint drift',
    'ALTER TABLE accounts RENAME CONSTRAINT accounts_email_key TO changed_email_key',
  ],
] as const) {
  test(`handover rejects ${label} without creating the ORM ledger`, async () => {
    const postgres = await startPostgres();
    const db = createDataSource(postgres.url);
    const client = new Client({ connectionString: postgres.url });
    try {
      await installLegacy(postgres.url);
      await client.connect();
      await client.query(sql);
      await client.end();
      await db.initialize();
      const before = await db.getRepository(LegacyMigration).find();
      await assert.rejects(migrate(db, true), /history|checksum|drift/i);
      const runner = db.createQueryRunner();
      try {
        assert.equal(await runner.hasTable('typeorm_migrations'), false);
      } finally {
        await runner.release();
      }
      assert.deepEqual(await db.getRepository(LegacyMigration).find(), before);
    } finally {
      await client.end();
      if (db.isInitialized) await db.destroy();
      await postgres.stop();
    }
  });
}

test('concurrent migration invocation fails promptly while the designated deployment process holds the lock', async () => {
  const postgres = await startPostgres();
  const first = await createDataSource(postgres.url).initialize();
  const second = await createDataSource(postgres.url).initialize();
  try {
    await withMigrationLock(first, async () => {
      await assert.rejects(migrate(second), /Another migration process/);
    });
    await migrate(second);
  } finally {
    await first.destroy();
    await second.destroy();
    await postgres.stop();
  }
});

import {
  DataSource,
  Table,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';
import { databaseOptions } from '../apps/api/src/database/data-source.js';
import { Baseline1792368000000 } from '../apps/api/src/database/migrations/1792368000000-Baseline.js';
class Future1792368000001 implements MigrationInterface {
  name = 'Future1792368000001';
  async up(runner: QueryRunner) {
    await runner.createTable(
      new Table({
        name: 'future',
        columns: [{ name: 'id', type: 'integer', isPrimary: true }],
      }),
    );
  }
  async down(runner: QueryRunner) {
    await runner.dropTable('future');
  }
}

test('handover marks only the baseline and leaves later migrations pending; startup rejects incomplete and unknown ledgers', async () => {
  const postgres = await startPostgres();
  const db = await new DataSource({
    ...databaseOptions(postgres.url),
    migrations: [Baseline1792368000000, Future1792368000001],
  }).initialize();
  try {
    await installLegacy(postgres.url);
    await migrate(db, true);
    await migrate(db, true);
    assert.deepEqual(
      (await migrationStatus(db)).pending.map((m) => m.name),
      ['Future1792368000001'],
    );
    const { assertMigrationsApplied } =
      await import('../apps/api/src/database/migrate.js');
    await assert.rejects(assertMigrationsApplied(db), /pending/);
    await migrate(db);
    await assertMigrationsApplied(db);
    await db
      .getRepository(AppliedMigration)
      .delete({ name: 'Baseline1792368000000' });
    await assert.rejects(assertMigrationsApplied(db), /history/);
    await db
      .getRepository(AppliedMigration)
      .update(
        { name: 'Future1792368000001' },
        { name: 'Unknown1792368000001' },
      );
    await assert.rejects(assertMigrationsApplied(db), /history/);
  } finally {
    await db.destroy();
    await postgres.stop();
  }
});
