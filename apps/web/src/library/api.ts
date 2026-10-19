import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError, type Observable } from 'rxjs';
import type { Game } from '../catalog/api';
import { apiErrorMessage } from '../http-error';

export const playStatuses = [
  { value: 'want-to-play', label: 'Want to play' },
  { value: 'playing', label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'stopped-playing', label: 'Stopped playing' },
] as const;
export type PlayStatus = (typeof playStatuses)[number]['value'];
export interface LibraryEntry {
  game: Game;
  status: PlayStatus;
}
export interface LibraryResult {
  items: LibraryEntry[];
}

@Service()
export class LibraryApi {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  list(status: string): Observable<LibraryResult> {
    return this.handle(
      this.http.get<LibraryResult>(
        `/api/library${status ? `?${new URLSearchParams({ status })}` : ''}`,
      ),
    );
  }
  add(id: number) {
    return this.handle(
      this.http.post<LibraryEntry>(`/api/library/games/${id}`, {}),
    );
  }
  change(id: number, status: string) {
    return this.handle(
      this.http.patch<LibraryEntry>(`/api/library/games/${id}`, { status }),
    );
  }
  remove(id: number) {
    return this.handle(this.http.delete<void>(`/api/library/games/${id}`));
  }
  private handle<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      catchError((error: unknown) => {
        const message = apiErrorMessage(
          error,
          'Cannot update or load your library. Please try again.',
        );
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return from(this.router.navigateByUrl('/login')).pipe(
            switchMap(() =>
              throwError(
                () =>
                  new Error('Your session has expired. Please sign in again.'),
              ),
            ),
          );
        }
        return throwError(() => new Error(message));
      }),
    );
  }
}
