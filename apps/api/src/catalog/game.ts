import { BadRequestException } from '@nestjs/common';

/** A game as the frontend receives it. Unknown values are null or []. */
export interface CatalogGame {
  /** The IGDB id. */
  id: number;
  title: string;
  kind: 'main' | 'remake' | 'remaster';
  coverUrl: string | null;
  /** First release on any platform, as YYYY-MM-DD. */
  firstReleaseDate: string | null;
  platforms: string[];
  summary: string | null;
  genres: string[];
  developers: string[];
  publishers: string[];
}

/** A feed card: the game plus a wide artwork for the hero banner. */
export interface DiscoveryGame extends CatalogGame {
  artworkUrl: string | null;
}

/** Parses a game id from the URL. 400 unless it is a whole number ≥ 1. */
export function parseGameId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id))
    throw new BadRequestException('Use a valid game ID.');
  return id;
}

export type SearchItem = Pick<
  CatalogGame,
  'id' | 'title' | 'kind' | 'coverUrl' | 'firstReleaseDate' | 'platforms'
>;
