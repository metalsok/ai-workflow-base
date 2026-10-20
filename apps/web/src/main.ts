import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
import { sessionInterceptor } from './session-interceptor';

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
    provideHttpClient(withInterceptors([sessionInterceptor])),
    provideRouter(
      [
        { path: 'login', component: AccountPage },
        {
          path: 'register',
          component: AccountPage,
          data: { registering: true },
        },
        {
          path: '',
          component: Shell,
          canActivateChild: [signedIn],
          children: [
            {
              path: 'discover',
              title: 'Discover',
              loadComponent: () =>
                import('./catalog/discover-page/discover-page').then(
                  (m) => m.DiscoverPage,
                ),
            },
            {
              path: 'library',
              title: 'My Library',
              loadComponent: () =>
                import('./library/library-page/library-page').then(
                  (m) => m.LibraryPage,
                ),
            },
            {
              path: 'search',
              title: 'Search games',
              loadComponent: () =>
                import('./catalog/search-page/search-page').then(
                  (m) => m.SearchPage,
                ),
            },
            {
              path: 'games/:id',
              title: 'Game details',
              loadComponent: () =>
                import('./catalog/game-page/game-page').then((m) => m.GamePage),
            },
            { path: '', pathMatch: 'full', redirectTo: 'discover' },
          ],
        },
        { path: '**', redirectTo: 'discover' },
      ],
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
}).catch(console.error);
