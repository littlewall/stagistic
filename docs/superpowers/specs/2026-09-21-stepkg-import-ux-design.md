# Stepkg import UX — restore branch and import modal — design

**Date:** 2026-09-21
**Status:** approved design, implementation planned
**Scope:** the import modal's `.stepkg` support (new-copy and replace-existing flows), the restore-existing-script
backend branch, and the shared type-to-confirm UI primitive. Excludes any change to the standalone `.stagistic`
import behavior itself.

## 1. Problem

`.stepkg` export and "import as a new script" (fresh identities) are complete and tested
(`docs/superpowers/specs/2026-09-18-stepkg-import-format-design.md`,
`docs/superpowers/specs/2026-09-18-stepkg-import-format-design.md` implementation). Nothing in the app surfaces
`.stepkg` import yet: the Home route's import modal only accepts `.stagistic` text files, and there is no way
to detect or act on the case where a `.stepkg` package's `script.id` already matches a script the user has
locally — the "restore/replace an existing script" branch was explicitly deferred.

This phase adds:

- `.stepkg` support to the existing import modal, alongside the unchanged `.stagistic` path;
- detection of an existing local script by the package's `script.id`, surfaced before the user commits to an
  action;
- a new backend branch that overwrites an existing script's data in place from a `.stepkg` package ("restore");
- an explicit, destructive-action-appropriate confirmation for restore, with an escape hatch to back up the
  current local state first.

## 2. Decisions

- Restore semantics are a **full replace**: every domain row the app owns for that `script.id` (characters,
  groups, genders, locations, music, attachments, title page, settings, and the document/blocks/scenes/acts
  projection) is replaced with exactly what the package contains. Anything the user added locally since the
  package was exported is discarded. No field-level merge.
- The import modal detects a collision **immediately after file selection**, via a cheap manifest-only peek —
  before the user reaches the name field or the submit button.
- When no collision exists, the user only ever sees "import as new" — no dead Replace option.
- Replace requires a **type-to-confirm** step (the same friction level as script deletion), plus a **one-click,
  non-blocking "Download backup" action** that exports the current local state as `.stepkg` before the user
  commits to replacing it. Both live inside the same modal — no second stacked dialog.
- `packages/ui` stays free of `@stagistic/db` / `@stagistic/stepkg` dependencies. All `.stepkg`-aware logic
  (peek, restore, backup) is injected into the modal as callback props, mirroring the existing `onImport` /
  `onPickFile` pattern.
- The import modal remains reachable only from the Home route, as today. Replace therefore never touches a
  script that is currently open in the editor.
- The existing `DeleteScriptConfirm` type-to-confirm pattern is generalized into a shared component
  (`TypeToConfirmAction`) reused by both script deletion and package replace, instead of duplicating it.

## 3. Modal flow

The modal starts with only the drop zone (now accepting both `.stagistic` and `.stepkg`). Everything below it
is revealed progressively based on the selected file:

```text
[drop zone: .stagistic or .stepkg]
        │
        ├─ .stagistic ──────────────────────────────────────────► [Script name field] → Import
        │
        └─ .stepkg ─► peek (manifest only)
                        │
                        ├─ peek fails ─► inline error, Import disabled
                        │
                        └─ peek ok ─► look up manifest.script.id locally
                                        │
                                        ├─ not found ─► [Script name field, prefilled from package title] → Import (new)
                                        │
                                        └─ found ─► [New copy | Replace existing "<local title>"] choice, default New copy
                                                        │
                                                        ├─ New copy ─► [Script name field] → Import (new, fresh IDs)
                                                        │
                                                        └─ Replace ─► warning text
                                                                      + [Download backup] (non-blocking, repeatable)
                                                                      + [type "replace me" to confirm] → Replace
```

The New/Replace choice uses the existing `Button variant="segment"` styling already used elsewhere in the app
(no new toggle component).

## 4. Backend surface

### Peek — `peekStepkgPackage` (`@stagistic/app-core`)

```ts
export type StepkgPeekResult =
    | {ok: true; scriptId: string; packageTitle: string; existingScript: {id: string; title: string} | null}
    | {ok: false; issues: StepkgImportIssue[]};

export const peekStepkgPackage = (args: {repository: ScriptRepository; bytes: Uint8Array}): Promise<StepkgPeekResult>;
```

Implementation: `readStepkgContainer` (already built — Task 1 of the format phase; unzips and validates only the
manifest, not the full domain payload or checksums) to get `manifest.script.{id,title}`, then
`repository.getScriptSummary(manifest.script.id)` for the collision check. This is intentionally cheap: it does
not read or validate `data/*.json`, attachments, or checksums. A package that passes peek can still fail at
actual import time with a more specific error (see §6) — this mirrors how export's own validation is deferred
to the point of doing real work.

### Restore — `restoreScriptFromPackage` (`@stagistic/db`) + `restoreScriptPackage` (`@stagistic/app-core`)

`ScriptRepository` gains:

