# 08: Choose backend database access and define any ORM migration

Type: decision
Status: needs-info
Progress: Awaiting owner design discussion
Blocked by: None
Priority: Before 03
Parent: [First private release](../spec.md)

## Question

Should the application retain direct PostgreSQL access through pg, adopt an ORM,
or use a typed query builder? Agree the owner's preferences and the project's
needs, select an approach, and scope any migration before library implementation.
No ORM or migration is selected by the creation of this ticket.

## Context

The owner questioned the volume of SQL in the backend and agreed to create a
separate task before ticket 03. The planning docs selected PostgreSQL but left
the database access library as an implementation choice. The application currently
uses pg, SQL migrations, and connect-pg-simple for persistent sessions; no recorded
comparison explains choosing direct SQL over an ORM.

The application has real account/session data in development. Existing accounts,
password hashes, sessions, cached games, request limits, schema migration history,
and public API behavior must be preserved by any implementation plan.

## Work to do

1. Use the installed grilling skill when the owner starts the design discussion.
   Establish preferences for ORM/model style, SQL visibility, type safety,
   migration ownership, and the acceptable scope of replacing existing access.
   Research technical facts rather than asking the owner to supply them.
2. Load NestJS framework guidance before recommending an implementation. Compare
   a small shortlist against installed NestJS/PostgreSQL/Node versions, existing
   session storage, transactions, atomic counters/upserts, tests, and self-hosting.
   Use official documentation and representative existing operations as evidence.
3. Record the agreed choice, alternatives, tradeoffs, and any justified direct-SQL
   exceptions in project documentation using the domain-doc conventions.
4. If a migration is chosen, create a separate implementation ticket with concrete
   acceptance criteria, data/migration compatibility and recovery steps, and the
   existing HTTP/PostgreSQL and browser verification seams. Update ticket 03 to
   depend on that implementation ticket before closing this decision task.
   If direct SQL is retained, document the agreed conventions and unblock 03.

## Acceptance criteria

- [ ] Owner preferences and the chosen database access approach are agreed and recorded.
- [ ] Compatibility and tradeoffs are supported by official sources and current project evidence.
- [ ] Scope covers account access, sessions, catalog caching, limits, SQL migrations, and future library relationships.
- [ ] Any migration plan preserves existing data, account/session contracts, migration history, and the agreed test seams.
- [ ] A concrete migration implementation ticket is published if needed, with ticket 03's dependency updated; otherwise the retained approach and conventions are documented.

## Scope boundaries

This ticket ends with an agreed decision and actionable follow-up. It does not
install an ORM, change schemas, rewrite data access, or start the personal library.
Do not mark it ready-for-agent until the decisions needed for autonomous work
are settled. Human decision work remains pending in this ticket.

## Comments

### Created — 2026-10-19

The owner requested a task and asked where grill-with-docs belongs. The installed
skill is named grilling; the repository README uses the earlier grill-with-docs
name. Use that design discussion to settle the choice, then implement the scoped
follow-up separately. Tickets 02 and 07 are already accepted and complete.
