# Stagistic package import (create new script) — design

**Date:** 2026-09-18
**Status:** approved design, implementation planned
**Scope:** `.stepkg` reader, validation, and the "import as a new script" branch only

## 1. Problem

The `.stepkg` export path is complete: the app can produce a validated package containing a lossless
editor document, an open `script.stagistic` text view, domain metadata, and every referenced
attachment. Nothing yet consumes a `.stepkg` package.

This phase adds the import logic and functions — no UI/UX. It covers the first of two import branches:

- **import as a new script** (this phase): always create an independent copy with fresh identities;
- **import to recover an existing script** (later phase): reuse the package identities and replace or
  restore the matching local script.

Both branches share reading, validation, and format-to-database mapping. This phase builds those
shared pieces plus everything unique to creating a new script. It deliberately leaves the recover
branch and all UI out of scope, while keeping the shared boundaries clean so recover can reuse them.

## 2. Decisions

- Import reading and validation live in `@stagistic/stepkg`, symmetric with the export writer.
- Reading uses `fflate`'s `unzip` (the writer already uses `fflate.zip`).
- Validation is strict and fail-fast: a package is either fully trustworthy or it is rejected with
  structured diagnostics. No partial script is ever written.
- The "new script" branch remaps every domain identity to a fresh UUID and preserves internal block
  IDs. It never reuses the package's `script.id`.
- Database writes go through one new transactional repository method, `createScriptFromPackage`,
  so an import is atomic: either the whole script materializes or nothing does.
- `@stagistic/db` stays independent of the `.stepkg` format. The write method accepts a db-native
  input type; `@stagistic/app-core` bridges the format snapshot to that type, mirroring the existing
  export mapper direction.
- Import returns a discriminated result mirroring `StepkgExportResult`.

## 3. Architecture

Import mirrors the four export boundaries in reverse:

```text
package bytes -> parsed & validated package -> remapped snapshot -> db write input -> new script
```

Three layers, matching the export layering:

1. `@stagistic/stepkg` — reader, validator, and pure ID remapping (format-aware, framework-free).
2. `@stagistic/db` — one transactional `createScriptFromPackage` write method (format-unaware).
3. `@stagistic/app-core` — orchestration: read → remap → map to db input → write → structured result.

### Why these boundaries

- The reader belongs with the writer: both understand the archive layout, the manifest, the JSON
  schemas, and `fflate`. Keeping them together keeps the external format contract in one package.
- ID remapping is a pure transform on the format snapshot, independent of the database. Placing it in
  `@stagistic/stepkg` lets the future recover branch skip it without touching the database layer.
- The database must not learn the file format. As with export, `@stagistic/app-core` owns the mapper
  between the format snapshot and the db-native shape.

## 4. Reader — `@stagistic/stepkg`

### `readStepkg(bytes: Uint8Array): Promise<StepkgReadResult>`

```ts
type StepkgReadResult =
    | {ok: true; package: StepkgPackage}
    | {ok: false; issues: StepkgImportIssue[]};

interface StepkgPackage {
    manifest: StepkgManifest;
    snapshot: StepkgSnapshot;              // the export snapshot shape, reconstructed from files
    assets: Map<string, Uint8Array>;       // archive asset path -> uncompressed bytes
}
```

`readStepkg` performs, in order, collecting all deterministic problems in each stage before deciding:

1. **unzip** — decode the ZIP with `fflate.unzip`. A non-ZIP or corrupt container yields `not_a_zip`.
2. **manifest** — `manifest.json` must be present, parseable, and valid against `manifest.v1.schema.json`.
   `format` must equal `stagistic-package`; `formatVersion` must equal `1`, otherwise
   `unsupported_format_version`. `documentSchemaVersion` greater than the current
   `SCRIPT_DOCUMENT_SCHEMA_VERSION` yields `unsupported_document_schema_version`.
3. **files present** — every `manifest.files[].path` must exist in the archive; a missing entry yields
   `file_missing`. Archive entries not listed in the manifest (other than `manifest.json`) are ignored,
   not errors, to allow forward-compatible additive files.
