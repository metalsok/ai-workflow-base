import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';
import { apiErrorMessage } from '../../http-error';
import { SaveGame } from '../../library/save-game';
import { LibraryState } from '../../library/library-state';
import type { SearchResult } from '../models';
import { DatePipe } from '@angular/common';
import { GameCover } from '../cover';

@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, GameCover, SaveGame],
  templateUrl: './search-page.html',
})
export class SearchPage {
  readonly library = inject(LibraryState);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => this.params().get('q') ?? '');
  readonly request = httpResource<SearchResult>(() =>
    this.query().trim()
      ? {
          url: '/api/catalog/search',
          params: { q: this.query(), page: this.params().get('page') ?? '1' },
        }
      : undefined,
  );
  readonly result = computed(() =>
    !this.request.isLoading() && this.request.hasValue()
      ? this.request.value()
      : null,
  );
  readonly loading = this.request.isLoading;
  readonly error = computed(() => {
    const error = this.request.error();
    return error
      ? apiErrorMessage(error, 'Cannot load games right now. Please try again.')
      : '';
  });
}
