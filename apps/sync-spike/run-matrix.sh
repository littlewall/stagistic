#!/usr/bin/env bash
# Runs the Phase 0 bench matrix; one JSON report per scenario in results/.
set -euo pipefail
cd "$(dirname "$0")/../.."
compose=(docker compose -f docker-compose.bench.yml)
out=apps/sync-spike/results

run() {
    if [[ -n "${ONLY:-}" && "$1" != "$ONLY" ]]; then return; fi
    local name=$1; shift
    echo "== $name ($*)"
    env "$@" "${compose[@]}" up -d --force-recreate server >/dev/null 2>&1
    sleep 3
    env "$@" "${compose[@]}" run --rm bench 2>/dev/null | sed -n '/^{/,$p' > "$out/$name.json"
    "${compose[@]}" exec -T postgres psql -U stagistic -d sync_spike -qc 'truncate ydoc_states, ydoc_updates' >/dev/null
}

"${compose[@]}" up -d postgres toxiproxy s3 >/dev/null 2>&1


run full-db1         PERSISTENCE=full        DB_LATENCY_MS=1
run full-db5         PERSISTENCE=full        DB_LATENCY_MS=5
run incremental-db1  PERSISTENCE=incremental DB_LATENCY_MS=1
run incremental-db5  PERSISTENCE=incremental DB_LATENCY_MS=5
run full-db1-deflate PERSISTENCE=full        DB_LATENCY_MS=1 PER_MESSAGE_DEFLATE=1
run full-db1-512m    PERSISTENCE=full        DB_LATENCY_MS=1 SERVER_MEM=512m

bun build apps/sync-spike/src/server.node.ts --target=node --outfile=apps/sync-spike/dist/server.node.js >/dev/null

# Runtime/image variants (CPU + RAM), all full persistence, DB 1 ms.
run img-bun-debian       PERSISTENCE=full DB_LATENCY_MS=1 SERVER_IMAGE=oven/bun:1.4.2
run img-bun-alpine       PERSISTENCE=full DB_LATENCY_MS=1 SERVER_IMAGE=oven/bun:1.4.2-alpine
run img-bun-alpine-smol  PERSISTENCE=full DB_LATENCY_MS=1 SERVER_IMAGE=oven/bun:1.4.2-alpine "SERVER_CMD=bun --smol apps/sync-spike/src/server.ts"
run img-compiled-musl    PERSISTENCE=full DB_LATENCY_MS=1 SERVER_IMAGE=sync-spike:alpine
run img-compiled-glibc   PERSISTENCE=full DB_LATENCY_MS=1 SERVER_IMAGE=sync-spike:distroless

run node-full-db1    PERSISTENCE=full        DB_LATENCY_MS=1 SERVER_IMAGE=node:24-alpine "SERVER_CMD=node --expose-gc apps/sync-spike/dist/server.node.js"
