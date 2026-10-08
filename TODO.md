# Cloud sync — progress

## Phase 0 — spike (go/no-go)
- [x] `packages/sync-engine` core: codec (JSON ↔ Y), seed, classify, scene diff, replace content, tab sync
- [x] Unit tests for core (node)
- [x] `apps/sync-spike` server: Bun + Hocuspocus + Postgres persistence + metrics
- [x] Deno 2.9.7 + Hono variant measured; runtime switched to Deno + Hono (`docs/sync-spike-results.md`)
- [x] `apps/sync-spike` headless bench clients (50 docs / 100 conns)
- [x] `docker-compose.bench.yml` (postgres:17, server, toxiproxy, S3)
- [x] Browser spike tests: BroadcastChannel, leader handoff, offline merge, classification, replace w/o duplicates, old client + unknown node, UniqueID, projection = Y.Doc
- [x] Run bench, write `docs/sync-spike-results.md`, go/no-go → GO
- [ ] User go/no-go sign-off

## Phase 1 — local Yjs engine: script body
- [x] db: `createScriptBodyProjectionStore` (load + write projection, baseline, timestamp, summary metadata)
- [x] sync-engine: engine (leader) — open/seed once/IDB persistence/BroadcastChannel/projection debounce/flush/replace/delete
- [x] sync-engine: client (tab) — replica, open/flush/release, re-open after leader handoff
- [x] web: start engine in `pglite.worker.ts`, yjs dedupe in Vite
- [x] editor: `document.collaboration` prop (Collaboration instead of History, no setContent)
- [x] editor: appendTransaction plugins ignore remote transactions
- [x] app-routes: collab loader + autosave via flush + summary metadata; restore/delete notify engine
- [x] Schema gate (read-only for newer docs)
- [x] AGENTS.md rules (schemaVersion in meta, seed once, idempotent migrations/plugins)
- [x] Tests: engine/client node, editor collab browser, two-tab browser test

## Phases 2–6 — local only (Postgres, RustFS, Mailpit, Caddy + mkcert `*.stagistic.local`)
- [ ] 2. Metadata + comments in Y docs, duplicate over Y.Doc, drop outbox
- [ ] 3. Identity (Better Auth, Mailpit, Turnstile test keys)
- [ ] 4. Collab server (Hocuspocus + REST)
- [ ] 5. Account + cloud sync in client
- [ ] 6. Attachments to S3 (RustFS)

## Phase 7 — UpCloud (separate, later)
- [ ] Provisioning, deploy (Caddy, systemd, binary), Postmark, prod Turnstile, DNS
- [ ] Tests against UpCloud: RSS/CPU, DB latency, connections, CORS, `pg_dump` restore
