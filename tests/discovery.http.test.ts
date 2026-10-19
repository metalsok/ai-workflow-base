import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';
import { baldursGate, IgdbFixture } from './support/igdb.js';

let postgres: Awaited<ReturnType<typeof startPostgres>>;
let app: INestApplication;
let base: string;
let cookie: string;
let now = Date.UTC(2026, 9, 19, 12);
const origin = 'http://127.0.0.1:4200';
const provider = new IgdbFixture();
const options = () => ({
  databaseUrl: postgres.url,
  origin,
  sessionSecret: 'discovery-disposable-session-secret-at-least-32',
  igdb: {
    clientId: 'fixture',
    clientSecret: 'fixture',
    fetch: provider.fetch,
    clock: () => now,
  },
});
const get = (path: string) =>
  fetch(`${base}${path}`, { headers: { Cookie: cookie } });
before(async () => {
  postgres = await startPostgres();
  await prepareDatabase(postgres.url);
  app = await createApp(options());
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const registered = await fetch(`${base}/api/accounts/register`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'discovery@example.com',
      password: 'long-discovery-passphrase',
    }),
  });
  assert.equal(registered.status, 201);
  cookie = registered.headers.get('set-cookie')!;
});
after(async () => {
  await app?.close();
  await postgres?.stop();
});

test('discovery requires a session and reports cold provider failures without fixture data', async () => {
  assert.equal(
    (await fetch(`${base}/api/catalog/discovery/popular`)).status,
    401,
  );
  assert.equal((await get('/api/catalog/discovery/invalid')).status, 400);
  provider.status = 503;
  try {
    for (const kind of ['popular', 'recent']) {
      const response = await get(`/api/catalog/discovery/${kind}`);
      assert.equal(response.status, 503);
      assert.ok(Number(response.headers.get('retry-after')) > 0);
      const body = await response.text();
      assert.match(body, /temporarily unavailable/);
      assert.doesNotMatch(
        body,
        /fixture-server-only-token|Private provider diagnostics/,
      );
    }
  } finally {
    provider.status = 200;
  }
});

test('Popular now uses IGDB Visits order and returns eligible metadata in a bounded batch', async () => {
  const before = provider.requests.length;
  provider.popularity = [
    { game_id: 1001, value: 0.9, popularity_type: 1 },
    { game_id: 119171, value: 0.8, popularity_type: 1 },
    { game_id: 2000, value: 0.7, popularity_type: 1 },
  ];
  provider.games = [
    baldursGate,
    { ...baldursGate, id: 2000, game_type: 1 },
    {
      ...baldursGate,
      id: 1001,
      name: 'An indie adventure',
      cover: undefined,
      artworks: [{ image_id: 'landscape_1' }],
    },
  ];
  const response = await get('/api/catalog/discovery/popular');
  assert.equal(response.status, 200);
  const feed = await response.json();
  assert.equal(feed.source, 'igdb-visits');
  assert.equal(feed.stale, false);
  assert.equal(feed.fetchedAt, '2026-10-19T12:00:00.000Z');
  assert.deepEqual(
    feed.items.map((game: { id: number }) => game.id),
    [1001, 119171],
  );
  assert.equal(feed.items[0].coverUrl, null);
  assert.equal(
    feed.items[0].artworkUrl,
    'https://images.igdb.com/igdb/image/upload/t_1080p/landscape_1.jpg',
  );
  const games = provider.requests
    .slice(before)
    .filter((request) => request.endpoint === 'games');
  assert.equal(games.length, 1);
  assert.match(games[0].body, /id = \(1001,119171,2000\)/);
  assert.match(
    provider.requests.find(
      (request) => request.endpoint === 'popularity_primitives',
    )!.body,
    /popularity_type = 1/,
  );
});

