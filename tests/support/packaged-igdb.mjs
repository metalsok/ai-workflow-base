// Verification image only: replace the external provider boundary, retaining the production entrypoint.
import { browserIgdbFetch } from './fixtures/browser-igdb.js';
const transport = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const hostname = new URL(String(input)).hostname;
  return ['id.twitch.tv', 'api.igdb.com'].includes(hostname)
    ? browserIgdbFetch(input, init)
    : transport(input, init);
};
