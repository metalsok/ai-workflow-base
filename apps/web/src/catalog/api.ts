import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface GameCard {
  id: number;
  title: string;
  kind: 'main' | 'remake' | 'remaster';
  coverUrl: string | null;
  firstReleaseDate: string | null;
  platforms: string[];
}
export interface Game extends GameCard {
  summary: string | null;
  genres: string[];
  developers: string[];
  publishers: string[];
}
export interface Freshness {
  fetchedAt: string;
  stale: boolean;
}
export interface SearchResult extends Freshness {
  items: GameCard[];
  page: number;
  nextPage: number | null;
}
export interface GameResult extends Freshness {
  game: Game;
}

export class CatalogError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly router = inject(Router);
  search(query: string, page: number, signal: AbortSignal) {
    return this.get<SearchResult>(
      `/api/catalog/search?${new URLSearchParams({ q: query, page: String(page) })}`,
      signal,
    );
  }
  details(id: string, signal: AbortSignal) {
    return this.get<GameResult>(
      `/api/catalog/games/${encodeURIComponent(id)}`,
      signal,
    );
  }
  private async get<T>(path: string, signal: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await fetch(path, { signal });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new CatalogError(
        'Cannot connect to the game catalog. Please try again.',
        0,
      );
    }
    if (response.status === 401) {
      await this.router.navigateByUrl('/login');
      throw new CatalogError(
        'Your session has expired. Please sign in again.',
        401,
      );
    }
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      throw new CatalogError(
        body.message ?? 'Cannot load games right now. Please try again.',
        response.status,
      );
    }
    return (await response.json()) as T;
  }
}
