import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type FindOptionsWhere, type Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service.js';
import type { CatalogGame } from '../catalog/game.js';
import { LibraryEntry, type PlayStatus } from './library-entry.entity.js';

/** `played` means "started": everything except want-to-play. */
export type StatusFilter = PlayStatus | 'played';

/** What the frontend receives for each saved game. */
export interface LibraryItem {
  game: CatalogGame;
  status: PlayStatus;
}

/**
 * Every method takes the signed-in account id and uses it in every query,
 * so one account can never see or change another account's entries.
 */
@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryEntry)
    private readonly entries: Repository<LibraryEntry>,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  async list(accountId: string, filter?: StatusFilter) {
    // TypeORM rejects `undefined` in a where clause, so add status only when filtering.
    const where: FindOptionsWhere<LibraryEntry> = { accountId };
    if (filter === 'played')
      where.status = In<PlayStatus>([
        'playing',
        'completed',
        'stopped-playing',
      ]);
    else if (filter) where.status = filter;
    const entries = await this.entries.find({
      where,
      relations: { game: true },
      order: { gameId: 'ASC' },
    });
    return { items: entries.map(toItem) };
  }

  /** Saves a game as want-to-play. Saving it again keeps its current status. */
  async add(accountId: string, gameId: number): Promise<LibraryItem> {
    const existing = await this.findEntry(accountId, gameId);
    if (existing) return toItem(existing);

    // Makes sure the game is in our scope, and stores its metadata.
    await this.catalog.details(gameId);
    // "or ignore": if a parallel request saved it a moment ago, keep that one.
    await this.entries
      .createQueryBuilder()
      .insert()
      .values({ accountId, gameId, status: 'want-to-play' })
      .orIgnore()
      .execute();
    return toItem((await this.findEntry(accountId, gameId))!);
  }

  async changeStatus(
    accountId: string,
    gameId: number,
    status: PlayStatus,
  ): Promise<LibraryItem> {
    const { affected } = await this.entries.update(
      { accountId, gameId },
      { status },
    );
    if (!affected) throw new NotFoundException('Saved game not found.');
    return toItem((await this.findEntry(accountId, gameId))!);
  }

  async remove(accountId: string, gameId: number): Promise<void> {
    const { affected } = await this.entries.delete({ accountId, gameId });
    if (!affected) throw new NotFoundException('Saved game not found.');
  }

  private findEntry(accountId: string, gameId: number) {
    return this.entries.findOne({
      where: { accountId, gameId },
      relations: { game: true },
    });
  }
}

function toItem(entry: LibraryEntry): LibraryItem {
  return { game: entry.game.metadata, status: entry.status };
}
