import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { DiscoveryPayload, FeedKind } from './discovery.js';

@Entity('catalog_feeds')
export class CachedFeed {
  @PrimaryColumn('text', { primaryKeyConstraintName: 'catalog_feeds_pkey' })
  kind!: FeedKind;
  @Column('jsonb') payload!: DiscoveryPayload;
  @Column('timestamptz', { name: 'fetched_at' }) fetchedAt!: Date;
}
