import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('accounts')
@Unique('accounts_email_key', ['email'])
export class Account {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'accounts_pkey' })
  id!: string;
  @Column('text') email!: string;
  @Column('integer', { name: 'session_version', default: 0 })
  sessionVersion!: number;
  @Column('text', { name: 'password_hash' }) passwordHash!: string;
  @Column('timestamptz', { name: 'created_at', default: () => 'now()' })
  createdAt!: Date;
}
