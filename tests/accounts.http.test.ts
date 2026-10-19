import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';

let postgres: Awaited<ReturnType<typeof startPostgres>>;
let app: INestApplication;
let base: string;
const origin = 'http://127.0.0.1:4200';

before(async () => {
  postgres = await startPostgres();
  await prepareDatabase(postgres.url);
  app = await createApp({
    databaseUrl: postgres.url,
    origin,
    sessionSecret: 'a-disposable-test-secret-at-least-32-characters',
  });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});

after(async () => {
  await app?.close();
  await postgres?.stop();
});

test('registering creates an account and an authenticated cookie session', async () => {
  const response = await fetch(`${base}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: ' Alice@Example.com ',
      password: 'long-enough-passphrase',
    }),
  });
  assert.equal(response.status, 201);
  const identity = await response.json();
  assert.equal(identity.email, 'alice@example.com');
  assert.deepEqual(Object.keys(identity).sort(), ['email', 'id']);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  const me = await fetch(`${base}/api/accounts/me`, {
    headers: { Cookie: cookie },
  });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), identity);
});

test('invalid registration input is rejected without issuing a session', async () => {
  for (const input of [
    null,
    {},
    { email: 'invalid', password: 'long-enough-passphrase' },
    { email: 'bad@example.com', password: 'short' },
    { email: 42, password: [] },
    { email: 'bad@example.com', password: 'x'.repeat(129) },
  ]) {
    const response = await fetch(`${base}/api/accounts/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('duplicate registration is case insensitive and leaves the existing account usable', async () => {
  const response = await fetch(`${base}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'ALICE@example.com',
      password: 'a-different-password',
    }),
  });
  assert.equal(response.status, 409);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.doesNotMatch(await response.text(), /password_hash|argon2|INSERT/i);
});

test('sign-in accepts the original password and rejects wrong or unknown credentials', async () => {
  for (const email of ['alice@example.com', 'missing@example.com']) {
    const rejected = await fetch(`${base}/api/accounts/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ email, password: 'a-different-password' }),
    });
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers.get('set-cookie'), null);
    assert.equal(
      (await rejected.json()).message,
      'Email or password is incorrect.',
    );
  }
  const response = await fetch(`${base}/api/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'ALICE@example.com',
      password: 'long-enough-passphrase',
    }),
  });
  assert.equal(response.status, 200);
  const account = await response.json();
  assert.equal(account.email, 'alice@example.com');
  assert.deepEqual(Object.keys(account).sort(), ['email', 'id']);
  const me = await fetch(`${base}/api/accounts/me`, {
    headers: { Cookie: response.headers.get('set-cookie')! },
  });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), account);
  assert.equal((await fetch(`${base}/api/accounts/me`)).status, 401);
});

test('sessions survive server restarts, rotate on sign-in, and are revoked by logout', async () => {
  const login = (cookie?: string) =>
    fetch(`${base}/api/accounts/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        email: 'alice@example.com',
        password: 'long-enough-passphrase',
      }),
    });
  const original = (await login()).headers.get('set-cookie')!;
  await app.close();
  app = await createApp({
    databaseUrl: postgres.url,
    origin,
    sessionSecret: 'a-disposable-test-secret-at-least-32-characters',
  });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  assert.equal(
    (await fetch(`${base}/api/accounts/me`, { headers: { Cookie: original } }))
      .status,
    200,
  );
  const renewed = (await login(original)).headers.get('set-cookie')!;
  assert.notEqual(renewed.split(';')[0], original.split(';')[0]);
  assert.equal(
    (await fetch(`${base}/api/accounts/me`, { headers: { Cookie: original } }))
      .status,
    401,
  );
  const logout = await fetch(`${base}/api/accounts/logout`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: renewed },
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/i);
  assert.equal(
    (await fetch(`${base}/api/accounts/me`, { headers: { Cookie: renewed } }))
      .status,
    401,
  );
});

