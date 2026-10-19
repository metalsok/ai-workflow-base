import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'block aspect-[3/4] overflow-hidden rounded-[0.7rem] border border-outline bg-surface',
  },
  selector: 'app-game-cover',
  template: `
    @if (url() && !failed()) {
      <img
        class="block size-full object-cover"
        [src]="url()"
        [alt]="title() + ' cover'"
        loading="lazy"
        (error)="failed.set(true)"
      />
    } @else {
      <div
        class="flex size-full flex-col items-center justify-center gap-[0.6rem] bg-[radial-gradient(ellipse_at_50%_30%,#bda6f819,transparent_75%)] p-3 text-center text-[0.8rem] text-muted"
        role="img"
        aria-label="No cover available"
      >
        <span class="text-[3rem] text-accent" aria-hidden="true">◈</span
        ><span>No cover available</span>
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
