# Ticket 03: private Library implementation

Implemented and accepted on 2026-10-19. The owner approved the implementation
and subsequent Angular organization/`@Service()` conventions; ticket 03 is done.

## Delivered behavior

Search and details can save an eligible Game as Want to play. A repeated save
preserves the existing status, including concurrent saves. My Library renders
stored Catalog metadata with the four Play statuses, the combined Played view,
status changes, removal, and desktop/mobile empty, loading, and retry states.
All reads and mutations derive ownership from the authenticated session.

Accounts, Catalog, and Library retain their existing boundaries. Library uses
TypeORM repositories, an account/Game composite primary key, and relationships
to Account and CachedGame. The generated PersonalLibrary migration adds one table
and its constraints; the baseline and historical SQL are unchanged. Saved cards,
status changes, removals, and repeated saves require no IGDB request. A new save
resolves the eligible Game through Catalog and its existing request budget.

The project profile follows the existing Angular 22.2/NestJS 12.1/TypeORM 1.1.2,
TypeScript 6 and Node 26 conventions. No dependencies or framework versions
changed. Angular remains zoneless with explicit OnPush, HttpClient Observables,
rxResource reads, destruction cleanup for explicit mutation subscriptions, and
Tailwind template utilities. Both framework skills were loaded:
`angular-developer` and `nestjs-professional-software-engineering`.

## Verification

The pre-agreed seams were the HTTP API with real PostgreSQL and the browser
journey. Tests replace only the external provider boundary; live IGDB validation
remains opt-in. PostgreSQL processes and schemas were disposable; the real local
development database was not migrated or modified.

- API checks cover two accounts, identifier tampering, all status transitions,
  Played and individual filters, concurrent duplicates, removal, restart,
  signing in on another device, logout, invalid input, Origin checks, and metadata
  rendering/status operations with IGDB returning 503.
- Migration checks cover clean installs with no entity/schema difference,
  populated upgrades preserving accounts/sessions/catalog/history, rollback and
  reapplication, and continued account/session and Library HTTP access.
- Desktop and mobile browser journeys cover saving from search and details,
  duplicate saves, status changes, Played, empty filters, reload, sign-in again,
  and removal. Screenshots were inspected for both viewports, including image
  fallbacks; neither layout overflowed horizontally.
- The browser regression caught a select initialization bug: the persisted value
  was set before options rendered. Binding the selected option now displays the
  persisted status on initial render and reload.

`npm run typecheck`, `npm run format:check`, `npm run build`, and `npm test`
passed. The final suite contains 45 HTTP/PostgreSQL tests and six desktop/mobile
browser journeys. Node 26.12.0 and the locked dependency tree were used.

## Review

Fixed point: `973b7b9031473ac95810aacf45f74218e15fa742` (session start).
The code-review skill ran independent Standards and Spec subagents against the
implementation diff. Both found the same migration rollback ordering defect.
The new real-PostgreSQL regression reproduced it before correction; the migration
now drops foreign keys before the table. Both reviewers inspected the correction
and reported no remaining findings. Standards reported no material baseline smells.

## Using the updated local app

Run `npm run db:migrate` once, then restart the development API. The migration is
additive and preserves existing account/session/catalog rows. Follow the existing
migration runbook for backups and deployment. A rollback removes Library data;
the rollback/reapply experiment was performed only on a disposable test database.
No changes were pushed or deployed.
