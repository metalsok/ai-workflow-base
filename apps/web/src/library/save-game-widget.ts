import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { LibraryState } from './library-state';
import { SaveGame } from './save-game';

@Component({
  selector: 'app-save-game-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SaveGame],
  template: `
    <app-save-game
      [gameId]="gameId()"
      [library]="library.view()"
      (save)="library.saveGame($event)"
    />
  `,
})
export class SaveGameWidget {
  readonly gameId = input.required<number>();
  protected readonly library = inject(LibraryState);
}
