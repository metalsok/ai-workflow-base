# 05: Complete the discovery-to-library journey and account recovery

Status: ready-for-agent
Blocked by: 03 — Save games and manage a private library; 04 — Discover featured, popular, and recently released games
Parent: [First private release](../spec.md)

## What to build

A tester can save directly from the real discovery page, see consistent saved
states throughout the app, and complete the full first-test journey. The owner
can recover an account through the agreed administrator reset command.

## Acceptance criteria

- [ ] Discover, search, details, and My Library show consistent saved status after additions, changes, and removal.
- [ ] Saving directly from the discovery spotlight and cards persists to the correct user's library.
- [ ] An administrator command resets a tester's password without exposing it in arguments/logs and revokes existing sessions.
- [ ] Recovery is verified through HTTP behavior: old password/session fail and the new password succeeds.
- [ ] A browser journey covers registration, discovery, search, details, save, status/filter changes, removal, logout, and sign-in again.
- [ ] The same journey remains usable at desktop and mobile widths and does not depend on a ChatGPT account.
