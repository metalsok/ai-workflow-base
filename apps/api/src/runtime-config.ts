import { readFileSync } from 'node:fs';

// Compose mounts secret files at runtime; values never enter image build layers.
export function loadRuntimeSecrets() {
  const secret = (name: string) =>
    readFileSync(name, 'utf8').replace(/\r?\n$/, '');
  if (!process.env.DATABASE_URL && process.env.DATABASE_PASSWORD_FILE) {
    const url = new URL('postgresql://db:5432/game_tracker');
    url.hostname = process.env.DATABASE_HOST ?? 'db';
    url.port = process.env.DATABASE_PORT ?? '5432';
    url.pathname = process.env.DATABASE_NAME ?? 'game_tracker';
    url.username = process.env.DATABASE_USER ?? 'game_tracker';
    url.password = secret(process.env.DATABASE_PASSWORD_FILE);
    process.env.DATABASE_URL = url.toString();
  }
  for (const name of ['SESSION_SECRET', 'IGDB_CLIENT_SECRET'] as const) {
    const file = process.env[`${name}_FILE`];
    if (!process.env[name] && file) process.env[name] = secret(file);
  }
}
