# Session handoff — 2026-10-18

## Current progress

- Account access is implemented in `070b3b6`; owner verification of registration,
  sign-in/out, and restart persistence is recorded in `721fa8e`.
- Game search and details are implemented in `3b3a1d8`. The issue records passing
  automated checks, Standards/Spec reviews, and representative live IGDB checks.
  Ticket 02 is now `done` after owner acceptance of the implementation and
  code-review revisions. Ticket 01 retains its recorded verification status.
- Angular and NestJS skills are installed for this user. Their selection,
  revisions, and workflow rules are in `docs/agents/framework-skills.md`.
- The Angular CLI MCP server is configured in the user's Codex configuration.
  Its saved launch configuration was tested: Angular 22.2.3 initialized,
  discovered `web`, and returned workspace best practices. Restart the Codex
  client/session to discover the newly configured tools.

## Resume

Read `AGENTS.md`, the parent `spec.md`, and the issue outcomes first. The next
implementation ticket is the separate Tailwind migration, to be created before
`issues/03-personal-library.md` at the owner's request. Use the relevant framework skills, explain meaningful steps,
and preserve TDD at the agreed HTTP/PostgreSQL and browser seams.

To run the existing development setup:

```bash
npm run db:up
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:4200`; the configured origin policy rejects
`http://localhost:4200`. Local secrets remain in the ignored `.env`.
Database data is held in the Docker volume. See `docs/development.md` for setup
and persistence details.

The IDE and Obsidian files visible in `git status` are unrelated user files.
Preserve them. User-level skills and MCP configuration are local to this machine
and are not included in the repository commits.


## Follow-up — 2026-10-19

Ticket 02's owner-requested code improvements are implemented in the working
tree: CatalogService extraction, parsed provider records, linkedSignal state,
and a resource-backed request helper. All six Angular components explicitly
use OnPush; zoneless operation is retained and checked by the browser journey.
The owner requires these Angular conventions for future components; read the
Project Angular requirements in `docs/agents/framework-skills.md`.

Type checking, formatting, 27 HTTP/PostgreSQL tests, four desktop/mobile browser
journeys, and both application builds passed. Read ticket 02's follow-up for
scope and the correction to its initial null-metadata review finding. The code
changes are uncommitted and still await owner acceptance. Ticket 03 has not begun.

Authentication and catalog frontend transport now use Angular `HttpClient`; the
resource-backed catalog lifecycle is preserved and cancels superseded HTTP
requests. Direct frontend fetch calls have been removed. Framework guidance
records the transport convention. Type checking, formatting, 27 API tests, four
browser journeys including cancellation, and both builds passed after this
follow-up. These changes are also uncommitted.

Latest owner correction: frontend services must return cold Observables; use
signals for state and RxJS for orchestration, without async/await or HTTP Promise
conversions. This supersedes the preceding awaitable-auth description. Auth uses
tap to update account state on responses; the guard returns its Observable,
components subscribe with takeUntilDestroyed/finalize, and catalog uses rxResource
for signal state and automatic HTTP cancellation. Updated framework guidance
records the rule. Type checking, formatting, both builds, 27 API tests, and four
desktop/mobile browser journeys passed after this correction. All changes remain
uncommitted and await owner acceptance.


## Ticket 02 accepted — 2026-10-19

The owner accepted ticket 02 and requested a Tailwind migration as the next
ticket, ahead of personal library work (03). The Observable/signal refactors and
framework conventions are complete and verified. See ticket 02 for acceptance
and the passing checks. Historical references above to pending acceptance are
superseded by this entry.
