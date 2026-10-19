import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';
import { IgdbFixture } from './support/igdb.js';

let postgres: Awaited<ReturnType<typeof startPostgres>>;
let app: INestApplication;
let base: string;
let cookie: string;
const origin = 'http://127.0.0.1:4200';
const provider = new IgdbFixture();
const options = () => ({
  databaseUrl: postgres.url,
  origin,
  sessionSecret: 'disposable-library-session-secret-at-least-32-characters',
  igdb: {
    clientId: 'fixture-client-id',
    clientSecret: 'fixture-client-secret',
    fetch: provider.fetch,
  },
});
const request = (
  path: string,
  method = 'GET',
  body?: unknown,
  session = cookie,
) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      Cookie: session,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
before(async () => {
  postgres = await startPostgres();
  await prepareDatabase(postgres.url);
  app = await createApp(options());
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const response = await request(
    '/api/accounts/register',
    'POST',
    { email: 'library@example.com', password: 'long-library-passphrase' },
    '',
  );
  assert.equal(response.status, 201);
  cookie = response.headers.get('set-cookie')!;
});
after(async () => {
  await app?.close();
  await postgres?.stop();
});

test('saving a catalog Game creates a private Want to play entry with stored metadata', async () => {
  const saved = await request('/api/library/games/119171', 'POST');
  assert.equal(saved.status, 201);
  const entry = await saved.json();
  assert.equal(entry.game.id, 119171);
  assert.equal(entry.game.title, "Baldur's Gate III");
  assert.equal(entry.status, 'want-to-play');
  const list = await request('/api/library');
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json()).items, [entry]);
  assert.equal('accountId' in entry, false);
});

test('Play status transitions filter independently and Played includes all three started statuses', async () => {
  for (const status of [
    'playing',
    'completed',
    'stopped-playing',
    'want-to-play',
  ]) {
    const response = await request('/api/library/games/119171', 'PATCH', {
      status,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, status);
    for (const filter of [
      'want-to-play',
      'playing',
      'completed',
      'stopped-playing',
      'played',
    ]) {
      const list = await request(`/api/library?status=${filter}`);
      assert.equal(list.status, 200);
      assert.equal(
        (await list.json()).items.length,
        filter === status || (filter === 'played' && status !== 'want-to-play')
          ? 1
          : 0,
      );
    }
  }
});

test('two users cannot read, update, or remove each other’s saved Game, even with account identifier tampering', async () => {
  const registered = await request(
    '/api/accounts/register',
    'POST',
    {
      email: 'other-library@example.com',
      password: 'other-library-passphrase',
    },
    '',
  );
  assert.equal(registered.status, 201);
  const other = registered.headers.get('set-cookie')!;
  const owner = await (await request('/api/accounts/me')).json();
  assert.deepEqual(
    (
      await (
        await request(
          `/api/library?accountId=${owner.id}`,
          'GET',
          undefined,
          other,
        )
      ).json()
    ).items,
    [],
  );
  assert.equal(
    (
      await request(
        '/api/library/games/119171',
        'PATCH',
        { status: 'completed', accountId: owner.id },
        other,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        '/api/library/games/119171',
        'DELETE',
        { accountId: owner.id },
        other,
      )
    ).status,
    404,
  );
  const saved = await request(
    '/api/library/games/119171',
    'POST',
    { accountId: owner.id },
    other,
  );
  assert.equal(saved.status, 201);
  await request(
    '/api/library/games/119171',
    'PATCH',
    { status: 'playing' },
    other,
  );
  assert.equal(
    (await (await request('/api/library')).json()).items[0].status,
    'want-to-play',
  );
  assert.equal(
    (await request('/api/library/games/119171', 'DELETE', undefined, other))
      .status,
    204,
  );
  assert.equal((await (await request('/api/library')).json()).items.length, 1);
});

test('repeated and concurrent additions create one entry and preserve its current Play status', async () => {
  await request('/api/library/games/119171', 'DELETE');
  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      request('/api/library/games/119171', 'POST'),
    ),
  );
  assert.ok(responses.every((response) => response.status === 201));
  assert.equal((await (await request('/api/library')).json()).items.length, 1);
  await request('/api/library/games/119171', 'PATCH', { status: 'completed' });
  assert.equal(
    (await (await request('/api/library/games/119171', 'POST')).json()).status,
    'completed',
  );
  assert.equal((await (await request('/api/library')).json()).items.length, 1);
});

test('Library metadata and statuses survive restart, a new device and sign-in during an IGDB outage', async () => {
  const expected = await (await request('/api/library')).json();
  await app.close();
  provider.status = 503;
  app = await createApp(options());
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  try {
    assert.deepEqual(await (await request('/api/library')).json(), expected);
    const login = await request(
      '/api/accounts/login',
      'POST',
      { email: 'library@example.com', password: 'long-library-passphrase' },
      '',
    );
    assert.equal(login.status, 200);
    const device = login.headers.get('set-cookie')!;
    assert.deepEqual(
      await (await request('/api/library', 'GET', undefined, device)).json(),
      expected,
    );
    assert.equal(
      (
        await request(
          '/api/library/games/119171',
          'PATCH',
          { status: 'stopped-playing' },
          device,
        )
      ).status,
      200,
    );
    assert.equal(
      (await (await request('/api/library?status=played')).json()).items[0]
        .status,
      'stopped-playing',
    );
    assert.equal(
      (await request('/api/library/games/119171', 'DELETE', undefined, device))
        .status,
      204,
    );
    assert.deepEqual((await (await request('/api/library')).json()).items, []);
    await request('/api/accounts/logout', 'POST', undefined, device);
    assert.equal(
      (await request('/api/library', 'GET', undefined, device)).status,
      401,
    );
  } finally {
    provider.status = 200;
  }
});

test('Library rejects unauthenticated access, foreign origins, invalid identifiers, statuses, and excluded Games', async () => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const path =
      method === 'GET' ? '/api/library' : '/api/library/games/119171';
    assert.equal(
      (
        await request(
          path,
          method,
          method === 'PATCH' ? { status: 'playing' } : undefined,
          '',
        )
      ).status,
      401,
    );
  }
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = await fetch(`${base}/api/library/games/119171`, {
      method,
      headers: { Cookie: cookie, Origin: 'http://foreign.invalid' },
    });
    assert.equal(response.status, 403);
    for (const id of ['0', '-1', 'abc', '1.2', '9007199254740992'])
      assert.equal(
        (
          await request(`/api/library/games/${id}`, method, {
            status: 'playing',
          })
        ).status,
        400,
      );
  }
  for (const body of [
    {},
    { status: 'played' },
    { status: [] },
    { status: null },
  ])
    assert.equal(
      (await request('/api/library/games/119171', 'PATCH', body)).status,
      400,
    );
  for (const filter of ['invalid', 'playing&status=completed', ''])
    assert.equal((await request(`/api/library?status=${filter}`)).status, 400);
  provider.games = [];
  assert.equal(
    (await request('/api/library/games/999999', 'POST')).status,
    404,
  );
  assert.deepEqual((await (await request('/api/library')).json()).items, []);
});
