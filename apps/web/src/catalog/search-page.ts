import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApi } from './api';
import { catalogRequest } from './request';
import { SaveGame } from '../library/save-game';
import { GameCover } from './cover';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-search-page',
  imports: [RouterLink, DatePipe, GameCover, SaveGame],
  templateUrl: './search-page.html',
})
export class SearchPage {
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => this.params().get('q') ?? '');
  readonly request = catalogRequest(
    () => {
      const query = this.query();
      return query.trim()
        ? { query, page: Number(this.params().get('page') ?? 1) }
        : undefined;
    },
    ({ query, page }) => this.api.search(query, page),
  );
}
