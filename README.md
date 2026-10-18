# Matt Pocock workflow starter

A local workspace for learning Matt Pocock's AI development workflow with Codex.

## Active project

The first project is a private, Goodreads-like game tracker for PC and consoles.
The selected production stack is Angular, NestJS, PostgreSQL, and Docker Compose,
with independent accounts and Tailscale access. The approved visual direction is
the cinematic dashboard (prototype D) with purple accents.

- [Build specification](.scratch/game-tracker-build/spec.md)
- [Planning map and decisions](.scratch/game-tracker/map.md)
- The prototype source is preserved on local branch `prototype/game-discovery`.
  The ignored local preview remains at `.scratch/game-tracker/prototype/index.html`.

## Run the application locally

Account access and catalog search are implemented: registration, sign-in/out,
persisted sessions, paginated IGDB title search, and game details in the responsive
purple Angular shell. Discovery feeds and personal library operations follow in
later tickets.

```bash
npm ci
node scripts/setup-dev.mjs
npm run db:up
npm run db:migrate
npm run dev
```

Use Node 26 and Docker Compose. Open `http://127.0.0.1:4200`.
The setup script generates local secrets in the ignored `.env`, preserving
existing values, including IGDB configuration. Email ownership is not verified
in this private test. Existing `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` values
enable catalog search; enter them in `.env` if they are not already configured.

See [development and testing](docs/development.md) for check commands, session
policy, and running tests without Docker.

## Start a session

```bash
codex -C /home/metalsok/Work/ai-workflow-base
```

The `mattpocock-skills@mattpocock` plugin is installed for your user account.
Open a new Codex session to load the newly installed skills. Use Codex's skill
picker (type `$`) to select a skill. The names below are the upstream skill names;
select the plugin-qualified entry if Codex shows one.

## Work through an idea

Choose the entry point by the size and uncertainty of the planning:

- **grill-with-docs**: sharpen an idea or design whose questions fit in one
  session. Often a feature, but it can also be a small new project.
- **wayfinder**: explore a large, uncertain project or major feature across
  sessions. Create a map of open decisions and dependencies, then resolve those
  decisions one at a time. It plans by default; it does not build the application.
  Once the route is clear, continue with **to-spec**, **to-tickets**, and
  **implement**.
- **ask-matt**: get help choosing when the appropriate entry point is unclear.

For a manageable idea, the usual flow is:

1. **ask-matt** — describe what you want to do and get help choosing a skill.
2. **grill-with-docs** — work through the idea together, resolve ambiguity, and
   record shared vocabulary and decisions as they become useful.
3. **to-spec** — turn the agreed conversation into a spec with acceptance criteria.
4. **to-tickets** — split the spec into small, testable pieces, including dependencies.
5. **implement** — implement a selected ticket, using TDD where appropriate and
   reviewing the result before committing.
6. **code-review** — request an additional explicit review when needed.
7. **retro** — identify improvements to project instructions, checks, and tooling.

For a manageable idea, start with a prompt such as:

> Use grill-with-docs to help me define a small tool I want to build. Explain each
> step, ask one question at a time, and wait until we agree on the idea before coding.

For a larger project with substantial unknowns:

> Use wayfinder to help me map this project. First help me define the destination,
> then identify the decisions we need to resolve. Explain each step as we go.

Matt often writes skill names as slash commands in his documentation. In Codex,
use the skill picker or explicitly ask for the named skill in your message.

## Project files

- `AGENTS.md`: project instructions Codex reads.
- `docs/agents/issue-tracker.md`: where to save and retrieve specs and tickets.
- `docs/agents/triage-labels.md`: the meanings of ticket statuses.
- `docs/agents/domain.md`: how to use the glossary and architectural decisions.
- `.scratch/<feature>/spec.md`: a feature's spec.
- `.scratch/<feature>/issues/01-<slug>.md`: one ticket per file.
- `GLOSSARY.md` and `docs/adr/`: created when actual terms or decisions need recording.

The application lives in `apps/web` and `apps/api`; database migrations live in
`db/migrations`. Application check commands are recorded in `AGENTS.md` and
`package.json`.

## Use another project

The plugin is installed once for this user account. Configure each actual project
separately by running its `setup-matt-pocock-skills` skill from that project's
directory. Choose that project's tracker and preserve any existing instructions.

## Check and maintain the installation

```bash
codex plugin list --marketplace mattpocock --json
codex plugin marketplace upgrade --help
```

Installed during setup: version 1.3.1. The repository documents automatic plugin
updates at startup, so the installed version can change later.

To remove the plugin, inspect `codex plugin remove --help`, then remove
`mattpocock-skills@mattpocock`. The starter's files remain yours.

## Sources

- [Matt's official skills repository](https://github.com/mattpocock/skills)
- [Matt's workflow and skill catalog](https://www.aihero.dev/skills)
- [OpenAI plugin documentation](https://developers.openai.com/plugins/build/plugins)
