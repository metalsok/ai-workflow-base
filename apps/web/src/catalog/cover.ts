import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-game-cover',
  template: `
    @if (url() && !failed()) {
      <img
        [src]="url()"
        [alt]="title() + ' cover'"
        loading="lazy"
        (error)="failed.set(true)"
      />
    } @else {
      <div class="cover-placeholder" role="img" aria-label="No cover available">
        <span aria-hidden="true">◈</span><span>No cover available</span>
      </div>
    }
  `,
})
export class GameCover {
  readonly url = input<string | null>(null);
  readonly title = input.required<string>();
  readonly failed = linkedSignal({
    source: this.url,
    computation: () => false,
  });
}
