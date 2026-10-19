import { Column, Entity, PrimaryColumn } from 'typeorm';

// Read-only PostgreSQL metadata, excluded from schema generation.
@Entity({ schema: 'information_schema', name: 'columns', synchronize: false })
export class DatabaseColumn {
  @PrimaryColumn('varchar', { name: 'table_schema' }) tableSchema!: string;
  @PrimaryColumn('varchar', { name: 'table_name' }) tableName!: string;
  @PrimaryColumn('varchar', { name: 'column_name' }) columnName!: string;
  @Column('varchar', { name: 'column_default', nullable: true }) default!:
    string | null;
}
@Entity({ schema: 'pg_catalog', name: 'pg_settings', synchronize: false })
export class DatabaseSetting {
  @PrimaryColumn('text') name!: string;
  @Column('text') setting!: string;
}
