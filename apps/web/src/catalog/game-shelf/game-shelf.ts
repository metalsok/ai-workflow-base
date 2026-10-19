import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameCover } from '../cover';
import type { DiscoveryResult, FeedKind } from '../api';

@Component({
  selector: 'app-game-shelf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, GameCover],
  templateUrl: './game-shelf.html',
})
export class GameShelf {
  readonly kind = input.required<FeedKind>();
  readonly feed = input<DiscoveryResult | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly retry = output<void>();
  readonly heading = computed(() =>
    this.kind() === 'popular' ? 'Popular now' : 'Recent releases',
  );
}
