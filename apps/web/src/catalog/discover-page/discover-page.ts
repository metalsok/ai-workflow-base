import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { SaveGame } from '../../library/save-game';
import { RouterLink } from '@angular/router';
import { CatalogApi } from '../api';
import { catalogRequest } from '../request';
import { GameShelf } from '../game-shelf/game-shelf';

@Component({
  selector: 'app-discover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, GameShelf, SaveGame],
  templateUrl: './discover-page.html',
})
export class DiscoverPage {
  private readonly api = inject(CatalogApi);
  readonly popular = catalogRequest(
    () => 'popular' as const,
    (kind) => this.api.discovery(kind),
  );
  readonly recent = catalogRequest(
    () => 'recent' as const,
    (kind) => this.api.discovery(kind),
  );
  readonly featured = computed(
    () =>
      this.popular.result()?.items[0] ?? this.recent.result()?.items[0] ?? null,
  );
  readonly artworkFailed = linkedSignal({
    source: () => this.featured()?.artworkUrl,
    computation: () => false,
  });
}
