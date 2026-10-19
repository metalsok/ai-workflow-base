import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { SessionData } from 'express-session';

@Entity('sessions')
export class StoredSession {
  @PrimaryColumn('varchar', { primaryKeyConstraintName: 'sessions_pkey' })
  sid!: string;
  @Column('json') sess!: SessionData;
  @Index('sessions_expire_idx')
  @Column('timestamp', { precision: 6 })
  expire!: Date;
}
