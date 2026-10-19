import assert from 'node:assert/strict';
import { fork, execFile } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startPostgres } from '../tests/support/postgres.js';
import { createDataSource } from '../apps/api/src/database/data-source.js';
import { migrate } from '../apps/api/src/database/migrate.js';
import { createApp } from '../apps/api/src/app.js';

const previous = process.argv[2];
if (!previous)
  throw new Error(
    'Supply an isolated previous-version checkout with npm ci installed.',
  );
if (process.env.TEST_DATABASE_URL)
  throw new Error(
    'Recovery rehearsal requires packaged disposable PostgreSQL; unset TEST_DATABASE_URL.',
  );
const directory = await mkdtemp(join(tmpdir(), 'game-tracker-handover-'));
const source = await startPostgres();
const restored = await startPostgres();
// initdb inherits TZ. Pin connection timezones so a non-UTC Node rehearsal
// actually exercises different application and database timezone settings.
for (const database of [source, restored]) {
  const url = new URL(database.url);
  // libpq URLs require percent-encoded spaces (URLSearchParams emits '+').
  url.search = `options=${encodeURIComponent('-c timezone=UTC')}`;
  database.url = url.toString();
}
const origin = 'http://127.0.0.1:4200';
const sessionSecret = 'disposable-rehearsal-secret-at-least-32-characters';
async function previousApp(url: string) {
  const child = fork(resolve('tests/support/previous-server.mjs'), [], {
    cwd: resolve(previous),
    execArgv: [
      '--import',
      pathToFileURL(resolve(previous, 'node_modules/tsx/dist/loader.mjs')).href,
    ],
    env: {
      ...process.env,
      PREVIOUS_CHECKOUT: resolve(previous),
      REHEARSAL_DATABASE_URL: url,
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  const result = await Promise.race([
    once(child, 'message').then(([base]) => String(base)),
    once(child, 'exit').then(() => {
      throw new Error('Previous application exited before listening');
    }),
  ]);
  return {
    base: result,
    async close() {
      const exited = once(child, 'exit');
      child.send('close');
      await exited;
    },
  };
}
let old: Awaited<ReturnType<typeof previousApp>> | undefined;
let current: Awaited<ReturnType<typeof createApp>> | undefined;
try {
  old = await previousApp(source.url);
  const registration = await fetch(`${old.base}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'recovery@example.com',
      password: 'recovery-long-passphrase',
    }),
  });
  assert.equal(registration.status, 201);
  const identity = await registration.json();
  const cookie = registration.headers.get('set-cookie')!;
  const read = (base: string, path: string) =>
    fetch(`${base}${path}`, { headers: { Cookie: cookie } });
  const cached = await (
    await read(old.base, '/api/catalog/games/119171')
  ).json();
  assert.equal(cached.game.id, 119171);
  const search = await (
    await read(old.base, '/api/catalog/search?q=recovery')
  ).json();
  await old.close();
  old = undefined; // Writes stopped before backup.
  const backup = join(directory, 'pre-handover.dump');
  await promisify(execFile)('pg_dump', [
    '--format=custom',
    '--file',
    backup,
    source.url,
  ]);
  await promisify(execFile)('pg_restore', ['--list', backup]);
  const db = await createDataSource(source.url).initialize();
  try {
    await migrate(db, true);
    await migrate(db);
  } finally {
    await db.destroy();
  }
  for (let restart = 0; restart < 2; restart++) {
    current = await createApp({
      databaseUrl: source.url,
      origin,
      sessionSecret,
    });
    await current.listen(0, '127.0.0.1');
    const base = await current.getUrl();
    assert.deepEqual(
      await (await read(base, '/api/accounts/me')).json(),
      identity,
    );
    assert.deepEqual(
      await (await read(base, '/api/catalog/games/119171')).json(),
      cached,
    );
    assert.deepEqual(
      await (await read(base, '/api/catalog/search?q=recovery')).json(),
      search,
    );
    await current.close();
    current = undefined;
  }
  await promisify(execFile)('pg_restore', [
    '--no-owner',
    '--dbname',
    restored.url,
    backup,
  ]);
  old = await previousApp(restored.url);
  assert.deepEqual(
    await (await read(old.base, '/api/accounts/me')).json(),
    identity,
  );
  assert.deepEqual(
    await (await read(old.base, '/api/catalog/games/119171')).json(),
    cached,
  );
  const login = await fetch(`${old.base}/api/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'recovery@example.com',
      password: 'recovery-long-passphrase',
    }),
  });
  assert.equal(login.status, 200);
  console.log(
    'Recovery rehearsal passed: old signed session and cached catalog survive handover/restart; verified backup runs on the previous application.',
  );
} finally {
  await old?.close();
  await current?.close();
  await source.stop();
  await restored.stop();
  await rm(directory, { recursive: true, force: true });
}
