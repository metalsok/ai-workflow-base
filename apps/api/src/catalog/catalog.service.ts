import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { IgdbClient } from './igdb.js';
import {
  catalogFilter,
  searchFields,
  detailFields,
  eligible,
} from './scope.js';
import { normalizeGame } from './game.js';
import { CatalogUnavailable } from './unavailable.js';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(IgdbClient) private readonly igdb: IgdbClient,
    @Inject(Pool) private readonly pool: Pool,
    @Inject('catalog-clock') private readonly now: () => number,
  ) {}

  async consumeRequest(accountId: string): Promise<number> {
    const result = await this.pool.query(
      `
      INSERT INTO catalog_request_limits (account_id, attempts, window_end)
      VALUES ($1, 1, to_timestamp($2 / 1000.0) + interval '1 minute')
      ON CONFLICT (account_id) DO UPDATE SET
        attempts = CASE WHEN catalog_request_limits.window_end <= to_timestamp($2 / 1000.0) THEN 1 ELSE catalog_request_limits.attempts + 1 END,
        window_end = CASE WHEN catalog_request_limits.window_end <= to_timestamp($2 / 1000.0) THEN to_timestamp($2 / 1000.0) + interval '1 minute' ELSE catalog_request_limits.window_end END
      RETURNING attempts, CEIL(EXTRACT(EPOCH FROM (window_end - to_timestamp($2 / 1000.0)))) AS retry_after
    `,
      [accountId, this.now()],
    );
    return result.rows[0].attempts > 60
      ? Math.max(1, Number(result.rows[0].retry_after))
      : 0;
  }

  async search(query: string, page: number) {
    const key = createHash('sha256')
      .update(`${query.trim().toLowerCase()}|${page}`)
      .digest('hex');
    const cached = await this.pool.query(
      'SELECT payload FROM catalog_searches WHERE cache_key = $1',
      [key],
    );
    if (
      cached.rowCount &&
      new Date(cached.rows[0].payload.fetchedAt).valueOf() + 5 * 60 * 1000 >
        this.now()
    )
      return cached.rows[0].payload;
    try {
      const games = await this.igdb.games(
        `search ${JSON.stringify(query.trim())}; fields ${searchFields}; where ${catalogFilter}; limit 13; offset ${(page - 1) * 12};`,
      );
      const payload = {
        items: games
          .slice(0, 12)
          .filter(eligible)
          .map((game) => {
            const normalized = normalizeGame(game);
            return {
              id: normalized.id,
              title: normalized.title,
              kind: normalized.kind,
              coverUrl: normalized.coverUrl,
              firstReleaseDate: normalized.firstReleaseDate,
              platforms: normalized.platforms,
            };
          }),
        page,
        nextPage: games.length > 12 && page < 50 ? page + 1 : null,
        fetchedAt: new Date(this.now()).toISOString(),
        stale: false,
      };
      await this.pool.query(
        'INSERT INTO catalog_searches (cache_key, payload, fetched_at) VALUES ($1,$2,$3) ON CONFLICT (cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at',
        [key, payload, payload.fetchedAt],
      );
      await this.pool.query(
        'DELETE FROM catalog_searches WHERE cache_key IN (SELECT cache_key FROM catalog_searches ORDER BY fetched_at DESC OFFSET 500)',
      );
      return payload;
    } catch (error) {
      if (error instanceof CatalogUnavailable && cached.rowCount)
        return { ...cached.rows[0].payload, stale: true };
      throw error;
    }
  }

  async details(id: number) {
    const cached = await this.pool.query(
      'SELECT metadata, fetched_at FROM catalog_games WHERE id = $1 AND eligible = true',
      [id],
    );
    if (
      cached.rowCount &&
      cached.rows[0].fetched_at.valueOf() + 24 * 60 * 60 * 1000 > this.now()
    )
      return {
        game: cached.rows[0].metadata,
        fetchedAt: cached.rows[0].fetched_at.toISOString(),
        stale: false,
      };
    try {
      const games = await this.igdb.games(
        `fields ${detailFields}; where id = ${id} & ${catalogFilter}; limit 1;`,
      );
      const game = games[0];
      if (!game || game.id !== id || !eligible(game)) {
        await this.pool.query(
          'UPDATE catalog_games SET eligible = false WHERE id = $1',
          [id],
        );
        throw new NotFoundException('Game not found.');
      }
      const payload = {
        game: normalizeGame(game),
        fetchedAt: new Date(this.now()).toISOString(),
        stale: false,
      };
      await this.pool.query(
        'INSERT INTO catalog_games (id, metadata, fetched_at, eligible) VALUES ($1,$2,$3,true) ON CONFLICT (id) DO UPDATE SET metadata = excluded.metadata, fetched_at = excluded.fetched_at, eligible = true',
        [id, payload.game, payload.fetchedAt],
      );
      return payload;
    } catch (error) {
      if (error instanceof CatalogUnavailable && cached.rowCount)
        return {
          game: cached.rows[0].metadata,
          fetchedAt: cached.rows[0].fetched_at.toISOString(),
          stale: true,
        };
      throw error;
    }
  }
}
