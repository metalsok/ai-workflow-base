import { setTimeout } from 'node:timers/promises';
import { CatalogUnavailable } from './unavailable.js';
export interface IgdbOptions {
  clientId?: string;
  clientSecret?: string;
  fetch?: typeof fetch;
  clock?: () => number;
}
export interface ProviderGame {
  id: number;
  name: string;
  game_type?: number;
  version_parent?: number | null;
  cover?: { image_id?: string };
  first_release_date?: number;
  platforms?: { id: number; name: string; platform_type?: number }[];
  summary?: string;
  genres?: { name: string }[];
  involved_companies?: {
    developer?: boolean;
    publisher?: boolean;
    company?: { name?: string };
  }[];
}

export class IgdbClient {
  private token?: string;
  private tokenExpiresAt = 0;
  private tail = Promise.resolve();
  private pending = 0;
  private nextStart = 0;
  private cooldownUntil = 0;
  private readonly transport: typeof fetch;
  private readonly now: () => number;
  constructor(private readonly options: IgdbOptions) {
    this.transport = options.fetch ?? fetch;
    this.now = options.clock ?? Date.now;
  }

  async games(query: string): Promise<ProviderGame[]> {
    return (await this.records('games', query)) as ProviderGame[];
  }

  async records(
    endpoint: 'games' | 'game_types' | 'platform_types' | 'platforms',
    query: string,
  ): Promise<unknown[]> {
    if (
      !this.options.clientId ||
      !this.options.clientSecret ||
      this.pending >= 8
    )
      throw new CatalogUnavailable();
    this.pending++;
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await previous;
      if (this.cooldownUntil > this.now())
        throw new CatalogUnavailable(
          Math.max(1, Math.ceil((this.cooldownUntil - this.now()) / 1000)),
        );
      for (let attempt = 0; attempt < 2; attempt++) {
        const token = await this.accessToken();
        const delay = this.nextStart - performance.now();
        if (delay > 0) await setTimeout(Math.ceil(delay));
        this.nextStart = performance.now() + 300;
        const response = await this.transport(
          `https://api.igdb.com/v4/${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Client-ID': this.options.clientId!,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'text/plain',
            },
            body: query,
            signal: AbortSignal.timeout(8000),
          },
        );
        if (response.status === 401 && attempt === 0) {
          await response.body?.cancel();
          this.token = undefined;
          continue;
        }
        if (!response.ok) {
          const retryAfter = Math.max(
            1,
            Math.min(
              3600,
              Math.ceil(Number(response.headers.get('retry-after')) || 2),
            ),
          );
          if (response.status === 429)
            this.cooldownUntil = this.now() + retryAfter * 1000;
          await response.body?.cancel();
          throw new CatalogUnavailable(retryAfter);
        }
        const records = await boundedJson(response, 2 * 1024 * 1024);
        if (!Array.isArray(records)) throw new CatalogUnavailable();
        return records;
      }
      throw new CatalogUnavailable();
    } catch (error) {
      if (error instanceof CatalogUnavailable) throw error;
      throw new CatalogUnavailable();
    } finally {
      this.pending--;
      release();
    }
  }

  private async accessToken() {
    if (this.token && this.tokenExpiresAt > this.now()) return this.token;
    const response = await this.transport('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.options.clientId!,
        client_secret: this.options.clientSecret!,
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new CatalogUnavailable();
    }
    const body = (await boundedJson(response, 64 * 1024)) as {
      access_token: string;
      expires_in: number;
    };
    if (
      typeof body.access_token !== 'string' ||
      !body.access_token ||
      typeof body.expires_in !== 'number' ||
      !Number.isFinite(body.expires_in) ||
      body.expires_in <= 0
    )
      throw new CatalogUnavailable();
    this.token = body.access_token;
    this.tokenExpiresAt = this.now() + Math.max(1, body.expires_in - 30) * 1000;
    return this.token;
  }
}

async function boundedJson(
  response: Response,
  maximum: number,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new CatalogUnavailable();
  const decoder = new TextDecoder();
  let length = 0;
  const chunks: string[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new CatalogUnavailable();
      }
      chunks.push(decoder.decode(chunk.value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return JSON.parse(chunks.join('')) as unknown;
  } finally {
    reader.releaseLock();
  }
}
