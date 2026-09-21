# Stagistic package export format — design

**Date:** 2026-09-18
**Status:** approved design, implementation planned
**Scope:** `.stepkg` format and browser-side package generation only

## 1. Problem

The existing `.stagistic` export is an open, human-readable representation of the script text and
title-page fields. It is intentionally not a complete backup. It does not preserve stable block IDs,
all ProseMirror attributes, editor settings, structured character/music/scene metadata, attachment
bindings, or attachment blobs.

Users need a second export form that represents a complete script. The package must:

- be generated entirely in the browser without a server;
- remain a standard ZIP archive after changing its extension to `.zip`;
- preserve enough information for a future lossless restore;
- remain understandable to other applications without exposing the database schema as the format;
- fail rather than silently produce an incomplete backup;
- return structured diagnostics that a later UI can explain to the user.

This design does not replace the existing `.stagistic` format.

## 2. Decisions

- The package extension is `.stepkg` (`STagistic Editor PacKaGe`).
- The media type is `application/vnd.stagistic.package+zip`.
- The container is a standard ZIP archive, not a custom archive algorithm.
- Package generation runs in the browser. Version one uses a small JavaScript ZIP implementation;
  `fflate` is the preferred implementation unless the implementation spike finds a blocking issue.
- The package contains both a lossless `document.json` and a generated `script.stagistic`.
- Metadata is stored in domain-oriented JSON documents, not database-table dumps or canonical CSV.
- Binary attachments are stored under `assets/`.
- A required manifest identifies the source script directly and describes every other file.
- Any missing required data or attachment aborts the export before download.

## 3. Archive layout

The archive has no enclosing top-level directory. Its root is:

```text
manifest.json
document.json
script.stagistic
data/
  script.json
  title-page.json
  settings.json
  characters.json
  music.json
  scenes.json
  attachments.json
assets/
  <attachment-id>/
    <sanitized-original-file-name>
```

All paths use `/`, are relative to the archive root, and must not contain `..`, empty segments,
backslashes, control characters, or an absolute-path prefix. Asset IDs provide uniqueness; original
file names are preserved only as sanitized display-friendly leaf names.

## 4. Sources of truth

Within a `.stepkg` archive:

- `document.json` is the authoritative lossless editor document.
- `data/*.json` are the authoritative domain metadata.
- Files under `assets/` are the authoritative attachment bytes.
- `script.stagistic` is a generated, open interchange view of the same snapshot. It is not used to
  recover IDs or fields that the text syntax cannot represent.
- `manifest.json` is authoritative for package identity, versions, entry paths, byte lengths,
  media types, and checksums.

`document.json` and `script.stagistic` deliberately duplicate the readable script content for two
different goals. The former guarantees Stagistic fidelity; the latter preserves portability and the
existing text ecosystem. Both are generated from the same immutable export snapshot.

## 5. Manifest

`manifest.json` is UTF-8 JSON with this version-one shape:

```json
{
  "format": "stagistic-package",
  "formatVersion": 1,
  "documentSchemaVersion": 3,
  "createdAt": "2026-09-18T12:00:00.000Z",
  "generator": {
    "name": "Stagistic",
    "version": "0.0.0"
  },
  "script": {
    "id": "script-id",
    "title": "Script title",
    "updatedAt": "2026-09-18T11:30:00.000Z"
  },
  "entrypoints": {
    "document": "document.json",
    "text": "script.stagistic"
  },
  "files": [
    {
      "path": "document.json",
      "mediaType": "application/json",
      "byteLength": 1234,
      "sha256": "lowercase-hex-digest"
    }
  ]
}
```

Rules:

- `format` is the fixed discriminator `stagistic-package`.
- `formatVersion` is an integer. Backwards-compatible optional additions stay within version 1;
  an incompatible change increments it.
- `documentSchemaVersion` is the existing `SCRIPT_DOCUMENT_SCHEMA_VERSION`. It changes only when
  the stored `ScriptDocument` shape or semantics change, under the repository's existing rule.
- `createdAt`, `script.updatedAt`, and domain timestamps use UTC ISO 8601 strings.
- `script.id` is the stable source script ID. A future importer uses it to determine whether restore
  can be offered or whether only creation of a new script is possible.
- `script.title` and `script.updatedAt` allow future import UI to identify the package after reading
  only the manifest. `data/script.json` remains the lossless script-metadata source.
