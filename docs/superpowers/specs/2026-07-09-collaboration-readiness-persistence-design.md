# Collaboration-readiness persistence refactor

> Related: [Local-first application state and synchronization](./2026-07-15-local-first-state-sync-design.md)
> defines the complementary relational UI-state path. This document owns the
> active script source and projection architecture; the local-first state
> design owns PGlite-backed reactive metadata collections. They remain separate
> writable state machines.

Date: 2026-07-09
Status: Proposed design, pending implementation plan

## Summary

Prepare the current local-first persistence layer for a future server-backed
collaboration layer without introducing Hocuspocus/Yjs dependencies now.

The intended future architecture is:

```txt
editor document source
  -> document content persistence
  -> projection writer
  -> query/read-model tables
```

Today the document source is the existing PGlite block-table storage. In a later
cloud build, the document source can become Hocuspocus/Yjs binary storage while
the projection writer continues to maintain relational read models such as
blocks, scenes, music, and character references.

This spec is deliberately incremental: no UI rewrite, no schema split for every
table, no realtime transport, and no new production behavior.

## Motivation

Current saves are efficient and well tested, but the persistence API makes
`script_blocks` look like the authoritative document. That is workable for a
single-user local editor, but it is the wrong mental model for CRDT collaboration.

For future Hocuspocus support:

- the script body should have one authoritative document source;
- relational tables should be treated as projections/read models;
- metadata and derived data need clear ownership boundaries;
- projection rebuild must be possible from the authoritative document.

The goal is to create those boundaries now, while the app still behaves exactly
as it does today.

## Non-goals

- Adding Hocuspocus, Yjs, collaboration extensions, or websocket code.
- Replacing the current PGlite save path.
- Physically splitting all hybrid tables immediately.
- Changing editor UI, save timing, export behavior, or local storage format.
- Removing `@tiptap/extension-history` now.

## Existing entry points

- Content repository: `packages/db/src/repo/content.ts`
- Granular projection persistence: `packages/db/src/repo/persist/persistDocumentDelta.ts`
- Repository contract: `packages/db/src/scriptRepository.ts`
- Local repository wiring: `packages/db/src/repo/createLocalPgliteRepository.ts`
- Script load path: `packages/app-routes/src/routes/script/controller/useScriptLoader.ts`
- Script save path: `packages/app-routes/src/routes/script/controller/useScriptSaveHandlers.ts`
- Current persistence notes: `docs/persistence.md`

## 1. Rename the persistence mental model

### Goal

Make the code express that content loading/saving and relational projection are
separate responsibilities, even though today's implementation still uses the
same tables.

### Implementation

Keep public repository methods stable:

```ts
loadLatest(scriptId): Promise<ScriptDocument | null>
saveLatest(scriptId, value): Promise<void>
```

Inside `packages/db/src/repo/content.ts`, split the implementation into named
steps:

```txt
loadLatest
  -> loadDocumentFromCurrentProjection
  -> seedProjectionBaseline

saveLatest
  -> saveDocumentToCurrentSource
  -> updateProjectionFromDocument
  -> record timestamp/outbox
  -> syncToFs
```

At this stage these can be private functions or small modules. The important
change is naming and responsibility separation, not runtime behavior.

### Acceptance criteria

- `ScriptRepository.loadLatest` and `saveLatest` signatures do not change.
- Existing app routes compile without changes beyond imports, if any.
- Existing persistence tests pass unchanged or with rename-only updates.
- `docs/persistence.md` can still describe the same save pipeline.

### Tests

- Existing `persistDocumentDelta.*.test.ts` coverage remains green.
- Add a focused test only if a new public helper is exported.

## 2. Introduce `ScriptDocumentSource`

### Goal

Create a narrow interface for the authoritative script body source. Today's
implementation will still be backed by the current block-table reconstruction
and save path. A future implementation can be backed by Yjs/Hocuspocus storage.

### Contract

Add a source contract in `packages/db/src/repo/content` or a nearby module:

```ts
export interface ScriptDocumentSource {
    load(scriptId: string): Promise<ScriptDocument | null>,
    save(scriptId: string, value: ScriptDocument): Promise<void>,
}
```

