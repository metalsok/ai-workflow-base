import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CachedFeed } from './cached-feed.entity.js';
import { CLOCK, type Clock } from './clock.js';
import type { DiscoveryGame } from './game.js';
import { IgdbAdapter } from './igdb/igdb.adapter.js';
export type { DiscoveryGame } from './game.js';

export type FeedKind = 'popular' | 'recent';

export interface DiscoveryFeed {
  items: DiscoveryGame[];
  /** Tells the frontend how the list was ranked. */
  source: 'igdb-rating-count' | 'first-release-date';
  fetchedAt: string;
  stale: boolean;
}

const FEED_SIZE = 12;
const FEED_LIFETIME_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DiscoveryService {
  constructor(
    @Inject(IgdbAdapter) private readonly igdb: IgdbAdapter,
    @InjectRepository(CachedFeed)
    private readonly feeds: Repository<CachedFeed>,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  /** The feed, rebuilt from IGDB at most once a day. */
  async feed(kind: FeedKind): Promise<DiscoveryFeed> {
    const source =
      kind === 'popular' ? 'igdb-rating-count' : 'first-release-date';
    const cached = await this.feeds.findOneBy({ kind });
    if (
      cached &&
      cached.payload.source === source &&
      cached.fetchedAt.valueOf() + FEED_LIFETIME_MS > this.now()
    )
      return cached.payload;

    const games =
      kind === 'popular'
        ? await this.igdb.getPopularGames()
        : await this.igdb.getRecentGames();
    const fetchedAt = new Date(this.now());
    const feed: DiscoveryFeed = {
      items: games.slice(0, FEED_SIZE),
      source,
      fetchedAt: fetchedAt.toISOString(),
      stale: false,
    };
    await this.feeds.upsert({ kind, payload: feed, fetchedAt }, ['kind']);
    return feed;
  }
}
