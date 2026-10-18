import { Injectable, signal, inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

interface Account {
  id: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  readonly account = signal<Account | null>(null);

  async load() {
    const response = await fetch('/api/accounts/me');
    if (response.status === 401) {
      this.account.set(null);
      return;
    }
    if (!response.ok)
      throw new Error('Cannot load your account. Please try again.');
    this.account.set((await response.json()) as Account);
  }

  async authenticate(
    action: 'login' | 'register',
    email: string,
    password: string,
  ) {
    const response = await fetch(`/api/accounts/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      throw new Error(
        error.message ?? 'Cannot sign in right now. Please try again.',
      );
    }
    this.account.set((await response.json()) as Account);
  }

  async logout() {
    const response = await fetch('/api/accounts/logout', { method: 'POST' });
    if (!response.ok)
      throw new Error('Cannot sign out right now. Please try again.');
    this.account.set(null);
  }
}

export const signedIn: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    await auth.load();
  } catch {
    return router.createUrlTree(['/login'], {
      queryParams: { unavailable: '1' },
    });
  }
  return auth.account() ? true : router.createUrlTree(['/login']);
};
