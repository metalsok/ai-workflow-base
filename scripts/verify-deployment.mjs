import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

const state = await mkdtemp(join(tmpdir(), 'game-tracker-package-'));
const envFile = join(state, 'settings.env');
const project = `game-tracker-check-${randomBytes(5).toString('hex')}`;
const restoredProject = `${project}-restore`;
const secretValues = [];
const redacted = (value) =>
  secretValues.reduce(
    (text, secret) => (secret ? text.replaceAll(secret, '<REDACTED>') : text),
    value,
  );
async function run(command, args, { input, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const chunks = [];
    const errors = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks))
        : reject(
            new Error(
              `${command} failed (${code}): ${redacted(Buffer.concat(errors).toString()).slice(-4000)}`,
            ),
          ),
    );
  });
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
const port = await freePort();
const restoredPort = await freePort();
const origin = `http://127.0.0.1:${port}`;
const restoredOrigin = `http://127.0.0.1:${restoredPort}`;
const deploymentEnv = {
  DEPLOY_STATE_DIR: state,
  DEPLOY_ENV_FILE: envFile,
  APP_PORT: String(port),
  APP_ORIGIN: origin,
  DEPLOY_IGDB_CLIENT_ID: 'packaged-fixture-id',
  DEPLOY_IGDB_CLIENT_SECRET: 'packaged-fixture-secret',
  APP_IMAGE: 'game-tracker:verify',
  APP_BUILD_TARGET: 'verification',
};
const compose = (name, args, options = {}) =>
  run(
    'docker',
    [
      'compose',
      '--env-file',
      envFile,
      '-p',
      name,
      '-f',
      'compose.production.yaml',
      ...args,
    ],
    {
      ...options,
      env: {
        ...deploymentEnv,
        ...(name === restoredProject
          ? { APP_PORT: String(restoredPort), APP_ORIGIN: restoredOrigin }
          : {}),
        ...options.env,
      },
    },
  );
