import type { Request } from 'express';
import { CatalogFailureFilter } from './unavailable.js';
import {
  Controller,
  type DynamicModule,
  Get,
  Inject,
  Module,
  Query,
  UseGuards,
  Param,
  BadRequestException,
  UseFilters,
  Req,
  HttpException,
} from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { AccountsGuard } from '../accounts/accounts.module.js';
import { Pool } from 'pg';
import { IgdbClient, type IgdbOptions } from './igdb.js';

@Controller('api/catalog')
@UseGuards(AccountsGuard)
@UseFilters(CatalogFailureFilter)
class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
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
    return this.catalog.search(query.trim(), page);
  }
  private async limitRequest(request: Request) {
    const retryAfter = await this.catalog.consumeRequest(
      request.session.accountId!,
    );
    if (retryAfter > 0) {
      request.res!.setHeader('Retry-After', String(retryAfter));
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
    return this.catalog.details(Number(id));
  }
}

@Module({})
export class CatalogModule {
  static forOptions(
    pool: Pool,
    options: IgdbOptions,
    accounts: DynamicModule,
  ): DynamicModule {
    return {
      module: CatalogModule,
      imports: [accounts],
      controllers: [CatalogController],
      providers: [
        CatalogService,
        { provide: IgdbClient, useValue: new IgdbClient(options) },
        { provide: Pool, useValue: pool },
        { provide: 'catalog-clock', useValue: options.clock ?? Date.now },
      ],
    };
  }
}
