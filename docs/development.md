# Development and account access

## Start locally

Prerequisites: Node 26, npm, and Docker Compose with permission to use Docker.
Angular 22.2, NestJS 12.1, and TypeScript 6.0 are locked in `package-lock.json`.
Run all commands from the repository root.

```bash
npm ci
node scripts/setup-dev.mjs
npm run db:up
npm run db:migrate
npm run dev
```

Open **http://127.0.0.1:4200**. Use this exact origin: `localhost` is a different
origin. Angular proxies `/api` to NestJS on loopback port 3000. Registration
immediately signs you in. Discover and My Library currently supply the shell;
catalog and library operations belong to later tickets.

The setup script generates database and session secrets in the ignored `.env`
with owner-only permissions. Existing nonempty settings are preserved; existing
IGDB credentials are untouched. Keep the same `SESSION_SECRET` across restarts.
`.env.example` lists configuration keys and contains no usable credentials.

`npm run db:up` starts PostgreSQL 17 with a named data volume and a health check.
Port 5433 is exposed on loopback for development only. `docker compose stop db`
preserves data; `docker compose down -v` deletes that local database volume.
The full application container deployment is covered by issue 06.

## Migrations and built application

`npm run db:migrate` applies numbered SQL migrations in `db/migrations` in one
transaction, with a database lock and checksums. Repeating the command is safe;
changing an applied migration is rejected. Add a new migration for schema changes.
The API also runs outstanding migrations on startup, including in tests.

```bash
npm run build
APP_ORIGIN=http://127.0.0.1:3000 npm start
```

The built Angular app and API are served together at loopback port 3000.
Deep links return Angular's index; unknown `/api` routes retain API 404 responses.
Angular critical CSS inlining is disabled so the server's script policy can
remain `script-src 'self'` without an inline stylesheet-loader script.

## Checks

```bash
npm run format:check
npm run typecheck
npm run build
npx playwright install chromium # once per browser version
npm run test:api                # real HTTP + PostgreSQL
npm run test:browser            # builds, then desktop and mobile browser journey
npm test                       # both suites
```

The API and browser tests use separate, disposable PostgreSQL 17 processes from
platform-specific binaries installed through the development dependency
`embedded-postgres`. No database is mocked, and no Docker daemon is required for
these checks. Run as a non-root user with permission to bind loopback ports.
The helper launches binaries directly because the package's lifecycle wrapper
can hide a failing Node test runner's exit status. Each process is stopped and
its temporary directory is removed after the suite. Its trust authentication is
restricted to this temporary loopback-only test server.

Alternatively set `TEST_DATABASE_URL` to an **empty disposable PostgreSQL 17
database**. The tests apply migrations and create accounts there; the caller
owns cleanup. Do not point it at a personal, shared, or production database.

The API tests assert responses and cookies, including account/session continuity
across NestJS restarts. The Playwright journey uses accessible controls and runs
at desktop and phone widths. Failures retain traces under ignored `test-results`.
IGDB is not contacted by these account tests.

## Authentication contract

All account operations go through `/api/accounts`:

| Method | Path        | Behavior                                                                         |
| ------ | ----------- | -------------------------------------------------------------------------------- |
| POST   | `/register` | Valid email and 12–128-character password; creates and signs in an account (201) |
| POST   | `/login`    | Email/password verification; replaces the current session (200)                  |
| GET    | `/me`       | Returns only account ID and normalized email, or 401                             |
| POST   | `/logout`   | Revokes the current persisted session and expires the cookie (204)               |

Registration/login accept JSON `{ "email": "…", "password": "…" }`.
Emails are trimmed and normalized to lowercase. Duplicate registration returns
409; invalid fields return 400. Wrong passwords and unknown emails share the
same 401 response and both perform Argon2 verification. Passwords are stored as
Argon2id hashes; password fields and hashes never appear in account responses.
Passport Local handles verification, and Express Session with connect-pg-simple
stores revocable sessions in PostgreSQL. The browser receives a signed opaque ID.

Sessions have a fixed seven-day lifetime, enforced on the server as well as by
the cookie and database expiry. Sign-in rotates the session ID and destroys the
previous session. Logout deletes the current session. Restarting the app retains
sessions when the database and secret are retained. Expired sessions are rejected
on access and pruned periodically by the store.

The cookie is HttpOnly, SameSite=Lax, and Secure when `APP_ORIGIN` uses HTTPS.
Every API mutation requires an exact matching `Origin` header, including login,
registration, and logout; missing or foreign origins receive 403. This is the
CSRF defense, together with same-origin hosting and explicit cookie policy.
API responses use `Cache-Control: no-store`. Helmet supplies security headers.

Authentication attempts are bounded in PostgreSQL over 15-minute windows:
60 combined registration/login attempts per address and 10 login attempts per
normalized email. Limits count successful attempts too. A blocked request
returns 429 with `Retry-After`. Restarting the API does not clear these counters.
Forwarding headers are ignored by default.

For an HTTPS proxy on the same host, set `APP_ORIGIN` to the exact public HTTPS
origin and `TRUST_PROXY_LOOPBACK=true`, and configure the proxy to overwrite
forwarding headers. Only loopback proxies are trusted. The API binds locally;
private Tailscale access, HTTPS termination, and final deployment verification
follow in issue 06. Secure cookies are not issued over plain HTTP.

Email ownership is **not verified** for this private test. Application accounts
are independent of ChatGPT and Tailscale. Administrator password recovery and
revocation of all account sessions are scheduled for issue 05; no self-service
recovery or outbound email is available in this slice.

## Verification limits for issue 01

The implementation session could not access the host Docker socket. The HTTP
and browser checks use the real disposable PostgreSQL process described above.
Compose configuration was validated during implementation. The owner subsequently
confirmed local Compose startup, registration, sign-in/out, and the restart check
for PostgreSQL and the app. These manual confirmations resolve the issue 01
container verification gap; they are separate from the automated test results.

Version compatibility reference: [Angular's supported versions](https://angular.dev/reference/versions).
Session integration: [NestJS session documentation](https://docs.nestjs.com/techniques/session)
and [Express session cookie and storage options](https://expressjs.com/en/resources/middleware/session/).
