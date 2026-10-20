import {
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Auth } from './auth';

export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const owner = auth.account()?.id;
  const protectedRequest = /^\/api\/(catalog|library)(?:\/|\?|$)/.test(
    request.url,
  );
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        protectedRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        owner &&
        auth.account()?.id === owner
      ) {
        auth.account.set(null);
        return from(router.navigateByUrl('/login')).pipe(
          switchMap(() => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
