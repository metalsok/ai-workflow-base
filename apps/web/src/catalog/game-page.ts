import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApi, CatalogError, type GameResult } from './api';
import { catalogRequest } from './request';
import { GameCover } from './cover';

@Component({
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
  readonly request = catalogRequest<GameResult>((signal) =>
    this.api.details(this.params().get('id') ?? '', signal),
  );
  readonly notFound = computed(() => {
    const failure = this.request.failure();
    return failure instanceof CatalogError && failure.status === 404;
  });
}
