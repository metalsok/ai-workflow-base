import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { migrate } from './database/migrate.js';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AccountsModule } from './accounts/accounts.module.js';

export interface AppOptions {
  databaseUrl: string;
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
  const pool = new Pool({ connectionString: options.databaseUrl });
  await migrate(pool);
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool,
    tableName: 'sessions',
    disableTouch: true,
  });
  @Module({
    imports: [AccountsModule.forPool(pool)],
    providers: [
      {
        provide: 'database-lifecycle',
        useValue: {
          async onApplicationShutdown() {
            await store.close();
            await pool.end();
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
  app.use(helmet());
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
