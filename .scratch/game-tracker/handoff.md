# Game-tracker planning checkpoint — 2026-10-29

Status: paused by the owner after feature priorities were agreed

## Progress

- [Choose the most valuable improvements before inviting testers](issues/08-choose-pre-tester-improvement-priorities.md)
  is resolved. The milestone centres on *diving into the world of games*. In ranked
  order: catalog browsing with filters and sorts, then company pages linking games,
  studios, parent companies, and publishers' collaborators, then critic ratings.
- Company terms were added to [the glossary](../../GLOSSARY.md).
- [Validate OpenCritic game-score access](issues/12-validate-opencritic-access.md)
  was added. It checks whether OpenCritic scores (apparently sold through
  RapidAPI) may be used, what they cost, and what real responses contain. The
  owner chose to leave it for later. Ratings ship only if it succeeds; otherwise
  game details link to the review sites.

## Resume point

The owner agreed to finish without the one-ticket-per-session rule:

1. In one session, use the grilling and domain-modeling skills to settle
   [Choose the visual improvements for the next milestone](issues/09-choose-pre-tester-visual-direction.md)
   and then [Define the next milestone and its completion criteria](issues/10-define-pre-tester-milestone.md).
   The milestone can be drafted with ratings marked conditional on the OpenCritic check.
2. The owner does the OpenCritic sign-up whenever convenient: a RapidAPI account,
   a plan, and an API key. The agent then makes a few test requests and records
   the result in that ticket.
3. Write the follow-up specification.

This continuation is planning only: do not implement, deploy, or invite testers.
The accepted [build specification](../game-tracker-build/spec.md) remains the baseline.
Host selection, HTTPS/Tailscale setup, and remote-phone verification remain
separate operator steps before invitations.
