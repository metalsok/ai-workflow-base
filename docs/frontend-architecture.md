# Angular frontend architecture

Updated on 2026-10-20. The frontend uses routed feature containers, presentational
controls, and one shared library state owner. This follows
[ADR 0003](adr/0003-routed-feature-pages.md), which supersedes the earlier
shell-only request decision.

## Routes and ownership

`Shell` owns the common navigation, search form, account controls, and router
outlet. Its lazy child routes use the shared signed-in guard:

| URL                  | Container      | Responsibility                                                             |
| -------------------- | -------------- | -------------------------------------------------------------------------- |
| `/discover`          | `DiscoverPage` | Independent popular/recent resources and spotlight selection               |
| `/search?q=…&page=…` | `SearchPage`   | Search parameters, results, loading, errors, and retry                     |
| `/games/:id`         | `GamePage`     | Details resource, missing-game presentation, and retry                     |
| `/library?status=…`  | `LibraryPage`  | Local filtering, status edits, removal, pending state, and mutation errors |

Pages declare direct HTTP reads with `httpResource`. Named computed signals
prepare data and readable errors for templates, including guarded value reads
and hiding old catalog results during reload. Changing request parameters
replaces pending reads; leaving a page destroys its resource. There is no
`catalogRequest` wrapper or page-selection conditional in the shell.

Shelves, covers, save controls, and Play status editors receive inputs and emit
intent. Local form and presentation state stay with their rendering component.
The app retains Signal Forms, explicit OnPush declarations, and zoneless startup.

## Shared library data

`LibraryState` is provided by the shell component, with automatic root provision
disabled. Its full-library resource supplies both saved badges and the library
page. It survives child-page navigation and is destroyed when leaving the
signed-in shell. Resource identity follows the account ID rather than a fresh
account object returned by a route guard.

The library page derives `status` from the URL and exposes `filteredItems` as a
computed array. Changing the filter makes no HTTP request. An empty filter shows
all entries; Played includes Playing, Completed, and Stopped playing. Returning
`null` before a usable response distinguishes missing data from an empty list.

The service owns shared save actions and per-game pending/error state. The
library page owns explicit edit/remove subscriptions. Successful writes refetch
the shared resource; failed edits also refetch to restore the authoritative form
value. Entering the library refreshes its data. Shared library read errors and
retry appear in the shell. This accepts an extra GET after edits in exchange for
avoiding a second locally patched cache.

Shared saves follow the shell lifetime; page-owned edits are cancelled on page
teardown. Cancelling a request does not roll back a server write. Revisit shared
mutation ownership if edits must finish and reconcile across page navigation.

The backend contract is unchanged: `library_entries` connects an account and
catalog game with a Play status, and the API determines ownership from the
session. Game metadata remains in `catalog_games`.

## Connected widget trial

Only the discovery spotlight uses `SaveGameWidget`. It accepts a Game ID,
injects `LibraryState`, and wires the existing presentational `SaveGame` control.
It creates no independent resource or cache. Other save controls retain explicit
inputs/outputs so the benefit of avoiding repeated bindings can be compared with
the cost of an injected dependency. No shell connection token is required.

## Session handling

A functional interceptor handles 401 responses from protected catalog/library
endpoints. It clears the matching current account, redirects to login, and
propagates the original error. Account endpoints keep their own behavior:
invalid login credentials show a validation error, and an unauthenticated account
check lets the route guard redirect. Feature-specific errors remain with their
owning container or shared library state.

## Development and production

| Command                           | Angular mode         | Source maps |
| --------------------------------- | -------------------- | ----------- |
| `npm run dev` / `npm run dev:web` | Development          | Enabled     |
| `npm run build`                   | Optimized production | Disabled    |

`angular.json` selects development for serving and production for builds.
Restart an already-running development server after changing these settings.
The API proxy and same-origin session behavior are preserved. See
[development instructions](development.md) for setup and commands.

The repository-local
[`angular-architecture-review`](../.agents/skills/angular-architecture-review/SKILL.md)
skill reviews ownership, lifetimes, alternatives, and abstraction costs before
future structural changes. It complements the official Angular developer skill
and the installed codebase-design guidance.

## Verification

Typechecking, lint, formatting, and production/development builds passed during
this change. Development output includes source maps and Angular debug code;
production output excludes both. On this Mac, build verification used
`NG_BUILD_CACHE_STORE=sqlite` after the default LMDB cache crashed in native code;
this is an invocation setting rather than a project configuration change.

Browser coverage was extended for expired sessions during reads and saves,
back/forward navigation, and shared library reads across page/filter changes.
The API and browser suites could not start their disposable localhost services
in the agent sandbox (`listen EPERM` on `127.0.0.1`). Those journeys remain
unverified for this change; run `npm test` in a terminal that permits local
listeners. Automated tests use deterministic provider fixtures; no live IGDB
validation was run.
