import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { LibraryApi, playStatuses } from './api';

@Component({
  selector: 'app-save-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="mt-4 min-h-[44px] cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-button-ink disabled:cursor-wait disabled:opacity-65"
      (click)="save()"
      [disabled]="pending() || !api.ready() || status() !== undefined"
    >
      {{
        pending()
          ? 'Saving…'
          : status()
            ? 'In library'
            : api.ready()
              ? 'Want to play'
              : 'Checking library…'
      }}
    </button>
    @if (message()) {
      <p class="mt-2 text-sm text-accent" role="status">{{ message() }}</p>
    }
    @if (error()) {
      <p class="mt-2 text-sm text-[#ffbbd0]" role="alert">{{ error() }}</p>
    }
  `,
})
export class SaveGame {
  readonly gameId = input.required<number>();
  readonly api = inject(LibraryApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly pending = signal(false);
  readonly status = computed(() => this.api.statuses().get(this.gameId()));
  readonly message = computed(() => {
    const status = this.status();
    return status
      ? `Saved · ${playStatuses.find((option) => option.value === status)!.label}`
      : '';
  });
  readonly error = linkedSignal({ source: this.gameId, computation: () => '' });
  save() {
    if (this.pending() || !this.api.ready() || this.status()) return;
    this.pending.set(true);
    this.error.set('');
    this.api
      .add(this.gameId())
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: Error) => this.error.set(error.message),
      });
  }
}
