import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, tap } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-account-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './account-page.html',
})
export class AccountPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly registering = this.route.snapshot.data['registering'] === true;
  readonly pending = signal(false);
  readonly error = signal(
    this.route.snapshot.queryParamMap.has('unavailable')
      ? 'Cannot load your account. Please try again.'
      : '',
  );
  readonly email = signal('');
  readonly password = signal('');

  submit() {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.auth
      .authenticate(
        this.registering ? 'register' : 'login',
        this.email(),
        this.password(),
      )
      .pipe(
        tap(() => this.password.set('')),
        switchMap(() => this.router.navigateByUrl('/discover')),
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: unknown) =>
          this.error.set(
            error instanceof Error
              ? error.message
              : 'Cannot connect. Please try again.',
          ),
      });
  }
}
