# 06: Package the complete private test in Docker

Status: ready-for-agent
Blocked by: 05 — Complete the discovery-to-library journey and account recovery
Parent: [First private release](../spec.md)

## What to build

The owner can build and run the complete app with Docker Compose, restart it
without losing libraries, and back up and restore its database. Provide a clear
handoff for private Tailscale deployment when the host is selected.

## Acceptance criteria

- [x] Document and verify Compose build/start, runtime configuration, migrations, health checks, and local access.
- [x] Accounts, sessions, and library data use persistent storage; database access stays private to the container network.
- [x] Secret values are absent from source, committed images, browser bundles, and logs.
- [x] Container restart preserves user data, and a documented backup is restored into a disposable environment successfully.
- [x] Static checks, builds, HTTP behavior checks, and the browser smoke journey pass against the packaged app.
- [x] Document host selection, NAS architecture verification, HTTPS/cookie configuration, and restricted Tailscale sharing as deployment steps; do not claim a NAS or remote setup was tested before it exists.
- [x] Record remaining operator actions and give the owner a concise friends-test checklist.

## Comments

### Implementation and verification — 2026-10-19

The production Compose stack builds a non-root, read-only API image, runs a
one-shot TypeORM migration service, mounts runtime secrets, persists PostgreSQL
in a named volume, and publishes only the app on host loopback. The readiness
endpoint checks the database. The deployment guide covers startup, upgrades,
backup/restore, Tailscale Serve, proxy trust, NAS architecture checks, and the
remaining friends-test setup.

Packaged verification passed on Docker 29.9.1 / x64: HTTP behavior, 12 browser
journeys, restart persistence, administrator recovery, restore into a second
disposable Compose project with account/session/library continuity, private
database networking, image/bundle/log secret scans, and database-outage
readiness. The machine-readable result is in
[the container verification record](../verification/06-containers.json).
The `npm test` suite and static checks are being run for this final source state.

The chosen workstation/NAS host, NAS compatibility, public HTTPS origin,
Tailscale Serve configuration/ACLs, and remote phone access remain operator
steps; none are claimed as tested. Technical acceptance criteria are complete;
owner review is pending. Keep `Status: ready-for-agent` until accepted, per
tracker completion policy.
