# Session handoff — 2026-10-19

## Current progress

All nine build tickets (01–09) are `done` and accepted by the owner. The owner
reviewed the app and requested closing the final tickets, 05 and 06.

Accounts, IGDB search/details, private libraries, discovery, saving across views,
administrator password recovery, Tailwind styling, TypeORM database access, and
Docker packaging are implemented. See the individual ticket comments for
implementation history and verification evidence.

## Remaining deployment steps

Choose the workstation or NAS host, verify its architecture and Docker support,
configure HTTPS/Tailscale access and proxy trust, restrict access to invited
friends, and test from a remote phone. These operator steps are documented in
[the deployment guide](../../docs/deployment.md); they have not been verified
on a selected remote host.

## Verification evidence

[Packaged verification](verification/06-containers.json) records successful HTTP
checks, 12 desktop/mobile browser journeys, restart persistence, administrator
recovery, backup/restore with session continuity, private database networking,
secret scans, and database-outage readiness.

During owner review, login on development port 4200 returned HTTP 500 because
the development database was stopped. Restarting it restored the expected
unauthorized response for a nonexistent account. The packaged app on port 4400
returned the expected response throughout. No application code was changed.

## Run locally

Development:

```bash
npm run db:up
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:4200`.

Packaged deployment:

```bash
npm run deploy:setup
docker compose --env-file .env.production -f compose.production.yaml up -d --build --wait
```

Open `http://127.0.0.1:4400`. Development and packaged deployment use separate
databases and accounts; both databases can run together. Preserve their volumes
and ignored secrets. See `docs/development.md` and `docs/deployment.md`.
