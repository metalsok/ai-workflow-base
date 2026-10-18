import type { ProviderGame } from './igdb.js';

// Verified against live game_types/platform_types, not deprecated category enums.
export const catalogFilter =
  'game_type = (0,8,9) & version_parent = null & (platforms.platform_type = (1,5,6) | platforms = (3,6,14))';
export const searchFields =
  'name,game_type,version_parent,cover.image_id,first_release_date,platforms.name,platforms.platform_type';
export const detailFields = `${searchFields},summary,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name`;

export function eligible(value: unknown): value is ProviderGame {
  if (!value || typeof value !== 'object') return false;
  const game = value as ProviderGame;
  return (
    Number.isSafeInteger(game.id) &&
    game.id > 0 &&
    typeof game.name === 'string' &&
    game.name.trim().length > 0 &&
    [0, 8, 9].includes(game.game_type ?? -1) &&
    game.version_parent == null &&
    Array.isArray(game.platforms) &&
    game.platforms.some(
      (platform) =>
        platform &&
        typeof platform === 'object' &&
        ([3, 6, 14].includes(platform.id) ||
          [1, 5, 6].includes(platform.platform_type ?? -1)),
    )
  );
}
