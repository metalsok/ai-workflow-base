# api-java — reading guide

The game tracker API written the way a senior Java developer would: Spring Boot,
a standard controller/service/repository layout, Spring Security. Same URLs and JSON as `apps/api`, so the
Angular app works against either. Decisions: `.scratch/api-java/spec.md`.

## Run it

```sh
apps/api-java/run.sh          # port 3000, database game_tracker_java, root .env
apps/api-java/mvnw -f apps/api-java verify   # all tests (needs Docker)
```

Stop the Node API first; both listen on port 3000. Java comes from Homebrew
(`brew install openjdk@25`); `run.sh` finds it. The database must exist once:
`docker exec game-tracker-db-1 createdb -U game_tracker game_tracker_java`.
Flyway creates the tables on startup.

## How a request flows

```
browser ─► Spring Security filters ─► controller ─► service ─► repository (Spring Data JPA) ─► PostgreSQL
           (session, CSRF, signed      (HTTP: read   (rules)
            in?, security headers)      input, status)
```

## Layout

One folder (Java: package) per feature, and inside it one class per role, like
the NestJS folders in `apps/api`:

| Class                    | Role                                      | NestJS equivalent  |
| ------------------------ | ----------------------------------------- | ------------------ |
| `*Controller`            | HTTP routes: read input, call the service | `*.controller.ts`  |
| `*Service`               | The feature's rules                       | `*.service.ts`     |
| `*Repository`            | Database access; Spring Data writes it    | TypeORM repository |
| entity (`Account`)       | One database table                        | `*.entity.ts`      |
| `*Request` / `*Response` | JSON shapes in and out (records)          | DTOs               |

There are no module files: Spring finds every `@RestController`, `@Service`,
`@Component` and `@Configuration` below `ApiJavaApplication` by itself.
`shared/` holds what every feature uses: security rules and error handling.

## Read in this order

1. `accounts/AccountsController.java`: register, login, me.
2. `accounts/AccountService.java`: registering, email normalizing.
3. `accounts/Account.java` and `AccountRepository.java`: the table and its queries.
4. `shared/security/SecurityConfiguration.java`: every security rule, numbered.
5. `accounts/AccountUserDetailsService.java` and `SignedInAccount.java`: how
   Spring Security finds an account and what it keeps in the session.
   `SessionSignIn` stores the signed-in user in a fresh session.
6. `shared/web/ApiExceptionHandler.java`: how errors become JSON.
7. `src/main/resources/db/migration/`: the tables (Flyway).

## Differences from the Node API

| Topic            | Node (`apps/api`)                   | Java (`apps/api-java`)                           |
| ---------------- | ----------------------------------- | ------------------------------------------------ |
| Forged requests  | Origin header must match APP_ORIGIN | CSRF token: XSRF-TOKEN cookie → X-XSRF-TOKEN     |
| Session cookie   | `game_tracker.sid`, signed          | `game_tracker_java.sid`, random id (unsigned)    |
| Session lifetime | 7 days from sign-in                 | 7 days since last request (sliding)              |
| Session storage  | `sessions` table                    | Spring Session's `spring_session*` tables        |
| Schema           | TypeORM migrations                  | Flyway SQL migrations; Hibernate only validates  |
| Error body       | `{statusCode, message}`             | RFC 9457 problem detail + `message`              |
| Cache-Control    | `no-store`                          | `no-cache, no-store, max-age=0, must-revalidate` |
| Unexpected error | Not logged                          | Logged, answered with a generic 500              |

`SESSION_SECRET` and `APP_ORIGIN` are not used: Spring Session ids are random
and need no signature, and CSRF tokens replace the Origin check.

## Endpoints

Same as `apps/api/README.md`. Implemented so far: health and accounts.
