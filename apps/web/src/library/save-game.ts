import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  computed,
} from '@angular/core';
import { playStatuses, type LibraryView } from './models';

@Component({
  selector: 'app-save-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="mt-4 min-h-[44px] cursor-pointer rounded-lg bg-accent px-4 py-3 font-semibold text-button-ink disabled:cursor-not-allowed disabled:opacity-65"
      (click)="save.emit(gameId())"
      [disabled]="pending() || !library().ready || status() !== undefined"
    >
      {{
        pending()
          ? 'Saving…'
          : status()
            ? 'In library'
            : library().ready
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
  readonly library = input.required<LibraryView>();
  readonly save = output<number>();
  readonly pending = computed(() => this.library().saving.has(this.gameId()));
  readonly status = computed(() => this.library().statuses.get(this.gameId()));
  readonly error = computed(
    () => this.library().errors.get(this.gameId()) ?? '',
  );
  readonly message = computed(() => {
    const status = this.status();
    return status
      ? `Saved · ${playStatuses.find((option) => option.value === status)!.label}`
      : '';
  });
}
