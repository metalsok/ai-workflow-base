import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { LibraryEntry } from '../library/library-entry.entity.js';
import { Account } from '../accounts/account.entity.js';
import { StoredSession } from '../accounts/session.entity.js';
import { CachedFeed } from '../catalog/cached-feed.entity.js';
import { CachedGame } from '../catalog/cached-game.entity.js';
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
      LibraryEntry,
      Account,
      StoredSession,
      CachedFeed,
      CachedGame,
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
