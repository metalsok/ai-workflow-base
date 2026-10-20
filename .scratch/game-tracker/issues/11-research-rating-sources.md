# Establish feasible critic-rating sources for catalog exploration

Type: research
Status: resolved
Blocked by: none
Parent: [Game-tracker planning map](../map.md)

## Question

Can the next private milestone display or sort/filter by identifiable Metacritic
or OpenCritic scores through a documented integration, and what distinguishes
those scores from the ratings already available through IGDB?

## Context

The owner confirmed that ratings matter alongside taste fit and named Metacritic
and/or OpenCritic. Do not silently substitute a different provider's score.
Use current primary documentation to establish access, score meaning, attribution,
cost/limits if documented, coverage caveats, game/platform matching, and missing
ratings behavior. Public website visibility alone does not establish API access.
No accounts, subscriptions, scraping, credentials, or app changes are authorized.

## Resolution requirements

- Capture findings in a linked local research note with primary-source links.
- Distinguish documented facts, unverified access, and recommendations.
- Recommend a bounded option or a precise unresolved prerequisite; do not choose
  the owner's preferred fallback or approve a new provider on their behalf.

## Answer — 2026-10-19

Desk research is complete in [Critic ratings for catalog exploration](../ratings-research.md).
OpenCritic is the first candidate to validate, but current authorized game access,
terms/pricing/quotas and usable score responses are still unverified. Metacritic's
documented Fabric integration covers movies/shows; it does not establish game
access. IGDB's user, critic and combined ratings are distinct and must not be
labelled Metacritic/OpenCritic. Source choice, score usage and any fallback remain
owner decisions. No implementation or accounts were created.

The report is committed on the local `research/rating-sources` branch and copied
into the shared checkout. The repository has no remote, so it cannot be pushed.
