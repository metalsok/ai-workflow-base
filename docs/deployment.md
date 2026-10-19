# Private Docker deployment

This guide runs the complete app and PostgreSQL in a separate Compose project.
The production stack uses its own named volume and does not import the local
development database automatically. Run commands from the repository root.

## Prepare and start

Use Docker Compose on a Linux host with Node-free runtime support. The app image
currently targets `linux/amd64`; check the selected NAS model's CPU architecture
and Docker support before choosing it. The verification record is for Docker
29.9.1 on x64. A NAS or remote Tailscale setup has not been tested.

The setup command creates `.deploy/` and `.env.production` without replacing
existing files. It generates PostgreSQL and session secrets, and copies IGDB
credentials from the local `.env` when present. To provide credentials directly,
set `DEPLOY_IGDB_CLIENT_ID` and `DEPLOY_IGDB_CLIENT_SECRET` for the setup command.
The client ID is stored in `.env.production`; the client secret goes into a
separate file. Review those files locally and do not commit or print them.

```bash
npm run deploy:setup
docker compose --env-file .env.production -f compose.production.yaml up -d --build --wait
```

Open `http://127.0.0.1:4400`. Set `APP_PORT` in `.env.production` to change
the host port. `APP_ORIGIN` must match the origin people use in their browsers.
The app binds only to host loopback. PostgreSQL has no host port; only the app
and migration service can reach it on the private Compose network. The database
uses the named `game-tracker-private_postgres-data` volume. `docker compose down`
keeps that volume; `down -v` deletes it.

The API image runs as the unprivileged `node` user with a read-only root
filesystem, dropped capabilities, and a temporary writable `/tmp`. Secrets are
mounted as files at runtime. `.deploy/secrets` and its parent have owner-only
directory permissions; secret files are read-only so the container's non-root
UID can read bind-mounted files. Keep the host account and backups private.
Generated secrets are not baked into either image or browser bundle.

Compose waits for PostgreSQL health, runs the migration service once, then
starts the API. The API health check reads `/api/health`; it returns an error
when PostgreSQL is unavailable. For an upgrade, make a backup first, build the
new image, run the migration service, then recreate the app:

```bash
docker compose --env-file .env.production -f compose.production.yaml stop app
docker compose --env-file .env.production -f compose.production.yaml build app
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate
docker compose --env-file .env.production -f compose.production.yaml up -d app
```

Migrations use a host-mounted lock directory so only one migration process can
run for that deployment. Keep `.deploy/migration-lock` with the deployment state.
Do not run migration rollback against user data; recovery is a restore into a
replacement database after review.

## Back up and restore

Create backups with restrictive permissions and keep them outside Git. Retain
the matching `.deploy/secrets` and `.env.production` securely: the database
password is needed to restore, and the same session secret preserves existing
signed cookies. Treat backup copies as private user data.

```bash
umask 077
mkdir -p .deploy/backups
docker compose --env-file .env.production -f compose.production.yaml \
  exec -T db pg_dump -U game_tracker -d game_tracker -Fc \
  > .deploy/backups/game-tracker-$(date +%F).dump
```

To rehearse a restore, create a fresh deployment directory with its own secrets,
environment file, project name, and database volume. Stop its app, restore the
custom-format dump into its empty database, then start the app so normal startup
validates migration history. For example, after setting `RESTORE_ENV` to the
fresh environment file and `RESTORE_PROJECT` to its unique Compose project:

```bash
docker compose --env-file "$RESTORE_ENV" -p "$RESTORE_PROJECT" \
  -f compose.production.yaml up -d --wait db
docker compose --env-file "$RESTORE_ENV" -p "$RESTORE_PROJECT" \
  -f compose.production.yaml exec -T db pg_restore -U game_tracker \
  -d game_tracker --no-owner < .deploy/backups/game-tracker-YYYY-MM-DD.dump
docker compose --env-file "$RESTORE_ENV" -p "$RESTORE_PROJECT" \
  -f compose.production.yaml up -d --wait
```

Check account sign-in, saved games, and health before relying on the restored
copy. Never restore over a database containing newer writes without an explicit
recovery decision. The packaged verification run performs this restore into a
disposable Compose project and checks account, session, and library continuity.

## Private Tailscale access

Choose either the workstation or NAS as the deployment host. Before using a NAS,
check its exact model, CPU architecture, supported Docker image platforms, and
available memory/storage. Build the image on the target or use a matching
platform image. The current verification covers x64 only.

Install and sign in to Tailscale on the selected host. Keep the app's loopback
binding and expose it through Tailscale Serve, which provides HTTPS on the tailnet.
For example, on the host:

```bash
tailscale serve --bg http://127.0.0.1:4400
```

Set `APP_ORIGIN` to the exact `https://<host>.<tailnet>.ts.net` origin used by
friends. Secure session cookies require HTTPS. Configure the proxy to replace
forwarding headers. Docker's proxy connection may reach the container through
the Compose gateway, so add only the verified proxy address/range to
`TRUST_PROXY_CIDRS` in `.env.production`; inspect the actual route on the chosen
host. Leave `TRUST_PROXY_LOOPBACK` false unless the proxy really connects from
the app container's loopback interface. Do not trust arbitrary forwarded
headers or a broad network range.

Use Tailscale access controls to grant only the intended friends access to the
host's HTTPS service. Do not enable Funnel or public internet access. Test from
a phone outside the home network: HTTPS, registration/sign-in, search, saving,
and logout. The app's own accounts remain independent of ChatGPT and Tailscale.

## Friends-test checklist

- Select the host and verify its Docker architecture and storage.
- Preserve the deployment secrets and IGDB credentials; make and restore-test a backup.
- Configure the exact HTTPS origin and trust only the inspected proxy source.
- Restrict Tailscale access to invited friends, then verify HTTPS from a phone.
- Exercise account creation, discovery/search, save/status changes, restart persistence,
  and recovery before inviting friends to use their own accounts.
