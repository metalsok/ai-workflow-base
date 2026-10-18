import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from './auth';

@Component({
  selector: 'app-account-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './account-page.html',
})
export class AccountPage {
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

  async submit() {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    try {
      await this.auth.authenticate(
        this.registering ? 'register' : 'login',
        this.email(),
        this.password(),
      );
      this.password.set('');
      await this.router.navigateByUrl('/discover');
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Cannot connect. Please try again.',
      );
    } finally {
      this.pending.set(false);
    }
  }
}
