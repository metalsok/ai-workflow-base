import type { IgdbOptions } from './catalog/igdb/igdb.client.js';

/** Everything the API needs from the outside world. main.ts reads these from env vars; tests pass them directly. */
export interface AppOptions {
  /** PostgreSQL connection string. */
  databaseUrl: string;
  /** The one browser origin allowed to send changes, e.g. http://127.0.0.1:4200. */
  origin: string;
  /** Signs the session cookie. At least 32 characters. */
  sessionSecret: string;
  /** How long a sign-in lasts. Defaults to 7 days. */
  sessionMaxAgeMs?: number;
  /** IGDB credentials. Without them the catalog answers 503. */
  igdb?: IgdbOptions;
}

/** Injection token: `@Inject(APP_OPTIONS) options: AppOptions` in any provider. */
export const APP_OPTIONS = Symbol('APP_OPTIONS');
