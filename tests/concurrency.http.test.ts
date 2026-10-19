import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp } from '../apps/api/src/app.js';
import { createDataSource } from '../apps/api/src/database/data-source.js';
import { CachedSearch } from '../apps/api/src/catalog/catalog-search.entity.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';
import { IgdbFixture, baldursGate } from './support/igdb.js';
import { normalizeGame } from '../apps/api/src/catalog/game.js';
import { Client } from 'pg';

const origin = 'http://127.0.0.1:4200';
async function fixture() {
  const postgres = await startPostgres();
  await prepareDatabase(postgres.url);
  const provider = new IgdbFixture();
  let now = Date.now();
  const options = {
    databaseUrl: postgres.url,
    origin,
    sessionSecret: 'concurrent-test-secret-at-least-32-characters',
    clock: () => now,
    igdb: {
      clientId: 'fixture',
      clientSecret: 'fixture',
      fetch: provider.fetch,
      clock: () => now,
    },
  };
  const apps = await Promise.all([createApp(options), createApp(options)]);
  for (const app of apps) await app.listen(0, '127.0.0.1');
  const bases = await Promise.all(apps.map((app) => app.getUrl()));
  let sequence = 0;
  return {
    postgres,
    provider,
    get now() {
      return now;
    },
    advance(ms: number) {
      now += ms;
    },
    post(path: string, email: string, password = 'long-enough-passphrase') {
      return fetch(`${bases[sequence++ % 2]}/api/accounts/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ email, password }),
      });
    },
    get(query: string, cookie: string) {
      return fetch(
        `${bases[sequence++ % 2]}/api/catalog/search?q=${encodeURIComponent(query)}`,
        { headers: { Cookie: cookie } },
      );
    },
    async close() {
      for (const app of apps) await app.close();
      await postgres.stop();
    },
  };
}

test('two instances preserve registration conflicts and exact IP-first/email counting across absent rows and window resets', async () => {
  const f = await fixture();
  try {
    const registrations = await Promise.all([
      f.post('register', 'same@example.com'),
      f.post('register', 'SAME@example.com'),
    ]);
    assert.deepEqual(registrations.map((r) => r.status).sort(), [201, 409]);
    const attempts = await Promise.all(
      Array.from({ length: 15 }, () => f.post('login', 'missing@example.com')),
    );
    assert.equal(attempts.filter((r) => r.status === 401).length, 10);
    assert.equal(attempts.filter((r) => r.status === 429).length, 5);
    assert.ok(
      attempts
        .filter((r) => r.status === 429)
        .every((r) => r.headers.get('retry-after') === '900'),
    );
    // 2 registrations + 15 login attempts consume 17 IP slots, including email rejections.
    for (let i = 0; i < 43; i++)
      assert.equal(
        (await f.post('login', `invalid-${i}@example.com`, 'short')).status,
        400,
      );
    assert.equal(
      (await f.post('login', 'another@example.com', 'short')).status,
      429,
    );
    f.advance(899_001);
    const end = await f.post('login', 'another@example.com', 'short');
    assert.equal(end.status, 429);
    assert.equal(end.headers.get('retry-after'), '1');
    f.advance(999); // Exactly the expiry boundary.
    const reset = await Promise.all(
      Array.from({ length: 12 }, () => f.post('login', 'missing@example.com')),
    );
    assert.equal(reset.filter((r) => r.status === 401).length, 10);
    assert.equal(reset.filter((r) => r.status === 429).length, 2);
  } finally {
    await f.close();
  }
});

test('two instances count simultaneous cached requests exactly for absent and expired catalog counters', async () => {
  const f = await fixture();
  try {
    const registration = await f.post('register', 'catalog@example.com');
    const cookie = registration.headers.get('set-cookie')!;
    assert.equal((await f.get('quota', cookie)).status, 200);
    for (let window = 0; window < 2; window++) {
      f.advance(60_000);
      const results = await Promise.all(
        Array.from({ length: 65 }, () => f.get('quota', cookie)),
      );
      assert.equal(results.filter((r) => r.status === 200).length, 60);
      assert.equal(results.filter((r) => r.status === 429).length, 5);
      assert.ok(
        results
          .filter((r) => r.status === 429)
          .every((r) => r.headers.get('retry-after') === '60'),
      );
    }
  } finally {
    await f.close();
  }
});

test('simultaneous cache writes retain exactly the newest 500 searches', async () => {
  const f = await fixture();
  const db = await createDataSource(f.postgres.url).initialize();
  try {
    const cookie = (
      await f.post('register', 'pruning@example.com')
    ).headers.get('set-cookie')!;
    const searches = db.getRepository(CachedSearch);
    await searches.insert(
      Array.from({ length: 499 }, (_, index) => {
        const query = `seed${index}`;
        const fetchedAt = new Date(f.now - 10_000 + index);
        return {
          cacheKey: createHash('sha256').update(`${query}|1`).digest('hex'),
          fetchedAt,
          payload: {
            items: [normalizeGame(baldursGate)],
            page: 1,
            nextPage: null,
            fetchedAt: fetchedAt.toISOString(),
            stale: false,
          },
        };
      }),
    );
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, index) => f.get(`new${index}`, cookie)),
    );
    assert.ok(results.every((r) => r.status === 200));
    f.provider.status = 503;
    for (let index = 0; index < 3; index++)
      assert.equal((await f.get(`seed${index}`, cookie)).status, 503);
    assert.equal((await f.get('seed3', cookie)).status, 200);
    assert.equal((await f.get('seed498', cookie)).status, 200);
    for (let index = 0; index < 4; index++)
      assert.equal((await f.get(`new${index}`, cookie)).status, 200);
  } finally {
    await db.destroy();
    await f.close();
  }
});

test('whole transactions retry serialization failures, and counting failures never permit a request', async () => {
  const f = await fixture();
  const client = new Client({ connectionString: f.postgres.url });
  try {
    const cookie = (await f.post('register', 'faults@example.com')).headers.get(
      'set-cookie',
    )!;
    assert.equal((await f.get('faults', cookie)).status, 200);
    f.advance(60_000);
    await client.connect();
    // Infrastructure fault injection: PostgreSQL sequences survive transaction rollback.
    await client.query(`CREATE SEQUENCE retry_faults;
      CREATE FUNCTION fail_counter() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF nextval('retry_faults') <= 2 THEN RAISE EXCEPTION 'test serialization' USING ERRCODE = '40001'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER retry_fault BEFORE INSERT OR UPDATE ON catalog_request_limits FOR EACH ROW EXECUTE FUNCTION fail_counter()`);
    for (let i = 0; i < 60; i++)
      assert.equal((await f.get('faults', cookie)).status, 200);
    assert.equal((await f.get('faults', cookie)).status, 429);
    await client.query(`CREATE OR REPLACE FUNCTION fail_counter() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'unrelated conflict' USING ERRCODE = '23505', CONSTRAINT = 'unrelated_constraint'; END $$`);
    f.advance(60_000);
    assert.equal((await f.get('faults', cookie)).status, 500);
    await client.query('DROP TRIGGER retry_fault ON catalog_request_limits');
    assert.equal((await f.get('faults', cookie)).status, 200);
  } finally {
    await client.end();
    await f.close();
  }
});