Initial implementation:

```ts
createProjectedTableDocumentSource(...)
```

This implementation can internally call the same functions currently used by
`loadLatestFromBlocks` and `createDocumentPersister(...).persist(...)`.

Future implementation, not built now:

```ts
createYjsDocumentSource(...)
```

### Acceptance criteria

- `createContentHandlers` depends on `ScriptDocumentSource` instead of directly
  owning every source-specific detail.
- The default local repository still wires the block-table-backed source.
- No caller outside `packages/db` needs to know which source is used.

### Tests

- Existing repository/content tests still cover the default source.
- Add a small fake-source test for `createContentHandlers` if the refactor makes
  source injection practical.

## 3. Extract projection as an explicit service

### Goal

Make relational projection a named service that can be called by the current
save path now and by a future cloud projection worker later.

### Implementation

Move or wrap the existing projection logic from
`persistDocumentDelta.ts` behind an explicit API:

```ts
export interface ScriptDocumentProjectionWriter {
    updateFromDocument(scriptId: string, document: ScriptDocument): Promise<void>,
    seedBaseline?(scriptId: string, document: ScriptDocument): void,
}
```

Concrete implementation:

```ts
createSqlScriptDocumentProjectionWriter({
    getDb,
    recordOutbox,
    syncDb,
})
```

The existing `createDocumentPersister(scriptId).persist(...)` can remain the
internal engine. Do not rewrite the diff algorithm. The refactor should only
make the role explicit.

### Acceptance criteria

- The save path still performs one transactional projection update and one
  explicit `syncToFs()` flush.
- The projection writer owns updates to:
  - `script_blocks`
  - `script_acts`
  - `script_scenes` projection fields
  - `script_music`
  - `script_block_character_refs`
- Metadata fields are not overwritten by projection writes unless they are
  explicitly projection-owned today.

### Tests

- Existing delta tests remain the primary regression suite.
- Add tests around metadata preservation where the current schema has hybrid
  rows, especially `script_scenes`.

## 4. Add document schema versioning

### Goal

Introduce a stable schema-version concept before collaboration exists. Future
Yjs storage and projection workers need to know which document schema they are
reading and writing.

### Implementation

Add a version constant in `@stagistic/script`, likely near the document model:

```ts
export const SCRIPT_DOCUMENT_SCHEMA_VERSION = 1;
```

Use this version in new source/projection APIs where metadata is returned:

```ts
export interface LoadedScriptDocument {
    document: ScriptDocument,
    schemaVersion: number,
}
```

Do not force all current app callers to consume this immediately if it creates
churn. It is acceptable for `ScriptRepository.loadLatest` to keep returning
`ScriptDocument | null` while lower-level source functions carry the version.

### Acceptance criteria

- The schema version exists in one canonical exported location.
- Import/export or persistence code that writes new document-source metadata can
  reference the same constant.
- No duplicate hard-coded document schema versions appear in the repo.

### Tests

- Add a small unit test or export assertion if this package has an appropriate
  public API test pattern.
- No migration is required for this step.

## 5. Keep editor content separate from metadata

### Goal

Prevent new domain metadata from being added to the collaborative document body
by accident.

### Rule

The script body document should contain edit-content structure and stable block
identity. It should not become the owner of app metadata.

Allowed in `ScriptDocument`:

- block nodes and inline marks;
- stable block ids;
- document-level attributes required by editor/schema behavior.

Prefer SQL/API metadata for:

- title and subtitle;
- title page;
- editor settings;
- confirmed character records;
- character color/gender/outline/notes;
- scene synopsis/color/location;
- production-facing metadata.

### Implementation

Add a short comment or doc section near `ScriptDocument` and the editor settings
helpers explaining the boundary. Keep `stripScriptSettings` as the enforcement
point for current saves.

### Acceptance criteria

- No new feature stores user metadata in `ScriptDocument.attrs` unless a spec
  explicitly justifies it.
- Existing settings/title-page paths remain outside the script body.
- Future metadata specs must state whether a field is document content,
  projection, or metadata.

### Tests

- Existing `stripScriptSettings` tests, if present, should remain green.
- Add a test only when new metadata fields are introduced.

