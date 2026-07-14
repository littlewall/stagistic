# Cue PDF Attachments — Design

**Date:** 2026-07-14
**Status:** Approved (design), ready for planning

## Goal

Allow uploading PDF files to cues in the Attribute Manager. The app is
browser-only (no backend), so files are stored locally. Binaries live in
IndexedDB; PostgreSQL/PGlite holds only metadata and relationships.

## Scope (MVP)

- N PDFs per cue (list of attachments).
- Inline preview in a modal, rendered with `pdfjs-dist` (already a dependency).
- Files stay **local to this browser** — `.stagistic` export remains text-only.
  Attachment metadata lives in PGlite, not in the `ScriptDocument`, so an
  imported `.stagistic` simply has no attachments (nothing references them);
  there is no cross-import placeholder.
- No cloud/S3 sync yet (the storage abstraction leaves room for it later).

Non-goals: bundling files into `.stagistic`, cross-device sync, non-PDF file
types, attachments on entities other than cues (schema leaves room; no UI).

## Architecture

Three layers, following existing repo dependency-injection patterns.

### 1. File storage abstraction

```ts
interface FileStorage {
    save(blob: Blob): Promise<string>;   // returns storageKey
    get(key: string): Promise<Blob | null>;
    delete(key: string): Promise<void>;
}
```

- `IndexedDbFileStorage` implementation lives in `apps/web` (browser concern).
  Object store `files`, `keyPath: 'id'`, value `{ id, blob }`.
- Injected into `createLocalPgliteRepository` the same way `getLocalDb` and
  `syncToFs` are today. Keeps `packages/db` free of IndexedDB, swappable for a
  future `S3FileStorage`, and testable via an in-memory implementation.
- On first upload, call `navigator.storage.persist()` (best-effort; ignore
  result).

### 2. Database (`packages/db`) — metadata only, no binaries

Two tables (attachments kept separate from their binding, so future entities
reuse the same file records via new join tables).

**`script_attachments`** — file record, no entity binding:
- `id` (text, PK)
- `script_id` (text, FK → scripts.id, ON DELETE CASCADE)
- `filename` (text)
- `mime_type` (text)
- `size_bytes` (bigint)
- `storage_key` (text) — key into `FileStorage`/IndexedDB
- `created_at` (bigint)
- `updated_at` (bigint)
- Index on `script_id`.

**`script_cue_attachments`** — join only:
- `cue_id` (text, FK → script_cues.id, ON DELETE CASCADE)
- `attachment_id` (text, FK → script_attachments.id, ON DELETE CASCADE)
- `sort_order` (integer)
- `created_at` (bigint)
- Index on `cue_id` and on `attachment_id`.

Migration is hand-written, then `pnpm --filter @stagistic/db db:compile-migrations`.

Queries: `insertAttachment`, `insertCueAttachmentLink`, `listAttachmentsByCue`,
`getAttachmentById`, `deleteCueAttachmentLink`, `deleteAttachment`,
`countAttachmentLinks`.

### 3. Repository handlers — `createAttachmentHandlers`

Mirrors `cues.ts` / `locations.ts` (`getDb`, `recordOutbox`, `syncDb`, plus
injected `fileStorage`).

- `listByCue(cueId)` → attachment metadata rows (joined).
- `attachToCue(scriptId, cueId, file)`:
  `storageKey = fileStorage.save(file)` → insert `script_attachments` → insert
  `script_cue_attachments` → `recordOutbox('cueAttachment.attach')` → `syncDb()`.
- `removeFromCue(scriptId, cueId, attachmentId)`: delete join row; if
  `countAttachmentLinks(attachmentId) === 0` → delete `script_attachments` row +
  `fileStorage.delete(storageKey)` (orphan GC) → `recordOutbox('cueAttachment.detach')`
  → `syncDb()`.
- `getBlob(storageKey)` → `fileStorage.get(storageKey)`.

Added to the `ScriptRepository` interface and wired in
`createLocalPgliteRepository`.

**Durability:** metadata flushed via existing `syncToFs` (PGlite); blob lives
independently in IndexedDB. Both are per-browser and normally evicted together.
A metadata row whose blob is missing (rare — manual IndexedDB deletion or an
orphan-GC race) resolves to `null` → defensive UI placeholder. This is not an
import scenario: imported `.stagistic` carries no attachment metadata at all.

## UI (`packages/ui` + `packages/app-routes`)

The Cues panel already exists as a list; its **detail** is currently the
placeholder `"Cue details are coming soon."` (generic `AttributeManagerListPanel`
in `ScriptSettingsModalProvider`). We fill that existing slot — no new tab/panel.

- **`AttributeManagerListPanel`**: add optional `renderDetail(selectedItem)`
  render-prop. In the provider, pass it for the Cues panel to replace
  `detailPlaceholder`. Cue list logic (`buildAttributeManagerCueItems`,
  assigned/unassigned, numbering) is untouched.
- **Cue detail content**: an "Attachments" section — list of PDFs (filename,
  size), an **Upload PDF** button (hidden `<input type="file"
  accept="application/pdf">`), each row opens the preview modal, a remove icon
  opens the confirm modal.
- **`CueAttachmentPreviewModal`**: reuses the `pdfjs-dist` canvas render from
  `ExportPreview`. Extract a shared `renderPdfToCanvases(data)` helper used by
  both. Loads the blob via `repo.getBlob(storageKey)` → `arrayBuffer()` →
  render. Revoke object URLs / clean canvases on close.
- **`RemoveAttachmentModal`**: mirrors `RemovePlaceModal`.
- **`useCueAttachmentsState`** hook: mirrors `useScriptPlacesState`, wired in the
  provider; exposes `attachments`, `isLoading`, `attach`, `remove`, `getBlob`.
- Missing blob (metadata row present, blob absent — rare, defensive) → a
  disabled placeholder row ("attachment unavailable").

## Error handling

- Non-PDF selection: ignored by `accept`; also guard on `file.type` and skip
  with a message.
- `fileStorage.save` failure: surface an error, do not insert metadata.
- `getBlob` returns `null`: preview shows an "unavailable" state instead of
  rendering.
- Orphan GC failure to delete a blob: log; the metadata row is already gone, so
  it is a harmless orphan blob (acceptable for MVP).

## Testing

- DB queries + handlers: PGlite node tests (project convention) — attach, list,
  remove, orphan GC, cascade on cue delete. Use an in-memory `FileStorage`.
- UI: browser tests (`test:browser`) for the cue detail attachment list, upload
  wiring (mock repo), remove-confirm flow. Preview modal render asserted
  minimally (env-sensitive canvas).

## Document schema version

No change to `SCRIPT_DOCUMENT_SCHEMA_VERSION` — this is DB/projection + UI only,
not a stored `ScriptDocument` shape change.
