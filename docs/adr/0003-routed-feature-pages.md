# Use routed feature pages and shared library state

Accepted on 2026-10-20 at the owner's request. This supersedes
[ADR 0002](0002-shell-request-ownership.md). The shell renders shared navigation,
search, account controls, and a router outlet. Discover, Library, Search, and
Game details have dedicated lazy child routes with a shared child-route account
guard. Each page is a smart feature container; underlying shelves, covers,
save controls, and status editors remain presentational.

Catalog pages own their HTTP resources and route-derived state. Library page
owns filtering, edit/remove subscriptions, mutation pending state, and errors.
Named computed signals prepare display values and errors for templates. Angular
owns route activation, reuse on parameter changes, and page destruction, which
cancels resource reads when the user leaves a feature. The shell no longer
selects pages with route flags or knows their request parameters.

One `LibraryState` service is provided at the persistent shell component. It
owns the shared full-library resource, save actions, and per-game save state.
Its subscription lifetime follows the shell. Library edits refresh this same
resource instead of updating a second cache; entry to the library refreshes it,
while local filters reuse loaded data. Catalog route navigation keeps the shared
state. Track account identity by ID to avoid refetching on every successful
guard response. Leaving the signed-in area destroys the state; it is never a
root singleton. Read failures and retry appear in the shared shell.

The discovery spotlight's connected-widget pilot now injects `LibraryState`
directly. Remove the shell connection token and alias provider: a widget needs
the shared state owner rather than the parent component. Keep the remaining
save controls on inputs/outputs so the pilot can still be compared.

This replaces the shell-only request rule because it concentrated unrelated
feature behavior in a growing parent. The new boundary follows routes while
retaining one source for library data. Shared saves may finish across feature
navigation; page-owned edits and catalog reads are cancelled on page teardown.
Full-library refetches still cost an extra GET after edits and suit the current
unpaginated library. Revisit that choice if the collection becomes large.
