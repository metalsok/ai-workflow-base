import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CatalogGame } from './game.js';

/**
 * One row of `catalog_games`: our copy of a game's IGDB metadata. It saves
 * IGDB calls, and lets a saved library game show even while IGDB is down.
 */
@Entity('catalog_games')
export class CachedGame {
  // PostgreSQL bigint arrives as a string; IGDB ids fit safely in a number.
  @PrimaryColumn('bigint', {
    transformer: { to: (id: number) => id, from: (id: string) => Number(id) },
  })
  id!: number;

  @Column('jsonb')
  metadata!: CatalogGame;

  @Column('timestamptz', { name: 'fetched_at' })
  fetchedAt!: Date;

  /** False once IGDB said the game is outside our scope (used in ticket 07). */
  @Column('boolean', { default: true })
  eligible!: boolean;
}
