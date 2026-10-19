import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, In, type Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CachedGame } from './catalog-game.entity.js';
import { CachedSearch } from './catalog-search.entity.js';
import { CatalogRequestLimit } from './catalog-request-limit.entity.js';
import { retryTransaction } from '../database/retry.js';
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
    @Inject(DataSource) private readonly database: DataSource,
    @InjectRepository(CachedGame)
    private readonly games: Repository<CachedGame>,
    @InjectRepository(CachedSearch)
    private readonly searches: Repository<CachedSearch>,
    @Inject('catalog-clock') private readonly now: () => number,
  ) {}

  async consumeRequest(accountId: string): Promise<number> {
    const now = this.now();
    const counter = await retryTransaction(
      () =>
        this.database.transaction('SERIALIZABLE', async (manager) => {
          const limits = manager.getRepository(CatalogRequestLimit);
          let counter = await limits.findOneBy({ accountId });
          if (!counter || counter.windowEnd.valueOf() <= now) {
            counter = limits.create({
              accountId,
              attempts: 0,
              windowEnd: new Date(now + 60_000),
            });
          }
          counter.attempts++;
          return limits.save(counter);
        }),
      'catalog_request_limits_pkey',
    );
    return counter.attempts > 60
      ? Math.max(1, Math.ceil((counter.windowEnd.valueOf() - now) / 1000))
      : 0;
  }

  async search(query: string, page: number) {
    const key = createHash('sha256')
      .update(`${query.trim().toLowerCase()}|${page}`)
      .digest('hex');
    const cached = await this.searches.findOneBy({ cacheKey: key });
    if (
      cached &&
      new Date(cached.payload.fetchedAt).valueOf() + 5 * 60 * 1000 > this.now()
    )
      return cached.payload;
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
      // SERIALIZABLE includes the pruning read, so concurrent writers cannot
      // each keep a different set and leave more than 500 committed entries.
      await retryTransaction(() =>
        this.database.transaction('SERIALIZABLE', async (manager) => {
          const searches = manager.getRepository(CachedSearch);
          await searches.upsert(
            { cacheKey: key, payload, fetchedAt: new Date(payload.fetchedAt) },
            ['cacheKey'],
          );
          const excess = await searches.find({
            select: { cacheKey: true },
            order: { fetchedAt: 'DESC', cacheKey: 'ASC' },
            skip: 500,
          });
          if (excess.length)
            await searches.delete({
              cacheKey: In(excess.map((row) => row.cacheKey)),
            });
        }),
      );
      return payload;
    } catch (error) {
      if (error instanceof CatalogUnavailable && cached)
        return { ...cached.payload, stale: true };
      throw error;
    }
  }

  async details(id: number) {
    const cached = await this.games.findOneBy({ id, eligible: true });
    if (cached && cached.fetchedAt.valueOf() + 24 * 60 * 60 * 1000 > this.now())
      return {
        game: cached.metadata,
        fetchedAt: cached.fetchedAt.toISOString(),
        stale: false,
      };
    try {
      const games = await this.igdb.games(
        `fields ${detailFields}; where id = ${id} & ${catalogFilter}; limit 1;`,
      );
      const game = games[0];
      if (!game || game.id !== id || !eligible(game)) {
        await this.games.update({ id }, { eligible: false });
        throw new NotFoundException('Game not found.');
      }
      const payload = {
        game: normalizeGame(game),
        fetchedAt: new Date(this.now()).toISOString(),
        stale: false,
      };
      await this.games.upsert(
        {
          id,
          metadata: payload.game,
          fetchedAt: new Date(payload.fetchedAt),
          eligible: true,
        },
        ['id'],
      );
      return payload;
    } catch (error) {
      if (error instanceof CatalogUnavailable && cached)
        return {
          game: cached.metadata,
          fetchedAt: cached.fetchedAt.toISOString(),
          stale: true,
        };
      throw error;
    }
  }
}
