import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  linkedSignal,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import {
  form,
  FormField,
  required,
  minLength,
  maxLength,
  validate,
} from '@angular/forms/signals';
import { finalize, switchMap } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DiscoverPage } from '../catalog/discover-page/discover-page';
import { LibraryPage } from '../library/library-page/library-page';
import { SearchPage } from '../catalog/search-page/search-page';
import { GamePage } from '../catalog/game-page/game-page';
import { LibraryApi } from '../library/api';
import { Auth } from '../auth';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    FormField,
    SearchPage,
    GamePage,
    LibraryPage,
    DiscoverPage,
  ],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(Auth);
  readonly savedLibrary = inject(LibraryApi);
  constructor() {
    this.savedLibrary.refresh();
  }
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly library = this.route.snapshot.data['library'] === true;
  readonly searchPage = this.route.snapshot.data['search'] === true;
  readonly gamePage = this.route.snapshot.data['game'] === true;
  private readonly searchModel = linkedSignal(() => ({
    query: this.params().get('q') ?? '',
  }));
  readonly searchForm = form(this.searchModel, (fields) => {
    required(fields.query);
    minLength(fields.query, 2);
    maxLength(fields.query, 100);
    validate(fields.query, ({ value }) =>
      value().trim().length < 2
        ? { kind: 'queryLength', message: 'Enter at least two characters.' }
        : undefined,
    );
  });
  search() {
    if (!this.searchForm().valid()) return;
    this.router
      .navigate(['/search'], {
        queryParams: { q: this.searchModel().query.trim() },
      })
      .catch(() =>
        this.error.set('Cannot open search right now. Please try again.'),
      );
  }
  readonly error = signal('');
  readonly pending = signal(false);

  logout() {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.auth
      .logout()
      .pipe(
        switchMap(() => this.router.navigateByUrl('/login')),
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: () =>
          this.error.set('Cannot sign out right now. Please try again.'),
      });
  }
}
