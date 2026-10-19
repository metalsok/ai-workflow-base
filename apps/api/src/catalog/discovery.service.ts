import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CachedFeed } from './catalog-feed.entity.js';
import { IgdbClient } from './igdb.js';
import { CatalogUnavailable } from './unavailable.js';
import {
  feedLifetimeMs,
  loadDiscovery,
  type FeedKind,
  type DiscoveryPayload,
} from './discovery.js';

@Injectable()
export class DiscoveryService {
  private readonly pending = new Map<FeedKind, Promise<DiscoveryPayload>>();
  constructor(
    @InjectRepository(CachedFeed)
    private readonly feeds: Repository<CachedFeed>,
    @Inject(IgdbClient) private readonly igdb: IgdbClient,
    @Inject('catalog-clock') private readonly now: () => number,
  ) {}
  async feed(kind: FeedKind): Promise<DiscoveryPayload> {
    const cached = await this.feeds.findOneBy({ kind });
    if (cached && cached.fetchedAt.valueOf() + feedLifetimeMs > this.now())
      return cached.payload;
    const existing = this.pending.get(kind);
    if (existing) return existing;
    const refresh = this.refresh(kind, cached);
    this.pending.set(kind, refresh);
    try {
      return await refresh;
    } finally {
      this.pending.delete(kind);
    }
  }
  private async refresh(
    kind: FeedKind,
    cached: CachedFeed | null,
  ): Promise<DiscoveryPayload> {
    try {
      const payload = await loadDiscovery(this.igdb, kind, this.now());
      await this.feeds.upsert(
        { kind, payload, fetchedAt: new Date(payload.fetchedAt) },
        ['kind'],
      );
      return payload;
    } catch (error) {
      if (error instanceof CatalogUnavailable && cached)
        return { ...cached.payload, stale: true };
      throw error;
    }
  }
}
