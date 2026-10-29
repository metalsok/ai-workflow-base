import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One row of the `accounts` table. */
@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Always stored trimmed and lower-case. Unique. */
  @Column('text')
  email!: string;

  /** argon2 hash. Never sent to the browser. */
  @Column('text', { name: 'password_hash' })
  passwordHash!: string;

  /** Bumped by a password reset; sessions from an older version stop working. */
  @Column('integer', { name: 'session_version', default: 0 })
  sessionVersion!: number;

  @Column('timestamptz', { name: 'created_at', default: () => 'now()' })
  createdAt!: Date;
}
