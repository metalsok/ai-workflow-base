# 04: Discover featured, popular, and recently released games

Status: ready-for-agent
Blocked by: 02 — Search games and open details
Parent: [First private release](../spec.md)

## What to build

Signing in lands on the selected purple cinematic dashboard, backed by real
catalog feeds. Testers can explore eligible major-studio and indie titles and
open their details from the spotlight and discovery shelves.

## Acceptance criteria

- [ ] Deliver a functional Angular discovery page using D and C's purple palette as the current direction; final visual polish remains revisitable after real usage.
- [ ] Keep feed/catalog behavior separate from presentation, use focused components and centralized theme values, and avoid an elaborate theming system.
- [ ] Do not ship prototype switchers, debug state, or fixture rankings.
- [ ] Popular now uses the specification's documented IGDB signal, freshness, and daily refresh default, with honest labels.
- [ ] Recent releases use the specified release window and eligible catalog types; details use the same catalog identity.
- [ ] Include both major-studio and indie games without inventing an unsupported studio classifier.
- [ ] Missing artwork, empty feeds, and provider outages have usable fallbacks and retry behavior.
- [ ] Validate live popularity/feed access; deterministic HTTP checks cover normalization, caching, and failures.
- [ ] The layout is usable with keyboard and at phone and desktop widths.
