import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
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
      [disabled]="pending()"
    >
      {{ pending() ? 'Saving…' : 'Want to play' }}
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
  private readonly api = inject(LibraryApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly pending = signal(false);
  readonly message = linkedSignal(() => {
    this.gameId();
    return '';
  });
  readonly error = linkedSignal(() => {
    this.gameId();
    return '';
  });
  save() {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.api
      .add(this.gameId())
      .pipe(
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (entry) =>
          this.message.set(
            `Saved · ${playStatuses.find((status) => status.value === entry.status)!.label}`,
          ),
        error: (error: Error) => this.error.set(error.message),
      });
  }
}
