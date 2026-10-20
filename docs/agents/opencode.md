# OpenCode and shared skills

Start OpenCode from the repository root:

```bash
opencode
```

Type `@implement` and select the skill from the picker, then describe the ticket.
For example: `@implement Let's work on ticket 03. Read its current status and
acceptance criteria first, and explain each meaningful step.` This setup does
not start that ticket. Other skills use the same `@skill-id` syntax.

OpenCode reads the root `AGENTS.md`, including the local issue tracker and
framework guidance. When continuing work from another client, ask it to read the
relevant ticket, verification notes, and `git status` first. Existing chat
history stays in its original client; project files carry the handoff.

The [Mac setup checkpoint](../mac-setup.md) records the current device's verified
installation. The installation history below describes the original Linux host;
its backup paths and optional integrations are specific to that host.

## Project architecture skill

This repository keeps `angular-architecture-review` in
[`.agents/skills/`](../../.agents/skills/angular-architecture-review/SKILL.md), so
its instructions travel with the project rather than relying on the machine's
shared skill bundle. Framework guidance requires reading it for Angular feature
design, structural refactors, and architectural reviews. Use it alongside the
installed Angular and codebase-design skills.

## Shared installation

The user-level discovery directory is `~/.agents/skills/`. It contains:

- All 27 Matt Pocock skills from version 1.3.1, linked to the complete pinned
  bundle at `~/.agents/skill-sources/mattpocock-skills/1.3.1/`. Supporting files
  and the upstream license are preserved. This copy is independent of Codex's
  plugin cache.
- `angular-developer` and `nestjs-professional-software-engineering`, moved here
  with compatibility links at their previous `~/.codex/skills/` locations.
  Their reviewed source revisions remain in `framework-skills.md`.
- The existing Omarchy and crash-diagnosis links to the system-managed skills.

OpenCode discovers this directory automatically. The existing Codex plugin is
also retained so its qualified commands remain available. Its managed updates
are separate from the pinned shared Matt bundle: review an upstream release,
install it into a new version directory, and repoint the shared links together.
Keep the bundle directory structure intact so relative references keep working.
Avoid editing duplicate copies or deleting an active version directory.

Backups of the moved framework skills and the installation manifest are in
`~/.agents/setup-backups/20261019T112236Z/`. To undo the framework move, remove
only the two Codex compatibility symlinks, restore the matching backup directories
there, then remove the corresponding shared copies. To remove the shared Matt
installation, remove only its 27 skill symlinks before removing its versioned
bundle. Existing Omarchy links and the Codex plugin remain independently managed.

These are machine-level files, not checked into this repository. A new machine
needs its own installation. Skills supply instructions; tools provided privately
by a particular client or connector still need an equivalent integration.

## Angular MCP

The root `opencode.json` launches the installed Angular CLI with this checkout
as its root. Run OpenCode from the repository root after `npm ci` with Node 26.
Verify with `opencode mcp list`; `angular-cli` should be connected. Begin Angular
work with `list_projects`, then `get_best_practices`, as described in
`framework-skills.md`. The existing global Codex adviser also remains configured;
its per-consultation approval rules still apply.

## Models later

No cloud provider was connected during this setup. The existing local
`ollama/gpt-oss:20b` default and adviser settings are preserved. Use `/connect`
when ready to authenticate a provider, then `/models` to choose a connected model.
Review the existing local-first rules in `~/.config/opencode/AGENTS.md` and the
build agent's system instruction at that time, so an explicitly selected cloud
model is permitted while automatic paid fallback remains disabled. Provider
quotas and billing still apply when using OpenCode.

## Verification

On 2026-10-19, all copied Matt bundle files were checked against their installed
source with SHA-256. All 31 shared skill entry points and the two Codex framework
compatibility links resolved. OpenCode's terminal picker displayed `implement`,
`code-review`, both framework skills, and `omarchy`. `opencode mcp list` reported
both Angular CLI and the existing Codex adviser connected. No inference request
or cloud adviser consultation was made. The bare experimental API registry can
be empty before a client initializes its plugins; use the terminal picker for
this check.

References: [OpenCode skills](https://opencode.ai/v2/docs/skills),
[MCP configuration](https://opencode.ai/v2/docs/mcp-servers), and
[providers](https://opencode.ai/v2/docs/providers).
