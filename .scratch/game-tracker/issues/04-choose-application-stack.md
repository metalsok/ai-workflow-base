# Choose frontend and backend frameworks

Type: grilling
Status: resolved
Blocked by: 01, 03

## Question

Which frontend and backend frameworks fit the agreed self-hosted application and
the owner's experience?

## Answer

Use Angular for the frontend and NestJS for the backend. The owner is a senior
Angular developer, is interested in NestJS and .NET, and selected NestJS for now.
This supersedes the initial Next.js proposal.

The app retains the agreed Docker packaging, self-hosting, private Tailscale
access, independent email accounts, and IGDB integration.

This decision does not select a database, ORM, authentication library, monorepo
tool, or final container layout. PostgreSQL remains a proposal. Next resolve
[persistence and accounts](05-choose-persistence-and-accounts.md).

## Supporting documentation

- [Angular rendering strategies](https://angular.dev/guide/routing/rendering-strategies)
- [Angular deployment](https://angular.dev/tools/cli/deployment)
- [NestJS documentation](https://docs.nestjs.com/)
