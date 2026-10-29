import type { CatalogGame, DiscoveryGame } from '../game.js';

// Which IGDB games we show: main games (0), remakes (8) and remasters (9),
// not editions (version_parent), on a console/PC platform type (1, 5, 6) or
// on PC, DOS or Linux (6, 3, 14). Checked against live IGDB data.
const GAME_TYPES = [0, 8, 9];
const PLATFORM_TYPES = [1, 5, 6];
const PLATFORM_IDS = [3, 6, 14];

/**
 * Turns one IGDB row into a CatalogGame, or null when the row is broken or
 * outside our scope. IGDB data is untrusted, so every field is checked.
 */
export function toCatalogGame(raw: unknown): CatalogGame | null {
  const game = asObject(raw);
  if (!game) return null;
  const id = game['id'];
  const title = asText(game['name']);
  if (!Number.isSafeInteger(id) || (id as number) <= 0 || !title) return null;
  if (!GAME_TYPES.includes(game['game_type'] as number)) return null;
  if (game['version_parent'] != null) return null;

  const platforms = asObjects(game['platforms']);
  const onSupportedPlatform = platforms.some(
    (platform) =>
      PLATFORM_IDS.includes(platform['id'] as number) ||
      PLATFORM_TYPES.includes(platform['platform_type'] as number),
  );
  if (!onSupportedPlatform) return null;

  const companies = asObjects(game['involved_companies']);
  const companyNames = (role: 'developer' | 'publisher') =>
    uniqueTexts(
      companies
        .filter((company) => company[role] === true)
        .map((company) => asObject(company['company'])?.['name']),
    );

  return {
    id: id as number,
    title,
    kind:
      game['game_type'] === 8
        ? 'remake'
        : game['game_type'] === 9
          ? 'remaster'
          : 'main',
    coverUrl: igdbImageUrl(
      asObject(game['cover'])?.['image_id'],
      't_cover_big',
    ),
    firstReleaseDate: isoDate(game['first_release_date']),
    platforms: uniqueTexts(platforms.map((platform) => platform['name'])),
    summary: asText(game['summary']),
    genres: uniqueTexts(
      asObjects(game['genres']).map((genre) => genre['name']),
    ),
    developers: companyNames('developer'),
    publishers: companyNames('publisher'),
  };
}

/** Builds an IGDB image URL, or null for a missing or suspicious image id. */
export function igdbImageUrl(imageId: unknown, size: string): string | null {
  return typeof imageId === 'string' && /^[a-zA-Z0-9_]+$/.test(imageId)
    ? `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`
    : null;
}

// Small helpers for reading untrusted JSON.

export function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asObjects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(asObject).filter((item) => item !== null)
    : [];
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function uniqueTexts(values: unknown[]): string[] {
  return [...new Set(values.map(asText).filter((text) => text !== null))];
}

/** IGDB dates are seconds since 1970; we show only the day. */
function isoDate(seconds: unknown): string | null {
  if (typeof seconds !== 'number') return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

export function toDiscoveryGame(raw: unknown): DiscoveryGame | null {
  const game = toCatalogGame(raw);
  if (!game) return null;
  const artworkIds = asObjects(asObject(raw)?.['artworks']).map(
    (artwork) => artwork['image_id'],
  );
  const artworkUrl =
    artworkIds
      .map((imageId) => igdbImageUrl(imageId, 't_1080p'))
      .find((url) => url !== null) ?? null;
  return { ...game, artworkUrl };
}
