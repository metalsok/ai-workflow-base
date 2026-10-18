import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApi, type SearchResult } from './api';
import { catalogRequest } from './request';
import { GameCover } from './cover';

@Component({
  selector: 'app-search-page',
  imports: [RouterLink, DatePipe, GameCover],
  templateUrl: './search-page.html',
})
export class SearchPage {
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => this.params().get('q') ?? '');
  readonly request = catalogRequest<SearchResult>((signal) => {
    const query = this.query();
    const page = Number(this.params().get('page') ?? 1);
    return query.trim() ? this.api.search(query, page, signal) : null;
  });
}
