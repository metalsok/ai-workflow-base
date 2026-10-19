import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('authentication_attempts')
export class AuthenticationAttempt {
  @PrimaryColumn('text', {
    primaryKeyConstraintName: 'authentication_attempts_pkey',
  })
  key!: string;
  @Column('integer') attempts!: number;
  @Index('authentication_attempts_expiry_idx')
  @Column('timestamptz', { name: 'expires_at' })
  expiresAt!: Date;
}
