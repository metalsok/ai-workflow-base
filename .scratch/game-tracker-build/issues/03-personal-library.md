# 03: Save games and manage a private library

Status: ready-for-agent
Blocked by: 08 — Database access decision and any resulting migration (02 and 07 accepted)
Parent: [First private release](../spec.md)

## What to build

A tester adds a game to Want to play, changes its Play status, browses My Library
and its filters, and removes a game. The library remains private and persists
across devices, sign-ins, and application restarts.

## Acceptance criteria

- [ ] Adding from search or details creates one entry per user and Game; repeated additions do not duplicate it.
- [ ] The four Play statuses and the combined Played view match the glossary.
- [ ] My Library supports status filtering, status changes, removal, and intentional empty states on desktop and mobile.
- [ ] The backend enforces ownership for every library read and mutation, independently of Angular navigation.
- [ ] PostgreSQL-backed HTTP checks cover two users, identifier tampering, duplicates, transitions, filtering, removal, and persisted results.
- [ ] Saved-game rendering remains usable from stored metadata during an IGDB outage.
- [ ] The browser journey covers save, status change, Played, removal, and signing in again.
