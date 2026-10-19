# Critic ratings for catalog exploration

Researched: 2026-10-19. Planning evidence for
[rating-source research](issues/11-research-rating-sources.md).
No credentials, live API calls, accounts, subscriptions, scraping, or application
changes were used. This note resolves the desk research, not provider access or
the owner's milestone/fallback decision.

## Finding

Treat **OpenCritic as the first candidate to validate**, with Metacritic optional.
That is a research recommendation, not a confirmed integration choice. No
documented, usable game-score integration was established in this investigation.
Keep the desired branded ratings in the plan as conditional on access validation;
do not promise native score filtering/sorting yet or silently substitute IGDB.

## Documented facts and limits of verification

| Source | Evidence | What remains unverified |
| --- | --- | --- |
| Metacritic | Its Metascore expresses critic consensus using a weighted average. User ratings are a separate activity. [Metacritic explanation](https://www.metacritic.com/about-us/) | A game-score API route, game-data permission, price, quota, coverage, freshness, and application-specific attribution terms. |
| Fabric Origin's Metacritic integration | Official provider documentation requires account approval, a paid core subscription and acceptance of terms; trial subscriptions exclude Metacritic data. The documented endpoints are for movies and shows. It supplies branding/display guidelines. [Integration documentation](https://developer.origin.fabricdata.com/origin/apis-all/metacritic-api-docs), [endpoints](https://developer.origin.fabricdata.com/origin/apis-all/metacritic-api-docs/metacritic) | This is evidence of a licensed integration route for the documented media, **not proof of game access**. No game price or quota was established. |
| OpenCritic | A marketplace listing named OpenCritic API is discoverable at [RapidAPI](https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api/tutorials). | No current first-party OpenCritic link confirming that listing's authorization was verified. Attempts to read the [official website](https://opencritic.com/), [FAQ](https://opencritic.com/faq), and API page failed in the browsing tool. Publisher identity, available plans/prices/quotas, permitted display/cache/filter uses, attribution, current response schema and score definitions remain unverified. A marketplace listing alone does not establish usable access. |

The OpenCritic failures are an observation about this investigation, not evidence
that OpenCritic has no API or is unavailable generally. Third-party scrapers and
unofficial APIs were excluded. No commercial arrangement was initiated.

## What IGDB actually provides

The [IGDB game schema](https://api-docs.igdb.com/#game) distinguishes:

| Fields | Meaning |
| --- | --- |
| `rating`, `rating_count` | IGDB user average and number of user ratings. |
| `aggregated_rating`, `aggregated_rating_count` | External critic score aggregate and number of critic scores. |
| `total_rating`, `total_rating_count` | Combined user/critic average and count. |

The schema does not identify those critic aggregates as Metacritic or OpenCritic.
They cannot substantiate either brand label. Ratings are fields on a game, rather
than a documented per-platform rating breakdown. [IGDB game schema](https://api-docs.igdb.com/#game)

IGDB also documents associated website URLs and website types, but does not
promise Metacritic/OpenCritic links or coverage; the older category enum is
deprecated in favor of `type`. A link is not score data or permission to copy a
score. [Website schema](https://api-docs.igdb.com/#website)

IGDB documents free noncommercial access under Twitch's agreement, authenticated
through Twitch, with four requests per second and at most eight simultaneous
requests. [Access](https://api-docs.igdb.com/#account-creation),
[limits](https://api-docs.igdb.com/#rate-limits)

## Bounded follow-up and planning consequences

Before committing native branded ratings to a specification, verify an authorized
OpenCritic access path, current terms/pricing/quota and sample responses using a
small set of major, indie, older, unreleased and unrated games. Record which exact
metric is provided, its scale, review count and whether it spans platforms. Only
then decide whether the milestone includes displaying scores alone or also rating
filters/sorting. Metacritic game access needs independent confirmation if desired.

These are proposed acceptance prerequisites, not verified provider behavior:

- Match stable provider IDs to the correct game, edition/remake/remaster and
  platform scope; title-only matching is insufficient evidence. Preserve the
  accepted catalog scope and leave uncertain matches unlinked.
- Show the provider and exact metric, review count where supplied, source link,
  platform scope and freshness policy. Keep user scores separate from critics.
  Do not combine providers into an invented consensus score.
- Missing/unmatched ratings mean “unrated” or unavailable, never zero. Decide
  explicitly whether rating filters exclude unrated games and place unrated
  entries after scored entries when sorting by rating. Preserve ordinary browsing
  so less-reviewed games can still be discovered.
- A link-only fallback is smaller but cannot support native score filtering or
  sorting. Exact outbound links still need matching/coverage validation. IGDB
  ratings would be a different, explicitly labelled fallback, requiring the
  owner's agreement. Neither fallback is selected by this report.

Research artifact is preserved locally on `research/rating-sources`; there is no
configured Git remote, so it has not been pushed.
