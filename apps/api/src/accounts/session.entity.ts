import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { SessionData } from 'express-session';

/** One row of the `sessions` table: a signed-in browser. */
@Entity('sessions')
export class StoredSession {
  /** The random id that the `game_tracker.sid` cookie carries (signed). */
  @PrimaryColumn('varchar')
  sid!: string;

  /** What we know about this browser, e.g. `{ accountId, expiresAt }`. */
  @Column('json')
  sess!: SessionData;

  /** When the row may be deleted. */
  @Column('timestamp', { precision: 6 })
  expire!: Date;
}
