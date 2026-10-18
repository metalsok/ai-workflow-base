# Session handoff — 2026-10-18

## Current progress

- Account access is implemented in `070b3b6`; owner verification of registration,
  sign-in/out, and restart persistence is recorded in `721fa8e`.
- Game search and details are implemented in `3b3a1d8`. The issue records passing
  automated checks, Standards/Spec reviews, and representative live IGDB checks.
  Both implemented issues currently have status `ready-for-human`; read their
  outcomes and comments before changing status.
- Angular and NestJS skills are installed for this user. Their selection,
  revisions, and workflow rules are in `docs/agents/framework-skills.md`.
- The Angular CLI MCP server is configured in the user's Codex configuration.
  Its saved launch configuration was tested: Angular 22.2.3 initialized,
  discovered `web`, and returned workspace best practices. Restart the Codex
  client/session to discover the newly configured tools.

## Resume

Read `AGENTS.md`, the parent `spec.md`, and the issue outcomes first. The next
implementation ticket is `issues/03-personal-library.md`; inspect its dependencies
before starting it. Use the relevant framework skills, explain meaningful steps,
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
