# 04: Discover featured, popular, and recently released games

Status: done
Blocked by: 02 — Search games and open details
Parent: [First private release](../spec.md)

## What to build

Signing in lands on the selected purple cinematic dashboard, backed by real
catalog feeds. Testers can explore eligible major-studio and indie titles and
open their details from the spotlight and discovery shelves.

## Acceptance criteria

- [x] Deliver a functional Angular discovery page using D and C's purple palette as the current direction; final visual polish remains revisitable after real usage.
- [x] Keep feed/catalog behavior separate from presentation, use focused components and centralized theme values, and avoid an elaborate theming system.
- [x] Do not ship prototype switchers, debug state, or fixture rankings.
- [x] Popular now uses the specification's documented IGDB signal, freshness, and daily refresh default, with honest labels.
- [x] Recent releases use the specified release window and eligible catalog types; details use the same catalog identity.
- [x] Include both major-studio and indie games without inventing an unsupported studio classifier.
- [x] Missing artwork, empty feeds, and provider outages have usable fallbacks and retry behavior.
- [x] Validate live popularity/feed access; deterministic HTTP checks cover normalization, caching, and failures.
- [x] The layout is usable with keyboard and at phone and desktop widths.


## Comments

### Implementation and verification — 2026-10-19

Implemented the cinematic spotlight, Popular now from IGDB Visits, and the
90-day Recent releases feed. Independent Angular shelf resources support
loading, empty, error, stale, and retry presentation; artwork and covers have
usable fallbacks. Catalog owns normalization/queries and the TypeORM feed cache.
The approved component-folder, explicit OnPush, and Angular `@Service()`
conventions are retained.

Verification passed: typecheck, formatting, production build, 51 HTTP/PostgreSQL
checks and eight desktop/mobile browser journeys. Clean/populated migration,
no schema difference, and rollback/reapplication checks passed on disposable
PostgreSQL. Live provider validation passed through the implemented loader;
both feeds returned 12 titles and included Indie metadata. Standards and Spec
reviews independently reported no findings.

See [the implementation record](../verification/04-discovery.md) and
[the public live sample](../verification/04-live-feeds.json). No changes were
pushed or deployed, and the real development database was not changed. Apply
`npm run db:migrate` and restart the API before previewing the updated app.

Technical acceptance criteria are verified; owner review is pending. Retain
`Status: ready-for-agent` until accepted, per tracker completion policy.


### Owner acceptance — 2026-10-19

After the outdated development API was restarted and both discovery routes were
verified through the API and frontend proxy, the owner confirmed: “u are right.
looks solid”. This records acceptance of ticket 04; its implementation and
technical acceptance checks are complete.
