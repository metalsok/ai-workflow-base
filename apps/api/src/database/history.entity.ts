import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('schema_migrations')
export class LegacyMigration {
  @PrimaryColumn('text', { primaryKeyConstraintName: 'schema_migrations_pkey' })
  name!: string;
  @Column('text') checksum!: string;
  @Column('timestamptz', { name: 'applied_at', default: () => 'now()' })
  appliedAt!: Date;
}

// TypeORM owns this ledger; it is never part of entity schema generation.
@Entity({ name: 'typeorm_migrations', synchronize: false })
export class AppliedMigration {
  @PrimaryGeneratedColumn() id!: number;
  @Column('bigint') timestamp!: string;
  @Column('varchar') name!: string;
}
