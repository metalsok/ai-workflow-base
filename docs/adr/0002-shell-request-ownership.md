# Let the shell own authenticated page requests

Superseded by [ADR 0003](0003-routed-feature-pages.md) on 2026-10-20.

Accepted on 2026-10-20 at the owner's request. `Shell` is the smart component
for discovery, search, game details, and the personal library. It owns
`httpResource` reads, route parameters, explicit `HttpClient` mutations, pending
state, and errors. Pages and their controls receive data through signal inputs
and emit user actions through outputs. Keep local display and form state in the
component that renders it. Account access and the authentication guard retain
their separate request lifecycles.

The owner prioritizes a visible, readable data flow over page-owned requests and
stateful API services. Remove `catalogRequest` rather than replacing it with a
new resource wrapper. Keep resources in the shell, activating only the reads for
the displayed page. Put shared expired-session behavior in a functional
interceptor scoped to protected catalog/library requests; keep readable feature
errors at the shell boundary.

Use one full-library resource for saved badges and local library filtering.
Successful mutations refetch the library instead of patching a separate cache;
failed edits refetch to restore the authoritative form value. This adds a GET
after edits and a loading interval, but removes duplicate snapshots and their
synchronization logic. Disable new library actions until the read completes.
The backend's filtered endpoints remain available to other clients. For a much
larger, paginated library, revisit loading the entire collection.

Keep state scoped to the shell lifetime. Crossing page routes can recreate the
shell and reload its data; query/ID changes on a reused route update the relevant
signals. If the shell grows difficult to read, revisit feature containers with
the owner before moving request ownership back into presentation components.

## Connected widget pilot

On 2026-10-20 the owner requested one trial of the connected-widget pattern
introduced in [this article](https://medium.com/@Angular_With_Awais/smart-and-dumb-components-arent-enough-meet-the-connected-widget-040f415b7088).
The discovery spotlight uses `SaveGameWidget`, a thin connector around the
presentational `SaveGame`. It takes only a Game ID and injects the shell-scoped
`LIBRARY_CONNECTION` for the existing library view and save action. The shell
provides itself through that narrow interface, retaining HTTP and state ownership;
the widget creates no requests, subscriptions, or independent cache.

Other save controls retain inputs/outputs for comparison. This is a deliberate
exception to the presentation-only descendant rule, limited to the connector.
Keep pages and the underlying save control presentational. Evaluate the reduction
in passing state/events against the additional DI wiring before extending it.
