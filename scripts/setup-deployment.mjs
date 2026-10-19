import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { resolve, join } from 'node:path';

const state = resolve(process.env.DEPLOY_STATE_DIR ?? '.deploy');
const envFile = resolve(process.env.DEPLOY_ENV_FILE ?? '.env.production');
const local = parseEnv(await readFile('.env', 'utf8').catch(() => ''));
await mkdir(join(state, 'secrets'), { recursive: true, mode: 0o700 });
await chmod(state, 0o700);
await chmod(join(state, 'secrets'), 0o700);
await mkdir(join(state, 'migration-lock'), { recursive: true });
// The parent is owner-only on the host; the bind mount must accept the image's non-root UID.
await chmod(join(state, 'migration-lock'), 0o777);
const values = {
  postgres_password: randomBytes(24).toString('hex'),
  session_secret: randomBytes(48).toString('hex'),
  igdb_client_secret:
    process.env.DEPLOY_IGDB_CLIENT_SECRET ?? local.IGDB_CLIENT_SECRET ?? '',
};
for (const [name, value] of Object.entries(values)) {
  const path = join(state, 'secrets', name);
  try {
    await writeFile(path, value + '\n', { flag: 'wx', mode: 0o444 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
const config = {
  APP_PORT: process.env.APP_PORT ?? '4400',
  APP_ORIGIN: process.env.APP_ORIGIN ?? 'http://127.0.0.1:4400',
  DEPLOY_STATE_DIR: state,
  IGDB_CLIENT_ID:
    process.env.DEPLOY_IGDB_CLIENT_ID ?? local.IGDB_CLIENT_ID ?? '',
};
try {
  await writeFile(
    envFile,
    Object.entries(config)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('\n') + '\n',
    { flag: 'wx', mode: 0o600 },
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
console.log(
  'Deployment settings are ready. Existing files were preserved; secrets were not printed.',
);
