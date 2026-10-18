# Framework skills

Load these skills for planning, implementation, debugging, and review involving
the corresponding framework. Read the skill's `SKILL.md`, then its task-relevant
references. For changes spanning both frameworks, load both.

| Framework | Skill                                      | Source                                                                                                                                                                             |
| --------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Angular   | `angular-developer`                        | [Official Angular skills](https://github.com/angular/skills/tree/ceb8ce8c3d0f0db9c1f56dd45b607e657314cb8f/angular-developer)                                                       |
| NestJS    | `nestjs-professional-software-engineering` | [Community skill by amirtaherkhani](https://github.com/amirtaherkhani/nestjs-skills/tree/31f798a6770a240b7a646e06ca9a845359c0cf6e/skills/nestjs-professional-software-engineering) |

The Angular skill provides version-aware framework guidance and focused
references for components, signals, forms, HTTP, routing, accessibility, and
testing. The NestJS skill prioritizes installed-version evidence, existing
conventions, minimal implementation, and proportionate verification. Its sibling
skills are optional; this project selects only the implementation skill.

## Applying them in this workflow

1. During Wayfinder, use the relevant skill when resolving framework decisions
   and carry the requirement into implementation handoffs.
2. During implementation, let `implement` coordinate delivery and `tdd` govern
   red-green-refactor. Use the framework skills for framework decisions.
3. During review, apply the relevant framework guidance alongside the Standards
   and Spec checks. Include the skill names and this document in delegated
   instructions when delegation is part of the active workflow.
4. State which framework skills were actually loaded in the completion report.
   If a skill is unavailable, report the missing skill explicitly; use the pinned
   installation instructions below to restore it when installation is authorized.

Project agreements take precedence over generic skill defaults. Keep TDD at the
NestJS HTTP API with real PostgreSQL and the browser journey, using the existing
test harnesses. Keep live IGDB checks opt-in. Preserve the specified account and
session contracts and approved design. Select syntax using the actual installed
versions and configuration; introducing a skill alone does not authorize a
framework upgrade, application migration, or additional architecture.

## Angular MCP

The `angular-cli` MCP server is configured in this machine's user-level
`~/.codex/config.toml`. It launches the repository's installed Angular CLI with
the repository as its working directory and explicit filesystem root. This
keeps the server aligned with the application's installed Angular version.
The configuration targets this checkout even when Codex starts elsewhere.

For Angular work, begin with `list_projects`, then use `get_best_practices` for
the discovered workspace. Use `search_documentation` for uncertain Angular APIs.
Use build and development-server tools when relevant to the authorized task;
the project's application checks and agreed testing seams still apply.
Report a connection failure explicitly and use the installed skill, official
documentation, and project commands while resolving it.

After adding the server, restart the Codex client/session so it discovers the
new tools. Check the saved configuration with `codex mcp get angular-cli`.
Node and this checkout's `npm ci` dependencies must be available. Moving the
checkout requires updating the launch arguments and working directory in the
user configuration. Another machine requires its own MCP configuration.

Setup references: [Angular CLI MCP](https://angular.dev/ai/mcp) and
[Codex MCP configuration](https://developers.openai.com/codex/mcp).

## Installation and provenance

Selected and installed on 2026-10-18 in the user's Codex skills directory
(`$CODEX_HOME/skills`, normally `~/.codex/skills`). The installed entry points are
`angular-developer/SKILL.md` and
`nestjs-professional-software-engineering/SKILL.md` within that directory.
These user-level installations are separate from this repository; another
machine needs its own installation.

The source links above pin the reviewed revisions. To reproduce the selection
using Codex's skill installer (adjust its location for a custom `CODEX_HOME`):

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo angular/skills --path angular-developer \
  --ref ceb8ce8c3d0f0db9c1f56dd45b607e657314cb8f

python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo amirtaherkhani/nestjs-skills \
  --path skills/nestjs-professional-software-engineering \
  --ref 31f798a6770a240b7a646e06ca9a845359c0cf6e
```

Newly installed skills are available on the next Codex turn. Before updating,
review upstream changes, check compatibility with this project's agreements,
and update the pinned revisions here. The installer refuses an existing target;
inspect an existing installation before replacing it.
