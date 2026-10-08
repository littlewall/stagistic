# sync-spike (dočasné, fáze 0)

Měření Yjs + Hocuspocus na Bunu, Node a Denu. Výsledky a rozhodnutí: [docs/sync-spike-results.md](../../docs/sync-spike-results.md).

```sh
docker compose -f docker-compose.bench.yml up -d postgres toxiproxy s3 server
docker compose -f docker-compose.bench.yml run --rm bench          # jeden běh
moon run sync-spike:bench                                          # celá matice → results/
ONLY=full-db1 apps/sync-spike/run-matrix.sh                         # jeden scénář
docker compose -f docker-compose.bench.yml run --rm bench bun apps/sync-spike/src/s3check.ts
SYNC_SPIKE_URL=ws://localhost:1234 moon run sync-engine:test-browser
docker compose -f docker-compose.bench.yml down -v
```

- `src/server.ts` (Bun), `src/server.node.ts` (Node), `src/server.deno.ts` (Deno + Hono) a `src/server.deno-ws.ts` (Deno, `node:http` + `ws` kvůli `permessage-deflate`) sdílí `src/core.ts`.
- Deno: `SERVER_IMAGE=denoland/deno:2.9.7 SERVER_CMD='deno run -A --sloppy-imports --v8-flags=--expose-gc apps/sync-spike/src/server.deno.ts'`. Binárka: `deno bundle --sloppy-imports --platform=deno -o dist/server.deno.bundle.js src/server.deno.ts`, pak `deno compile -A --no-check --output dist/server-deno-linux-arm64 dist/server.deno.bundle.js` (přímý `deno compile` nenajde pnpm peer závislosti), image `docker/Dockerfile.deno-distroless`.
- `PERSISTENCE=full|incremental`, `PER_MESSAGE_DEFLATE=1`, `DB_LATENCY_MS`, `CLIENT_LATENCY_MS`, `DOCS`, `CLIENTS_PER_DOC`, `EDIT_SECONDS`.
- Zkompilovaná binárka: `bun build --compile --minify --target=bun-linux-arm64-musl src/server.ts --outfile dist/server-linux-arm64-musl`, image `docker build -f docker/Dockerfile.alpine -t sync-spike:alpine .` (obdobně `Dockerfile.distroless`), běh `SERVER_IMAGE=sync-spike:alpine`.
- Paměť v čase: `docker compose -f docker-compose.bench.yml run --rm bench bun apps/sync-spike/src/memtest.ts`.
- Smaže se po fázi 4 (collab server).
