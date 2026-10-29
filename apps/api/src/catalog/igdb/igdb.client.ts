import { Inject, Injectable } from '@nestjs/common';
import { APP_OPTIONS, type AppOptions } from '../../app-options.js';
import { CLOCK, type Clock } from '../clock.js';

export interface IgdbOptions {
  clientId?: string;
  clientSecret?: string;
  /** Tests replace the network with a fake. */
  fetch?: typeof fetch;
  /** Tests control time. */
  clock?: Clock;
}

/** IGDB could not answer. Shown to users as a 503 "try again" (see IgdbUnavailableFilter). */
export class IgdbUnavailableError extends Error {
  constructor(readonly retryAfterSeconds = 2) {
    super('Game catalog is temporarily unavailable. Please try again.');
  }
}

/**
 * The only code that talks to IGDB (https://api-docs.igdb.com).
 * IGDB uses Twitch sign-in: we trade our client id/secret for an access
 * token, keep it until it expires, and send it with every query.
 */
@Injectable()
export class IgdbClient {
  private readonly options: IgdbOptions;
  private readonly fetch: typeof fetch;
  private token?: { value: string; expiresAt: number };

  constructor(
    @Inject(APP_OPTIONS) appOptions: AppOptions,
    @Inject(CLOCK) private readonly now: Clock,
  ) {
    this.options = appOptions.igdb ?? {};
    this.fetch = this.options.fetch ?? fetch;
  }

  /**
   * Sends one IGDB query and returns its rows as untrusted JSON.
   * `body` uses IGDB's query language, e.g. `fields name; where id = 1;`.
   */
  async query(
    endpoint: 'games' | 'popularity_primitives',
    body: string,
  ): Promise<unknown[]> {
    try {
      const response = await this.fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: 'POST',
        headers: {
          'Client-ID': this.options.clientId ?? '',
          Authorization: `Bearer ${await this.accessToken()}`,
          'Content-Type': 'text/plain',
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new IgdbUnavailableError(retryAfterSeconds(response));
      }
      const rows: unknown = await response.json();
      if (!Array.isArray(rows)) throw new IgdbUnavailableError();
      return rows;
    } catch (error) {
      // Network errors, timeouts and bad JSON all mean "unavailable". We never
      // pass IGDB's own error text on: it can contain our token.
      if (error instanceof IgdbUnavailableError) throw error;
      throw new IgdbUnavailableError();
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now())
      return this.token.value;
    const { clientId, clientSecret } = this.options;
    if (!clientId || !clientSecret) throw new IgdbUnavailableError();
    const response = await this.fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new IgdbUnavailableError();
    }
    const { access_token, expires_in } = (await response.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (
      typeof access_token !== 'string' ||
      !access_token ||
      typeof expires_in !== 'number' ||
      !(expires_in > 0)
    )
      throw new IgdbUnavailableError();
    // Renew 30 seconds early so a token never expires mid-request.
    this.token = {
      value: access_token,
      expiresAt: this.now() + Math.max(1, expires_in - 30) * 1000,
    };
    return this.token.value;
  }
}

/** IGDB's Retry-After header in seconds (1 s – 1 h), or 2 s if missing. */
function retryAfterSeconds(response: Response) {
  const seconds = Math.ceil(Number(response.headers.get('retry-after')) || 2);
  return Math.min(3600, Math.max(1, seconds));
}
