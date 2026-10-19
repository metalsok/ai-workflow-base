import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Client } from 'pg';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';

test('legacy sessions remain usable through a process DST gap when PostgreSQL uses UTC, including cleanup', async (context) => {
  const postgres = await startPostgres();
  const url = new URL(postgres.url);
  url.searchParams.set('options', '-c timezone=UTC');
  const databaseUrl = url.toString();
  await prepareDatabase(databaseUrl);
  const client = new Client({ connectionString: databaseUrl });
  const secret = 'timezone-regression-secret-at-least-32-characters';
  const sid = 'legacy-session-during-dst-gap';
  const cookie = `game_tracker.sid=${encodeURIComponent(`s:${sid}.${createHmac('sha256', secret).update(sid).digest('base64').replace(/=+$/, '')}`)}`;
  const previousTimezone = process.env.TZ;
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  try {
    await client.connect();
    const account = await client.query(
      "INSERT INTO accounts (email, password_hash) VALUES ('dst@example.com', 'not-used-for-login') RETURNING id",
    );
    // Historical infrastructure fixture uses exactly the old store's conversion.
    const expiresAt = Date.parse('2027-03-28T02:45:00Z');
    await client.query(
      'INSERT INTO sessions (sid, sess, expire) VALUES ($1,$2,to_timestamp($3))',
      [
        sid,
        {
          accountId: account.rows[0].id,
          expiresAt,
          cookie: {
            expires: new Date(expiresAt).toISOString(),
            originalMaxAge: 900_000,
            httpOnly: true,
            path: '/',
          },
        },
        expiresAt / 1000,
      ],
    );
    process.env.TZ = 'Europe/Vienna';
    assert.equal(
      new Date(2027, 2, 28, 2, 30).getHours(),
      3,
      'test process must normalize the local DST gap',
    );
    let now = Date.parse('2027-03-28T02:30:00Z');
    context.mock.method(Date, 'now', () => now);
    context.mock.timers.enable({ apis: ['setInterval'] });
    app = await createApp({
      databaseUrl,
      origin: 'http://127.0.0.1:4200',
      sessionSecret: secret,
    });
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const me = () =>
      fetch(`${base}/api/accounts/me`, { headers: { Cookie: cookie } });
    assert.equal((await me()).status, 200);
    now += 60_001;
    context.mock.timers.tick(60_001);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal((await me()).status, 200);
    now += 15 * 60_000;
    context.mock.timers.tick(15 * 60_000);
    assert.equal((await me()).status, 401);
  } finally {
    await app?.close();
    context.mock.timers.reset();
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
    await client.end();
    await postgres.stop();
  }
});
