# Explore the first-use screens

Type: prototype
Status: resolved
Blocked by: 04, 05, 06

## Question

What layout and navigation make the agreed search-to-personal-list journey clear
on desktop and mobile? Start by choosing the signed-in home screen, then use a
local throwaway prototype to assess the interactions before production code.

## Constraints

- Use the agreed game statuses and catalog scope.
- Represent accounts and private lists without using real credentials in a prototype.
- Prototype fixture data is for design feedback; it is not the IGDB integration.
- Preserve Angular/NestJS as the production framework choice.

## Decisions so far

The signed-in landing screen is a visually rich discovery page rather than the
personal library. Candidate content includes new major-studio releases and
games popular that week. The owner has not restricted discovery to major studios
or selected a ranking formula, time window, or visual layout.

IGDB's PopScore documentation describes popularity primitives updated daily.
It does not by itself establish an off-the-shelf weekly chart matching the user's
intent. Validate the data and select an honest section label before implementation.

Source: [IGDB PopScore](https://api-docs.igdb.com/#popscore).

The owner confirmed that discovery includes both major-studio and indie games.
Prepare three structurally different local prototype variants with sample data,
then await the owner's feedback before resolving the design question.

## Prototype ready for feedback

[Open the local prototype](../prototype/index.html) and use the floating switcher:

- A: cinematic spotlight and cover shelves.
- B: editorial feature, ranked list, and indie shelf.
- C: sidebar dashboard, compact spotlight, and discovery cards.
- D: cinematic hero with sidebar navigation and denser discovery cards (A/C hybrid).

The six-game fixture includes major-studio and indie titles with public IGDB
artwork. Library mutations are in-memory only. JavaScript syntax, desktop/mobile
rendering, the core sample interactions, and mobile overflow checks passed.
See [prototype notes](../prototype/README.md) for limitations.

The design question remains open until the owner reviews the variants. Preserve
the prototype on a throwaway branch after capturing the owner's verdict.

## First feedback

The owner likes both A and C. This is a shortlist, not yet a final design choice.
Added D as a concrete hybrid for comparison: A's cinematic spotlight, C's sidebar
and compact cards. Await feedback on whether that combination captures the appeal
of the originals.

## Answer

The owner selected D, the A/C hybrid, with C's purple color palette. Retain the
cinematic featured-game area, desktop sidebar/navigation, and denser discovery
cards, with responsive mobile layouts. Discovery includes both major-studio and
indie titles, and My Library remains a separate destination.

This approves the design direction, not the temporary sample collections as
live rankings or the prototype code as production implementation. Sidequest
remains a working name. Proceed to a build specification and implementation tickets.

Prototype preservation branch: `prototype/game-discovery`. The ignored local
preview remains available for review; the branch preserves the source independently
of the implementation branch.