- `manifest.script.id` must equal `data/script.json.id`. A mismatch is an invalid package.
- `files` lists every regular archive entry except `manifest.json`, including domain data and assets.
- `byteLength` is the uncompressed byte length.
- `sha256` is the SHA-256 digest of the uncompressed bytes, encoded as lowercase hexadecimal.
- `manifest.json` does not contain a checksum of itself.

The implementation should keep JSON Schemas for the manifest and domain documents alongside the
format code. Import-time schema use is deferred, but export-time fixtures and validation must make
the external contract explicit.

## 6. Document representations

### `document.json`

This file contains the `ScriptDocument` JSON value without an additional wrapper. It preserves node
IDs, mark attributes, music markers, cue identity, and other editor-document fields exactly as they
exist in the consistent export snapshot. Its schema version lives in the manifest.

The package feature does not change `SCRIPT_DOCUMENT_SCHEMA_VERSION` by itself. Creating a new
container around the existing document shape is not a document-schema change.

### `script.stagistic`

This file is generated through the existing `serializeStagistic` path from the same document and
title-page snapshot. Its bytes are not minified or otherwise rewritten for package export. It uses
UTF-8 and the serializer's canonical LF line endings.

The text representation does not need to reproduce internal IDs because `document.json` carries
them. The standalone `.stagistic` import/export behavior remains unchanged.

## 7. Domain data

The domain files are stable export DTOs. They must not reuse raw Drizzle rows or make database table
names part of the external contract.

### `data/script.json`

Contains the source script ID, title, nullable subtitle, creation timestamp, and update timestamp.
It excludes transient editor position such as `activeBlockId`.

### `data/title-page.json`

Contains the exact stored title-page values, including distinctions that `.stagistic` frontmatter
cannot round-trip, such as automatic versus manually entered draft-date behavior.

### `data/settings.json`

Contains stored script-level overrides grouped by their domain sections. It exports the stored
overrides, not values resolved against current application defaults. This allows a later version of
Stagistic to apply its own defaults where the user did not explicitly choose a value.

### `data/characters.json`

Contains characters, character groups, group memberships, and custom gender options. IDs and stable
character keys are preserved. The file keeps those related concepts together without exposing how
they happen to be represented in database tables.

### `data/music.json`

Contains script music items and their user-authored metadata. Attachment relationships live in
`attachments.json`, so binary ownership has one package-wide source.

### `data/scenes.json`

Contains user-authored scene metadata, locations, and scene-location assignments. Scene records may
reference `headingBlockId` values present in `document.json`. Purely derived act/block projections
are excluded because they can be rebuilt from the document.

### `data/attachments.json`

Contains attachment identity, original file metadata, archive asset path, and typed bindings to
music or future supported targets. Every referenced asset path must appear in `manifest.files` and
must have matching bytes in the archive.

All original domain IDs remain unchanged in the exported package. Deciding whether a future import
preserves them for restore or remaps them for a new copy is explicitly outside this phase.

## 8. Excluded state

The package excludes:

- sync outbox entries and sync transport state;
- caches and indexes;
- document-derived act, block, and character-reference projections;
- active cursor/block and other session-only UI state;
- export preview state;
- application-global preferences that do not belong to the script.

The inclusion rule is user-authored script state plus the identities and relationships required to
interpret it. Rebuildable or operational state is not part of the portable format.

## 9. Encoding and ZIP behavior

- JSON and text entries are UTF-8.
- Generated text uses LF line endings.
- JSON is minified and serialized deterministically: stable property order and stable array order
  where domain order is not itself meaningful.
- JSON and `.stagistic` entries use ZIP DEFLATE compression.
- PDF and other already-compressed binary formats use ZIP STORE.
- ZIP compression is lossless. Compressing `script.stagistic` does not alter its text or line endings;
  extraction returns the original bytes.
- Package generation is asynchronous and must not block the main thread for the full duration of a
  large archive operation.
- Version one may accumulate output chunks into a final browser `Blob`. Direct-to-disk streaming and
  ZIP64 are future optimizations, not requirements for this phase.

## 10. Export architecture

The export path has four boundaries:

```text
repository -> immutable domain snapshot -> package entries -> ZIP Blob -> browser download
```

### Snapshot boundary

Before reading data, the current editor must flush and persist pending changes. The repository then
produces one immutable `ScriptPackageSnapshot` containing the document, domain records, and stable
attachment descriptors. Snapshot creation must provide a consistent view rather than allowing
autosave to change one domain halfway through collection.

The snapshot API is domain-oriented. The package serializer must not query Drizzle tables directly.

### Serialization boundary

