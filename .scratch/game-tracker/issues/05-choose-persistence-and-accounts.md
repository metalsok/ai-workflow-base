# Choose persistence and account implementation

Type: grilling
Status: resolved
Blocked by: 04

## Question

Which self-hosted database and account implementation should support the NestJS
backend's independent email accounts, sessions, and private per-user game lists?

## Context

The owner selected PostgreSQL and one repository for frontend, backend, and
Docker Compose configuration. The exact container layout is still to be specified.
Account implementation must fit the private friends test and the owner's
self-hosting requirement.

## Answer

- PostgreSQL selected by the owner.
- Email/password login with database-backed sessions and an HttpOnly session cookie.
- Verification and password-reset emails are deferred for the private friends test.
- Provide an administrator password-reset command for initial account recovery.
- Add email flows before a broader release.
- A specific authentication package and database access library remain implementation
  choices to validate against the selected NestJS version and test requirements.

The user accepted the recommendation to defer outbound email and use manual
administrator recovery during testing. This does not add an administrative web UI.

## Comments

No managed account service or ChatGPT authentication may be introduced. All
credentials and account records remain in the owner's deployment; passwords
are stored as hashes. Tailscale connectivity does not replace app authentication.
