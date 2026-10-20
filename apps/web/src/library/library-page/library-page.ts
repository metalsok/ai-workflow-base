import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize, type Observable } from 'rxjs';
import { LibraryApi, playStatuses } from '../api';
import { catalogRequest } from '../../catalog/request';
import { GameCover } from '../../catalog/cover';
import { PlayStatusEditor } from '../play-status-editor';

@Component({
  selector: 'app-library-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, GameCover, PlayStatusEditor],
  templateUrl: './library-page.html',
})
export class LibraryPage {
  private readonly api = inject(LibraryApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly status = computed(() => this.params().get('status') ?? '');
  readonly filters = [
    { value: '', label: 'All games' },
    ...playStatuses,
    { value: 'played', label: 'Played' },
  ];
  readonly request = catalogRequest(
    () => this.status(),
    (status) => this.api.list(status),
  );
  readonly pending = signal(false);
  readonly error = signal('');
  change(id: number, status: string) {
    this.mutate(this.api.change(id, status));
  }
  remove(id: number) {
    this.mutate(this.api.remove(id));
  }
  private mutate(request: Observable<unknown>) {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    request
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.request.retry(),
        error: (error: Error) => {
          this.error.set(error.message);
          this.request.retry();
        },
      });
  }
}
