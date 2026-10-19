import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Check,
} from 'typeorm';
import { Account } from '../accounts/account.entity.js';
import { CachedGame } from '../catalog/catalog-game.entity.js';

export const playStatuses = [
  'want-to-play',
  'playing',
  'completed',
  'stopped-playing',
] as const;
export type PlayStatus = (typeof playStatuses)[number];

@Entity('library_entries')
@Check(
  'library_entries_status_check',
  `"status" IN ('want-to-play', 'playing', 'completed', 'stopped-playing')`,
)
export class LibraryEntry {
  @PrimaryColumn('uuid', {
    name: 'account_id',
    primaryKeyConstraintName: 'library_entries_pkey',
  })
  accountId!: string;
  @PrimaryColumn('bigint', {
    name: 'game_id',
    primaryKeyConstraintName: 'library_entries_pkey',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  gameId!: number;
  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'account_id',
    foreignKeyConstraintName: 'library_entries_account_fk',
  })
  account!: Account;
  @ManyToOne(() => CachedGame, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'game_id',
    foreignKeyConstraintName: 'library_entries_game_fk',
  })
  game!: CachedGame;
  @Column('text') status!: PlayStatus;
}
