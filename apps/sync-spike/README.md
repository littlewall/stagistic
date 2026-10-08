# sync-spike (dočasné, fáze 0)

Měření Yjs + Hocuspocus na Bunu. Výsledky a rozhodnutí: [docs/sync-spike-results.md](../../docs/sync-spike-results.md).

```sh
docker compose -f docker-compose.bench.yml up -d postgres toxiproxy s3 server
docker compose -f docker-compose.bench.yml run --rm bench          # jeden běh
moon run sync-spike:bench                                          # celá matice → results/
ONLY=full-db1 apps/sync-spike/run-matrix.sh                         # jeden scénář
docker compose -f docker-compose.bench.yml run --rm bench bun apps/sync-spike/src/s3check.ts
SYNC_SPIKE_URL=ws://localhost:1234 moon run sync-engine:test-browser
docker compose -f docker-compose.bench.yml down -v
```

- `src/server.ts` (Bun) a `src/server.node.ts` (Node, srovnání) sdílí `src/core.ts`.
- `PERSISTENCE=full|incremental`, `PER_MESSAGE_DEFLATE=1`, `DB_LATENCY_MS`, `CLIENT_LATENCY_MS`, `DOCS`, `CLIENTS_PER_DOC`, `EDIT_SECONDS`.
- Zkompilovaná binárka: `bun build --compile --minify --target=bun-linux-arm64-musl src/server.ts --outfile dist/server-linux-arm64-musl`, image `docker build -f docker/Dockerfile.alpine -t sync-spike:alpine .` (obdobně `Dockerfile.distroless`), běh `SERVER_IMAGE=sync-spike:alpine`.
- Paměť v čase: `docker compose -f docker-compose.bench.yml run --rm bench bun apps/sync-spike/src/memtest.ts`.
- Smaže se po fázi 4 (collab server).
