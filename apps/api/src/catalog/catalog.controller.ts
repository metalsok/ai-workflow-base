import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SignedInGuard } from '../accounts/signed-in.guard.js';
import { SearchTextPipe } from './search-text.pipe.js';
import { SearchPagePipe } from './search-page.pipe.js';
import { CatalogService } from './catalog.service.js';
import { DiscoveryService } from './discovery.service.js';
import { parseGameId } from './game.js';
import { IgdbUnavailableFilter } from './igdb-unavailable.filter.js';

@Controller('api/catalog')
@UseGuards(SignedInGuard)
@UseFilters(IgdbUnavailableFilter)
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
  ) {}

  /** GET /api/catalog/search?q=zelda&page=2 */
  @Get('search')
  search(
    @Query('q', SearchTextPipe) q: string,
    @Query('page', SearchPagePipe) page: number,
  ) {
    return this.catalog.search(q, page);
  }

  /** GET /api/catalog/games/119171 */
  @Get('games/:id')
  details(@Param('id') id: string) {
    return this.catalog.details(parseGameId(id));
  }

  /** GET /api/catalog/discovery/popular or /api/catalog/discovery/recent */
  @Get('discovery/:kind')
  feed(@Param('kind') kind: string) {
    if (kind !== 'popular' && kind !== 'recent')
      throw new BadRequestException('Choose a valid discovery feed.');
    return this.discovery.feed(kind);
  }
}
