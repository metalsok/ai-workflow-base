# 05: Complete the discovery-to-library journey and account recovery

Status: done
Blocked by: 03 — Save games and manage a private library; 04 — Discover featured, popular, and recently released games
Parent: [First private release](../spec.md)

## What to build

A tester can save directly from the real discovery page, see consistent saved
states throughout the app, and complete the full first-test journey. The owner
can recover an account through the agreed administrator reset command.

## Acceptance criteria

- [x] Discover, search, details, and My Library show consistent saved status after additions, changes, and removal.
- [x] Saving directly from the discovery spotlight and cards persists to the correct user's library.
- [x] An administrator command resets a tester's password without exposing it in arguments/logs and revokes existing sessions.
- [x] Recovery is verified through HTTP behavior: old password/session fail and the new password succeeds.
- [x] A browser journey covers registration, discovery, search, details, save, status/filter changes, removal, logout, and sign-in again.
- [x] The same journey remains usable at desktop and mobile widths and does not depend on a ChatGPT account.

## Comments

### Implementation and verification — 2026-10-19

Discovery, search, details, and My Library share saved-state updates. Saves from
the spotlight and cards persist to the signed-in account. The administrator
reset command reads the new password through hidden terminal input, updates the
Argon2 hash, and increments the account session version so previous sessions
are rejected. Additive TypeORM migration preserves existing sessions at version
zero until a password reset.

The record in [ticket 06's packaged verification](../verification/06-containers.json)
includes real HTTP recovery checks and 12 desktop/mobile browser journeys.
Focused race regression coverage confirms an in-flight stale library response
cannot overwrite a newer status. Earlier full checks passed 53 HTTP and 10
browser cases before the extra outage/proxy coverage was added for ticket 06.

Technical acceptance criteria are complete; owner review is pending. Keep
`Status: ready-for-agent` until the owner accepts, per tracker completion policy.

### Owner acceptance — 2026-10-19

The owner reviewed the app, confirmed it looks good, and requested closing the
remaining tickets. Ticket 05 is accepted and complete.
