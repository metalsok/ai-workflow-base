# Obtain developer access and validate IGDB game results

Type: task
Status: resolved
Blocked by: none

## Question

Can the selected IGDB service supply the agreed game search and detail experience
for representative PC and console titles using live application credentials?

## Work required

- Guide the owner through developer registration when ready, using current
  official instructions. Keep secrets out of chat and source control.
- Validate representative PC and console searches and requested metadata.
- Record coverage gaps and any ambiguity around editions, remakes, and release dates.
- Link findings and expose new decision tickets where necessary.

## Comments

Documentation research is recorded in [catalog research](../catalog-research.md).
Provider selection is agreed; live access has not been tested.

The owner does not yet have developer credentials. Official registration
instructions have been checked, and `.env.example` documents the two required
values. The owner will complete Twitch account verification/2FA and confidential
application registration, then enter credentials locally into the ignored `.env`.
Do not print credential values when checking readiness or running validation.

## Answer

Live application authentication and three search/metadata checks passed using
`scripts/check-igdb.py`. Expected IGDB IDs were returned for Elden Ring (119133),
Baldur's Gate III (119171), and The Legend of Zelda: Breath of the Wild (7346).
Each had cover metadata, a description, release date, platforms, genres,
developer information, and publisher information.

The script keeps the access token in memory and writes only public metadata to
[the validation report](../igdb-validation.json). It does not fetch image files,
exercise browser behavior, or test load and rate-limit handling.

Search accepts “Baldur's Gate 3” but returns the canonical title “Baldur's Gate III.”
Sample results mixed main games with editions, DLC, mods, and a canceled title.
Some related results lacked metadata. Resolve [catalog entry scope](06-choose-catalog-entry-scope.md)
before defining filtering behavior in the specification.
