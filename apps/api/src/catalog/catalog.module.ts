import type { Request } from 'express';
import { CatalogFailureFilter, CatalogUnavailable } from './unavailable.js';
import {
  Controller,
  type DynamicModule,
  Get,
  Inject,
  Module,
  Query,
  UseGuards,
  Param,
  NotFoundException,
  BadRequestException,
  UseFilters,
  Req,
  HttpException,
} from '@nestjs/common';
import {
  catalogFilter,
  searchFields,
  detailFields,
  eligible,
} from './scope.js';
import { normalizeGame } from './game.js';
import { AccountsGuard } from '../accounts/accounts.module.js';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { IgdbClient, type IgdbOptions } from './igdb.js';

@Controller('api/catalog')
@UseGuards(AccountsGuard)
@UseFilters(CatalogFailureFilter)
class CatalogController {
  constructor(
    @Inject(IgdbClient) private readonly igdb: IgdbClient,
    @Inject(Pool) private readonly pool: Pool,
    @Inject('catalog-clock') private readonly now: () => number,
  ) {}

  @Get('search')
  async search(
    @Req() request: Request,
    @Query('q') query: unknown,
    @Query('page') requestedPage?: unknown,
  ) {
    await this.limitRequest(request);
    if (
      typeof query !== 'string' ||
      query.trim().length < 2 ||
      query.trim().length > 100 ||
      /[\u0000-\u001f\u007f]/.test(query)
    )
      throw new BadRequestException(
        'Search for a title using 2–100 characters.',
      );
    if (
      requestedPage !== undefined &&
      (typeof requestedPage !== 'string' || !/^[1-9]\d*$/.test(requestedPage))
    )
      throw new BadRequestException('Choose a page from 1 to 50.');
    const page = Number(requestedPage ?? 1);
    if (page > 50) throw new BadRequestException('Choose a page from 1 to 50.');
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
  private async limitRequest(request: Request) {
    const result = await this.pool.query(
      `
      INSERT INTO catalog_request_limits (account_id, attempts, window_end)
      VALUES ($1, 1, to_timestamp($2 / 1000.0) + interval '1 minute')
      ON CONFLICT (account_id) DO UPDATE SET
        attempts = CASE WHEN catalog_request_limits.window_end <= to_timestamp($2 / 1000.0) THEN 1 ELSE catalog_request_limits.attempts + 1 END,
        window_end = CASE WHEN catalog_request_limits.window_end <= to_timestamp($2 / 1000.0) THEN to_timestamp($2 / 1000.0) + interval '1 minute' ELSE catalog_request_limits.window_end END
      RETURNING attempts, CEIL(EXTRACT(EPOCH FROM (window_end - to_timestamp($2 / 1000.0)))) AS retry_after
    `,
      [request.session.accountId, this.now()],
    );
    if (result.rows[0].attempts > 60) {
      request.res!.setHeader(
        'Retry-After',
        String(Math.max(1, Number(result.rows[0].retry_after))),
      );
      throw new HttpException(
        'Too many searches. Please wait and try again.',
        429,
      );
    }
  }

  @Get('games/:id')
  async details(@Req() request: Request, @Param('id') id: string) {
    await this.limitRequest(request);
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
      throw new BadRequestException('Use a valid game ID.');
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
        `fields ${detailFields}; where id = ${Number(id)} & ${catalogFilter}; limit 1;`,
      );
      const game = games[0];
      if (!game || game.id !== Number(id) || !eligible(game)) {
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

@Module({})
export class CatalogModule {
  static forOptions(
    _pool: Pool,
    options: IgdbOptions,
    accounts: DynamicModule,
  ): DynamicModule {
    return {
      module: CatalogModule,
      imports: [accounts],
      controllers: [CatalogController],
      providers: [
        { provide: IgdbClient, useValue: new IgdbClient(options) },
        { provide: Pool, useValue: _pool },
        { provide: 'catalog-clock', useValue: options.clock ?? Date.now },
      ],
    };
  }
}
