# 06: Package the complete private test in Docker

Status: draft
Blocked by: 05 — Complete the discovery-to-library journey and account recovery
Parent: [First private release](../spec.md)

## What to build

The owner can build and run the complete app with Docker Compose, restart it
without losing libraries, and back up and restore its database. Provide a clear
handoff for private Tailscale deployment when the host is selected.

## Acceptance criteria

- [ ] Document and verify Compose build/start, runtime configuration, migrations, health checks, and local access.
- [ ] Accounts, sessions, and library data use persistent storage; database access stays private to the container network.
- [ ] Secret values are absent from source, committed images, browser bundles, and logs.
- [ ] Container restart preserves user data, and a documented backup is restored into a disposable environment successfully.
- [ ] Static checks, builds, HTTP behavior checks, and the browser smoke journey pass against the packaged app.
- [ ] Document host selection, NAS architecture verification, HTTPS/cookie configuration, and restricted Tailscale sharing as deployment steps; do not claim a NAS or remote setup was tested before it exists.
- [ ] Record remaining operator actions and give the owner a concise friends-test checklist.
