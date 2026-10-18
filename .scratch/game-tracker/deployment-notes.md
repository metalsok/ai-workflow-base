# Container deployment: initial constraints

## Owner decisions

- Self-host the app and account/list data.
- Use Docker container(s).
- Defer the host choice: local workstation or Ugreen NAS.
- Friends will use Tailscale for private remote access. No networking change has
  been performed; configure access at deployment time.

## Local observations

Read-only command checks found an x86_64 workstation, Docker 29.9.1, and Docker
Compose 5.6.0. The `tailscale` command was not found on this shell's PATH.
Docker daemon access and container execution have not been checked.
The NAS model, CPU architecture, and container runtime remain unknown.

## Proposed packaging, not yet selected implementation

Docker Compose can describe an application service and a separate database
service with persistent data. Keep configuration outside the image and document
backup/restore steps so moving hosts includes data, not only container images.

Source: [Docker Compose production guidance](https://docs.docker.com/compose/how-tos/production/).

## Remote-access distinction

- Private Tailscale sharing gives invited users access through their Tailscale clients.
- Tailscale Funnel publishes a local service to the public internet. The app's
  own authentication remains necessary for private account data.

The owner selected private Tailscale client access for the friends test. Funnel
and a public endpoint are not required. Neither access mechanism has been enabled.

Sources: [Tailscale sharing](https://tailscale.com/docs/features/sharing),
[Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel).
