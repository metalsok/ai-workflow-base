import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, from, switchMap, throwError, type Observable } from 'rxjs';
import { apiErrorMessage } from '../http-error';
import { Service, inject } from '@angular/core';
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

@Service()
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  search(query: string, page: number): Observable<SearchResult> {
    return this.get<SearchResult>(
      `/api/catalog/search?${new URLSearchParams({ q: query, page: String(page) })}`,
    );
  }
  details(id: string): Observable<GameResult> {
    return this.get<GameResult>(`/api/catalog/games/${encodeURIComponent(id)}`);
  }
  private get<T>(path: string): Observable<T> {
    return this.http.get<T>(path).pipe(
      catchError((error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        if (status === 401) {
          return from(this.router.navigateByUrl('/login')).pipe(
            switchMap(() =>
              throwError(
                () =>
                  new CatalogError(
                    'Your session has expired. Please sign in again.',
                    401,
                  ),
              ),
            ),
          );
        }
        return throwError(
          () =>
            new CatalogError(
              apiErrorMessage(
                error,
                status === 0
                  ? 'Cannot connect to the game catalog. Please try again.'
                  : 'Cannot load games right now. Please try again.',
              ),
              status,
            ),
        );
      }),
    );
  }
}
