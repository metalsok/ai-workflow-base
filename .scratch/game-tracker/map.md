# Plan the game-tracker release

Type: wayfinder:map
Planning status: paused by owner on 2026-10-29

## Destination

Define the next milestone of feature and visual improvements before inviting
testers: agree the user benefit, bounded scope, visual direction, and completion
criteria, ready for a follow-up specification. The initial private build is
accepted; this continuation plans improvements without implementing them.

## Notes

- Start from the [latest planning checkpoint](handoff.md); the frontier is in
  `issues/`. Do not restart initial discovery.
- The agreed product scope and first test journey are in [discovery](discovery.md).
- Use the local Markdown tracker configured in `docs/agents/issue-tracker.md`.
- Explain each meaningful step in plain language; ask one focused question at a time.
- Consult the grilling and domain-modeling skills for live design discussions.
- For Angular and NestJS decisions and implementation handoffs, consult the
  framework skills configured in [framework guidance](../../docs/agents/framework-skills.md).
- Catalog recommendation and sources are in [catalog research](catalog-research.md).
- User selected IGDB; initial live API validation passed.
- Work on the next open, unblocked decision ticket; record each resolution in its
  own ticket and link a short pointer here.
- Initial ticket frontier lives in `issues/`, rather than being duplicated here.
- Resumed on 2026-10-19 at the owner's request after acceptance of the initial
  private build. Improving features and visual design now precedes tester
  invitations. This supersedes the earlier timing of polish after the friends
  test, while preserving the accepted build and previous product decisions.
- The [accepted build specification](../game-tracker-build/spec.md),
  [completed build tickets](../game-tracker-build/issues/), and
  [acceptance handoff](../game-tracker-build/handoff.md) are the baseline, not
  unfinished implementation work. All nine build tickets are done.
- Use grilling and domain-modeling for the continuation. Resolve at most one
  decision ticket per session; proposed priorities are not owner decisions.
- Challenge additions against a concrete personal-tracking need and a bounded
  milestone. No code, prototypes, dependency changes, deployment, or invitations
  are authorized by this planning continuation.
- Retain the purple cinematic dashboard, separate My Library, private accounts,
  catalog scope, and four Play statuses unless explicitly reopened. Preserve
  TypeORM and the other accepted implementation constraints in the build spec.
- Feature priorities are settled; see Decisions so far. Ratings depend on
  [Validate OpenCritic game-score access](issues/12-validate-opencritic-access.md).
- Agreed 2026-10-29: finish without the one-ticket-per-session rule. The owner
  does the OpenCritic sign-up from a checklist whenever convenient. One grilling
  session then settles visual direction and the milestone together, and the
  follow-up specification is written next. Record each answer in its own ticket.

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
- [Establish feasible critic-rating sources for catalog exploration](issues/11-research-rating-sources.md):
  desk research complete; OpenCritic is the first candidate to validate, branded
  game-score access remains unverified, and IGDB aggregates do not establish either brand.
- [Choose the most valuable improvements before inviting testers](issues/08-choose-pre-tester-improvement-priorities.md):
  a "dive into the world of games" journey. Ranked: catalog browsing with
  filters and sorts, then company pages linking games, studios, parent companies,
  and publishers' collaborators, then critic ratings if OpenCritic access works.

## Not yet specified

- The specific screen changes and visual acceptance examples needed once the
  owner identifies what feels unfinished in the accepted design.

## Initial build handoff — completed

The original planning destination was reached: the build specification led into
the approved [implementation tickets](../game-tracker-build/issues/01-account-access.md),
all now accepted. This paragraph preserves the original handoff and its constraints.
The owner approved the six-ticket breakdown with visual polish deferred and the
design easy to revisit. Specific package choices, live catalog filter/feed
validation, and backup/restore checks belong to implementation. Physical host
selection and its Tailscale/NAS configuration remain intentionally deferred until deployment.

## Continuation — 2026-10-19

The owner accepted the initial private build and wants feature and visual
improvements before inviting testers. The map was reopened for planning only
was paused on 2026-10-19, resumed and paused again on 2026-10-29.
Feature priorities are agreed; the visual direction and the milestone are not. The decision tickets hold the
candidate priorities and discussion; resolved decisions will be indexed above.
The original specification and completed tickets remain the accepted historical
baseline. A follow-up specification comes after this planning destination is reached.

Host selection, HTTPS/Tailscale setup, and a remote-phone check remain separate
operator work before invitations. Build acceptance does not claim those checks
have happened, and this continuation does not execute them.

## Out of scope

- Public profiles, community reviews, following users, and other social features
  are deferred beyond the first release.
- Franchise, series, and similar-game relationships, personalised recommendations,
  completion-time data, personal ratings/notes, and My Library search/sort are
  deferred beyond this milestone; see
  [Choose the most valuable improvements before inviting testers](issues/08-choose-pre-tester-improvement-priorities.md).
- Native mobile applications and mobile game catalog coverage are deferred.
- ChatGPT-coupled user authentication and Sites hosting are excluded.
- Managed hosting and hosted account services are not the chosen deployment approach.
- This map does not authorize adding monetization or paid subscriptions.
- Implementation, production prototypes, deployment work, and sending tester
  invitations are outside this planning continuation.
- Rebuilding accepted account, catalog, persistence, or deployment foundations
  without a concrete requirement is outside this continuation.