A pure serializer converts the snapshot into named byte entries:

1. validate IDs and cross-references;
2. serialize `document.json`;
3. serialize `script.stagistic` through the existing serializer;
4. serialize each domain JSON document;
5. load and validate attachment blobs;
6. calculate byte lengths and SHA-256 digests;
7. produce `manifest.json` last.

The serializer is independent of React and browser download UI. Blob loading and hashing may use
browser-capable adapters, but the format model and validation remain testable as pure TypeScript.

### Archive boundary

The ZIP writer receives complete entries plus their compression policy and returns a `Blob`. It has
no knowledge of repositories, editor state, or React. The downloader is called only after the writer
returns successfully.

## 11. Diagnostics and failure behavior

The export operation returns a discriminated result rather than leaking arbitrary exceptions:

```ts
type StepkgExportResult =
    | {
        ok: true,
        blob: Blob,
        fileName: string,
        manifest: StepkgManifest,
    }
    | {
        ok: false,
        issues: StepkgExportIssue[],
    };
```

Each issue contains a stable code, stage, optional domain entity, optional package path, and safe
structured details. Version one reserves these codes:

- `editor_flush_failed`
- `script_not_found`
- `invalid_snapshot`
- `duplicate_id`
- `broken_reference`
- `asset_blob_missing`
- `asset_read_failed`
- `serialization_failed`
- `archive_creation_failed`

Stages are `flush`, `snapshot`, `validation`, `assets`, `serialization`, and `archive`.

Preflight validation collects all deterministic problems in one pass. For example, multiple missing
PDFs are all reported with attachment ID, original name, and related music identity where available.
Unexpected technical causes may be retained internally for logging, but are not exposed as the
stable public error contract.

Any error aborts the operation. No partial package is offered, no object URL is created, and no
download begins. A package advertised as a complete script must be a trustworthy backup candidate.

## 12. Validation invariants

Before archive creation:

- all required domain files can be serialized;
- IDs are non-empty and unique within their domain;
- every cross-reference resolves;
- every scene heading reference resolves to `document.json`;
- every attachment binding resolves to both an attachment and its target;
- every attachment descriptor resolves to a readable blob;
- attachment byte lengths and hashes can be calculated;
- every package path is safe and unique;
- `manifest.script.id` matches `data/script.json.id`;
- document serialization and `.stagistic` serialization use the same snapshot.

## 13. Testing

The implementation must cover:

- golden archive layout and manifest fixtures;
- deterministic JSON serialization;
- exact byte round-trip of compressed `.stagistic` content;
- `document.json` preservation of IDs and attributes;
- manifest byte lengths and SHA-256 digests;
- domain grouping without raw database-table leakage;
- safe and unique asset paths;
- DEFLATE for text/JSON and STORE for PDFs;
- aggregation of multiple validation issues;
- missing, unreadable, and corrupt attachment failures;
- broken domain-reference failures;
- ZIP-writer failure without download side effects;
- generation in the browser test environment without server APIs.

## 14. Non-goals

This phase does not design or implement:

- the export dropdown, modal, progress treatment, or error presentation;
- `.stepkg` import, restore, merge, replacement, or ID remapping;
- import UI/UX;
- CSV as a canonical package representation;
- encryption, signing, or password protection;
- incremental/delta packages;
- multi-script workspace packages;
- direct-to-disk streaming or server-side generation;
- changes to the standalone `.stagistic` format.

## 15. Follow-on phases

1. Export UX/UI: choose text versus package export, progress, and rendering structured failures.
2. Import system: standalone `.stagistic` import plus `.stepkg` validation, restore eligibility, replace
   versus copy behavior, and complete ID remapping for copies.
3. Import UX/UI: package preview, restore-versus-copy choice, conflicts, progress, and diagnostics.

The future importer first reads `manifest.json`. `manifest.script.id` is what allows it to check for
an existing local script before offering restore. The exact restore policy is intentionally deferred.

## 16. Success criteria

- A complete script can be exported in the browser as `<sanitized-title>.stepkg` without a server.
- Renaming the file to `.zip` exposes the documented directory structure in ordinary ZIP tools.
- The package contains a lossless editor document, open text representation, domain metadata, and
  every referenced attachment.
- The manifest identifies the source script without reading another entry.
- No database implementation detail is required to interpret the package.
- Export never silently omits a referenced asset or relationship.
- Every failure has a stable machine-readable reason and enough safe context for later UI copy.
- The existing standalone `.stagistic` workflow remains unchanged.
