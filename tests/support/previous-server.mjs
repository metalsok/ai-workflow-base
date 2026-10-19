// Used only by the disposable recovery rehearsal, with an explicitly supplied
// old checkout and old dependencies. Never connects to DATABASE_URL.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { createApp } = await import(
  pathToFileURL(resolve(process.env.PREVIOUS_CHECKOUT, 'apps/api/src/app.ts'))
    .href
);
const app = await createApp({
  databaseUrl: process.env.REHEARSAL_DATABASE_URL,
  origin: 'http://127.0.0.1:4200',
  sessionSecret: 'disposable-rehearsal-secret-at-least-32-characters',
  igdb: {
    clientId: 'fixture',
    clientSecret: 'fixture',
    fetch: async (input) =>
      new URL(String(input)).hostname === 'id.twitch.tv'
        ? Response.json({ access_token: 'fixture', expires_in: 3600 })
        : Response.json([
            {
              id: 119171,
              name: "Baldur's Gate III",
              game_type: 0,
              platforms: [{ id: 6, name: 'PC', platform_type: 4 }],
            },
          ]),
  },
});
await app.listen(0, '127.0.0.1');
process.send(await app.getUrl());
process.on('message', async () => {
  await app.close();
  process.disconnect();
});
