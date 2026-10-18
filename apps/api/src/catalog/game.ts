import type { ProviderGame } from './igdb.js';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function names(values: unknown[]): string[] {
  return [
    ...new Set(
      values.map(text).filter((value): value is string => value !== null),
    ),
  ];
}

export function normalizeGame(game: ProviderGame) {
  const imageId = game.cover?.image_id;
  const date =
    typeof game.first_release_date === 'number' &&
    Number.isFinite(game.first_release_date)
      ? new Date(game.first_release_date * 1000)
      : null;
  const companies = Array.isArray(game.involved_companies)
    ? game.involved_companies
    : [];
  return {
    id: game.id,
    title: game.name.trim(),
    kind:
      game.game_type === 8
        ? 'remake'
        : game.game_type === 9
          ? 'remaster'
          : 'main',
    coverUrl:
      typeof imageId === 'string' && /^[a-zA-Z0-9_]+$/.test(imageId)
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
        : null,
    firstReleaseDate:
      date && !Number.isNaN(date.valueOf())
        ? date.toISOString().slice(0, 10)
        : null,
    platforms: names((game.platforms ?? []).map((platform) => platform?.name)),
    summary: text(game.summary),
    genres: names(
      (Array.isArray(game.genres) ? game.genres : []).map(
        (genre) => genre?.name,
      ),
    ),
    developers: names(
      companies
        .filter((company) => company?.developer === true)
        .map((company) => company.company?.name),
    ),
    publishers: names(
      companies
        .filter((company) => company?.publisher === true)
        .map((company) => company.company?.name),
    ),
  };
}
export type CatalogGame = ReturnType<typeof normalizeGame>;
