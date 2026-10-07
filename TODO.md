# Cloud sync — progress

## Phase 0 — spike (go/no-go)
- [x] `packages/sync-engine` core: codec (JSON ↔ Y), seed, classify, scene diff, replace content, tab sync
- [x] Unit tests for core (node)
- [x] `apps/sync-spike` server: Bun + Hocuspocus + Postgres persistence + metrics
- [x] `apps/sync-spike` headless bench clients (50 docs / 100 conns)
- [x] `docker-compose.bench.yml` (postgres:17, server, toxiproxy, S3)
- [x] Browser spike tests: BroadcastChannel, leader handoff, offline merge, classification, replace w/o duplicates, old client + unknown node, UniqueID, projection = Y.Doc
- [x] Run bench, write `docs/sync-spike-results.md`, go/no-go → GO
- [ ] User go/no-go sign-off

## Phase 1 — local Yjs engine: script body
- [ ] Engine start in `pglite.worker.ts`, `ScriptDocumentSource` over Y.Doc
- [ ] Editor: `Collaboration` instead of `History`, yjs dedupe in Vite
- [ ] appendTransaction plugins ignore remote transactions (5 plugins)
- [ ] Seed-once migration, schema gate, AGENTS.md rule
