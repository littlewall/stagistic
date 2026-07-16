# Metadata synchronization provider evaluation

**Date:** 2026-07-16  
**Status:** Research complete; no provider selected; production sync disabled

## Decision boundary

This evaluation covers relational metadata only. The active script body still
requires a separate Yjs/Hocuspocus-compatible document collaboration design.
PGlite remains the durable local authority and the existing repository,
reactive-source, and TanStack DB layers remain unchanged.

## Options

| Criterion | Electric + PGlite | PowerSync | Custom API + outbox |
| --- | --- | --- | --- |
| Bidirectional writes | Electric Sync is read-path sync; write-path transport remains application-owned. The PGlite sync extension is alpha and currently inbound-only. | Local SQLite writes enter a managed upload queue; the application backend applies them to the source database. | Supported by an application-owned outbound batch API and inbound checkpoint feed. |
| Conflict handling | Application-owned for current write patterns. The PGlite extension does not provide outbound conflicts. | Server-authoritative; default behavior is effectively last-write-wins, with custom backend conflict handling available. | Fully application-owned; use operation-ID deduplication plus explicit per-domain revision/rebase policies. |
| PGlite compatibility | Native for inbound shapes and aligned with the current local database. | No direct compatibility: the web SDK owns a SQLite database, so adoption would replace PGlite or introduce two local authorities. | Native: domain rows, outbox, inbound application, and reactive confirmation stay in one PGlite database. |
| Transaction acknowledgement | Multi-shape inbound application can be transactional. Write acknowledgement must be designed separately. | FIFO uploads and server checkpoints provide acknowledgement semantics, but the backend must apply writes synchronously before acknowledging. | Operation IDs, batch acknowledgements, and inbound cursors must be implemented and persisted explicitly. |
| Browser support | PGlite already runs in the production worker. IndexedDB remains the cross-browser persistence choice; PGlite OPFS AHP is unavailable in Safari. | Web SDK supports worker-backed SQLite with IndexedDB/OPFS variants, each with documented browser and multi-tab trade-offs. | Uses the existing PGlite worker plus standard HTTP/WebSocket APIs; no second browser database runtime. |
| Operational cost | Electric Cloud charges for writes and retention; reads, egress, and fan-out are free. A custom write API is still required. | Requires PowerSync service/self-hosting plus an application write endpoint and source database CDC. | Lowest vendor coupling, but highest engineering and on-call ownership for auth, retries, checkpoints, conflicts, and observability. |

## Spike evidence

The narrow spike lives on branch `spike/sync-provider-evaluation`, commit
`87b39167`. It does not touch the production worktree or enable the outbox.

It proves two properties against PGlite:

1. A domain write and outbox operation can commit locally before transport.
2. If the server commits but its acknowledgement is lost, retrying the stable
   operation ID is idempotent; a compare-and-set revision rejects stale writes
   until the client explicitly rebases.

The focused command passes two tests:

```sh
pnpm --filter @stagistic/db test -- customOutbox.spike.test.ts
```

## Result

The custom API/outbox path is the best architectural fit to investigate next:
it preserves PGlite as the single durable local authority and matches the
already-defined mutation envelopes and replication port. This is not a
production provider selection. The spike does not establish authentication,
authorization, durable inbound deduplication, schema negotiation, per-domain
conflict UX, or operational viability.

PowerSync is not rejected as a product; it is a poor incremental fit while
PGlite is the committed local database because its web SDK owns SQLite.
Electric remains a strong possible inbound/read-path component, but its current
write path is explicitly application-owned and the PGlite sync extension does
not yet supply outbound replication or conflict resolution.

Do not enable sync until the accompanying implementation plan has a reviewed
backend contract, durable inbox/checkpoint design, and per-domain conflict
semantics.

## Primary sources

- [Electric write patterns](https://electric.ax/docs/sync/guides/writes)
- [PGlite Electric sync extension](https://pglite.dev/docs/sync)
- [PGlite browser filesystem support](https://pglite.dev/docs/filesystems)
- [Electric Cloud pricing](https://electric.ax/pricing)
- [PowerSync JavaScript Web SDK](https://docs.powersync.com/client-sdks/reference/javascript-web)
- [PowerSync writing client changes](https://docs.powersync.com/handling-writes/writing-client-changes)
- [PowerSync update conflicts](https://docs.powersync.com/handling-writes/handling-update-conflicts)
- [PowerSync consistency](https://docs.powersync.com/architecture/consistency)
