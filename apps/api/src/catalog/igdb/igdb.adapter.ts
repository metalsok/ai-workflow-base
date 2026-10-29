import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock.js';
import type { CatalogGame, DiscoveryGame, SearchItem } from '../game.js';
import { IgdbClient } from './igdb.client.js';
import { asObject, toCatalogGame, toDiscoveryGame } from './igdb.mapper.js';
import { GAME_FIELDS, SCOPE_FILTER, FEED_FIELDS } from './igdb.queries.js';

const FEED_SIZE = 12;
const RECENT_WINDOW_SECONDS = 90 * 24 * 60 * 60;

/** Translates catalog operations into IGDB queries and validated application data. */
@Injectable()
export class IgdbAdapter {
  constructor(
    @Inject(IgdbClient) private readonly igdb: IgdbClient,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  async searchGames(
    query: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: SearchItem[]; hasMore: boolean }> {
    // Ask for one extra result to learn whether a next page exists.
    const rows = await this.igdb.query(
      'games',
      `search ${JSON.stringify(query)}; fields ${GAME_FIELDS}; where ${SCOPE_FILTER}; ` +
        `limit ${pageSize + 1}; offset ${(page - 1) * pageSize};`,
    );
    const items = rows
      .slice(0, pageSize)
      .map(toCatalogGame)
      .filter((game) => game !== null)
      .map(({ id, title, kind, coverUrl, firstReleaseDate, platforms }) => ({
        id,
        title,
        kind,
        coverUrl,
        firstReleaseDate,
        platforms,
      }));
    return { items, hasMore: rows.length > pageSize };
  }

  async getGame(id: number): Promise<CatalogGame | null> {
    const rows = await this.igdb.query(
      'games',
      `fields ${GAME_FIELDS}; where id = ${id} & ${SCOPE_FILTER}; limit 1;`,
    );
    const game = toCatalogGame(rows[0]);
    return game?.id === id ? game : null;
  }

  /** Most rated: game details ordered by IGDB user rating count in one call. */
  async getPopularGames(): Promise<DiscoveryGame[]> {
    const rows = await this.igdb.query(
      'games',
      `fields ${FEED_FIELDS},rating_count; where ${SCOPE_FILTER} & rating_count > 0; ` +
        `sort rating_count desc; limit ${FEED_SIZE};`,
    );
    return rows
      .map(toDiscoveryGame)
      .filter((game) => game !== null)
      .slice(0, FEED_SIZE);
  }

  /** Games first released in the last 90 days, newest first. */
  async getRecentGames(): Promise<DiscoveryGame[]> {
    const end = Math.floor(this.now() / 1000);
    const start = end - RECENT_WINDOW_SECONDS;
    const rows = await this.igdb.query(
      'games',
      `fields ${FEED_FIELDS}; where ${SCOPE_FILTER} & first_release_date >= ${start} & first_release_date <= ${end}; ` +
        `sort first_release_date desc; limit ${FEED_SIZE};`,
    );
    return rows
      .flatMap((row) => {
        const game = toDiscoveryGame(row);
        const releasedAt = asObject(row)?.['first_release_date'];
        return game && typeof releasedAt === 'number'
          ? [{ game, releasedAt }]
          : [];
      })
      .filter(({ releasedAt }) => releasedAt >= start && releasedAt <= end)
      .map(({ game }) => game);
  }
}
