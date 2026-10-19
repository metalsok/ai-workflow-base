import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { CatalogGame } from './game.js';

export interface SearchPayload {
  items: Pick<
    CatalogGame,
    'id' | 'title' | 'kind' | 'coverUrl' | 'firstReleaseDate' | 'platforms'
  >[];
  page: number;
  nextPage: number | null;
  fetchedAt: string;
  stale: boolean;
}
@Entity('catalog_searches')
export class CachedSearch {
  @PrimaryColumn('text', {
    name: 'cache_key',
    primaryKeyConstraintName: 'catalog_searches_pkey',
  })
  cacheKey!: string;
  @Column('jsonb') payload!: SearchPayload;
  @Index('catalog_searches_fetched_at_idx')
  @Column('timestamptz', { name: 'fetched_at' })
  fetchedAt!: Date;
}
