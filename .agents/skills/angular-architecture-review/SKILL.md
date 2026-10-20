---
name: angular-architecture-review
description: Review Angular architectural decisions before implementation or during design review, including routed pages, component responsibilities, connected widgets, state and DI lifetimes, and request ownership. Use for new features, structural refactors, or proposed abstractions; skip routine styling and mechanical edits.
---

# Angular architecture review

Make ownership and lifetime decisions explicit before code turns a proposal into
structure. Challenge designs with concrete consequences, including the user's
proposal, while respecting their chosen goals and authorized scope.

## Establish the constraints

Read the affected routes, component tree, state owners, HTTP flows, and applicable
ADRs. Separate observed behavior from assumptions. Consult the installed Angular
version and the project-required `angular-developer` skill for framework details.
For interface design, also use `codebase-design` when available. This skill adds
a decision process rather than replacing those references.

In this repository, read [framework guidance](../../../docs/agents/framework-skills.md)
for current agreements and verification requirements. Preserve those agreements
unless the user authorizes changing them. Keep broadly reusable reasoning here
and project-specific choices in the project documentation.

## Choose ownership

For the affected feature, establish the following; a small table is useful when
several components share responsibilities.

- **Routes and layout:** Which views are navigable destinations? Which layout
  should survive navigation? Prefer the router and outlets for destinations;
  use local conditionals for display state within a destination. Decide which
  query/path parameters are URL state and who reacts to their changes.
- **Feature containers:** Which component coordinates this feature's reads,
  actions, loading, and errors? Put orchestration where its consumers and
  lifetime fit. Compare page ownership with shell ownership before accumulating
  unrelated feature behavior in a shared parent.
- **Presentation:** Which components render supplied data and emit intent?
  Keep derived view values in named `computed` signals when template bindings
  would otherwise encode resource rules or data transformations. Local image
  fallbacks and editable form state can stay with their rendering component.
- **Connected widgets:** Does a repeated application capability need the same
  shared state inside unrelated views? A thin connector can inject that owner
  and compose presentation. Weigh removed input/event forwarding against hidden
  dependencies and provider requirements. A page with its own feature lifecycle
  is usually a container; it does not need a widget wrapper just to inject data.
- **Shared state:** Give each authoritative dataset one owner. Choose its DI
  scope from who needs it and when it must be reset. Check actual component,
  route-injector, and router-reuse lifetimes rather than assuming providers are
  recreated on every navigation. Identify what survives feature navigation and
  what clears on logout, account change, or leaving a feature.

Treat these as decision criteria, not a universal layer hierarchy. Small features
may need fewer layers. Introduce a service when shared behavior, lifetime, or
state ownership justifies it.

## Trace reads and actions

Trace one initial load, a parameter change, retry, mutation, navigation during a
request, and account change when applicable. Identify who starts and subscribes
to each request, who cancels it, where errors appear, and how data becomes fresh.

Use `httpResource` for direct reactive HTTP reads; use `rxResource` when an
existing Observable pipeline or transport abstraction earns its place. Keep
mutations explicit with `HttpClient`. Check these choices against the installed
Angular version and existing project contracts.

For shared writes, decide whether an operation must finish across page
navigation. Unsubscribing from HTTP does not undo a server write: account for
reconciliation if a page disappears while its edit is in flight. Prevent older
reads from overwriting newer authoritative state. Compare refetching with local
updates by request cost, response delay, and synchronization complexity.

Separate common transport/session policy from feature presentation. Interceptors
can handle an expired protected session; a rejected login may need a different
401 policy. Preserve actionable errors for the feature that renders them.

## Challenge the proposed structure

Compare the proposed design with its strongest plausible alternative, including
keeping the existing structure. Explain a concrete benefit, cost, and condition
that would change the recommendation. Use scenarios from the actual feature,
such as a second consumer, overlapping saves, or leaving the page mid-request.

Apply the deletion test to a proposed wrapper, facade, token, or store: if removing
it eliminates complexity without making callers take on meaningful work, prefer
the simpler design. Existing concrete state owners may suffice; interfaces and
DI tokens should serve a real contract or variation. Preserve useful abstractions
when they centralize behavior or simplify callers.

## Finish the review

Before implementation, briefly state the selected owners, their lifetimes, the
strongest alternative, and the accepted tradeoff. Ask only for missing information
that changes the choice or an unresolved user decision; this review creates no
extra permission checkpoint for authorized work. For a review-only request,
report findings and recommendations without editing application code.

When implementing, verify affected navigation, cancellation, error/retry, and
shared-state behavior using the project's agreed test seams. Record material
ownership decisions in the applicable ADR or project guidance. Distinguish
completed checks from blocked or unverified behavior. Keep routine edits free
of architecture paperwork and unrelated migrations.

## Official references

Read the relevant page when framework behavior is uncertain:

- [Feature organization](https://angular.dev/style-guide)
- [Routes and child outlets](https://angular.dev/guide/routing/define-routes)
- [DI scopes and resolution](https://angular.dev/guide/di/hierarchical-dependency-injection)
- [HTTP resources](https://angular.dev/guide/http/http-resource)
