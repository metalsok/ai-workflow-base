import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CachedGame } from '../catalog/cached-game.entity.js';

export const PLAY_STATUSES = [
  'want-to-play',
  'playing',
  'completed',
  'stopped-playing',
] as const;
export type PlayStatus = (typeof PLAY_STATUSES)[number];

/**
 * One row of `library_entries`: a game saved by one account. The primary key
 * is (account, game), so an account can save each game only once.
 */
@Entity('library_entries')
export class LibraryEntry {
  @PrimaryColumn('uuid', { name: 'account_id' })
  accountId!: string;

  @PrimaryColumn('bigint', {
    name: 'game_id',
    transformer: { to: (id: number) => id, from: (id: string) => Number(id) },
  })
  gameId!: number;

  @Column('text')
  status!: PlayStatus;

  /** The saved metadata, so the library works even while IGDB is down. */
  @ManyToOne(() => CachedGame)
  @JoinColumn({ name: 'game_id' })
  game!: CachedGame;
}
