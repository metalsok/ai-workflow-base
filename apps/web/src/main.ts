import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideRouter,
  RouterOutlet,
  withInMemoryScrolling,
} from '@angular/router';
import { AccountPage } from './account-page';
import { Shell } from './shell';
import { signedIn } from './auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class App {}

bootstrapApplication(App, {
  providers: [
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
