import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import {
  DEFAULT_SESSION_MAX_AGE_MS,
  SESSION_COOKIE,
} from './accounts/accounts.controller.js';
import { StoredSession } from './accounts/session.entity.js';
import { TypeOrmSessionStore } from './accounts/session-store.js';
import { AppModule } from './app.module.js';
import type { AppOptions } from './app-options.js';

export type { AppOptions } from './app-options.js';

/**
 * Builds the API without starting it. main.ts calls `listen()` afterwards;
 * tests call this directly with a disposable database.
 */
export async function createApp(options: AppOptions) {
  checkOptions(options);
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(options),
    // Off on purpose: database driver errors can contain connection secrets.
    { logger: false },
  );

  // Security headers. Game images come from IGDB's image server.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { imgSrc: ["'self'", 'data:', 'https://images.igdb.com'] },
      },
    }),
  );
  app.use('/api', doNotCache);
  app.use('/api', onlyOurOrigin(options.origin));

  // Sessions: the browser keeps only a signed random id in an HttpOnly
  // cookie; everything else lives in the `sessions` table.
  const sessions = app.get(DataSource).getRepository(StoredSession);
  app.use(
    session({
      name: SESSION_COOKIE,
      secret: options.sessionSecret,
      store: new TypeOrmSessionStore(sessions),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: options.origin.startsWith('https://'),
        maxAge: options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS,
      },
    }),
  );
  return app;
}

function checkOptions(options: AppOptions) {
  const url = new URL(options.origin);
  if (
    url.origin !== options.origin ||
    !['http:', 'https:'].includes(url.protocol)
  )
    throw new Error('APP_ORIGIN must be an HTTP origin without a path');
  if (options.sessionSecret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters');
}

/** API answers are personal (they depend on who is signed in), so never cache them. */
function doNotCache(_request: Request, response: Response, next: NextFunction) {
  response.setHeader('Cache-Control', 'no-store');
  next();
}

/**
 * Cross-site request forgery protection: a request that changes something
 * (anything but GET/HEAD/OPTIONS) must come from our own frontend's origin.
 * Browsers always send the Origin header on such requests.
 */
function onlyOurOrigin(origin: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (!readOnly && request.get('origin') !== origin) {
      response.status(403).json({ message: 'Request origin is not allowed.' });
      return;
    }
    next();
  };
}
