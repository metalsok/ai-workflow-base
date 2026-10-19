# Session handoff — 2026-10-19

## Current progress

- Ticket 02 (search/details) is `done`, accepted by the owner and committed in
  `0e53656`. Its ticket retains the implementation/review history and corrections.
- Ticket 07 (Tailwind migration) is `done`, accepted by the owner. Its
  implementation is committed in `fb095ad`; see its ticket for verification.
- Ticket 08 (database access decision) is next, `needs-info`, awaiting an owner
  design discussion. No ORM has been chosen or installed.
- Ticket 03 (personal library) is unstarted and blocked on 08 and any resulting
  migration. Remaining order: 08 decision → migration if chosen → 03 → 04 → 05 → 06.
- Ticket 01 retains its recorded owner verification of account access and restart
  persistence. Read its comments before changing its status.

## Resume

Start with `issues/08-database-access-decision.md`: use a focused grilling
discussion to agree database access preferences, record the choice, and create
a migration implementation ticket if needed. Update 03's dependencies before
closing 08. Do not replace data access during the decision task.

Read `AGENTS.md`, `spec.md`, the relevant ticket comments, and
`docs/agents/framework-skills.md` before implementation. Tailwind v4 utilities
are now the styling convention. Keep Angular zoneless with explicit OnPush on
all components. Services return cold HttpClient Observables, signals hold state,
and rxResource manages catalog reads/cancellation. Do not reintroduce frontend
async/await or HTTP Promise conversions. Backend async code is unaffected.

Use the Angular/NestJS skills for corresponding framework work; keep tests at the
agreed HTTP/PostgreSQL and browser seams. Live IGDB validation remains opt-in.
The Angular CLI MCP tools are available in this session and were used.

## Latest verification

Type checking, formatting (including PostCSS config), both builds, 27 HTTP tests,
and four desktop/mobile browser journeys passed after the Tailwind migration.
Twelve fixture-backed before/after views have matching captured geometry and
typography measurements. Responsive boundary checks and keyboard focus/skip-link
checks passed. See ticket 07 for evidence and scope. Temporary visual artifacts
are under `/tmp/game-tracker-tailwind`; they are not durable repository files.

## Run locally

```bash
npm run db:up
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:4200`; the configured origin policy rejects
`http://localhost:4200`. Restart the Angular dev server after installing Tailwind
and adding PostCSS configuration. Local secrets remain in ignored `.env` and
development PostgreSQL data in the Docker volume. See `docs/development.md`.

The IDE and Obsidian files visible in git status are unrelated user files;
preserve them. User-level skills and MCP configuration are local to this machine
and are not included in repository commits.
