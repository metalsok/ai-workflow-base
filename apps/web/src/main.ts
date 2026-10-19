import { provideHttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideRouter,
  RouterOutlet,
  withInMemoryScrolling,
} from '@angular/router';
import { AccountPage } from './account-page/account-page';
import { Shell } from './shell/shell';
import { signedIn } from './auth';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class App {}

// Angular 22 boots zoneless by default; keep Zone.js and zone providers out.
bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter(
      [
        { path: 'login', component: AccountPage },
        {
          path: 'register',
          component: AccountPage,
          data: { registering: true },
        },
        {
          path: 'search',
          component: Shell,
          canActivate: [signedIn],
          data: { search: true },
        },
        {
          path: 'games/:id',
          component: Shell,
          canActivate: [signedIn],
          data: { game: true },
        },
        { path: 'discover', component: Shell, canActivate: [signedIn] },
        {
          path: 'library',
          component: Shell,
          canActivate: [signedIn],
          data: { library: true },
        },
        { path: '', pathMatch: 'full', redirectTo: 'discover' },
        { path: '**', redirectTo: 'discover' },
      ],
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
}).catch(console.error);