```ts
restoreScriptFromPackage(input: ScriptPackageWrite): Promise<void>;
```

It reuses the **same** `ScriptPackageWrite` shape `createScriptFromPackage` already takes (§6 of the format
design) — `input.script.id` here is required to already exist locally. Behavior, inside one transaction:

1. Update the `scripts` row (title, subtitle, timestamps) in place — no insert.
2. Delete every existing child row this app owns for that `script.id`: characters (both kinds — group
   memberships cascade), gender options, locations, music, and attachments (attachment `storageKey`s are read
   before deletion and kept for post-commit blob cleanup; music-attachment bindings cascade with their rows).
   Title page and settings already have delete-all-then-insert writers (`writeTitlePageFieldsTx`,
   `writeScriptSettingsTx` — from the format phase) and are reused unchanged.
3. Write every domain row from the package, identical to `createScriptFromPackage`'s ordering (genders →
   characters → groups/members → locations → music → document migration → scene metadata → title page →
   settings → attachments → bindings → outbox entry `script.import` — reused as `script.restore`).
4. `migrateScriptDocumentToBlocks` runs with `force: true` exactly as it does for create; it already diffs
   against the script's *current* blocks/scenes/acts and deletes what the new document no longer has — this is
   the same path normal document saves use, so no scene/block-specific deletion code is needed beyond what
   already exists. Scenes are never deleted or inserted directly, consistent with the format phase's rule.

Attachment blobs follow the same two-sided care as the existing `attachments.ts` write path: new blobs are
saved to `fileStorage` **before** the transaction (rolled back on failure by deleting them); the **old**,
now-replaced blobs are deleted from `fileStorage` only **after** the transaction commits successfully. On any
failure, the transaction rolls back and the pre-restore data is untouched — this is the opposite invariant from
`createScriptFromPackage`, where failure leaves nothing; here failure must leave the *original* script exactly
as it was.

Because this shares the bulk of its row-writing logic with `createScriptFromPackage`, the implementation factors
a shared internal helper for "write these package rows into this transaction" that both the create and restore
handlers call, with restore additionally running its delete pass first.

`@stagistic/app-core` gets a sibling to `importScriptPackageAsNew`:

```ts
export const restoreScriptPackage = (args: {repository: ScriptRepository; bytes: Uint8Array}): Promise<StepkgImportResult>;
```

Same `StepkgImportResult` type as the new-copy path (`{ok: true, scriptId, title} | {ok: false, issues}`).
Difference from `importScriptPackageAsNew`: **no** `remapStepkgIds` call — the package's own IDs are used
as-is — and it calls `repository.restoreScriptFromPackage` instead of `createScriptFromPackage`.

### Backup download

No new export code. The "Download backup" button reuses the existing `exportScriptPackage` (app-core) and the
existing `downloadBlob` helper (`packages/app-routes/src/routes/script/downloadStagistic.ts`), the same pair the
header export menu already uses. No editor flush is needed — the import modal only runs from the Home route, so
there is no open editor session for that script to flush.

## 5. UI and data flow

`packages/ui` stays presentational; `.stepkg` bytes and all `.stepkg`-aware decisions are injected as props,
the same shape as today's `onImport` / `onPickFile`.

- **`ImportDropZone`**: `acceptedFileTypes` becomes `['.stagistic', '.stepkg']`. The drop/select handlers
  classify by extension and read accordingly — `.stagistic` as text (unchanged), `.stepkg` via
  `file.arrayBuffer()` into a `Uint8Array` (native browser API, no new dependency).
- **`model.ts`**: `SelectedFile` becomes a discriminated union:
  ```ts
  type SelectedFile =
      | {kind: 'stagistic'; name: string; file?: File; text?: string}
      | {kind: 'stepkg'; name: string; file?: File; bytes?: Uint8Array};
  ```
