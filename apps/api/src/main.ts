import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app.js';

// Starts the API for development: `npm run dev:api` (values come from .env).
const { DATABASE_URL, SESSION_SECRET } = process.env;
if (!DATABASE_URL || !SESSION_SECRET)
  throw new Error(
    'DATABASE_URL and SESSION_SECRET are required. Run node scripts/setup-dev.mjs.',
  );

const app = await createApp({
  databaseUrl: DATABASE_URL,
  sessionSecret: SESSION_SECRET,
  origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:4200',
  igdb: {
    clientId: process.env.IGDB_CLIENT_ID,
    clientSecret: process.env.IGDB_CLIENT_SECRET,
  },
});

// After `ng build`, also serve the Angular app; any non-/api URL gets index.html.
const frontend = resolve('dist/web/browser');
if (existsSync(resolve(frontend, 'index.html'))) {
  app.use(express.static(frontend));
  app
    .getHttpAdapter()
    .getInstance()
    .get(/^\/(?!api(?:\/|$)).*/, (_request, response) =>
      response.sendFile(resolve(frontend, 'index.html')),
    );
}

app.enableShutdownHooks();
await app.listen(
  Number(process.env.PORT ?? 3000),
  process.env.BIND_HOST ?? '127.0.0.1',
);
console.log('Game tracker api is listening.');
