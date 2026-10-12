# Local cloud-sync environment

Everything for cloud sync runs on this machine (phases 3–6): Postgres, RustFS
(S3), Mailpit, the Deno server (auth + collab) and Caddy with HTTPS for the
production-like domains.

| URL | Service |
|---|---|
| `https://editor.stagistic.local` | editor (Vite dev server on the host, port 3000) |
| `https://auth.api.stagistic.local` | auth (Better Auth), container port 8787 |
| `https://sync.api.stagistic.local` | collab, container port 8788 |
| `http://localhost:8025` | Mailpit (sign-in emails land here) |
| `localhost:5432` | Postgres (`stagistic` / `stagistic`; tests use `stagistic_test`) |

## One-time setup

1. Local CA and certificate (the CA is trusted by browsers once installed):

    ```sh
    mkcert -install
    mkcert -cert-file infra/certs/stagistic.local.pem -key-file infra/certs/stagistic.local-key.pem \
        stagistic.local "*.stagistic.local" "*.api.stagistic.local"
    ```

2. Host names (needs sudo):

    ```sh
    echo '127.0.0.1 editor.stagistic.local auth.api.stagistic.local sync.api.stagistic.local' | sudo tee -a /etc/hosts
    ```

## Run

```sh
docker compose -f docker-compose.dev.yml up -d
VITE_HMR_PROTOCOL=wss VITE_HMR_HOST=editor.stagistic.local VITE_HMR_CLIENT_PORT=443 moon run web:dev
```

If ports 80/443 are taken (another local proxy), put this in a `.env` next to
`docker-compose.dev.yml` and use `https://editor.stagistic.local:8443` (and
`VITE_HMR_CLIENT_PORT=8443`):

```sh
CADDY_HTTP_PORT=8081
CADDY_HTTPS_PORT=8443
LOCAL_HTTPS_PORT_SUFFIX=:8443
```

The server runs `deno run --watch`, applies identity migrations on start
(`MIGRATE_ON_START=1`) and uses Cloudflare's always-pass Turnstile test secret
(`TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AA` makes it always fail).
Turnstile verification calls Cloudflare, so sign-in needs internet.

## Tests

`moon run identity:test` runs against the local Postgres (`stagistic_test`,
one schema per run) and skips when it is not running.
