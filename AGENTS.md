# Project instructions

This repository is a starter workspace for learning Matt Pocock's development
workflow with Codex. Read `README.md` for how to begin.

Explain each meaningful step in plain language before changing things. Keep
questions focused, and use the project files to retain agreed decisions.

The production stack is Angular, NestJS, and PostgreSQL in one repository, with
Docker Compose for self-hosting and private Tailscale access. Application accounts
must be independent of ChatGPT. Use the approved purple cinematic-dashboard design.
The implementation specification is `.scratch/game-tracker-build/spec.md`.
The plain HTML/CSS/JS prototype is a design reference, not production code.

The agreed testing
seams are the NestJS HTTP API with PostgreSQL and a browser journey. Keep live
IGDB checks opt-in and credentials out of logs, source control, and client bundles.

## Agent skills

### Framework guidance

For Angular or NestJS planning, implementation, debugging, or review, read
`docs/agents/framework-skills.md` and load the relevant framework skill before
making framework decisions. Include this requirement in any delegated task.
Keep Angular zoneless and set `changeDetection: ChangeDetectionStrategy.OnPush`
explicitly on every application component. Use Tailwind utilities for presentation
in templates and component hosts; keep global CSS limited to Tailwind setup,
shared theme values, and document-wide defaults. See the project requirements in
`docs/agents/framework-skills.md` for version details and review checks.

### Issue tracker

Specs and tickets are local Markdown files under `.scratch/<feature>/`.
See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `GLOSSARY.md` and `docs/adr/`.
See `docs/agents/domain.md`.

## Application checks

Run commands from the repository root with Node 26 and `npm ci` installed.
Use `npm run typecheck`, `npm run format:check`, and `npm run build` for static
checks. Use `npm run test:api` during API work and `npm run test:browser` for the
browser journey; run `npm test` before completing application changes.

Both suites create disposable real PostgreSQL processes by default. Run them
with permission to bind loopback ports. For an external disposable database,
set `TEST_DATABASE_URL` to an empty test database, never a development database.
Install the browser once with `npx playwright install chromium`.
For local setup, migrations, account/session policy, and Docker limitations,
read `docs/development.md` when starting or troubleshooting the application.
