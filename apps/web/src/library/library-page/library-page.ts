import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { finalize, type Observable } from 'rxjs';
import { apiErrorMessage } from '../../http-error';
import { LibraryState } from '../library-state';
import { playStatuses, type PlayStatus } from '../models';
import { GameCover } from '../../catalog/cover';
import { PlayStatusEditor } from '../play-status-editor';

@Component({
  selector: 'app-library-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, GameCover, PlayStatusEditor],
  templateUrl: './library-page.html',
})
export class LibraryPage {
  private readonly library = inject(LibraryState);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly status = computed(() => this.params().get('status') ?? '');
  readonly loading = this.library.loading;
  readonly filteredItems = computed(() => {
    const items = this.library.result()?.items;
    if (!items) return null;
    const status = this.status();
    if (!status) return items;
    return items.filter((entry) =>
      status === 'played'
        ? entry.status !== 'want-to-play'
        : entry.status === status,
    );
  });
  readonly pending = signal(false);
  readonly error = signal('');
  constructor() {
    this.library.refresh();
  }
  changeStatus(change: { id: number; status: PlayStatus }) {
    this.mutate(
      this.http.patch(`/api/library/games/${change.id}`, {
        status: change.status,
      }),
    );
  }
  remove(id: number) {
    this.mutate(this.http.delete(`/api/library/games/${id}`));
  }
  private mutate(request: Observable<unknown>) {
    if (this.pending() || !this.library.view().ready) return;
    this.pending.set(true);
    this.error.set('');
    request
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.library.refresh(),
        error: (error: unknown) => {
          this.error.set(
            apiErrorMessage(
              error,
              'Cannot update your library. Please try again.',
            ),
          );
          this.library.refresh();
        },
      });
  }
  readonly filters = [
    { value: '', label: 'All games' },
    ...playStatuses,
    { value: 'played', label: 'Played' },
  ];
}
