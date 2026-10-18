# Game tracker: discovery

## Product idea

A Goodreads-like application for games: people can look up games, view details,
and organize games into personal lists.

## Agreed direction

- The first version focuses on the personal tracking experience.
- Game lookup, game details, and personal lists form the initial scope.
- The signed-in home screen should be a visually appealing discovery page, not
  the personal library. The owner suggested new releases from major studios and
  games popular that week as possible featured content. Content selection and
  the exact popularity window remain to be settled.
- Discovery includes both major-studio and indie games.
- Selected design: prototype D's cinematic spotlight, sidebar navigation, and
  denser discovery cards, using prototype C's purple palette. My Library is separate.
- Community features such as public profiles, reviews, and following other
  gamers are deferred beyond the first version.
- The first version is a responsive website for computers and mobile devices.
- Each user has an individual account and their own private game lists initially.
- Users create independent email accounts in the application. There must be no
  ChatGPT account or sign-in dependency for users.
- The owner will self-host the application on their server, including account
  records and personal game lists. Managed hosting/account services are not the
  intended deployment approach. Store password hashes, not readable passwords.
- Package the application and its supporting services in Docker container(s).
  The owner will choose the deployment host later: this workstation or a Ugreen NAS.
- Friends will use Tailscale for private remote access, then authenticate with
  their own app accounts. A public browser endpoint is not required for this test.
  The exact network configuration remains deferred until deployment.
- The first release will be tested by the project owner and a few invited friends.
- Each tracked game has one current status per user: Want to play, Playing,
  Completed, or Stopped playing.
- “Played” is a combined view of games the user has started: Playing, Completed,
  and Stopped playing. It does not mean only completed games.
- Game detail pages show cover art, description, release date, platforms, genres,
  and developer/publisher, with a control to add the game to personal lists or
  change its play status.
- The initial game catalog covers PC and console games.
- Initial search covers standalone games, including distinct remakes and remasters.
  Exclude DLC, mods, bundles, and special/collector editions from the first version.
- IGDB is the selected game catalog provider. Live authentication and three
  representative PC/console search and metadata checks passed; see
  [the validation report](igdb-validation.json).
- Use Angular for the frontend and NestJS for the backend. The owner is a senior
  Angular developer and wants to develop their NestJS experience.
- Use PostgreSQL for persistence.
- Use email/password login with database-backed sessions and an HttpOnly session cookie.
- For the private friends test, defer email verification and password-reset emails.
  Provide an administrator password-reset command. Add email flows before a broader release.
- Keep the Angular frontend, NestJS backend, and Docker Compose configuration
  in one repository. Backend module candidates are accounts, catalog, and personal libraries.

## First test journey

The user accepted this as the initial readiness target:

1. A friend opens the responsive website on a phone and creates an individual account.
2. They search for a PC or console game and view its details.
3. They add the game to Want to play and change its play status.
4. They browse their personal lists and can remove a game.
5. Their lists persist across visits and devices and stay private to their account.

## Planning status

Initial product discovery is recorded. Continue planning from [the Wayfinder
map](map.md). Angular, NestJS, and PostgreSQL are selected. Authentication
implementation and the final deployment host remain to be specified.
