import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';

test('the readiness endpoint checks PostgreSQL and works without an application session', async () => {
  const pg = await startPostgres();
  await prepareDatabase(pg.url);
  const app = await createApp({
    databaseUrl: pg.url,
    origin: 'http://127.0.0.1:4200',
    sessionSecret: 'disposable-health-session-secret-at-least-32',
  });
  try {
    await app.listen(0, '127.0.0.1');
    const response = await fetch(`${await app.getUrl()}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('set-cookie'), null);
  } finally {
    await app.close();
    await pg.stop();
  }
});
