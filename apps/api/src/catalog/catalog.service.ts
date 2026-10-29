import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CachedGame } from './cached-game.entity.js';
import { CLOCK, type Clock } from './clock.js';
import type { CatalogGame, SearchItem } from './game.js';
import { IgdbAdapter } from './igdb/igdb.adapter.js';
export type { SearchItem } from './game.js';

export const PAGE_SIZE = 12;
const DETAILS_LIFETIME_MS = 24 * 60 * 60 * 1000;

export interface SearchResult {
  items: SearchItem[];
  page: number;
  nextPage: number | null;
  fetchedAt: string;
  stale: boolean;
}

export interface GameDetails {
  game: CatalogGame;
  fetchedAt: string;
  stale: boolean;
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(IgdbAdapter) private readonly igdb: IgdbAdapter,
    @InjectRepository(CachedGame)
    private readonly cachedGames: Repository<CachedGame>,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  /** One page of games whose title matches `query`. */
  async search(query: string, page: number): Promise<SearchResult> {
    const { items, hasMore } = await this.igdb.searchGames(
      query,
      page,
      PAGE_SIZE,
    );
    return {
      items,
      page,
      nextPage: hasMore && page < 50 ? page + 1 : null,
      fetchedAt: new Date(this.now()).toISOString(),
      stale: false,
    };
  }

  /**
   * Full metadata for one game. Uses our saved copy for 24 hours, otherwise
   * asks IGDB and saves the answer. 404 if IGDB has no such game in scope.
   */
  async details(id: number): Promise<GameDetails> {
    const cached = await this.cachedGames.findOneBy({ id, eligible: true });
    if (cached && cached.fetchedAt.valueOf() + DETAILS_LIFETIME_MS > this.now())
      return {
        game: cached.metadata,
        fetchedAt: cached.fetchedAt.toISOString(),
        stale: false,
      };

    const game = await this.igdb.getGame(id);
    if (!game) throw new NotFoundException('Game not found.');

    const fetchedAt = new Date(this.now());
    await this.cachedGames.upsert(
      { id, metadata: game, fetchedAt, eligible: true },
      ['id'],
    );
    return { game, fetchedAt: fetchedAt.toISOString(), stale: false };
  }
}
