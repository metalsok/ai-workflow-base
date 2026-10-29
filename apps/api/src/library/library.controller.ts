import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { SignedInAccount } from '../accounts/accounts.service.js';
import { CurrentAccount, SignedInGuard } from '../accounts/signed-in.guard.js';
import { parseGameId } from '../catalog/game.js';
import { IgdbUnavailableFilter } from '../catalog/igdb-unavailable.filter.js';
import { PLAY_STATUSES, type PlayStatus } from './library-entry.entity.js';
import { LibraryService, type StatusFilter } from './library.service.js';

@Controller('api/library')
@UseGuards(SignedInGuard)
@UseFilters(IgdbUnavailableFilter)
export class LibraryController {
  constructor(
    @Inject(LibraryService) private readonly library: LibraryService,
  ) {}

  /** GET /api/library or /api/library?status=playing (or =played) */
  @Get()
  list(
    @CurrentAccount() account: SignedInAccount,
    @Query('status') status: unknown,
  ) {
    return this.library.list(account.id, parseStatusFilter(status));
  }

  /** POST /api/library/games/119171 — save as want-to-play */
  @Post('games/:id')
  add(@CurrentAccount() account: SignedInAccount, @Param('id') id: string) {
    return this.library.add(account.id, parseGameId(id));
  }

  /** PATCH /api/library/games/119171 with { "status": "playing" } */
  @Patch('games/:id')
  changeStatus(
    @CurrentAccount() account: SignedInAccount,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const status = (body as { status?: unknown } | null)?.status;
    return this.library.changeStatus(
      account.id,
      parseGameId(id),
      parseStatus(status),
    );
  }

  /** DELETE /api/library/games/119171 */
  @Delete('games/:id')
  @HttpCode(204)
  remove(@CurrentAccount() account: SignedInAccount, @Param('id') id: string) {
    return this.library.remove(account.id, parseGameId(id));
  }
}

function parseStatus(value: unknown): PlayStatus {
  if (!PLAY_STATUSES.includes(value as PlayStatus))
    throw new BadRequestException('Choose a valid Play status.');
  return value as PlayStatus;
}

/** No filter, `played`, or one of the four statuses. */
function parseStatusFilter(value: unknown): StatusFilter | undefined {
  if (value === undefined) return undefined;
  if (value === 'played') return 'played';
  return parseStatus(value);
}
