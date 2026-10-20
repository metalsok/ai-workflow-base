# Frontend Signal Forms

Owner approved migration on 2026-10-20 after reviewing a Signal Forms example.
Owner accepted the implementation and requested documentation and push on the
same date.

## Scope

Migrate account email/password, route-backed catalog search, and per-game Play
status selection to Angular Signal Forms. Require the same approach for all new
frontend forms and user-editable form controls in project framework guidance.

## Acceptance criteria

- Typed signal models, form schemas, and FormField bindings replace ngModel and DOM-owned field state.
- Account email and password constraints, pending guards, retry, and successful password clearing remain intact.
- Search preserves trimmed queries, length limits, keyboard submit, and route synchronization.
- Play status changes save explicitly, disable during pending requests, and reconcile with server state after failure.
- Preserve the approved design, accessible labels, zoneless OnPush, and Observable HTTP actions.
- Browser journeys cover invalid account/search fields and Play status failure recovery.
- Typecheck, format check, build, and npm test pass.

## Design

Keep account and search forms in their existing feature modules. A focused Play
status editor owns field state; the library page owns requests and reconciliation.
No generic form abstraction or HTTP Promise bridge is needed.

## Verification — 2026-10-20

Implemented with the angular-developer skill and version-specific Angular MCP
guidance. Typecheck, format check, production build, and npm test passed:
55 HTTP/PostgreSQL tests and 12 desktop/mobile browser journeys. Extended browser
coverage verifies invalid account fields, schema-derived length constraints,
invalid search submission, and pending/failure recovery for Play status edits.
