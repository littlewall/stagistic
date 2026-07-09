# Local persistence: how saves work and why they are fast

The editor persists scripts locally into PGlite (Postgres compiled to
WASM) running in a Web Worker, with IndexedDB as the storage backend
(`idb://stagistic-main`). There is no network round-trip; the entire
cost of a save is CPU + IndexedDB I/O. This doc explains the pipeline,
the ordering strategy, the durability model, and the performance
invariants that keep a save under the "saving" indicator threshold
(600 ms, `useSaveIndicator.ts`).

Terminology:

- **Document source**: the authoritative script body source exposed through
  `ScriptDocumentSource`. Today this is still backed by the local block-table
  projection; a future server build can replace it with Yjs/Hocuspocus storage.
- **Projection**: relational read models (`script_blocks`, `script_scenes`,
  `script_cues`, character refs) materialized from the script document for fast
  local queries, sidebars, export, and future production surfaces.

The current local source and projection share the same PGlite tables, but the
code treats them as separate responsibilities so the source can change later
without rewriting the projection writer.

## Save pipeline

```
editor change → autosave → saveLatest (packages/db/src/repo/content.ts)
  → ScriptDocumentSource.save()
  → ScriptDocumentProjectionWriter.updateFromDocument()
  → createDocumentPersister(scriptId).persist(db, document, afterPersist)
      → extractScriptBlocks()        walk the doc, assign sequential orderNo
      → diffExtractedBlocks()        inserted / updated / deleted / structural
      → ONE transaction:
          Case A   content-only edits → per-block field UPDATEs
          Case B-fast  pure reorder   → order keys for moved blocks + refs
          Case B   insert/delete/heading edit → full reconciliation (bulk)
          afterPersist               script timestamp + sync outbox
  → syncToFs()                       flush PGlite WAL to IndexedDB
```

Key properties:

- **One transaction per save.** The block delta, the script timestamp,
  and the outbox record commit together (`persist` takes an
  `afterPersist` callback). No second COMMIT.
- **Serialized persister queue.** Concurrent `persist` calls chain; a
  later call always sees the baseline left by the previous one. This is
  what makes the diff-based approach race-free.
- **Diff baseline.** The persister keeps the last-saved extracted
  blocks *and* their persisted `block_order` keys in memory.
  `loadLatest` seeds both from the database so the first save after
  load is already minimal.

## Block ordering: fractional indexing with minimal re-keying

`script_blocks.block_order` is a lexicographic fractional-index string
(the `fractional-indexing` library), not an integer position. Ordering
is `ORDER BY block_order`; there is deliberately **no unique constraint**
on it (migrations 0004/0005) because Postgres checks uniqueness
row-by-row inside a single UPDATE, so key swaps would always trip a
spurious violation.

On a structural save, `computeOrderKeyAssignments`
(`packages/db/src/repo/persist/minimalOrderKeys.ts`) computes the
longest increasing subsequence of existing keys in the new document
order. LIS members keep their keys; only the blocks off the LIS
(moved or inserted) get fresh keys generated between the stable
anchors. **A scene move of M blocks therefore writes M rows, not N** —
and shrinks the dirty-page set that `syncToFs()` must flush.

Full re-key (evenly spaced keys for every block, one bulk
`UPDATE … FROM (VALUES …)`) remains the fallback when no usable
baseline exists: empty baseline, duplicate keys in legacy data, or
fractional-indexing precision exhaustion. The fallback also bounds
key-length growth over time.

## Persist cases

`diffExtractedBlocks` marks a save **structural** when any block's
`orderNo` changed, a block was inserted/deleted, or a scene/act heading
block was edited.

- **Case A — content-only.** Only blocks whose non-order fields
  actually changed get UPDATEs; refs rewritten only where they differ.
- **Case B-fast — pure reorder.** Condition: structural, but no
  inserts, no deletes, no non-order field changes. Scene/act ids derive
  deterministically from heading block ids and block→scene/act
  membership moves with the blocks, so the `script_scenes` /
  `script_acts` tables *cannot* have changed — reconciliation is
  skipped entirely. Writes: order keys for moved blocks (+ refs if
  changed). This is the scene drag-and-drop path.
- **Case B — full structural.** Acts and scenes reconciled with **bulk**
  upserts/deletes (`bulkUpsertScriptScenes`, `bulkDeleteScriptActs`, …),
  blocks bulk-inserted with ON CONFLICT safety nets, character refs
  rewritten via one DELETE + batched INSERTs
  (`bulkReplaceScriptBlockCharacterRefs`). Never per-row loops — each
  worker round-trip has fixed overhead.

## Durability model

PGlite with the IndexedDB VFS normally awaits a flush to IndexedDB
**after every query**. That is catastrophic for multi-statement saves,
so both PGlite instances run with `relaxedDurability: true`:

- worker: `apps/web/src/db/pglite.worker.ts` (the path the web app uses;
  `PGliteWorker.create` forwards the option from
  `packages/db/src/pglite/bootstrap.ts`),
- main-thread fallback: `packages/db/src/pglite/bootstrap.ts`.

Durability is instead explicit: `saveLatest` awaits `syncToFs()` after
the transaction commits. Without that call the WAL stays in worker
memory and dies with the page. Consequence: mutations that do *not* go
through `saveLatest` (character metadata handlers, configs, …) become
durable on PGlite's own scheduled flush or on the next content save —
acceptable trade-off, revisit if a durability-critical standalone
mutation appears.

`syncToFs()` cost is proportional to dirty pages, which is why minimal
re-keying matters beyond the UPDATE itself.

## Performance invariants (keep these when touching the persist path)

1. No per-row query loops inside `persistImpl` — batch or bulk
   everything; each PGlite worker round-trip has fixed overhead.
2. A pure scene reorder must not touch `script_scenes` / `script_acts`
   rows, and must rewrite only the moved blocks' `block_order`.
3. One transaction per save; `afterPersist` rides in it.
4. Never remove the explicit `syncToFs()` in `saveLatest`, and never
   remove `relaxedDurability` without removing the per-statement-flush
   assumption above.
5. OPFS AHP would be a faster VFS than IndexedDB, but PGlite's OPFS
   support is not usable in Safari — do not switch until that changes.

## Measuring saves

Opt-in timing spans exist in `saveLatest`:

```js
localStorage.setItem('stagistic:perf', '1');
```

Each save then logs `persist Xms, syncToFs Yms, total Zms` via
`console.debug`. The "saving" indicator appears only when a save
exceeds 600 ms — a scene move on a feature-length script should stay
well under that (typically tens of ms; if `syncToFs` dominates again,
the contingency is moving the flush off the awaited path with a
coalescing scheduler + `pagehide` flush).

Regression coverage: `persistDocumentDelta.test.ts` (fast path leaves
scene rows untouched, insert-between-anchors keeps neighbor keys,
full-re-key fallback) and `persistDocumentDelta.scale.test.ts` (scene
move in a ~400-block script re-keys only the moved scene, < 1 s budget).
