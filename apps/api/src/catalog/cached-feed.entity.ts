import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { DiscoveryFeed, FeedKind } from './discovery.service.js';

/** One row of `catalog_feeds`: the last built feed of each kind. */
@Entity('catalog_feeds')
export class CachedFeed {
  @PrimaryColumn('text')
  kind!: FeedKind;

  @Column('jsonb')
  payload!: DiscoveryFeed;

  @Column('timestamptz', { name: 'fetched_at' })
  fetchedAt!: Date;
}
