import { createApp } from '../../apps/api/src/app.js';
import { startPostgres } from './postgres.js';
import express from 'express';
import { resolve } from 'node:path';

const postgres = await startPostgres();
const app = await createApp({
  databaseUrl: postgres.url,
  origin: 'http://127.0.0.1:4300',
  sessionSecret: 'disposable-browser-test-session-secret-at-least-32',
});
const frontend = resolve('dist/web/browser');
app.use(express.static(frontend));
app
  .getHttpAdapter()
  .getInstance()
  .get(
    /^\/(?!api(?:\/|$)).*/,
    (_request: express.Request, response: express.Response) =>
      response.sendFile(resolve(frontend, 'index.html')),
  );
await app.listen(4300, '127.0.0.1');
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await app.close();
  await postgres.stop();
}
process.on('SIGTERM', () => void close());
process.on('SIGINT', () => void close());
