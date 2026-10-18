# Game catalog: initial research

Status: user selected IGDB after reviewing alternatives; live authentication and
three representative game search/metadata checks passed.

## Required capability

Search PC and console games and supply cover art, description, release date,
platforms, genres, and developer/publisher information.

## IGDB

The official API documents game search, cover images, platforms, genres, release
dates, and company relationships. Access requires a Twitch account with two-factor
authentication and an application registered in the Twitch Developer Portal.
Requests use application credentials; they are not made directly from a browser.
The documented rate limit is four requests per second. Non-commercial usage is
free; commercial usage has a partnership process.

Source: [IGDB API documentation](https://api-docs.igdb.com/).

## RAWG

RAWG provides game search and game details through an API key. Its pricing table
lists a non-commercial free plan with 20,000 monthly requests and required
backlinks. Commercial wording elsewhere on the same page differs from that
table, so commercial availability should be clarified before relying on it.

Source: [RAWG API documentation and plans](https://rawg.io/apidocs).

## Additional alternatives check

RAWG is the main alternative identified in this initial comparison; API-key
authentication requires less setup than IGDB's Twitch application credentials.
This is an integration assessment, not a live service test.

Giant Bomb's current official API page says its game and related wiki APIs are
unavailable during its rebuild, so it is not a viable dependency for this first
release at present.

Source: [Giant Bomb API status](https://giantbomb.com/api).

MobyGames also advertises an API, but its documentation and subscription pages
returned HTTP 403 during this check. Its current plan suitability has not been
verified, so it is not recommended on the available evidence.

## Selected approach

Use IGDB for the non-commercial friends test, subject to live validation. Its
documented data model appears to fit the agreed fields. This is a documentation
assessment, not a validation of coverage or search quality.

The [live validation report](igdb-validation.json) confirms the expected IDs and
required metadata for Elden Ring, Baldur's Gate III, and Breath of the Wild.
The [validation ticket](issues/02-validate-igdb-access.md) records the limits and
findings. Search mixes game entry types, and some related results lack metadata;
resolve catalog scope and specify missing-data behavior before implementing.
Multiple-release-date handling remains to be designed. Keep credentials on the
server. Revisit the usage arrangement if monetization enters scope.
