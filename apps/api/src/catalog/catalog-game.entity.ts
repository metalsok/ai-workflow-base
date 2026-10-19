import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CatalogGame } from './game.js';

@Entity('catalog_games')
export class CachedGame {
  @PrimaryColumn('bigint', {
    primaryKeyConstraintName: 'catalog_games_pkey',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => {
        const id = Number(value);
        if (!Number.isSafeInteger(id))
          throw new Error('Unsafe catalog Game ID');
        return id;
      },
    },
  })
  id!: number;
  @Column('jsonb') metadata!: CatalogGame;
  @Column('timestamptz', { name: 'fetched_at' }) fetchedAt!: Date;
  @Column('boolean', { default: true }) eligible!: boolean;
}
