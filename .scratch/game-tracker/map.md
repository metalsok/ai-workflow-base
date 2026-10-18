# Plan the first game-tracker release

Type: wayfinder:map

## Destination

Reach a buildable specification for the responsive, private game-tracking
experience agreed in discovery, suitable for the owner and a few friends to test.
The map resolves planning questions; implementation follows through to-spec,
to-tickets, and implement.

## Notes

- The agreed product scope and first test journey are in [discovery](discovery.md).
- Use the local Markdown tracker configured in `docs/agents/issue-tracker.md`.
- Explain each meaningful step in plain language; ask one focused question at a time.
- Consult the grilling and domain-modeling skills for live design discussions.
- Catalog recommendation and sources are in [catalog research](catalog-research.md).
- User selected IGDB; initial live API validation passed.
- Work on the next open, unblocked decision ticket; record each resolution in its
  own ticket and link a short pointer here.
- Initial ticket frontier lives in `issues/`, rather than being duplicated here.

## Decisions so far

- [First release scope](discovery.md): responsive PC/console game tracker with
  individual private accounts, four play statuses, and a concrete friends-test journey.
- [Catalog provider](catalog-research.md): IGDB selected after comparing alternatives;
  initial developer access and live checks passed.
- [Validate IGDB access](issues/02-validate-igdb-access.md): three expected game IDs
  and required metadata returned successfully.
- [Catalog entry scope](issues/06-choose-catalog-entry-scope.md): standalone games,
  including distinct remakes and remasters; exclude DLC, mods, bundles, and special editions.
- [Choose how friends sign in](issues/01-choose-sign-in-experience.md): independent
  email accounts, with no ChatGPT dependency; Sites-hosted sign-in is excluded.
- [Deployment constraints](discovery.md): Docker containers, with workstation vs
  Ugreen NAS selected later; friends will use private Tailscale access and independent app accounts.
- [Set the budget for the friends test](issues/03-choose-hosting-budget.md): the
  owner clarified self-hosting on their own server, including account storage;
  the proposed managed-service budget question is superseded.
- [Choose frontend and backend frameworks](issues/04-choose-application-stack.md):
  Angular and NestJS, reflecting the owner's Angular experience and NestJS learning goals.
- [Persistence and accounts](issues/05-choose-persistence-and-accounts.md): PostgreSQL,
  email/password login, database-backed sessions, and an HttpOnly cookie. Outbound
  account emails are deferred for the private test; recovery uses an administrator command.
  One repository holds the frontend, backend, and Docker Compose configuration.
- [First-use screens](issues/07-explore-first-use-screens.md): D's cinematic
  dashboard with C's purple palette, including both major-studio and indie games.

## Not yet specified

No further planning tickets remain open. The [build specification](../game-tracker-build/spec.md)
records the approved behavior and explicit implementation defaults for catalog
scope, missing metadata, first release dates, and discovery feeds. The owner
accepted API/PostgreSQL behavior tests and a browser journey as testing seams.

## Handoff

The planning destination is reached: continue from the build specification into
small implementation tickets. Specific package choices, live catalog filter/feed
validation, and backup/restore checks belong to implementation. Physical host
selection and its Tailscale/NAS configuration remain intentionally deferred until deployment.

## Out of scope

- Public profiles, community reviews, following users, and other social features
  are deferred beyond the first release.
- Native mobile applications and mobile game catalog coverage are deferred.
- ChatGPT-coupled user authentication and Sites hosting are excluded.
- Managed hosting and hosted account services are not the chosen deployment approach.
- This map does not authorize adding monetization or paid subscriptions.
