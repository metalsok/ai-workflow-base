import { Component, effect, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { SearchPage } from './catalog/search-page';
import { GamePage } from './catalog/game-page';
import { Auth } from './auth';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, FormsModule, SearchPage, GamePage],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly library = this.route.snapshot.data['library'] === true;
  readonly searchPage = this.route.snapshot.data['search'] === true;
  readonly gamePage = this.route.snapshot.data['game'] === true;
  readonly query = signal('');

  constructor() {
    effect(() => this.query.set(this.params().get('q') ?? ''));
  }
  async search() {
    if (this.query().trim().length < 2) return;
    await this.router.navigate(['/search'], {
      queryParams: { q: this.query().trim() },
    });
  }
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
