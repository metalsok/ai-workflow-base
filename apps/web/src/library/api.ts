import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject, computed, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Auth } from '../auth';
import { Router } from '@angular/router';
import {
  catchError,
  defer,
  from,
  map,
  switchMap,
  tap,
  throwError,
  type Observable,
} from 'rxjs';
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
  private readonly auth = inject(Auth);
  private readonly owner = computed(() => this.auth.account()?.id);
  private readonly revision = signal(0);
  private readonly saved = rxResource({
    params: () => {
      const owner = this.owner();
      return owner ? { owner, revision: this.revision() } : undefined;
    },
    stream: ({ params }) =>
      this.list('').pipe(map((result) => ({ ...result, owner: params.owner }))),
  });
  readonly ready = computed(
    () =>
      this.saved.hasValue() &&
      this.saved.value().owner === this.auth.account()?.id,
  );
  readonly statuses = computed(
    () =>
      new Map(
        this.ready() && this.saved.hasValue()
          ? this.saved
              .value()
              .items.map((entry) => [entry.game.id, entry.status])
          : [],
      ),
  );
  readonly error = computed(() => this.saved.error()?.message ?? '');
  refresh() {
    this.saved.reload();
  }
  private update(
    owner: string | undefined,
    change: (items: LibraryEntry[]) => LibraryEntry[],
  ) {
    if (owner && owner === this.auth.account()?.id && !this.saved.hasValue()) {
      // Replace an unfinished read so its pre-mutation snapshot cannot win later.
      this.revision.update((value) => value + 1);
      return;
    }
    if (
      owner &&
      owner === this.auth.account()?.id &&
      this.saved.hasValue() &&
      this.saved.value().owner === owner
    ) {
      this.saved.value.update((result) =>
        result ? { ...result, items: change(result.items) } : result,
      );
    }
  }
  list(status: string): Observable<LibraryResult> {
    return this.handle(
      this.http.get<LibraryResult>(
        `/api/library${status ? `?${new URLSearchParams({ status })}` : ''}`,
      ),
    );
  }
  add(id: number) {
    return defer(() => {
      const owner = this.auth.account()?.id;
      return this.handle(
        this.http.post<LibraryEntry>(`/api/library/games/${id}`, {}),
      ).pipe(
        tap((entry) =>
          this.update(owner, (items) => [
            ...items.filter((item) => item.game.id !== id),
            entry,
          ]),
        ),
      );
    });
  }
  change(id: number, status: string) {
    return defer(() => {
      const owner = this.auth.account()?.id;
      return this.handle(
        this.http.patch<LibraryEntry>(`/api/library/games/${id}`, { status }),
      ).pipe(
        tap((entry) =>
          this.update(owner, (items) =>
            items.map((item) => (item.game.id === id ? entry : item)),
          ),
        ),
      );
    });
  }
  remove(id: number) {
    return defer(() => {
      const owner = this.auth.account()?.id;
      return this.handle(
        this.http.delete<void>(`/api/library/games/${id}`),
      ).pipe(
        tap(() =>
          this.update(owner, (items) =>
            items.filter((item) => item.game.id !== id),
          ),
        ),
      );
    });
  }
  private handle<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      catchError((error: unknown) => {
        const message = apiErrorMessage(
          error,
          'Cannot update or load your library. Please try again.',
        );
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.auth.account.set(null);
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
