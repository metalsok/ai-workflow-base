import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApi, CatalogError } from './api';
import { catalogRequest } from './request';
import { GameCover } from './cover';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-game-page',
  imports: [DatePipe, RouterLink, GameCover],
  templateUrl: './game-page.html',
})
export class GamePage {
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly request = catalogRequest(
    () => this.params().get('id') ?? '',
    (id) => this.api.details(id),
  );
  readonly notFound = computed(() => {
    const failure = this.request.failure();
    return failure instanceof CatalogError && failure.status === 404;
  });
}
