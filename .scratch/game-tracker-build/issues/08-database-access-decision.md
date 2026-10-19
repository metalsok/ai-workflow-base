# 08: Choose backend database access and define any ORM migration

Type: decision
Status: done
Progress: Owner accepted TypeORM; migration scoped in 09
Blocked by: None
Priority: Before 03
Parent: [First private release](../spec.md)

## Question

Should the application retain direct PostgreSQL access through pg, adopt an ORM,
or use a typed query builder? Agree the owner's preferences and the project's
needs, select an approach, and scope any migration before library implementation.
The owner selected TypeORM during the design discussion recorded below.

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

- [x] Owner preferences and the chosen database access approach are agreed and recorded.
- [x] Compatibility and tradeoffs are supported by official sources and current project evidence.
- [x] Scope covers account access, sessions, catalog caching, limits, SQL migrations, and future library relationships.
- [x] Any migration plan preserves existing data, account/session contracts, migration history, and the agreed test seams.
- [x] A concrete migration implementation ticket is published if needed, with ticket 03's dependency updated; otherwise the retained approach and conventions are documented.

## Scope boundaries

This ticket ends with an agreed decision and actionable follow-up. It does not
install an ORM, change schemas, rewrite data access, or start the personal library.
The owner confirmed the shared understanding; decision work is complete.
Implementation remains in ticket 09.

## Comments

### Created — 2026-10-19

The owner requested a task and asked where grill-with-docs belongs. The installed
skill is named grilling; the repository README uses the earlier grill-with-docs
name. Use that design discussion to settle the choice, then implement the scoped
follow-up separately. Tickets 02 and 07 are already accepted and complete.

### Owner decision accepted — 2026-10-19

The grilling discussion established readability as the primary concern because
the owner has limited backend knowledge. They approved models/relationships and
type checking, generated/reviewed migrations, and then explicitly superseded the
initial allowance for SQL exceptions: all application database access must use
the ORM, including sessions, counters, and cleanup. The owner selected TypeORM
and confirmed preservation of data/history, backend-clock limit timing, a brief
shutdown with backup/tested recovery, and the final shared-understanding summary.

The accepted [architecture decision](../../../docs/adr/0001-typeorm-database-access.md)
records conventions, alternatives, compatibility evidence, and tradeoffs with
official sources. [Implementation ticket 09](09-typeorm-migration.md) defines
the migration, session replacement, concurrency and recovery acceptance criteria;
[ticket 03](03-personal-library.md) now depends on 09. Generated migration SQL is
allowed; handwritten application SQL is not. No dependencies were installed,
schemas changed, or application data-access code rewritten in this decision task.