test('recent releases use a rolling 90-day first-release window and the shared catalog scope', async () => {
  const end = Math.floor(now / 1000);
  const start = end - 90 * 86400;
  provider.games = [
    { ...baldursGate, id: 101, name: 'First day', first_release_date: start },
    {
      ...baldursGate,
      id: 102,
      name: 'Latest release',
      first_release_date: end,
      artworks: [null, { image_id: '../bad' }],
    },
    { ...baldursGate, id: 103, first_release_date: end + 1 },
    { ...baldursGate, id: 104, first_release_date: start - 1 },
    { ...baldursGate, id: 105, first_release_date: end, game_type: 1 },
    {
      ...baldursGate,
      id: 106,
      first_release_date: end,
      platforms: [{ id: 34, name: 'Android', platform_type: 4 }],
    },
    { ...baldursGate, id: 107, first_release_date: undefined },
  ];
  const response = await get('/api/catalog/discovery/recent');
  assert.equal(response.status, 200);
  const feed = await response.json();
  assert.equal(feed.source, 'first-release-date');
  assert.deepEqual(
    feed.items.map((game: { id: number }) => game.id),
    [102, 101],
  );
  assert.equal(feed.items[0].artworkUrl, null);
  assert.match(
    provider.requests.at(-1)!.body,
    new RegExp(`first_release_date >= ${start} & first_release_date <= ${end}`),
  );
});

test('feeds are cached daily in PostgreSQL and survive restart without per-card lookups', async () => {
  const popular = await (await get('/api/catalog/discovery/popular')).json();
  const recent = await (await get('/api/catalog/discovery/recent')).json();
  const before = provider.requests.length;
  now += 24 * 60 * 60 * 1000 - 1;
  await app.close();
  app = await createApp(options());
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  assert.deepEqual(
    await (await get('/api/catalog/discovery/popular')).json(),
    popular,
  );
  assert.deepEqual(
    await (await get('/api/catalog/discovery/recent')).json(),
    recent,
  );
  assert.equal(provider.requests.length, before);
});

test('expired feeds retain their metadata and original age during an outage, then refresh after recovery', async () => {
  const popular = await (await get('/api/catalog/discovery/popular')).json();
  const recent = await (await get('/api/catalog/discovery/recent')).json();
  now++;
  provider.status = 503;
  try {
    assert.deepEqual(
      await (await get('/api/catalog/discovery/popular')).json(),
      { ...popular, stale: true },
    );
    assert.deepEqual(
      await (await get('/api/catalog/discovery/recent')).json(),
      { ...recent, stale: true },
    );
  } finally {
    provider.status = 200;
  }
  provider.games = [
    { ...baldursGate, first_release_date: Math.floor(now / 1000) },
  ];
  provider.popularity = [{ game_id: 119171, value: 1, popularity_type: 1 }];
  for (const kind of ['popular', 'recent']) {
    const response = await get(`/api/catalog/discovery/${kind}`);
    assert.equal(response.status, 200);
    const feed = await response.json();
    assert.equal(feed.stale, false);
    assert.equal(feed.fetchedAt, '2026-10-20T12:00:00.000Z');
    assert.deepEqual(
      feed.items.map((game: { id: number }) => game.id),
      [119171],
    );
  }
  assert.equal(
    (await (await get('/api/catalog/games/119171')).json()).game.id,
    119171,
  );
});

test('concurrent cold refreshes are shared, empty feeds are intentional, and malformed ranks do not erase a cached feed', async () => {
  now += 24 * 60 * 60 * 1000;
  provider.popularity = [
    { game_id: '../invalid', value: 1, popularity_type: 1 },
  ];
  const stale = await (await get('/api/catalog/discovery/popular')).json();
  assert.equal(stale.stale, true);
  assert.equal(stale.items[0].id, 119171);
  provider.popularity = [];
  provider.games = [];
  const before = provider.requests.length;
  provider.delayMs = 100;
  try {
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => get('/api/catalog/discovery/popular')),
    );
    for (const response of responses) {
      assert.equal(response.status, 200);
      const feed = await response.json();
      assert.deepEqual(feed.items, []);
      assert.equal(feed.stale, false);
    }
    assert.equal(
      provider.requests
        .slice(before)
        .filter((request) => request.endpoint === 'popularity_primitives')
        .length,
      1,
    );
    assert.deepEqual(
      (await (await get('/api/catalog/discovery/recent')).json()).items,
      [],
    );
  } finally {
    provider.delayMs = 0;
  }
});
