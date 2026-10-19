import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSource, databaseOptions } from './database/data-source.js';
import { assertMigrationsApplied } from './database/migrate.js';
import { DatabaseSetting } from './database/postgres-metadata.entity.js';
import { StoredSession } from './accounts/session.entity.js';
import { OrmSessionStore } from './accounts/session.store.js';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { CatalogModule } from './catalog/catalog.module.js';
import type { IgdbOptions } from './catalog/igdb.js';
import { AccountsModule } from './accounts/accounts.module.js';

export interface AppOptions {
  igdb?: IgdbOptions;
  databaseUrl: string;
  clock?: () => number;
  origin: string;
  sessionSecret: string;
  sessionMaxAgeMs?: number;
  trustProxyLoopback?: boolean;
}

export async function createApp(options: AppOptions) {
  const allowedOrigin = new URL(options.origin).origin;
  if (
    allowedOrigin !== options.origin ||
    !['http:', 'https:'].includes(new URL(options.origin).protocol)
  )
    throw new Error('APP_ORIGIN must be an HTTP origin without a path');
  if (options.sessionSecret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  const database = await createDataSource(options.databaseUrl).initialize();
  try {
    await assertMigrationsApplied(database);
  } catch (error) {
    await database.destroy();
    throw error;
  }
  const timezone = await database
    .getRepository(DatabaseSetting)
    .findOneByOrFail({ name: 'TimeZone' });
  const store = new OrmSessionStore(
    database.getRepository(StoredSession),
    timezone.setting,
  );
  const accounts = AccountsModule.forClock(options.clock ?? Date.now);
  @Module({
    imports: [
      TypeOrmModule.forRootAsync({
        useFactory: () => databaseOptions(options.databaseUrl),
        dataSourceFactory: async () => database,
      }),
      accounts,
      CatalogModule.forOptions(options.igdb ?? {}, accounts),
    ],
    providers: [
      {
        provide: 'database-lifecycle',
        useValue: {
          async onModuleDestroy() {
            await store.close();
          },
        },
      },
    ],
  })
  class AppModule {}
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  if (options.trustProxyLoopback) app.set('trust proxy', 'loopback');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { imgSrc: ["'self'", 'data:', 'https://images.igdb.com'] },
      },
    }),
  );
  app.use(
    '/api',
    (request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store');
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
        request.get('origin') !== allowedOrigin
      ) {
        response
          .status(403)
          .json({ message: 'Request origin is not allowed.' });
        return;
      }
      next();
    },
  );
  const sessionMaxAgeMs = options.sessionMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
  app.use(
    session({
      name: 'game_tracker.sid',
      secret: options.sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: allowedOrigin.startsWith('https://'),
        maxAge: sessionMaxAgeMs,
      },
    }),
  );
  app.use((request: Request, _response: Response, next: NextFunction) => {
    if (
      request.session.accountId &&
      (!request.session.expiresAt || request.session.expiresAt <= Date.now())
    ) {
      request.session.regenerate(next);
      return;
    }
    next();
  });
  app.getHttpAdapter().getInstance().locals.sessionMaxAgeMs = sessionMaxAgeMs;
  return app;
}
