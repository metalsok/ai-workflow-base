# 07: Migrate application styling to Tailwind CSS

Status: done
Progress: Owner accepted
Blocked by: None (02 accepted)
Priority: Before 03, by owner request
Parent: [First private release](../spec.md)

## What to build

Replace the application's central selector-based presentation stylesheet with
Tailwind CSS v4 utilities in Angular templates and component host classes.
Preserve the approved purple cinematic design and current behavior. Keep only
Tailwind imports, shared theme tokens, and minimal document-wide base rules in
the global CSS entry. Future frontend tickets use Tailwind by default.

## Acceptance criteria

- [x] Tailwind v4 and its PostCSS integration build through the installed Angular CLI, with a committed dependency lockfile and no CDN runtime.
- [x] Account screens, shell/navigation, discovery placeholder, library placeholder, search, details, cover images, and loading/empty/error/stale states use Tailwind utilities.
- [x] Global CSS no longer holds page/component selector styling; shared theme values stay centralized without an elaborate theme system.
- [x] Preserve the purple palette, spacing, typography, responsive layouts, cover fallbacks, keyboard focus, accessible labels, and skip link; inspect desktop and mobile before/after views.
- [x] Keep zoneless operation, explicit OnPush, Observable service contracts, rxResource cancellation, authentication, and API behavior intact.
- [x] Type checking, formatting, both builds, HTTP/PostgreSQL tests, and desktop/mobile browser journeys pass.
- [x] Project guidance records Tailwind as the styling convention for future tickets.

## Scope boundaries

This is a styling migration, not a redesign or personal-library implementation.
No backend/API/database changes, framework upgrades, external fonts, icon library,
or new product features are needed. Retain a small global CSS entry for Tailwind
and tokens. Do not recreate every former CSS class with @apply.

## Comments

### Scheduling and claim — 2026-10-19

The owner asked to finish ticket 02, create this separate ticket, and take it
before ticket 03. Ticket 02 was accepted and committed in `0e53656`.
Claimed for implementation; ticket 03 remains unstarted and depends on this
migration. Existing IDE/Obsidian files are unrelated and must be preserved.

Use the Angular developer skill (Tailwind v4 and styling references), the official
Tailwind Angular/PostCSS guide, and the writing-for-agents guidance for project
instructions. Compare fixture-backed desktop/mobile views before and after.


### Implementation — 2026-10-19

Installed Tailwind CSS 4.3.3, @tailwindcss/postcss 4.3.3, and PostCSS 8.5.31 as
build dependencies with lockfile updates. Angular's build loads the root
`.postcssrc.json`; the formatter now checks that file too. The CSS entry scopes
Tailwind source scanning to `apps/web/src`, covering HTML templates and static
TypeScript host/inline-template classes.

Migrated account screens, shell, navigation, discovery/library placeholders,
search/pagination, details/metadata, covers and fallbacks, and all existing
loading/empty/error/stale states to utility classes. The global stylesheet is
37 lines of Tailwind import/theme/responsive configuration and document-wide
base/focus defaults. There are no page/component selectors or @apply aliases.
Shared colors/font values remain centralized. No backend or database changes.

Kept the original purple design, exact 800px/1100px responsive thresholds,
accessible labels, skip link, visible focus, OnPush, zoneless operation, cold
Observable services, and rxResource cancellation. Angular and writing-for-agents
skills were used; frontend guidance, development docs, spec, and README now
record Tailwind as the convention for future tickets.

### Verification

- Passed `npm run typecheck`, `npm run format:check`, `git diff --check`, and
  `npm test` (27 real HTTP/PostgreSQL tests and four browser journeys, including
  cancellation, desktop/mobile layouts, and Vienna/Los Angeles date rendering).
  Both Angular and NestJS builds passed through the browser suite.
- Captured fixture-backed before/after login, Discover, My Library, search,
  details, and missing-metadata views at desktop 1280px and mobile 390px.
  Compared visible-element geometry, typography, spacing, and foreground colors;
  the final measurements match in all twelve views. Inspected representative
  desktop/mobile screenshots. This is not a claim of pixel-identical rendering.
  Local screenshots/measurement files are under
  `/tmp/game-tracker-tailwind/{before,after}` and are temporary review artifacts.
- Checked five views at 390, 800, 801, 1100, 1101, and 1280px without horizontal
  overflow. Checked keyboard Tab focus and skip-link navigation, including the
  3px visible focus outline. The initial skip-link assertion ran before fragment
  navigation completed; waiting for navigation passed without an app change.
- Verification uses disposable PostgreSQL and fake external IGDB/image responses;
  no live IGDB requests or real account data were used. Temporary preview server
  was stopped after capture.

The migration is implemented and committed with this ticket, ready for owner
review. Do not mark it done or begin ticket 03 until the owner accepts it.


### Owner acceptance — 2026-10-19

The owner reviewed the migration and confirmed that it looks great. Ticket 07
is accepted and complete. Ticket 03 is now unblocked. Implementation commit:
`fb095ad`; all recorded checks remain passing.
