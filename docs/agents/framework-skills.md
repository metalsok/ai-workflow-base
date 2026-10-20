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

## Project Angular requirements

The owner requires a zoneless application and explicit
`changeDetection: ChangeDetectionStrategy.OnPush` on every application component,
including the root, account pages, shell, and shared components. Apply this to
new components and check it during reviews. This explicit declaration is a
project preference and takes precedence over generic Angular guidance that
recommends omitting the default.

Angular 22.2.3 already boots zoneless and defaults components to OnPush. Keep
Zone.js out of application dependencies and build/test polyfills; do not add
`provideZoneChangeDetection`. Rely on the installed zoneless bootstrap default
rather than adding a provider copied from an older Angular version. Angular CLI
component defaults are recorded in `angular.json`. Its Angular 22 generator
omits the explicit declaration when OnPush is selected, so add the import and
`changeDetection` field after generating a component.

Use signals and framework notification mechanisms for asynchronous UI updates.
Use `linkedSignal` for editable state that resets when its source changes and
`rxResource` for the catalog's Observable-based read lifecycle. Keep reactive
parameters separate from the stream factory. Resource-owned subscriptions handle
HTTP cancellation. Guard resource value reads after failure; preserve loading,
clear-on-retry, cancellation, and missing-data presentation.

Use Angular `HttpClient` for frontend API transport and return cold Observables
from services. Update service-owned signals with `tap` when a response arrives;
calling a service method alone must not dispatch a request or change account
state. Do not convert HTTP Observables to Promises with `firstValueFrom` or
`lastValueFrom`, or use `async`/`await` for frontend HTTP orchestration.

Return the account-check Observable directly from the route guard so Angular's
router owns its subscription. Components own subscriptions for explicit actions
such as login and logout: use `takeUntilDestroyed` with an injected `DestroyRef`,
`finalize` for pending state, and an error handler for readable messages. Compose
navigation after success with RxJS; do not subscribe inside services or nest
subscriptions. Mutations must not run from automatically reloading resources.

Use `rxResource` to connect catalog Observables to signal state without a Promise
bridge or manual abort listeners. Keep same-origin session cookies and the
backend's existing Origin-based mutation protection. Native server-side IGDB
transport and HTTP test clients do not use Angular dependency injection and are
outside this frontend convention.

Run the API and desktop/mobile browser journeys after changes that affect these
behaviors. The browser journey checks that Zone.js is absent and that asynchronous
results and retries render correctly.

References: [Angular zoneless](https://angular.dev/guide/zoneless),
[component change detection](https://angular.dev/guide/components/advanced-configuration),
and [resources](https://angular.dev/guide/signals/resource), and
[Observable resources](https://angular.dev/guide/signals/rxjs-interop#using-rxresource-for-async-data).

## Frontend forms

Use Angular Signal Forms (`@angular/forms/signals`) for every new frontend form
and user-editable form control. Keep a typed signal model, define validation in
`form()` schemas, and bind controls with `[formField]`. Do not introduce
`FormsModule`/`ngModel` or Reactive Forms (`FormControl`/`FormGroup`). Load the
Angular skill's `references/signal-forms.md` when implementing or reviewing forms.

Keep forms in their feature modules. Use `linkedSignal` when editable state must
reset from route parameters or authoritative inputs. Use schema availability
rules for field disabling. Keep labels, autocomplete, validation constraints,
keyboard submission, and accessible feedback intact.

Signal Forms owns field state and validation; explicit component actions retain
the Observable HTTP lifecycle described above. Use native `(submit)` with
`$event.preventDefault()` and `novalidate`, and guard actions with form validity
and request-pending state. Do not bridge HTTP to Promises to use the async
Signal Forms submission helper. Never run mutations from an effect or resource.
Action-only buttons do not need a form.

## Angular file organization and services

Keep each component in one of these two forms:

- A dedicated kebab-case folder containing matching class and template files,
  such as `catalog/game-page/game-page.ts` and `game-page.html`. Place any
  component-specific styles in that same folder.
- One `.ts` file containing both the class and its inline template, for small
  components such as `catalog/cover.ts` and `library/save-game.ts`.

Keep components inside their existing feature area. Use the folder form for
pages and larger templates; when extracting an inline template, move both files
into a dedicated folder. The CLI component defaults select this folder form.
Retain suffixless filenames and update imports when moving files.

Use `@Service()` from `@angular/core` for Angular singleton services, including
Auth, CatalogApi, and LibraryApi. It supplies automatic DI registration in the
installed Angular version. For explicitly scoped instances, use
`@Service({ autoProvided: false })` with an explicit provider. This convention
applies to Angular; backend NestJS providers follow their framework's decorators.

## Project styling requirements

Use Tailwind CSS v4 utilities for application presentation, in Angular templates
and component host classes. Keep complete class names visible in source so the
Tailwind scanner can generate them; do not construct class names at runtime.
Keep conditional classes in Angular class bindings or static state variants.

`apps/web/src/styles.css` is the Tailwind entry, with shared color/font theme
values, the existing 800px/1100px responsive variants, and document-wide base and
keyboard-focus defaults. Page layouts, spacing, typography, controls, cover
presentation, and UI states belong in template/host utilities. Do not rebuild a
central collection of semantic CSS selectors or use `@apply` to recreate the
former stylesheet. Extract a focused Angular component when a real repeated UI
pattern warrants it, rather than adding styling abstractions speculatively.

The build uses `.postcssrc.json` with `@tailwindcss/postcss`; dependencies are
locked in `package-lock.json`. Follow v4's `@import` and CSS theme configuration;
do not add v3 directives or a Tailwind JavaScript configuration file. Preserve
the purple cinematic design, accessible labels, visible keyboard focus, cover
fallbacks, and responsive behavior. Inspect desktop and mobile after broad styling
changes, alongside the established browser journey.

Setup reference: [Tailwind's Angular guide](https://tailwindcss.com/docs/installation/framework-guides/angular).

## Angular MCP

OpenCode uses this repository's root `opencode.json`; run it from the repository
root. See [OpenCode setup](opencode.md) for shared skill locations and verification.
The following user configuration describes the retained Codex setup.

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
The shared setup subsequently moved these two directories to `~/.agents/skills`
and kept symlinks at their original Codex paths. These user-level installations
are separate from this repository; another
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
