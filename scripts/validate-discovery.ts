import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { IgdbClient } from '../apps/api/src/catalog/igdb.js';
import {
  loadDiscovery,
  releaseWindowSeconds,
} from '../apps/api/src/catalog/discovery.js';

if (!process.argv.includes('--live')) {
  console.error(
    'Live IGDB checks are opt-in. Run npm run discovery:validate -- --live.',
  );
  process.exit(1);
}
async function validate() {
  const client = new IgdbClient({
    clientId: process.env.IGDB_CLIENT_ID,
    clientSecret: process.env.IGDB_CLIENT_SECRET,
  });
  const types = await client.records(
    'popularity_types',
    'fields name,external_popularity_source; limit 100;',
  );
  assert.ok(
    types.some(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        'id' in row &&
        'name' in row &&
        'external_popularity_source' in row &&
        row.id === 1 &&
        row.name === 'Visits' &&
        row.external_popularity_source === 121,
    ),
  );
  const now = Date.now();
  const popular = await loadDiscovery(client, 'popular', now);
  const recent = await loadDiscovery(client, 'recent', now);
  assert.ok(popular.items.length && recent.items.length);
  assert.ok(popular.items.length <= 12 && recent.items.length <= 12);
  assert.equal(popular.source, 'igdb-visits');
  const end = Math.floor(now / 1000);
  for (const game of recent.items) {
    assert.ok(game.firstReleaseDate);
    // The display date is date-only, so compare to the UTC days in the window.
    assert.ok(
      game.firstReleaseDate >=
        new Date((end - releaseWindowSeconds) * 1000)
          .toISOString()
          .slice(0, 10),
    );
    assert.ok(
      game.firstReleaseDate <= new Date(now).toISOString().slice(0, 10),
    );
  }
  assert.ok(
    [...popular.items, ...recent.items].some((game) =>
      game.genres.includes('Indie'),
    ),
  );
  const samples = (feed: typeof popular) =>
    feed.items.map((game) => ({
      id: game.id,
      title: game.title,
      kind: game.kind,
      firstReleaseDate: game.firstReleaseDate,
      genres: game.genres,
      developers: game.developers,
      publishers: game.publishers,
      hasArtwork: game.artworkUrl !== null,
    }));
  const report = {
    observedAt: new Date(now).toISOString(),
    popularityType: { id: 1, name: 'Visits', externalPopularitySource: 121 },
    popular: samples(popular),
    recent: samples(recent),
  };
  await writeFile(
    '.scratch/game-tracker-build/verification/04-live-feeds.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      observedAt: report.observedAt,
      popular: popular.items.length,
      recent: recent.items.length,
      indieMetadataObserved: true,
      report: '.scratch/game-tracker-build/verification/04-live-feeds.json',
    }),
  );
}
validate().catch(() => {
  console.error(
    'Live discovery validation failed; credentials and provider diagnostics were not logged.',
  );
  process.exitCode = 1;
});
