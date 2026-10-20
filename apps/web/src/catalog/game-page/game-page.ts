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
import type { GameResult } from '../models';
import { DatePipe } from '@angular/common';
import { GameCover } from '../cover';

@Component({
  selector: 'app-game-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, GameCover, SaveGame],
  templateUrl: './game-page.html',
})
export class GamePage {
  readonly library = inject(LibraryState);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly request = httpResource<GameResult>(() => {
    const id = this.params().get('id');
    return id ? `/api/catalog/games/${encodeURIComponent(id)}` : undefined;
  });
  readonly notFound = computed(() => this.request.statusCode() === 404);
  readonly result = computed(() =>
    !this.request.isLoading() && this.request.hasValue()
      ? this.request.value()
      : null,
  );
  readonly loading = this.request.isLoading;
  readonly error = computed(() => {
    const error = this.request.error();
    return error
      ? apiErrorMessage(error, 'Cannot load this game. Please try again.')
      : '';
  });
}
