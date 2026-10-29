import { Column, Entity, PrimaryColumn } from 'typeorm';

// Read-only PostgreSQL metadata, excluded from schema generation.
@Entity({ schema: 'pg_catalog', name: 'pg_settings', synchronize: false })
export class DatabaseSetting {
  @PrimaryColumn('text') name!: string;
  @Column('text') setting!: string;
}
