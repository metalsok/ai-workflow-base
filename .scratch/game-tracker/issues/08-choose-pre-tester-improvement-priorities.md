# Choose the most valuable improvements before inviting testers

Type: grilling
Status: open
Blocked by: none
Parent: [Game-tracker planning map](../map.md)

## Question

How far should the next milestone take catalog exploration through search,
filters, sorting, and company pages with descriptions and developed/published
games, and which additions should be deferred to keep the milestone bounded
alongside visual refinement before tester invitations?

## Context

The initial private build is accepted. The owner requested higher-level planning
for feature and visual improvements before inviting testers, with unnecessary
scope challenged. Read the accepted specification and completed build tickets;
do not reopen their implementation work or infer a new feature wish list.

## Comments

### Claimed — 2026-10-19

Claimed by the current planning session. Use grilling and domain-modeling,
ask one focused question at a time, and wait for the owner's preferences.
No resolution is recorded until the live discussion establishes agreement.

### Initial assessment and proposals — 2026-10-19

The completed build covers accounts, discovery feeds, catalog search/details,
private Library entries, all four Play statuses, Played, removal, saved-state
consistency, recovery, and portable packaging. These are baseline capabilities,
not candidates to implement again.

Reading the current Library template shows status filters and a card grid with
status controls and removal, but no library title search or sort controls. This
is a capability observation, not evidence of a measured usability problem or a
visual review of the running app.

Candidates to discuss, in recommended order:

1. **Find and manage saved games:** library title search and a small useful sort
   choice could help a growing library; simplify status-management presentation
   only where the owner identifies friction. Validate the need before choosing
   controls or adding all three changes.
2. **Refine the existing visual experience:** improve hierarchy, card density,
   artwork treatment, and action consistency across Discover, details, and My
   Library. Preserve the chosen purple cinematic direction unless the owner
   explicitly reopens it. Specific visual shortcomings still need owner feedback.
3. **Private ratings or notes:** consider only if the owner wants to remember
   their opinion after playing; these add new stored information and editing
   behavior. They are not implied by the Goodreads comparison.
4. **More discovery filters or feeds:** consider only if choosing what to play
   is the main unmet need. Extra shelves alone do not establish better discovery.

Challenge custom lists, playthrough history, imports, recommendations, and
statistics unless they address the selected need better than a smaller change.
Social features remain outside the existing map's scope. These are proposals,
not new exclusions or accepted decisions.

First discussion question: should the milestone focus on finding/managing saved
games plus visual refinement, or is another concrete need more valuable to the
owner before friends try the app?

## Resolution requirements

- The owner identifies the main unmet need using a concrete example.
- Agree a ranked, bounded feature shortlist and explicit deferrals with reasons.
- Keep feature outcomes separate from visual treatments, which the next decision
  will address. Clarify any new domain meanings rather than overloading Play status.
- Record the answer here and link its gist from the map only after agreement.

### Owner steering — 2026-10-19

The owner wants better catalog search with filters and sorting, plus the ability
to open company descriptions and discover games created or published by that
company. The goal is to encourage curiosity about a game and its relationships.
This redirects feature priority away from the agent's proposed Library
management milestone. Library search/sorting is not an agreed requirement.

Current code observations: catalog search takes a title query and page; game
details expose developer/publisher names as text. The provider normalization
retains company names rather than company identities or descriptions. The desired
company journey is new capability, not an existing screen requiring styling.
These observations are local facts, not a provider-feasibility conclusion.

Working journey for discussion: narrow the catalog, open a game, follow a
developer or publisher to a company description and its games, open another
game, then save it to Want to play. Treat developer/publisher as a company's
role on a game; a proposed company page distinguishes developed and published
titles so that publisher credits do not imply authorship. Confirm the intended
presentation before adding new glossary terms.

Next focused decision: should users be able to browse/filter without entering
a title, or should filters and sorting refine title searches only? Recommend
supporting browsing without a title because it serves open-ended exploration.

Further decisions in this ticket: the smallest useful filter/sort set; company
page content and role handling; whether company pages share catalog filters;
what related-content paths are actually required. Avoid assuming that the broad
exploration goal includes franchise graphs, company ownership histories,
personalized recommendations, or every possible catalog facet. Provider data
and query feasibility must be verified before promising exact behavior.

### Browse without a title agreed — 2026-10-19

The owner confirmed that people must be able to browse and filter without
entering a game title. Their main intent is to support curiosity in a crowded
catalog and help people find games worth investing their time in.

This establishes the user outcome, not a universal definition of a good game.
Useful discovery should help someone assess a game's suitability, rather than
measure success by the number of shelves or clicks alone. The company journey
remains part of the requested direction. The ticket stays claimed while the
feature boundary is discussed; no milestone acceptance is inferred.

Next preference to establish: does confidence in choosing a game primarily come
from fit with personal taste, reputation/ratings, or the expected time commitment?
Recommend taste fit as the organizing principle, with reputation as supporting
evidence if the owner wants it. Do not infer that the owner's mention of time
investment requires completion-time data, playtime tracking, ratings, or a
personalized recommendation engine. Exact filters and sorts follow this choice.

### Ratings requested — 2026-10-19

The owner affirmed taste fit and added that ratings are important, naming
Metacritic and/or OpenCritic. This is a request for recognizable reputation
signals; it does not approve replacing them with IGDB's own ratings. Source
access and score meaning are being checked in
[Establish feasible critic-rating sources for catalog exploration](11-research-rating-sources.md).
The owner has not chosen whether a direct score integration is a milestone
requirement or whether source links/another clearly labeled score are acceptable.

Local code assessment: the accepted catalog's selected fields, normalized game
shape, and detail screen do not currently expose ratings or review-site links.
This is new catalog capability, not a cosmetic change. The requested external
ratings do not imply implementing personal ratings or community review features.

When choosing score behavior, distinguish showing evidence on a game page from
using a score to order or exclude browse results. Missing scores and small
review samples must not silently become evidence that a game is bad. In
particular, rating filters could hide lesser-known games from a curiosity-led
journey. Whether score sorting/filtering is required remains a product decision.

### Rating-source desk research complete — 2026-10-19

See [the resolved rating-source investigation](11-research-rating-sources.md)
for facts and [the research note](../ratings-research.md) for primary sources.
Recommend validating one provider, OpenCritic, first and leaving a second
integration optional. Neither source choice nor a fallback is approved yet.
Native scores and rating-based ordering/filtering cannot be promised until
usable game-score access is verified. Continue the live scope discussion with
the independent choice of how scores should influence browsing.

### Pause checkpoint — 2026-10-19

The owner requested pausing and saving progress. The claim is released so the
next session can reclaim this ticket. It is open, not resolved: the feature
direction is established, but the full milestone boundary is still undecided.

Agreed direction: improve catalog exploration and visual design before tester
invitations; support search with filters/sorting, browsing without a title, and
company descriptions with developed/published games. Help users find games worth
their time through taste fit and ratings. The owner explicitly named Metacritic
and/or OpenCritic; no exact source or integration has been approved.

The last question was unanswered: should ratings appear on game cards and
details, with optional Highest rated sorting? The agent recommended yes,
retaining unrated games in ordinary browsing and deferring minimum-score filters.
All of that presentation/sort/filter behavior remains a proposal, as does using
OpenCritic first. Pause is not acceptance.

After that choice, narrow the filter/sort set and company-page scope, settle
rating-access prerequisites/fallback, and agree feature deferrals. Then resolve
this ticket before the visual-direction and milestone decisions. The original
build remains accepted, and plan-only scope remains in force.
