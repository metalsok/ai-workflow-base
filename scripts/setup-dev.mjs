import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { readFile, appendFile, chmod } from 'node:fs/promises';

const existing = await readFile('.env', 'utf8').catch((error) => {
  if (error.code !== 'ENOENT') throw error;
  return '';
});
const values = parseEnv(existing);
const has = (key) => Boolean(values[key]);
const password = values.POSTGRES_PASSWORD || randomBytes(24).toString('hex');
const defaults = {
  POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://game_tracker:${encodeURIComponent(password)}@127.0.0.1:5433/game_tracker`,
  SESSION_SECRET: randomBytes(48).toString('hex'),
  APP_ORIGIN: 'http://127.0.0.1:4200',
};
const additions = Object.entries(defaults).filter(([key]) => !has(key));
if (additions.length) {
  await appendFile(
    '.env',
    '\n' + additions.map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
    { mode: 0o600 },
  );
  await chmod('.env', 0o600);
}
console.log(
  'Local development configuration is ready in .env. Existing values were preserved.',
);
