import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createApp } from '../apps/api/src/app.js';
import { startPostgres, prepareDatabase } from './support/postgres.js';

let postgres: Awaited<ReturnType<typeof startPostgres>>;
let app: Awaited<ReturnType<typeof createApp>>;
let base: string;
const origin = 'http://127.0.0.1:4200';
const request = (path: string, cookie = '', body?: unknown) =>
  fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: cookie,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
async function reset(email: string, password: string) {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'apps/api/src/accounts/reset.cli.ts', email],
    {
      env: { ...process.env, DATABASE_URL: postgres.url },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => (output += String(chunk)));
  child.stderr.on('data', (chunk) => (output += String(chunk)));
  child.stdin.on('error', () => {});
  child.stdin.end(password + '\n');
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  assert.equal(output.includes(password), false);
  return { code, output };
}
before(async () => {
  postgres = await startPostgres();
  await prepareDatabase(postgres.url);
  app = await createApp({
    databaseUrl: postgres.url,
    origin,
    sessionSecret: 'disposable-recovery-session-secret-at-least-32',
  });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
  await postgres?.stop();
});

test('administrator recovery rejects old passwords and all old sessions, preserves other accounts, and allows the new password', async () => {
  const first = await request('/api/accounts/register', '', {
    email: 'recover@example.com',
    password: 'original-recovery-passphrase',
  });
  assert.equal(first.status, 201);
  const firstCookie = first.headers.get('set-cookie')!;
  const second = await request('/api/accounts/login', '', {
    email: 'recover@example.com',
    password: 'original-recovery-passphrase',
  });
  assert.equal(second.status, 200);
  const secondCookie = second.headers.get('set-cookie')!;
  const other = await request('/api/accounts/register', '', {
    email: 'unaffected@example.com',
    password: 'unaffected-account-passphrase',
  });
  const otherCookie = other.headers.get('set-cookie')!;
  const result = await reset(
    ' RECOVER@example.com ',
    'new-recovery-password-long',
  );
  assert.equal(result.code, 0, result.output);
  for (const cookie of [firstCookie, secondCookie]) {
    assert.equal((await request('/api/accounts/me', cookie)).status, 401);
    assert.equal((await request('/api/library', cookie)).status, 401);
    assert.equal(
      (await request('/api/catalog/discovery/popular', cookie)).status,
      401,
    );
  }
  assert.equal((await request('/api/accounts/me', otherCookie)).status, 200);
  assert.equal(
    (
      await request('/api/accounts/login', '', {
        email: 'recover@example.com',
        password: 'original-recovery-passphrase',
      })
    ).status,
    401,
  );
  const fresh = await request('/api/accounts/login', '', {
    email: 'recover@example.com',
    password: 'new-recovery-password-long',
  });
  assert.equal(fresh.status, 200);
  assert.deepEqual(Object.keys(await fresh.json()).sort(), ['email', 'id']);
  assert.equal(
    (await request('/api/accounts/me', fresh.headers.get('set-cookie')!))
      .status,
    200,
  );
});

test('invalid recovery passwords and unknown accounts fail safely without changing working credentials', async () => {
  assert.notEqual((await reset('recover@example.com', 'short')).code, 0);
  assert.notEqual(
    (await reset('unknown@example.com', 'unknown-account-password-long')).code,
    0,
  );
  assert.equal(
    (
      await request('/api/accounts/login', '', {
        email: 'recover@example.com',
        password: 'new-recovery-password-long',
      })
    ).status,
    200,
  );
});