async function request(base, path, cookie = '', method = 'GET', body) {
  return fetch(base + path, {
    method,
    headers: {
      Cookie: cookie,
      Origin: base,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
}
async function ready(base) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await request(base, '/api/health')).ok) return;
    } catch {}
    await pause(200);
  }
  throw new Error('Packaged application did not become healthy.');
}
let cleanupError;
try {
  console.log(
    'Creating isolated deployment settings and building production/verification images.',
  );
  await run(process.execPath, ['scripts/setup-deployment.mjs'], {
    env: deploymentEnv,
  });
  for (const name of [
    'postgres_password',
    'session_secret',
    'igdb_client_secret',
  ])
    secretValues.push(
      (await readFile(join(state, 'secrets', name), 'utf8')).trim(),
    );
  if (!process.argv.includes('--skip-build')) {
    await run('docker', [
      'build',
      '--target',
      'runtime',
      '-t',
      'game-tracker:local',
      '.',
    ]);
    await run('docker', [
      'build',
      '--target',
      'verification',
      '-t',
      'game-tracker:verify',
      '.',
    ]);
  }
  await compose(project, ['config', '--quiet']);
  await compose(project, ['up', '-d', '--wait']);
  await ready(origin);
  console.log(
    'Compose startup, migrations and readiness passed. Checking packaged HTTP behavior.',
  );
  const password = randomBytes(24).toString('hex');
  const newPassword = randomBytes(24).toString('hex');
  secretValues.push(password, newPassword);
  const email = `packaged-${randomBytes(6).toString('hex')}@example.com`;
  const registered = await request(
    origin,
    '/api/accounts/register',
    '',
    'POST',
    { email, password },
  );
  assert.equal(registered.status, 201);
  let cookie = registered.headers.get('set-cookie');
  const account = await registered.json();
  const revokedCookie = cookie;
  assert.equal(
    (await request(origin, '/api/library/games/119171', cookie, 'POST')).status,
    201,
  );
  assert.equal(
    (
      await request(origin, '/api/library/games/119171', cookie, 'PATCH', {
        status: 'completed',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await (
        await request(origin, '/api/library/games/119171', cookie, 'POST')
      ).json()
    ).status,
    'completed',
  );
  const other = await request(origin, '/api/accounts/register', '', 'POST', {
    email: `other-${email}`,
    password,
  });
  const otherCookie = other.headers.get('set-cookie');
  assert.deepEqual(
    (await (await request(origin, '/api/library', otherCookie)).json()).items,
    [],
  );
  assert.equal(
    (
      await request(origin, '/api/library/games/119171', otherCookie, 'PATCH', {
        status: 'playing',
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(origin + '/api/library/games/119171', {
        method: 'DELETE',
        headers: { Cookie: cookie, Origin: 'http://foreign.invalid' },
      })
    ).status,
    403,
  );
  assert.equal((await request(origin, '/library')).status, 200);
  await compose(
    project,
    [
      'run',
      '--rm',
      '--no-deps',
      'app',
      'node',
      'dist/api/accounts/reset.cli.js',
      email,
    ],
    { input: newPassword + '\n' },
  );
  assert.equal((await request(origin, '/api/accounts/me', cookie)).status, 401);
  assert.equal(
    (
      await request(origin, '/api/accounts/login', '', 'POST', {
        email,
        password,
      })
    ).status,
    401,
  );
  const login = await request(origin, '/api/accounts/login', '', 'POST', {
    email,
    password: newPassword,
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie');
  assert.deepEqual(await login.json(), account);
  await compose(project, ['restart', 'db']);
  for (let attempt = 0; ; attempt++) {
    try {
      await compose(project, [
        'exec',
        '-T',
        'db',
        'pg_isready',
        '-U',
        'game_tracker',
        '-d',
        'game_tracker',
      ]);
      break;
    } catch (error) {
      if (attempt > 50) throw error;
      await pause(200);
    }
  }
  await compose(project, ['restart', 'app']);
  await ready(origin);
  assert.equal((await request(origin, '/api/accounts/me', cookie)).status, 200);
  const expectedLibrary = await (
    await request(origin, '/api/library', cookie)
  ).json();
  assert.equal(expectedLibrary.items[0].status, 'completed');
  console.log(
    'Account recovery and container restart persistence passed. Rehearsing backup/restore.',
  );
  const backup = await compose(project, [
    'exec',
    '-T',
    'db',
    'pg_dump',
    '-U',
    'game_tracker',
    '-d',
    'game_tracker',
    '--format=custom',
  ]);
  await writeFile(join(state, 'backup.dump'), backup, { mode: 0o600 });
  await compose(restoredProject, ['up', '-d', '--wait', 'db']);
  await compose(restoredProject, ['exec', '-T', 'db', 'pg_restore', '--list'], {
    input: backup,
  });
  await compose(
    restoredProject,
    [
      'exec',
      '-T',
      'db',
      'pg_restore',
      '--no-owner',
      '-U',
      'game_tracker',
      '-d',
      'game_tracker',
    ],
    { input: backup },
  );
  await compose(restoredProject, ['up', '-d', '--wait']);
  await ready(restoredOrigin);
  assert.equal(
    (await request(restoredOrigin, '/api/accounts/me', cookie)).status,
    200,
  );
  assert.equal(
    (await request(restoredOrigin, '/api/accounts/me', revokedCookie)).status,
    401,
  );
  assert.deepEqual(
    await (await request(restoredOrigin, '/api/library', cookie)).json(),
    expectedLibrary,
  );
  const restoredLogin = await request(
    restoredOrigin,
    '/api/accounts/login',
    '',
    'POST',
    { email, password: newPassword },
  );
  assert.equal(restoredLogin.status, 200);
  console.log(
    'Backup restored with account, session and library continuity. Running packaged browser journeys.',
  );
  await run('npx', ['playwright', 'test'], {
    env: { PACKAGED_APP_ORIGIN: origin },
  });
  const containers = JSON.parse(
    (await compose(project, ['ps', '--format', 'json']))
      .toString()
      .trim()
      .split('\n')
      .find((line) => JSON.parse(line).Service === 'db'),
  );
  assert.equal(
    (containers.Publishers ?? []).some((port) => port.PublishedPort > 0),
    false,
  );
  const history = (
    await run('docker', [
      'history',
      '--no-trunc',
      '--format',
      '{{.CreatedBy}}',
      'game-tracker:local',
    ])
  ).toString();
  const logs = (await compose(project, ['logs', '--no-color'])).toString();
  for (const secret of secretValues)
    if (secret) {
      assert.equal(history.includes(secret), false);
      assert.equal(logs.includes(secret), false);
    }
  const scan = `const fs=require('node:fs');const assert=require('node:assert/strict');const needles=JSON.parse(fs.readFileSync(0,'utf8'));for(const path of ['/app/.env','/app/.deploy','/app/verification'])assert.equal(fs.existsSync(path),false);assert.notEqual(process.getuid(),0);function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())walk(path);else{const text=fs.readFileSync(path).toString();for(const secret of needles)if(secret)assert.equal(text.includes(secret),false);}}}walk('/app/dist');console.log('Production assets contain no verification fixtures or runtime secrets.');`;
  await run(
    'docker',
    [
      'run',
      '--rm',
      '--network',
      'none',
      '-i',
      '--entrypoint',
      'node',
      'game-tracker:local',
      '-e',
      scan,
    ],
    { input: JSON.stringify(secretValues) },
  );
  await compose(project, ['stop', 'db']);
  assert.equal((await request(origin, '/api/health')).status, 503);
  const version = (
    await run('docker', ['version', '--format', '{{.Server.Version}}'])
  )
    .toString()
    .trim();
  const report = {
    verifiedAt: new Date().toISOString(),
    docker: version,
    architecture: process.arch,
    image: 'game-tracker:local',
    fixtureImage: 'game-tracker:verify',
    http: true,
    browserJourneys: 12,
    restartPersistence: true,
    recovery: true,
    backupRestore: true,
    originalSessionRestored: true,
    databaseNotPublished: true,
    runtimeSecretsAbsentFromImagesBundlesLogs: true,
    readinessDetectsDatabaseOutage: true,
    backupBytes: backup.length,
    backupSha256: createHash('sha256').update(backup).digest('hex'),
  };
  await writeFile(
    '.scratch/game-tracker-build/verification/06-containers.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'Packaged verification passed. Removing only the disposable projects and volumes.',
  );
} finally {
  for (const name of [restoredProject, project]) {
    try {
      await compose(name, ['down', '-v', '--remove-orphans']);
    } catch (error) {
      cleanupError ??= error;
    }
  }
  if (!cleanupError) await rm(state, { recursive: true, force: true });
  if (cleanupError) throw cleanupError;
}
