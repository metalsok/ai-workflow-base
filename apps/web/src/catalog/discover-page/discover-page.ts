import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SaveGameWidget } from '../../library/save-game-widget';
import { LibraryState } from '../../library/library-state';
import { httpResource } from '@angular/common/http';
import { apiErrorMessage } from '../../http-error';
import type { DiscoveryResult } from '../models';
import { GameShelf } from '../game-shelf/game-shelf';

@Component({
  selector: 'app-discover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, GameShelf, SaveGameWidget],
  templateUrl: './discover-page.html',
})
export class DiscoverPage {
  readonly library = inject(LibraryState);
  readonly popularResource = httpResource<DiscoveryResult>(
    () => '/api/catalog/discovery/popular',
  );
  readonly recentResource = httpResource<DiscoveryResult>(
    () => '/api/catalog/discovery/recent',
  );
  readonly popular = computed(() =>
    !this.popularResource.isLoading() && this.popularResource.hasValue()
      ? this.popularResource.value()
      : null,
  );
  readonly recent = computed(() =>
    !this.recentResource.isLoading() && this.recentResource.hasValue()
      ? this.recentResource.value()
      : null,
  );
  readonly popularLoading = this.popularResource.isLoading;
  readonly recentLoading = this.recentResource.isLoading;
  readonly popularError = computed(() => {
    const error = this.popularResource.error();
    return error
      ? apiErrorMessage(error, 'Cannot load popular games. Please try again.')
      : '';
  });
  readonly recentError = computed(() => {
    const error = this.recentResource.error();
    return error
      ? apiErrorMessage(error, 'Cannot load recent releases. Please try again.')
      : '';
  });
  readonly featured = computed(
    () => this.popular()?.items[0] ?? this.recent()?.items[0] ?? null,
  );
  readonly artworkFailed = linkedSignal({
    source: () => this.featured()?.artworkUrl,
    computation: () => false,
  });
}
