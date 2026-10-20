# Frontend Signal Forms migration

Accepted and implemented on 2026-10-20. All frontend forms and user-editable form
controls now use Angular Signal Forms from `@angular/forms/signals`. This is also
the required approach for future features; see the
[framework convention](agents/framework-skills.md#frontend-forms).

## What changed

- Account registration and sign-in use a typed signal model and schema for email
  and password validation, replacing `ngModel` and `ngForm`. Submit guards retain
  pending-request protection; successful authentication clears the password.
- Catalog search uses a route-backed editable model with schema validation.
  Explicit submission trims the query before navigation, and route changes reset
  the field. Queries require at least two non-padding characters and have a
  100-character maximum.
- Library Play status uses a focused `PlayStatusEditor`. It owns field state and
  disabling; the routed library page owns edits, errors, and server refreshes.
  Failed saves restore the server's authoritative status.
- Project instructions require Signal Forms for future forms. No template-driven
  or Reactive Forms bindings remain in the application.

## Design decisions

Keep form models and schemas in their feature modules. Angular provides the form
implementation, so there is no additional generic form abstraction. Inputs bind
with `[formField]`; schemas own validation and field availability. Accessible
labels, autocomplete, validation state, and the purple design are preserved.

Signal Forms manages field state; explicit user actions retain the existing RxJS
HTTP lifecycle. Native submit handlers prevent browser navigation and check form
validity. There are no HTTP-to-Promise bridges or effect-driven mutations.
The application remains zoneless with explicit OnPush declarations.

## Verification

The migration passed `npm run typecheck`, `npm run format:check`, the production
build, and `npm test`: 55 real HTTP/PostgreSQL tests and 12 desktop/mobile browser
journeys. Extended browser coverage verifies invalid account input, field length
constraints, invalid search submission, and pending/failed Play status saves.
Live IGDB checks were not needed; the existing deterministic fixtures were used.

The agreed scope and acceptance criteria are retained in the
[migration spec](../.scratch/frontend-signal-forms/spec.md).
