import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Account } from '../accounts/account.entity.js';
import { StoredSession } from '../accounts/session.entity.js';
import { AuthenticationAttempt } from '../accounts/authentication-attempt.entity.js';
import { CachedGame } from '../catalog/catalog-game.entity.js';
import { CachedSearch } from '../catalog/catalog-search.entity.js';
import { CatalogRequestLimit } from '../catalog/catalog-request-limit.entity.js';
import { AppliedMigration, LegacyMigration } from './history.entity.js';
import { DatabaseSetting } from './postgres-metadata.entity.js';
import { postgresTypes } from './timestamp.js';
import { fileURLToPath } from 'node:url';

export function databaseOptions(url: string) {
  return {
    type: 'postgres' as const,
    url,
    extra: { types: postgresTypes },
    entities: [
      Account,
      StoredSession,
      AuthenticationAttempt,
      CachedGame,
      CachedSearch,
      CatalogRequestLimit,
      LegacyMigration,
      AppliedMigration,
      DatabaseSetting,
    ],
    migrations: [
      fileURLToPath(new URL('./migrations/*.{ts,js}', import.meta.url)),
    ],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    installExtensions: false,
    uuidExtension: 'pgcrypto' as const,
    logging: false as const,
  };
}
export function createDataSource(url: string) {
  return new DataSource(databaseOptions(url));
}