test('mutations reject missing and foreign origins, including logout with a valid cookie', async () => {
  const signedIn = await fetch(`${base}/api/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'alice@example.com',
      password: 'long-enough-passphrase',
    }),
  });
  const cookie = signedIn.headers.get('set-cookie')!;
  for (const endpoint of ['register', 'login', 'logout']) {
    for (const supplied of [undefined, 'https://attacker.example', 'null']) {
      const response = await fetch(`${base}/api/accounts/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          ...(supplied ? { Origin: supplied } : {}),
        },
        body: JSON.stringify({
          email: 'csrf@example.com',
          password: 'long-enough-passphrase',
        }),
      });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('set-cookie'), null);
    }
  }
  const me = await fetch(`${base}/api/accounts/me`, {
    headers: { Cookie: cookie },
  });
  assert.equal(me.status, 200);
  assert.equal(me.headers.get('cache-control'), 'no-store');
});

test('expired sessions cannot authenticate even when their cookie is replayed', async () => {
  const shortLived = await createApp({
    databaseUrl: postgres.url,
    origin,
    sessionSecret: 'a-disposable-test-secret-at-least-32-characters',
    sessionMaxAgeMs: 100,
  });
  await shortLived.listen(0, '127.0.0.1');
  try {
    const address = await shortLived.getUrl();
    const signedIn = await fetch(`${address}/api/accounts/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        email: 'alice@example.com',
        password: 'long-enough-passphrase',
      }),
    });
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers.get('set-cookie')!;
    assert.equal(
      (
        await fetch(`${address}/api/accounts/me`, {
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(
      (
        await fetch(`${address}/api/accounts/me`, {
          headers: { Cookie: cookie },
        })
      ).status,
      401,
    );
  } finally {
    await shortLived.close();
  }
});

test('sign-in attempts are bounded per account and remain bounded after a restart', async () => {
  const attempt = () =>
    fetch(`${base}/api/accounts/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        email: 'bounded@example.com',
        password: 'long-enough-passphrase',
      }),
    });
  for (let count = 0; count < 10; count++)
    assert.equal((await attempt()).status, 401);
  assert.equal((await attempt()).status, 429);
  await app.close();
  app = await createApp({
    databaseUrl: postgres.url,
    origin,
    sessionSecret: 'a-disposable-test-secret-at-least-32-characters',
  });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('HTTPS deployments issue Secure cookies only through an explicitly trusted loopback proxy', async () => {
  const secureOrigin = 'https://tracker.example';
  const secureApp = await createApp({
    databaseUrl: postgres.url,
    origin: secureOrigin,
    sessionSecret: 'a-disposable-test-secret-at-least-32-characters',
    trustProxyLoopback: true,
  });
  await secureApp.listen(0, '127.0.0.1');
  try {
    const address = await secureApp.getUrl();
    const response = await fetch(`${address}/api/accounts/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: secureOrigin,
        'X-Forwarded-Proto': 'https',
      },
      body: JSON.stringify({
        email: 'secure-cookie@example.com',
        password: 'long-enough-passphrase',
      }),
    });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie);
    assert.match(cookie, /; Secure/i);
    assert.match(cookie, /; HttpOnly/i);
    assert.match(cookie, /; SameSite=Lax/i);
    const plain = await fetch(`${address}/api/accounts/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: secureOrigin },
      body: JSON.stringify({
        email: 'secure-cookie@example.com',
        password: 'long-enough-passphrase',
      }),
    });
    assert.equal(plain.headers.get('set-cookie'), null);
  } finally {
    await secureApp.close();
  }
});

test('one address cannot bypass the authentication limit by varying emails or forwarding headers', async () => {
  let blocked = false;
  for (let count = 0; count < 61; count++) {
    const attempt = await fetch(`${base}/api/accounts/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        'X-Forwarded-For': `192.0.2.${count}`,
      },
      body: JSON.stringify({
        email: `ip-limit-${count}@example.com`,
        password: 'long-enough-passphrase',
      }),
    });
    assert.ok([401, 429].includes(attempt.status));
    if (attempt.status === 429) {
      blocked = true;
      break;
    }
  }
  assert.equal(blocked, true);
  const registration = await fetch(`${base}/api/accounts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      email: 'ip-limit-register@example.com',
      password: 'long-enough-passphrase',
    }),
  });
  assert.equal(registration.status, 429);
  assert.equal(registration.headers.get('set-cookie'), null);
});
