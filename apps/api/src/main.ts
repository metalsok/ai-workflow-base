import { createApp } from './app.js';
import express from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  throw new Error(
    'DATABASE_URL and SESSION_SECRET are required. Run node scripts/setup-dev.mjs.',
  );
}
const app = await createApp({
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET,
  trustProxyLoopback: process.env.TRUST_PROXY_LOOPBACK === 'true',
  origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:4200',
});
const frontend = resolve('dist/web/browser');
if (existsSync(resolve(frontend, 'index.html'))) {
  app.use(express.static(frontend));
  app
    .getHttpAdapter()
    .getInstance()
    .get(
      /^\/(?!api(?:\/|$)).*/,
      (_request: express.Request, response: express.Response) =>
        response.sendFile(resolve(frontend, 'index.html')),
    );
}
app.enableShutdownHooks();
await app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
console.log('Game tracker API is listening on loopback.');
