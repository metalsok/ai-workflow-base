import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Account } from '../accounts/account.entity.js';

@Entity('catalog_request_limits')
export class CatalogRequestLimit {
  @PrimaryColumn('uuid', {
    name: 'account_id',
    primaryKeyConstraintName: 'catalog_request_limits_pkey',
  })
  accountId!: string;
  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'account_id',
    foreignKeyConstraintName: 'catalog_request_limits_account_id_fkey',
  })
  account?: Account;
  @Column('integer') attempts!: number;
  @Column('timestamptz', { name: 'window_end' }) windowEnd!: Date;
}
