import { strict as assert } from 'node:assert';
import { writeFile } from 'node:fs/promises';
import { IgdbClient, type ProviderGame } from '../apps/api/src/catalog/igdb.js';
import {
  catalogFilter,
  detailFields,
  eligible,
} from '../apps/api/src/catalog/scope.js';

if (!process.argv.includes('--live')) {
  console.error(
    'Live IGDB checks are opt-in. Run npm run catalog:validate -- --live.',
  );
  process.exit(1);
}

async function validate() {
  const client = new IgdbClient({
    clientId: process.env.IGDB_CLIENT_ID,
    clientSecret: process.env.IGDB_CLIENT_SECRET,
  });
  const gameTypes = (await client.records(
    'game_types',
    'fields type; limit 100;',
  )) as { id: number; type: string }[];
  const platformTypes = (await client.records(
    'platform_types',
    'fields name; limit 100;',
  )) as { id: number; name: string }[];
  for (const [name, id] of [
    ['Main Game', 0],
    ['Remake', 8],
    ['Remaster', 9],
  ] as const)
    assert.ok(gameTypes.some((type) => type.id === id && type.type === name));
  for (const [name, id] of [
    ['Console', 1],
    ['Portable_console', 5],
    ['Computer', 6],
  ] as const)
    assert.ok(
      platformTypes.some((type) => type.id === id && type.name === name),
    );
  const platforms = await client.records(
    'platforms',
    'fields name,platform_type; where id = (3,6,14,34,39,130,167); limit 20;',
  );
  const main = await client.games(
    `fields ${detailFields}; where id = (119133,119171,7346) & ${catalogFilter}; limit 10;`,
  );
  assert.deepEqual(
    main.map((game) => game.id).sort((a, b) => a - b),
    [7346, 119133, 119171],
  );
  const alias = await client.games(
    `search "Baldur's Gate 3"; fields ${detailFields}; where ${catalogFilter}; limit 12;`,
  );
  assert.ok(
    alias.some(
      (game) => game.id === 119171 && game.name === "Baldur's Gate III",
    ),
  );
  const remakes = await client.games(
    `fields ${detailFields}; where game_type = 8 & ${catalogFilter}; limit 3;`,
  );
  const remasters = await client.games(
    `fields ${detailFields}; where game_type = 9 & ${catalogFilter}; limit 3;`,
  );
  assert.ok(remakes.length && remasters.length);
  const excluded = await client.games(
    `fields ${detailFields}; where id = (41826,210652,237895,180258); limit 10;`,
  );
  assert.equal(excluded.length, 4);
  assert.ok(excluded.every((game) => !eligible(game)));
  const excludedFiltered = await client.games(
    `fields ${detailFields}; where id = (41826,210652,237895,180258) & ${catalogFilter}; limit 10;`,
  );
  assert.equal(excludedFiltered.length, 0);
  const mobileSearch = await client.games(
    `search "Clash of Clans"; fields ${detailFields}; limit 10;`,
  );
  const mobileOnly = mobileSearch.filter(
    (game) =>
      game.game_type === 0 &&
      game.platforms?.length &&
      game.platforms.every((platform) => [34, 39].includes(platform.id)),
  );
  assert.ok(mobileOnly.length > 0);
  assert.ok(
    mobileOnly.map((game) => eligible(game)).every((value) => value === false),
  );
  const mobileFiltered = await client.games(
    `search "Clash of Clans"; fields ${detailFields}; where ${catalogFilter}; limit 12;`,
  );
  assert.ok(
    !mobileFiltered.some((game) =>
      mobileOnly.some((mobile) => mobile.id === game.id),
    ),
  );
  assert.ok(
    [...main, ...alias, ...remakes, ...remasters, ...mobileFiltered].every(
      eligible,
    ),
  );
  const summarize = (game: ProviderGame) => ({
    id: game.id,
    title: game.name,
    gameType: game.game_type,
    versionParent: game.version_parent ?? null,
    platforms: game.platforms ?? [],
    eligible: eligible(game),
  });
  const report = {
    checkedAt: new Date().toISOString(),
    filter: catalogFilter,
    gameTypes,
    platformTypes,
    platforms,
    main: main.map(summarize),
    alias: alias.map(summarize),
    remakes: remakes.map(summarize),
    remasters: remasters.map(summarize),
    excluded: excluded.map(summarize),
    mobileOnly: mobileOnly.map(summarize),
    outcome: 'passed',
    limits:
      'Representative classification and production-filter checks, not full catalog or feed validation.',
  };
  await writeFile(
    '.scratch/game-tracker-build/catalog-validation.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'Live catalog classification and filter checks passed. Public metadata report: .scratch/game-tracker-build/catalog-validation.json',
  );
}
validate().catch(() => {
  console.error(
    'Live catalog validation failed. Check IGDB availability, credentials, and current classification data. No credentials or provider diagnostics were logged.',
  );
  process.exitCode = 1;
});
