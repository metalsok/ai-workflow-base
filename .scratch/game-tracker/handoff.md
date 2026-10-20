# Game-tracker planning checkpoint — 2026-10-19

Status: paused at the owner's request

## Resume point

Use Wayfinder to resume the existing [map](map.md). Read its Notes, then reclaim
[Choose the most valuable improvements before inviting testers](issues/08-choose-pre-tester-improvement-priorities.md).
That ticket contains the discussion, agreed direction, and pause checkpoint.
Its status is open because the claim was released; it must not be skipped or
treated as resolved.

The initial private build and all nine build tickets are accepted. The
[build specification](../game-tracker-build/spec.md) and
[build handoff](../game-tracker-build/handoff.md) remain the historical baseline.
This continuation is planning only: do not implement, prototype, deploy, or
invite testers.

## First question on return

The owner has not answered:

> Should ratings appear on game cards and details, with an optional Highest
> rated sort?

The agent recommended yes, retaining unrated games in normal browsing and
deferring minimum-score filters. None of this is approved yet. Resume with this
focused question rather than repeating the discovery conversation.

## Evidence already gathered

[Establish feasible critic-rating sources for catalog exploration](issues/11-research-rating-sources.md)
is resolved as desk research; see [the research note](ratings-research.md).
Provider access is not validated. OpenCritic-first is a recommendation, not the
owner's selection. Metacritic game-score access remains unconfirmed. IGDB ratings
cannot be relabeled as either requested source. Do not repeat this research
unless new evidence or an access-validation decision justifies it.

The report is preserved on local branch `research/rating-sources` and copied
into this checkout. There is no Git remote; nothing was pushed.

## Remaining planning sequence

1. Finish the feature-priority ticket: rating behavior/source prerequisites,
   bounded filter/sort choices, company-page scope, and explicit deferrals.
2. Work [Choose the visual improvements for the next milestone](issues/09-choose-pre-tester-visual-direction.md),
   preserving the approved purple cinematic direction unless explicitly reopened.
3. Work [Define the next milestone and its completion criteria](issues/10-define-pre-tester-milestone.md).
   The milestone is not yet finalized or approved.

Keep company development and publishing roles distinct in the discussion. Exact
page organization is not yet settled. Library-management improvements were the
agent's initial proposal; the owner redirected priority to catalog exploration.
Completion-time data, personal ratings, social features, and personalized
recommendations have not been requested or approved in this continuation.

Host selection, HTTPS/Tailscale setup, and remote-phone verification remain
separate operator steps before invitations.

## Workspace state

Only planning documents were changed in this continuation. The accepted build
specification, build handoff, and completed build tickets for the final journey
and Docker packaging already had local edits when this planning session began;
those edits were preserved. The planning changes are saved locally but have not
been committed on the main branch. Application tests were not run for these
Markdown-only changes; `git diff --check` passed.
