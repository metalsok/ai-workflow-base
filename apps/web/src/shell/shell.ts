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
  RouterOutlet,
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
import { Auth } from '../auth';
import { LibraryState } from '../library/library-state';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shell',
  providers: [LibraryState],
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormField],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(Auth);
  readonly library = inject(LibraryState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
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
