import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { playStatuses, type PlayStatus } from './api';

@Component({
  selector: 'app-play-status-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  template: `
    <label class="mt-4 block text-sm text-muted" [for]="'status-' + gameId()">
      Play status<span class="sr-only"> for {{ title() }}</span>
    </label>
    <select
      class="mt-2 min-h-[44px] w-full min-w-0 rounded-lg border border-input-border bg-field px-2 text-foreground"
      [id]="'status-' + gameId()"
      [formField]="statusForm.status"
      (change)="save()"
    >
      @for (option of statuses; track option.value) {
        <option [value]="option.value">{{ option.label }}</option>
      }
    </select>
  `,
})
export class PlayStatusEditor {
  readonly gameId = input.required<number>();
  readonly title = input.required<string>();
  readonly status = input.required<PlayStatus>();
  readonly pending = input(false);
  readonly statusChange = output<PlayStatus>();
  readonly statuses = playStatuses;
  private readonly statusModel = linkedSignal(() => ({
    status: this.status(),
  }));
  readonly statusForm = form(this.statusModel, (fields) => {
    disabled(fields.status, () => this.pending());
  });

  save() {
    if (this.pending() || !this.statusForm().valid()) return;
    const status = this.statusModel().status;
    if (status !== this.status()) this.statusChange.emit(status);
  }
}
