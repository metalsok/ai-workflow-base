import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres } from './support/postgres.js';
import { IgdbFixture, baldursGate } from './support/igdb.js';

let postgres: Awaited<ReturnType<typeof startPostgres>>;
let app: INestApplication;
let base: string;
let cookie: string;
const origin = 'http://127.0.0.1:4200';
const provider = new IgdbFixture();
let now = Date.now();
const options = () => ({
  databaseUrl: postgres.url,
  origin,
  sessionSecret: 'a-disposable-catalog-test-secret-at-least-32-characters',
  igdb: {
    clientId: 'fixture-client-id',
    clientSecret: 'fixture-client-secret',
    fetch: provider.fetch,
    clock: () => now,
  },
});
before(async () => {
  postgres = await startPostgres();
  app = await createApp(options());
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const response = await fetch(`${base}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'catalog-tester@example.com',
      password: 'long-enough-passphrase',
    }),
  });
  assert.equal(response.status, 201);
  cookie = response.headers.get('set-cookie')!;
});
after(async () => {
  await app?.close();
  await postgres?.stop();
});
const get = (path: string) =>
  fetch(`${base}${path}`, { headers: { Cookie: cookie } });

test('a signed-in tester searches by an alias and receives the canonical game identity', async () => {
  const response = await get('/api/catalog/search?q=Baldur%27s%20Gate%203');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.items[0].id, 119171);
  assert.equal(result.items[0].title, "Baldur's Gate III");
  assert.equal(
    result.items[0].coverUrl,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg',
  );
  assert.equal(result.page, 1);
  assert.equal(result.nextPage, null);
  assert.equal(result.stale, false);
  assert.doesNotMatch(
    JSON.stringify(result),
    /fixture-server-only-token|fixture-client-secret|Authorization/,
  );
});

test('catalog search requires a live application session', async () => {
  const response = await fetch(`${base}/api/catalog/search?q=Zelda`);
  assert.equal(response.status, 401);
});

test('search includes main games, remakes, and remasters, excluding editions and unsupported platforms', async () => {
  provider.games = [
    baldursGate,
    { ...baldursGate, id: 1001, name: 'A remake', game_type: 8 },
    { ...baldursGate, id: 1002, name: 'A remaster', game_type: 9 },
    { ...baldursGate, id: 2001, game_type: 1 },
    { ...baldursGate, id: 2002, game_type: 3 },
    { ...baldursGate, id: 2003, game_type: 5 },
    { ...baldursGate, id: 2004, version_parent: 119171 },
    {
      ...baldursGate,
      id: 2005,
      platforms: [{ id: 34, name: 'Android', platform_type: 4 }],
    },
    { ...baldursGate, id: 2006, platforms: [] },
    { ...baldursGate, id: 2007, game_type: 99 },
  ];
  const response = await get('/api/catalog/search?q=Mixed');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(
    result.items.map((game: { id: number }) => game.id),
    [119171, 1001, 1002],
  );
});

test('opening details supplies expanded metadata and explicit nulls for unavailable information', async () => {
  provider.games = [baldursGate];
  const response = await get('/api/catalog/games/119171');
  assert.equal(response.status, 200);
  const { game } = await response.json();
  assert.equal(
    game.summary,
    'Gather your party and return to the Forgotten Realms.',
  );
  assert.equal(game.firstReleaseDate, '2023-08-03');
  assert.deepEqual(game.platforms, ['PC (Microsoft Windows)']);
  assert.deepEqual(game.genres, ['Role-playing (RPG)']);
  assert.deepEqual(game.developers, ['Larian Studios']);
  assert.deepEqual(game.publishers, ['Larian Studios']);
  provider.games = [
    {
      id: 1010,
      name: 'Little-known game',
      game_type: 0,
      platforms: [{ id: 130, name: 'Nintendo Switch', platform_type: 1 }],
    },
  ];
  const unknown = await get('/api/catalog/games/1010');
  assert.equal(unknown.status, 200);
  const missing = (await unknown.json()).game;
  assert.equal(missing.coverUrl, null);
  assert.equal(missing.summary, null);
  assert.equal(missing.firstReleaseDate, null);
  assert.deepEqual(missing.genres, []);
  assert.deepEqual(missing.developers, []);
  assert.deepEqual(missing.publishers, []);
});

test('excluded titles cannot bypass catalog scope through a direct details URL', async () => {
  for (const game_type of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 99]) {
    provider.games = [{ ...baldursGate, id: 2000 + game_type, game_type }];
    assert.equal(
      (await get(`/api/catalog/games/${2000 + game_type}`)).status,
      404,
    );
  }
  for (const game of [
    { ...baldursGate, id: 2100, version_parent: 119171 },
    {
      ...baldursGate,
      id: 2100,
      platforms: [{ id: 34, name: 'Android', platform_type: 4 }],
    },
    { ...baldursGate, id: 2100, platforms: [] },
    { ...baldursGate, id: 2100, name: '' },
    { ...baldursGate, id: 2200 },
  ]) {
    provider.games = [game];
    assert.equal((await get('/api/catalog/games/2100')).status, 404);
  }
  provider.games = [];
  assert.equal((await get('/api/catalog/games/999999')).status, 404);
  assert.equal((await fetch(`${base}/api/catalog/games/119171`)).status, 401);
});

test('search pagination returns bounded distinct pages with an explicit next page', async () => {
  provider.games = Array.from({ length: 13 }, (_, index) => ({
    ...baldursGate,
    id: 3000 + index,
    name: `Game ${index + 1}`,
  }));
  const first = await get('/api/catalog/search?q=Paged&page=1');
  assert.equal(first.status, 200);
  const page1 = await first.json();
  assert.equal(page1.items.length, 12);
  assert.equal(page1.nextPage, 2);
  assert.deepEqual(
    page1.items.map((game: { id: number }) => game.id),
    [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011],
  );
  provider.games = [{ ...baldursGate, id: 3012, name: 'Game 13' }];
  const page2 = await (await get('/api/catalog/search?q=Paged&page=2')).json();
  assert.equal(page2.page, 2);
  assert.equal(page2.nextPage, null);
  assert.deepEqual(
    page2.items.map((game: { id: number }) => game.id),
    [3012],
  );
  assert.match(provider.requests.at(-1)!.body, /limit 13; offset 12;/);
});

test('invalid search and detail inputs are rejected before contacting IGDB', async () => {
  const before = provider.requests.length;
  for (const path of [
    '/api/catalog/search',
    '/api/catalog/search?q=a',
    `/api/catalog/search?q=${'x'.repeat(101)}`,
    '/api/catalog/search?q=Halo&q=Zelda',
    '/api/catalog/search?q=Halo%00',
    ...['0', '-1', '1.5', '51', ''].map(
      (page) => `/api/catalog/search?q=Halo&page=${page}`,
    ),
    ...['0', '-1', 'abc', '1.2', '9e1', '9007199254740992'].map(
      (id) => `/api/catalog/games/${id}`,
    ),
  ])
    assert.equal((await get(path)).status, 400, path);
  assert.equal(provider.requests.length, before);
});

test('search and normalized game details remain cached in PostgreSQL across an app restart', async () => {
  provider.games = [
    { ...baldursGate, id: 4500, name: 'Persistent catalog title' },
  ];
  const search = await (await get('/api/catalog/search?q=Persistent')).json();
  const details = await (await get('/api/catalog/games/4500')).json();
  const requests = provider.requests.length;
  provider.status = 503;
  await app.close();
  app = await createApp(options());
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  assert.deepEqual(
    await (await get('/api/catalog/search?q=Persistent')).json(),
    search,
  );
  assert.deepEqual(
    await (await get('/api/catalog/games/4500')).json(),
    details,
  );
  assert.equal(provider.requests.length, requests);
  provider.status = 200;
});

test('provider failures and rate limiting produce safe retry responses rather than provider diagnostics', async () => {
  try {
    for (const status of [503, 429]) {
      provider.status = status;
      const response = await get(`/api/catalog/search?q=Failure${status}`);
      assert.equal(response.status, 503);
      assert.match(response.headers.get('retry-after')!, /^\d+$/);
      const body = await response.text();
      assert.match(body, /temporarily unavailable/i);
      assert.doesNotMatch(
        body,
        /fixture-server-only-token|Private provider diagnostics|fixture-client-secret/,
      );
      assert.equal((await get('/api/catalog/games/999998')).status, 503);
    }
  } finally {
    provider.status = 200;
  }
});

test('expired cached information stays available during an outage with its original timestamp and stale marker', async () => {
  const previousSearch = await (
    await get('/api/catalog/search?q=Persistent')
  ).json();
  const previousGame = await (await get('/api/catalog/games/4500')).json();
  now += 25 * 60 * 60 * 1000;
  provider.status = 503;
  try {
    const search = await get('/api/catalog/search?q=Persistent');
    assert.equal(search.status, 200);
    assert.deepEqual(await search.json(), { ...previousSearch, stale: true });
    const details = await get('/api/catalog/games/4500');
    assert.equal(details.status, 200);
    assert.deepEqual(await details.json(), { ...previousGame, stale: true });
  } finally {
    provider.status = 200;
  }
});

test('a title later confirmed outside the scope is not resurrected from stale metadata', async () => {
  provider.games = [{ ...baldursGate, id: 4600 }];
  assert.equal((await get('/api/catalog/games/4600')).status, 200);
  now += 25 * 60 * 60 * 1000;
  provider.games = [{ ...baldursGate, id: 4600, game_type: 1 }];
  assert.equal((await get('/api/catalog/games/4600')).status, 404);
  provider.status = 503;
  try {
    assert.equal((await get('/api/catalog/games/4600')).status, 503);
  } finally {
    provider.status = 200;
  }
});

test('concurrent searches are paced below the IGDB limit and excess queued work is rejected', async () => {
  provider.games = [baldursGate];
  const before = provider.requests.length;
  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      get(`/api/catalog/search?q=Concurrent${index}`),
    ),
  );
  assert.ok(
    responses.every((response) => [200, 503].includes(response.status)),
  );
  assert.ok(responses.some((response) => response.status === 503));
  const upstream = provider.requests
    .slice(before)
    .filter((request) => request.endpoint === 'games');
  assert.ok(upstream.length > 0 && upstream.length <= 8);
  for (let index = 1; index < upstream.length; index++)
    assert.ok(upstream[index].at - upstream[index - 1].at >= 250);
});

test('provider access tokens are refreshed after expiry', async () => {
  const before = provider.requests.filter(
    (request) => request.endpoint === 'token',
  ).length;
  now += 2 * 60 * 60 * 1000;
  provider.games = [baldursGate];
  assert.equal((await get('/api/catalog/search?q=TokenRefresh')).status, 200);
  assert.equal(
    provider.requests.filter((request) => request.endpoint === 'token').length,
    before + 1,
  );
});

test('a revoked provider token is refreshed once, with no unbounded retry loop', async () => {
  provider.games = [baldursGate];
  provider.rejectedTokens = 1;
  assert.equal((await get('/api/catalog/search?q=RevokedToken')).status, 200);
  provider.rejectedTokens = 2;
  const response = await get('/api/catalog/search?q=RevokedTwice');
  assert.equal(response.status, 503);
  assert.equal(provider.rejectedTokens, 0);
});

test('malformed and oversized provider payloads fail safely, while missing optional fields stay usable', async () => {
  try {
    provider.responseBody = { unexpected: true };
    assert.equal(
      (await get('/api/catalog/search?q=MalformedShape')).status,
      503,
    );
    provider.responseBody = [
      null,
      'invalid',
      {
        ...baldursGate,
        cover: { image_id: '../../invalid' },
        first_release_date: 1e100,
        platforms: [baldursGate.platforms[0], null],
      },
    ];
    const response = await get('/api/catalog/search?q=MalformedRecords');
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].coverUrl, null);
    assert.equal(result.items[0].firstReleaseDate, null);
    assert.deepEqual(result.items[0].platforms, ['PC (Microsoft Windows)']);
    provider.responseBody = [
      { ...baldursGate, summary: 'x'.repeat(2 * 1024 * 1024) },
    ];
    assert.equal(
      (await get('/api/catalog/search?q=OversizedPayload')).status,
      503,
    );
  } finally {
    provider.responseBody = undefined;
  }
});

test('malformed optional provider metadata does not prevent opening game details', async () => {
  provider.games = [
    {
      ...baldursGate,
      id: 4700,
      cover: null,
      summary: { unexpected: true },
      platforms: [null, 42, { id: 6, name: null }, ...baldursGate.platforms],
      genres: [null, 42, { name: {} }, { name: 'Adventure' }],
      involved_companies: [
        null,
        42,
        { developer: true, company: null },
        ...baldursGate.involved_companies,
      ],
    },
  ];
  const response = await get('/api/catalog/games/4700');
  assert.equal(response.status, 200);
  const { game } = await response.json();
  assert.equal(game.coverUrl, null);
  assert.equal(game.summary, null);
  assert.deepEqual(game.platforms, ['PC (Microsoft Windows)']);
  assert.deepEqual(game.genres, ['Adventure']);
  assert.deepEqual(game.developers, ['Larian Studios']);
  assert.deepEqual(game.publishers, ['Larian Studios']);
});

test('a signed-in account has a bounded catalog request window, including cached requests', async () => {
  now += 60_001;
  provider.games = [baldursGate];
  for (let index = 0; index < 60; index++)
    assert.equal((await get('/api/catalog/search?q=QuotaCached')).status, 200);
  const limited = await get('/api/catalog/search?q=QuotaCached');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  now += 60_001;
  assert.equal((await get('/api/catalog/search?q=QuotaCached')).status, 200);
});
