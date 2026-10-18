import { Component, effect, input, signal } from '@angular/core';

@Component({
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
  readonly failed = signal(false);
  constructor() {
    effect(() => {
      this.url();
      this.failed.set(false);
    });
  }
}
