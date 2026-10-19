export interface ProviderGame {
  id: number;
  name: string;
  game_type?: number;
  version_parent?: number | null;
  cover?: { image_id?: string };
  first_release_date?: number;
  platforms?: { id: number; name: string; platform_type?: number }[];
  summary?: string;
  genres?: { name: string }[];
  involved_companies?: {
    developer?: boolean;
    publisher?: boolean;
    company?: { name?: string };
  }[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(record).filter((item) => item !== undefined)
    : [];
}
function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// Decode untrusted JSON before exposing a typed provider record to Catalog.
export function parseProviderGame(value: unknown): ProviderGame | null {
  const game = record(value);
  if (
    !game ||
    !Number.isSafeInteger(game['id']) ||
    typeof game['name'] !== 'string'
  )
    return null;
  const versionParent = game['version_parent'];
  // A malformed edition marker must not become an eligible main title.
  if (versionParent != null && !Number.isSafeInteger(versionParent))
    return null;
  return {
    id: game['id'] as number,
    name: game['name'],
    game_type: number(game['game_type']),
    version_parent: versionParent == null ? null : (versionParent as number),
    cover: { image_id: text(record(game['cover'])?.['image_id']) },
    first_release_date: number(game['first_release_date']),
    summary: text(game['summary']),
    platforms: records(game['platforms']).flatMap((platform) => {
      const id = number(platform['id']);
      return id === undefined
        ? []
        : [
            {
              id,
              name: text(platform['name']) ?? '',
              platform_type: number(platform['platform_type']),
            },
          ];
    }),
    genres: records(game['genres']).flatMap((genre) => {
      const name = text(genre['name']);
      return name === undefined ? [] : [{ name }];
    }),
    involved_companies: records(game['involved_companies']).map((company) => ({
      developer: company['developer'] === true,
      publisher: company['publisher'] === true,
      company: { name: text(record(company['company'])?.['name']) },
    })),
  };
}
