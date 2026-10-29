export interface GameCard {
  id: number;
  title: string;
  kind: 'main' | 'remake' | 'remaster';
  coverUrl: string | null;
  firstReleaseDate: string | null;
  platforms: string[];
}
export interface Game extends GameCard {
  summary: string | null;
  genres: string[];
  developers: string[];
  publishers: string[];
}
export interface Freshness {
  fetchedAt: string;
  stale: boolean;
}
export interface SearchResult extends Freshness {
  items: GameCard[];
  page: number;
  nextPage: number | null;
}
export type FeedKind = 'popular' | 'recent';
export interface DiscoveryGame extends Game {
  artworkUrl: string | null;
}
export interface DiscoveryResult extends Freshness {
  items: DiscoveryGame[];
  source: 'igdb-visits' | 'igdb-rating-count' | 'first-release-date';
}
export interface GameResult extends Freshness {
  game: Game;
}
