import { HttpClient, httpResource } from '@angular/common/http';
import { Service, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Auth } from '../auth';
import { apiErrorMessage } from '../http-error';
import type { LibraryResult, LibraryView } from './models';

@Service({ autoProvided: false })
export class LibraryState {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly destroyRef = inject(DestroyRef);
  private readonly owner = computed(() => this.auth.account()?.id);
  private readonly saved = httpResource<LibraryResult>(() =>
    this.owner() ? '/api/library' : undefined,
  );
  readonly loading = this.saved.isLoading;
  readonly result = computed(() =>
    !this.saved.isLoading() && this.saved.hasValue()
      ? this.saved.value()
      : null,
  );
  readonly loadError = computed(() => {
    const error = this.saved.error();
    return error
      ? apiErrorMessage(error, 'Cannot load your library. Please try again.')
      : '';
  });
  private readonly saving = signal<ReadonlySet<number>>(new Set());
  private readonly saveErrors = signal<ReadonlyMap<number, string>>(new Map());
  readonly view = computed<LibraryView>(() => ({
    ready: this.saved.hasValue() && !this.saved.isLoading(),
    statuses: new Map(
      this.saved.hasValue()
        ? this.saved.value().items.map((entry) => [entry.game.id, entry.status])
        : [],
    ),
    saving: this.saving(),
    errors: this.saveErrors(),
  }));
  refresh() {
    this.saved.reload();
  }
  saveGame(id: number) {
    if (
      !this.view().ready ||
      this.saving().has(id) ||
      this.view().statuses.has(id)
    )
      return;
    this.saving.update((ids) => new Set([...ids, id]));
    this.saveErrors.update((errors) => {
      const next = new Map(errors);
      next.delete(id);
      return next;
    });
    this.http
      .post(`/api/library/games/${id}`, {})
      .pipe(
        finalize(() =>
          this.saving.update((ids) => {
            const next = new Set(ids);
            next.delete(id);
            return next;
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.refresh(),
        error: (error: unknown) =>
          this.saveErrors.update((errors) =>
            new Map(errors).set(
              id,
              apiErrorMessage(
                error,
                'Cannot save this game. Please try again.',
              ),
            ),
          ),
      });
  }
}
