import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, tap } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  form,
  FormField,
  required,
  email,
  minLength,
  maxLength,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-account-page',
  imports: [FormField, RouterLink],
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
  private readonly accountModel = signal({ email: '', password: '' });
  readonly accountForm = form(this.accountModel, (fields) => {
    required(fields.email);
    email(fields.email);
    maxLength(fields.email, 254);
    required(fields.password);
    minLength(fields.password, 12);
    maxLength(fields.password, 128);
  });

  submit() {
    if (this.pending() || !this.accountForm().valid()) return;
    this.pending.set(true);
    this.error.set('');
    this.auth
      .authenticate(
        this.registering ? 'register' : 'login',
        this.accountModel().email,
        this.accountModel().password,
      )
      .pipe(
        tap(() =>
          this.accountModel.update((value) => ({ ...value, password: '' })),
        ),
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
