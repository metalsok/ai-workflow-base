# Validate OpenCritic game-score access

Type: task
Status: open
Blocked by: none
Parent: [Game-tracker planning map](../map.md)

## Question

Can this app legitimately obtain OpenCritic game scores? Establish this before
the milestone decides whether critic ratings ship.

## Context

[Choose the most valuable improvements before inviting testers](08-choose-pre-tester-improvement-priorities.md)
ranked critic ratings third and made them conditional on this check. The desk
research is in [the rating-source investigation](11-research-rating-sources.md)
and [the research note](../ratings-research.md). Do not repeat it.

HITL: the owner performs any sign-up. The agent provides a checklist and never
creates accounts itself. Keep keys out of logs, source control, and client
bundles. Any live check is opt-in.

## Done when

- The access route, terms, pricing, and quota for a small private self-hosted app
  are known.
- A sample request returns usable scores for a few known games, including how
  unscored games and small review counts appear.
- The answer records where credentials are stored (not their values) and whether
  ratings can ship. If they cannot, the fallback is to link to the review sites
  instead.
