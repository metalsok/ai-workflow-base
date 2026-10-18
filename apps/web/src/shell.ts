import { Component, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { Auth } from './auth';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  readonly library = inject(ActivatedRoute).snapshot.data['library'] === true;
  readonly error = signal('');
  readonly pending = signal(false);

  async logout() {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch {
      this.error.set('Cannot sign out right now. Please try again.');
    } finally {
      this.pending.set(false);
    }
  }
}