## 6. Mark hybrid table ownership in code

### Goal

Make it clear which columns are projection-owned and which columns are
user-metadata-owned in tables that currently carry both.

### Initial ownership map

`script_scenes`:

| Column | Owner |
|---|---|
| `id` | projection identity, derived from heading block |
| `script_id` | projection |
| `heading_block_id` | projection |
| `scene_number` | projection or future metadata, define before use |
| `color_hex` | metadata |
| `synopsis` | metadata |
| `location_id` | metadata |
| `created_at` / `updated_at` | mixed; projection writer must not erase metadata meaning |

`script_characters`:

| Column | Owner |
|---|---|
| `id` | metadata identity |
| `script_id` | metadata |
| `character_key` | metadata identity, linked to document mentions |
| `color_hex` | metadata |
| `gender_key` | metadata |
| `notes` | metadata |
| `backstory` | metadata |
| `outline` | metadata |

`script_block_character_refs`:

| Column | Owner |
|---|---|
| all columns | projection from current document + confirmed character records |

`script_music`:

| Column | Owner |
|---|---|
| all current columns | projection from current document |

### Implementation

Add comments/types near query or projection code, not necessarily DB comments.
Projection writers should update only projection-owned fields.

Do not physically split tables yet. A later cloud schema may split:

```txt
script_scene_projection
script_scene_metadata
script_character_projection
script_characters
```

### Acceptance criteria

- Projection code documents which fields it may overwrite.
- Scene metadata fields survive projection rebuild/update.
- Character metadata is not treated as derived data.

### Tests

- Add a scene metadata preservation test:
  1. create a scene row with metadata;
  2. save/project a document with the same scene heading block;
  3. assert `synopsis`, `color_hex`, and `location_id` remain intact.
- Keep existing character tests as metadata-authority tests.

## 7. Add a projection rebuild API

### Goal

Provide the operation a future cloud worker will need: rebuild all relational
read models for one script from the authoritative document.

### Contract

Add an internal DB-layer API:

```ts
export interface RebuildScriptProjectionArgs {
    scriptId: string,
    document: ScriptDocument,
}

export const rebuildScriptProjection = async (
    args: RebuildScriptProjectionArgs,
): Promise<void> => {
    // implementation
};
```

The operation must be safe to run repeatedly. It should either:

- use the existing full structural reconciliation path with an empty baseline; or
- explicitly delete/recreate projection-owned rows in one transaction while
  preserving metadata-owned rows/columns.

For the first implementation, prefer reusing the existing persister full
reconciliation path. Avoid inventing a second block extraction algorithm.

### Acceptance criteria

- Running rebuild from the current document produces the same effective blocks,
  scenes, acts, music, and refs as normal saves.
- Rebuild does not delete metadata-owned rows/columns.
- Rebuild is transactionally safe.
- Rebuild can be called without an editor instance.

### Tests

- Rebuild from an empty projection creates blocks/scenes/acts/music/refs.
- Rebuild after stale projection rows removes obsolete projection-owned rows.
- Rebuild preserves scene metadata.
- Rebuild produces a document that can round-trip through
  `rebuildScriptDocumentFromBlocks`.

## Rollout order

1. Add schema version constant.
2. Add comments/ownership docs for content vs metadata.
3. Extract `ScriptDocumentSource` without changing behavior.
4. Extract projection writer wrapper around the existing persister.
5. Add metadata preservation tests for hybrid projection updates.
6. Add projection rebuild API.
7. Update `docs/persistence.md` to describe source vs projection terminology.

This order keeps behavior stable and lets each step compile independently.

## Future Hocuspocus insertion point

When the server-backed collaboration work starts, the intended replacement is:

```txt
current block-table ScriptDocumentSource
  -> future Yjs/Hocuspocus ScriptDocumentSource
```

The projection writer should stay in place. A future server flow can be:

```txt
Hocuspocus onStoreDocument
  -> save Yjs binary state
  -> enqueue projection rebuild/update
  -> projection worker materializes SQL read models
```

The editor and app routes should not need to know whether the document source is
local block tables or cloud Yjs storage.
