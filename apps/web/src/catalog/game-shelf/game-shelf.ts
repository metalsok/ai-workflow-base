import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { SaveGame } from '../../library/save-game';
import { RouterLink } from '@angular/router';
import { GameCover } from '../cover';
import type { LibraryView } from '../../library/models';
import type { DiscoveryResult, FeedKind } from '../models';

@Component({
  selector: 'app-game-shelf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, GameCover, SaveGame],
  templateUrl: './game-shelf.html',
})
export class GameShelf {
  readonly library = input.required<LibraryView>();
  readonly save = output<number>();
  readonly kind = input.required<FeedKind>();
  readonly feed = input<DiscoveryResult | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly retry = output<void>();
  readonly heading = computed(() =>
    this.kind() === 'popular' ? 'Popular now' : 'Recent releases',
  );
}
