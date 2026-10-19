import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, tap, throwError, type Observable } from 'rxjs';
import { apiErrorMessage } from './http-error';
import { Service, signal, inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

interface Account {
  id: string;
  email: string;
}

@Service()
export class Auth {
  private readonly http = inject(HttpClient);
  readonly account = signal<Account | null>(null);

  load(): Observable<Account | null> {
    return this.http.get<Account>('/api/accounts/me').pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 401
          ? of(null)
          : throwError(
              () => new Error('Cannot load your account. Please try again.'),
            ),
      ),
      tap((account) => this.account.set(account)),
    );
  }

  authenticate(
    action: 'login' | 'register',
    email: string,
    password: string,
  ): Observable<Account> {
    return this.http
      .post<Account>(`/api/accounts/${action}`, { email, password })
      .pipe(
        tap((account) => this.account.set(account)),
        catchError((error: unknown) =>
          throwError(
            () =>
              new Error(
                apiErrorMessage(
                  error,
                  'Cannot sign in right now. Please try again.',
                ),
              ),
          ),
        ),
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/accounts/logout', null).pipe(
      tap(() => this.account.set(null)),
      catchError(() =>
        throwError(
          () => new Error('Cannot sign out right now. Please try again.'),
        ),
      ),
    );
  }
}

export const signedIn: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return auth.load().pipe(
    map((account) => (account ? true : router.createUrlTree(['/login']))),
    catchError(() =>
      of(
        router.createUrlTree(['/login'], {
          queryParams: { unavailable: '1' },
        }),
      ),
    ),
  );
};
