# Choose which types of game entries appear in search

Type: grilling
Status: resolved
Blocked by: 02

## Question

Should the first version focus on standalone games, including distinct remakes
and remasters, while excluding DLC, mods, bundles, and special/collector editions?
Decide how these entries relate to the user's one current play status per game.

## Evidence

The [live IGDB sample](../igdb-validation.json) returned a mixture of main games
and related entries. Main games were not necessarily the first search result.
IGDB provides parent/version relationships, but the actual filters must be
validated against its current game-type model before implementation.

## Answer

The owner accepted the standalone-games scope, including distinct remakes and
remasters, and excluding DLC, mods, bundles, and special/collector editions.
Remakes and remasters remain distinct catalog entries that can be tracked separately.

IGDB documents `game_type` and `version_parent` for classification and editions;
its older `category` field is deprecated. Validate the actual type IDs and filter
behavior during implementation rather than copying deprecated category values.
This decision does not yet settle standalone expansions or separately indexed
ports; keep those edge cases visible when checking the provider's classification.

Source: [IGDB game documentation](https://api-docs.igdb.com/#game).