- **New prop** `onPeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>`, where the UI package defines
  its own minimal result shape (no dependency on `@stagistic/stepkg`'s issue types):
  ```ts
  type StepkgPeekResult =
      | {ok: true; packageTitle: string; existingLocalTitle: string | null}
      | {ok: false; message: string};
  ```
  The wiring layer (app-routes) adapts app-core's richer `StepkgPeekResult` into this shape.
- **`ImportScriptModalProps`** replaces the single `onImport` with:
  - `onImportStagistic: (payload: {name: string; fileName: string; text: string}) => Promise<void>` — the
    renamed, behaviorally identical `onImport` of today.
  - `onImportStepkgAsNew: (payload: {fileName: string; bytes: Uint8Array; title: string}) => Promise<void>`
  - `onReplaceWithStepkg: (payload: {fileName: string; bytes: Uint8Array; scriptId: string}) => Promise<void>`
  - `onDownloadStepkgBackup: (scriptId: string) => Promise<void>`
- **State hook** (`useImportScriptModalState`) gains: peek loading/result state, the New/Replace choice
  (default `'new'`, only meaningful when `existingLocalTitle` is set), and the type-to-confirm phrase state
  gating the Replace button.
- **`useGlobalModalMutations`** (app-routes): `handleImport` is renamed `handleImportStagistic` (unchanged
  body); new `handlePeekStepkg` (calls app-core's `peekStepkgPackage`, adapts the result), `handleImportStepkgAsNew`
  (calls `importScriptPackageAsNew`, navigates + toasts like today's success path), `handleReplaceWithStepkg`
  (calls `restoreScriptPackage`, navigates to `/script/${scriptId}/editor` + toasts), `handleDownloadStepkgBackup`
  (calls `exportScriptPackage` + `downloadBlob`, no navigation).

## 6. Copy and error handling

Peek-stage errors (shown immediately, Import stays disabled):

| Condition | Message |
|---|---|
| not a ZIP / invalid manifest | "This file isn't a valid Stagistic package." |
| unsupported `formatVersion` | "This package was created by an incompatible version of Stagistic." |
| `documentSchemaVersion` too new | "This package was created by a newer version of Stagistic. Update the app to import it." |

Submit-time errors (peek passed, but full validation or the write itself fails — checksum mismatch, schema
violation, broken reference, missing asset, or a write failure): one generic message, matching the existing
`.stagistic` failure tone — "This package appears to be corrupted or incomplete. Try exporting it again." /
toast "Failed to import script".

Drop zone hint: "Drop a .stagistic or .stepkg file here, or click to browse." Modal description: "Bring in a
.stagistic or .stepkg file and continue working in the editor."

Replace warning copy: "Replacing will overwrite '<local title>' with this package. Local changes made since
the last export will be lost."

Success toasts, matching the existing "Script imported" pattern: import-as-new uses the same "Script imported"
/ package title copy as today's `.stagistic` success toast; replace uses "Script replaced" / the local script's
(now updated) title.

## 7. Shared type-to-confirm component

`DeleteScriptConfirm` is generalized into `packages/ui/src/dialogs/TypeToConfirmAction.tsx` (replacing the old
file and its CSS module, renamed alongside it), taking the confirm phrase as a prop instead of the hardcoded
`DELETE_SCRIPT_CONFIRM_PHRASE`:

```ts
export interface TypeToConfirmActionProps {
    phrase: string,
    confirmLabel?: ReactNode,
    isPending?: boolean,
    secondaryAction?: ReactNode,
    onConfirm: () => void | Promise<void>,
}
```

`DeleteScriptModal` is updated to pass `phrase={DELETE_SCRIPT_CONFIRM_PHRASE}` (`'delete me'`, unchanged
behavior). The import modal's Replace section uses the same component with
`REPLACE_SCRIPT_CONFIRM_PHRASE = 'replace me'`.

## 8. Testing

- `db`: `restoreScriptFromPackage` — full replace (a locally-added character disappears; orphaned attachment
  blobs are deleted); rollback leaves the **original** data intact (not empty) on a forced failure; blob
  save/cleanup ordering matches the existing attachment-write convention.
- `app-core`: `peekStepkgPackage` — collision, no collision, invalid package (mocked repository, matching
  `importScriptPackageAsNew`'s existing test style); `restoreScriptPackage` — success, corrupt package, write
  failure (mirrors `importScriptPackageAsNew.test.ts`).
- `ui`: `ImportScriptModal` browser tests — file-type detection by extension, peek loading/success/error states,
  the New/Replace choice appearing only on collision, Replace button gated by the type-to-confirm phrase,
  Download backup usable independent of confirm state, `DeleteScriptModal` still working after the
  `TypeToConfirmAction` generalization.
- `app-routes`: `useGlobalModalMutations` — each new handler calls the right app-core function and
  navigates/toasts correctly; renamed `handleImportStagistic` keeps existing behavior/tests green.

## 9. Non-goals

- Any change to the standalone `.stagistic` import's own behavior or error copy.
- A native OS file picker (Tauri) for either format — `onPickFile` remains unused/unwired, as today.
- Field-level or conflict-aware merge on restore — full replace only.
- Multi-file or multi-script package import.
- Opening the import modal from anywhere other than the Home route (e.g. from within an open editor).
- Any change to `.stepkg` export or the "import as new" backend built in the previous phase.

## 10. Success criteria

- The Home route's import modal accepts both `.stagistic` and `.stepkg` files through one drop zone.
- Selecting a `.stepkg` file whose `script.id` is not present locally offers only "import as new," identical
  in spirit to today's `.stagistic` flow.
- Selecting a `.stepkg` file whose `script.id` matches a local script offers "import as new copy" (default) or
  "replace existing," with the existing script's title shown so the user knows exactly what would be
  overwritten.
- Replace requires typing a confirmation phrase before it can run, and offers a one-click backup download of
  the current local state first.
- A successful replace leaves the local script's data exactly matching the package's contents, including
  removal of anything added locally after the export the package came from.
- A failed replace leaves the pre-existing local script completely unchanged.
- `packages/ui` gains no new dependency on `@stagistic/db` or `@stagistic/stepkg`.
