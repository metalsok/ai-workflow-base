import {
  Controller,
  type DynamicModule,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
  UseFilters,
  BadRequestException,
  HttpException,
  Patch,
  Body,
  Query,
  NotFoundException,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import type { Request } from 'express';
import { In, type Repository } from 'typeorm';
import { AccountsGuard } from '../accounts/accounts.module.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { CatalogFailureFilter } from '../catalog/unavailable.js';
import { postgresError } from '../database/retry.js';
import {
  LibraryEntry,
  playStatuses,
  type PlayStatus,
} from './library-entry.entity.js';

function gameId(value: string) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new BadRequestException('Use a valid game ID.');
  return Number(value);
}
function playStatus(value: unknown): PlayStatus {
  if (typeof value !== 'string' || !playStatuses.includes(value as PlayStatus))
    throw new BadRequestException('Choose a valid Play status.');
  return value as PlayStatus;
}
function present(entry: LibraryEntry) {
  return { game: entry.game.metadata, status: entry.status };
}
@Injectable()
class LibraryService {
  constructor(
    @InjectRepository(LibraryEntry)
    private readonly entries: Repository<LibraryEntry>,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}
  async list(accountId: string, filter?: unknown) {
    const status =
      filter === undefined
        ? undefined
        : filter === 'played'
          ? In<PlayStatus>(['playing', 'completed', 'stopped-playing'])
          : playStatus(filter);
    const entries = await this.entries.find({
      where: { accountId, ...(status === undefined ? {} : { status }) },
      relations: { game: true },
      order: { gameId: 'ASC' },
    });
    return { items: entries.map(present) };
  }
  async remove(accountId: string, id: number) {
    const result = await this.entries.delete({ accountId, gameId: id });
    if (!result.affected) throw new NotFoundException('Saved game not found.');
  }
  async change(accountId: string, id: number, status: PlayStatus) {
    const result = await this.entries.update(
      { accountId, gameId: id },
      { status },
    );
    if (!result.affected) throw new NotFoundException('Saved game not found.');
    return present(
      await this.entries.findOneOrFail({
        where: { accountId, gameId: id },
        relations: { game: true },
      }),
    );
  }
  async add(request: Request, id: number) {
    const accountId = request.session.accountId!;
    const existing = await this.entries.findOne({
      where: { accountId, gameId: id },
      relations: { game: true },
    });
    if (existing) return present(existing);
    const retryAfter = await this.catalog.consumeRequest(accountId);
    if (retryAfter) {
      request.res!.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        'Too many searches. Please wait and try again.',
        429,
      );
    }
    await this.catalog.details(id);
    try {
      await this.entries.insert({
        accountId,
        gameId: id,
        status: 'want-to-play',
      });
    } catch (error) {
      const failure = postgresError(error);
      if (
        failure.code !== '23505' ||
        failure.constraint !== 'library_entries_pkey'
      )
        throw error;
    }
    return present(
      await this.entries.findOneOrFail({
        where: { accountId, gameId: id },
        relations: { game: true },
      }),
    );
  }
}
@Controller('api/library')
@UseGuards(AccountsGuard)
@UseFilters(CatalogFailureFilter)
class LibraryController {
  constructor(
    @Inject(LibraryService) private readonly library: LibraryService,
  ) {}
  @Get() list(@Req() request: Request, @Query('status') status?: unknown) {
    return this.library.list(request.session.accountId!, status);
  }
  @Delete('games/:id') @HttpCode(204) remove(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    return this.library.remove(request.session.accountId!, gameId(id));
  }
  @Patch('games/:id') change(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const status =
      typeof body === 'object' && body !== null && 'status' in body
        ? playStatus(body.status)
        : playStatus(undefined);
    return this.library.change(request.session.accountId!, gameId(id), status);
  }
  @Post('games/:id') add(@Req() request: Request, @Param('id') id: string) {
    return this.library.add(request, gameId(id));
  }
}
@Module({})
export class LibraryModule {
  static forModules(
    accounts: DynamicModule,
    catalog: DynamicModule,
  ): DynamicModule {
    return {
      module: LibraryModule,
      imports: [accounts, catalog, TypeOrmModule.forFeature([LibraryEntry])],
      controllers: [LibraryController],
      providers: [LibraryService],
    };
  }
}
