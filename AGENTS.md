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

When scaffolding application code, establish formatting, type checking, tests,
and build commands, then record the actual commands here. The agreed testing
seams are the NestJS HTTP API with PostgreSQL and a browser journey. Keep live
IGDB checks opt-in and credentials out of logs, source control, and client bundles.

## Agent skills

### Issue tracker

Specs and tickets are local Markdown files under `.scratch/<feature>/`.
See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `GLOSSARY.md` and `docs/adr/`.
See `docs/agents/domain.md`.