4. **checksum** — for every manifest file, the SHA-256 of its uncompressed bytes must equal the
   recorded `sha256`; a mismatch yields `checksum_mismatch`. Byte lengths must also match.
5. **schema** — each `data/*.json` document must validate against its versioned JSON schema. A failure
   yields `schema_invalid` with the offending path.
6. **cross-references** — validate the same invariants the exporter guarantees (section 6 below).
7. **reconstruct** — assemble a `StepkgSnapshot` from the validated files and an `assets` map keyed by
   archive asset path. `document.json` is used verbatim for `snapshot.document`; `script.stagistic` is
   ignored on import because `document.json` is authoritative (per the format's source-of-truth rules).

Any issue in any stage means `ok: false` with the aggregated issues; no package is returned.

### `remapStepkgIds(snapshot: StepkgSnapshot): {snapshot: StepkgSnapshot; idMap: StepkgIdMap}`

Pure function used only by the new-script branch. It exists because every domain identity is a
global primary key: re-importing a package while its source (or a prior import) still exists would
collide. A fresh copy therefore needs fresh identities everywhere they are referenced.

- Generates a fresh UUID (via an injected `newId` allocator, defaulting to the shared `uuidv7`, for
  test determinism) for every remappable domain identity: script, characters, character groups,
  gender options, music items, locations, and attachments.
- Rewrites every domain cross-reference through the id map: group `memberIds`, music attachment
  bindings (`attachmentId`, `target.id`), and scene `locationIds`.
- **Rewrites the domain IDs that the document embeds.** `document.json` carries `characterRefs`
  (a `characterKey → characterId` map on nodes) and music markers (`musicId` attrs). These are
  rewritten through the character and music id maps so the document stays consistent with the
  remapped domain rows.
- **Preserves all structural block/node IDs unchanged** — node IDs and the `headingBlockId`,
  `startBlockId`, and `endBlockId` references. Block IDs are scoped to the new script and cannot
  collide, and preserving them keeps the document-derived scene/act/music projection valid.
- **Does not remap scene IDs.** Scene rows are projection-owned (derived from document heading
  blocks on write); the new-script write resolves scenes by `headingBlockId`, so the package scene
  IDs are never persisted. `remapStepkgIds` leaves them as-is; the id map records no scene entries.
- Returns the remapped snapshot plus the `idMap` for tests and diagnostics.

## 5. Database write — `@stagistic/db`

### `createScriptFromPackage(input: ScriptPackageWrite): Promise<void>`

A db-native input type mirrors `ScriptPackageSource` for writing, carrying attachment blobs instead
of storage keys:

```ts
interface ScriptPackageWrite {
    script: {id: string; title: string; subtitle: string | null; createdAt: number; updatedAt: number};
    document: ScriptDocument;
    titlePage: TitlePageSettings;
    settings: EditorSettingsOverride;
    characters: ScriptCharacterWrite[];
    characterGroups: ScriptCharacterGroupWrite[];        // includes memberIds
    characterGenders: ScriptCharacterGenderWrite[];
    music: ScriptMusicWrite[];
    locations: ScriptLocationWrite[];
    scenes: ScriptSceneWrite[];                          // includes locationIds
    attachments: ScriptAttachmentWrite[];               // each carries its Blob
    musicAttachmentBindings: ScriptMusicAttachmentBindingWrite[];
}
```

Behavior, following the established attachment-write convention:

1. Save every attachment blob to `fileStorage` **before** the transaction, collecting the new storage
   keys. This matches `attachments.ts`, where blobs are written outside the DB transaction.
2. Open **one** DB transaction and write in a **projection-aware order**, because the document write
   derives blocks, scenes, and acts and validates block↔character references against existing
   character rows:
   1. insert the script row and subtitle;
   2. insert gender options, characters, character groups, and group memberships — **before** the
      document, so the migration keeps the document's character references;
   3. insert locations;
   4. insert music rows (the document-derivation path does not persist music, so import inserts it);
   5. run `migrateScriptDocumentToBlocks` (`force: true`) to persist the document and create blocks,
      scenes, acts, and character refs; this path also handles a lower `documentSchemaVersion`;
   6. patch each package scene's user metadata (`colorHex`, `synopsis`) onto the projected scene row
      matched by `headingBlockId`, via `updateScriptSceneMetadata`; package scenes without a
      `headingBlockId` cannot attach and are dropped (the document is authoritative for scene
      existence);
   7. write scene-location assignments with `replaceScriptSceneLocations`, keyed by `headingBlockId`;
   8. write the title page and settings **after** the document, so package values win over any
      `importMeta` the migration may have applied;
   9. insert attachments (with the new storage keys) and music attachment bindings;
   10. record a `script.import` outbox entry.
3. Call `syncToFs` after the transaction commits, as other mutating handlers do.
4. On any failure, the transaction rolls back and every blob saved in step 1 is deleted
   (compensating cleanup), mirroring the existing uncommitted-blob cleanup.

New low-level insert queries are added where the current code lacks them (characters, character
group members, gender options, locations). Music, attachments, bindings, scene metadata, and
scene-locations reuse existing queries (`insertScriptMusic`, `insertAttachment`,
`insertMusicAttachmentLink`, `updateScriptSceneMetadata`, `replaceScriptSceneLocations`); title page
and settings reuse tx-level writers extracted from the existing handlers. All reuse the existing
Drizzle table definitions.

`@stagistic/db` gains no dependency on `@stagistic/stepkg`. `ScriptPackageWrite` and its member types
are defined in the db package.

## 6. Validation invariants (reader)

Before a package is accepted:

- the container is a valid ZIP;
- `manifest.json` is present, parseable, and schema-valid;
- `format` is `stagistic-package` and `formatVersion` is `1`;
- `documentSchemaVersion` is not greater than the current `SCRIPT_DOCUMENT_SCHEMA_VERSION`;
- every `manifest.files` entry exists, with matching byte length and SHA-256;
- every `data/*.json` validates against its versioned schema;
- `manifest.script.id` equals `data/script.json.id`;
- all domain IDs are non-empty and unique within their domain;
- every cross-reference resolves: group members to characters, scene locations to locations, music
  bindings to both a music item and an attachment;
- every scene `headingBlockId`, and every music `startBlockId` / `endBlockId`, resolves to a node in
  `document.json`;
- every attachment `assetPath` is listed in `manifest.files` and has matching bytes in `assets/`.

These mirror the exporter's guarantees (export design §12) so a package the app produced always
imports, and a tampered or foreign package fails with a precise reason.

## 7. Diagnostics and failure behavior

```ts
type StepkgImportResult =
    | {ok: true; scriptId: string; title: string}
    | {ok: false; issues: StepkgImportIssue[]};

interface StepkgImportIssue {
    code: StepkgImportIssueCode;
    stage: StepkgImportStage;
    path?: string;                                   // offending archive path, when applicable
    entity?: {type: 'script' | 'character' | 'music' | 'scene' | 'attachment'; id: string; label?: string};
    details?: Record<string, string | number>;
}

type StepkgImportStage = 'read' | 'manifest' | 'checksum' | 'schema' | 'validation' | 'assets' | 'write';

type StepkgImportIssueCode =
    | 'not_a_zip'
    | 'manifest_invalid'
    | 'unsupported_format_version'
    | 'unsupported_document_schema_version'
    | 'file_missing'
    | 'checksum_mismatch'
    | 'schema_invalid'
    | 'broken_reference'
    | 'asset_missing'
    | 'write_failed';
```

Each code maps to one stage: `not_a_zip` → `read`; `manifest_invalid`, `unsupported_format_version`,
`unsupported_document_schema_version` → `manifest`; `file_missing`, `checksum_mismatch` → `checksum`;
`schema_invalid` → `schema`; `broken_reference` → `validation`; `asset_missing` → `assets`;
`write_failed` → `write`.

- Deterministic problems are aggregated: multiple checksum mismatches, schema failures, or broken
  references are all reported in one pass, each with a stable code, stage, and safe context.
- Any issue aborts the import. No script row, no attachment blob, and no outbox entry survive a
  failed import.
- Unexpected technical causes may be logged internally but are surfaced only as the stable public
  contract above (for example, an unexpected write error becomes `write_failed` at stage `write`).

## 8. Orchestration — `@stagistic/app-core`

### `importScriptPackageAsNew(args): Promise<StepkgImportResult>`

```ts
interface ImportScriptPackageAsNewArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
    title?: string;                                   // optional override; falls back to package title
}
```

Steps:

1. `readStepkg(bytes)` — on `ok: false`, return the issues unchanged.
2. `remapStepkgIds(package.snapshot)` — fresh identities, preserved block IDs.
3. Map the remapped `StepkgSnapshot` plus the `assets` map to `ScriptPackageWrite` (the inverse of
   `mapScriptPackageSourceToStepkg`), resolving each attachment's bytes to a `Blob`, converting ISO
   timestamps back to epoch milliseconds, and applying the optional `title` override with the same
   `trimOrFallback` semantics as the `.stagistic` import.
4. `repository.createScriptFromPackage(input)` — on throw, return `write_failed` at stage `write`.
5. Return `{ok: true, scriptId, title}`.

The orchestrator does not read files from disk or touch React; a caller supplies the package bytes.
This keeps it testable in the browser test environment without server APIs.

## 9. Reuse by the future recover branch

The recover branch (later phase) reuses without change:

- `readStepkg` and all validation;
- the format-to-db mapper and `ScriptPackageWrite`;
- most of `createScriptFromPackage`'s row-insert logic.

It differs only in two seams left clean here:

- identity handling — recover keeps the package IDs (and matches on `manifest.script.id`) instead of
  calling `remapStepkgIds`;
- write mode — recover replaces or restores the existing script rather than inserting a fresh one.

No recover-specific code is written in this phase.

## 10. Testing

- `readStepkg` round-trips a real exporter output: a freshly created `.stepkg` imports to an
  equivalent snapshot.
- Each validation failure has a focused test: non-ZIP, missing/invalid manifest, wrong
  `formatVersion`, too-new `documentSchemaVersion`, missing manifest file, checksum mismatch, schema
  violation, broken cross-reference (group member, scene location, music binding), unresolved block
  reference, and missing asset bytes.
- Aggregation: multiple simultaneous problems are all reported in one result.
- `remapStepkgIds`: every domain ID changes, all cross-references stay consistent, block IDs and the
  document body are unchanged.
- `createScriptFromPackage`: full round-trip against a PGlite database — export a script, import it as
  new, and assert the new script's `getScriptPackageSource` matches the original except for remapped
  IDs and attachment storage keys; blobs are retrievable; a forced mid-transaction failure leaves no
  rows and no orphaned blobs.
- `importScriptPackageAsNew`: happy path returns a new `scriptId`; a corrupt package returns issues
  and writes nothing; the `title` override and package-title fallback both work.
- All new tests run in the existing browser/node test environments without server APIs.

## 11. Non-goals

This phase does not design or implement:

- any import UI/UX (file picker, preview, progress, conflict or error presentation);
- the recover-existing-script branch (identity reuse, replace/restore, conflict resolution);
- standalone `.stagistic` import changes (that path already exists and is untouched);
- provenance tracking of the original `script.id` on the new copy (no schema change);
- merging packages, multi-script packages, or partial/selective import;
- encryption, signing, or password-protected packages;
- changes to the `.stepkg` format or the export path.

## 12. Success criteria

- A `.stepkg` package produced by the current exporter imports as a new, independent script entirely
  in the browser, with a fresh identity and no collision with existing local scripts.
- The imported script reproduces the document (including block IDs), title page, settings, characters,
  groups, genders, music, locations, scenes, and every attachment blob.
- A tampered, truncated, foreign, or future-version package is rejected with aggregated,
  machine-readable diagnostics and writes nothing.
- Import is atomic: no partial script and no orphaned blob can result from a failure.
- `@stagistic/db` remains free of any `.stepkg` format knowledge.
- The reader, validator, and mapper are structured so the future recover branch reuses them unchanged.
