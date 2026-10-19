import type { IgdbClient, ProviderGame } from './igdb.js';
import { normalizeGame, type CatalogGame } from './game.js';
import { catalogFilter, detailFields, eligible } from './scope.js';
import { CatalogUnavailable } from './unavailable.js';

export type FeedKind = 'popular' | 'recent';
export interface DiscoveryGame extends CatalogGame {
  artworkUrl: string | null;
}
export interface DiscoveryPayload {
  items: DiscoveryGame[];
  source: 'igdb-visits' | 'first-release-date';
  fetchedAt: string;
  stale: boolean;
}
const feedFields = `${detailFields},artworks.image_id`;
export const feedLifetimeMs = 24 * 60 * 60 * 1000;
export const releaseWindowSeconds = 90 * 24 * 60 * 60;
function discoveryGame(game: ProviderGame): DiscoveryGame {
  const imageId = game.artworks?.find((art) =>
    /^[a-zA-Z0-9_]+$/.test(art.image_id ?? ''),
  )?.image_id;
  return {
    ...normalizeGame(game),
    artworkUrl: imageId
      ? `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg`
      : null,
  };
}

// Bounded batch lookups keep provider access independent of how many cards render.
export async function loadDiscovery(
  igdb: IgdbClient,
  kind: FeedKind,
  now: number,
): Promise<DiscoveryPayload> {
  let games: ProviderGame[];
  if (kind === 'popular') {
    const records = await igdb.records(
      'popularity_primitives',
      'fields game_id,value,popularity_type; where popularity_type = 1; sort value desc; limit 100;',
    );
    const rankings = records
      .flatMap((row) => {
        if (
          typeof row !== 'object' ||
          row === null ||
          !('game_id' in row) ||
          !('value' in row) ||
          !('popularity_type' in row)
        )
          return [];
        if (
          typeof row.game_id !== 'number' ||
          !Number.isSafeInteger(row.game_id) ||
          row.game_id <= 0 ||
          typeof row.value !== 'number' ||
          !Number.isFinite(row.value) ||
          row.value < 0 ||
          row.popularity_type !== 1
        )
          return [];
        return [{ id: row.game_id, value: row.value }];
      })
      .sort((a, b) => b.value - a.value || a.id - b.id);
    if (records.length && !rankings.length) throw new CatalogUnavailable();
    const ids = [...new Set(rankings.map((rank) => rank.id))].slice(0, 100);
    const byId = new Map(
      (ids.length
        ? await igdb.games(
            `fields ${feedFields}; where id = (${ids.join(',')}) & ${catalogFilter}; limit 100;`,
          )
        : []
      )
        .filter(eligible)
        .map((game) => [game.id, game]),
    );
    games = ids.flatMap((id) => {
      const game = byId.get(id);
      return game ? [game] : [];
    });
  } else {
    const end = Math.floor(now / 1000);
    const start = end - releaseWindowSeconds;
    games = (
      await igdb.games(
        `fields ${feedFields}; where ${catalogFilter} & first_release_date >= ${start} & first_release_date <= ${end}; sort first_release_date desc; limit 12;`,
      )
    )
      .filter(
        (game) =>
          eligible(game) &&
          game.first_release_date !== undefined &&
          game.first_release_date >= start &&
          game.first_release_date <= end,
      )
      .sort(
        (a, b) => b.first_release_date! - a.first_release_date! || a.id - b.id,
      );
  }
  const unique = [...new Map(games.map((game) => [game.id, game])).values()];
  return {
    items: unique.slice(0, 12).map(discoveryGame),
    source: kind === 'popular' ? 'igdb-visits' : 'first-release-date',
    fetchedAt: new Date(now).toISOString(),
    stale: false,
  };
}
