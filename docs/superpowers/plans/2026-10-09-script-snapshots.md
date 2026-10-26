# Script drafts and versions (phase 1) implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement these tasks. Do not commit; the user reviews and commits.

**Goal:** Let a writer save the current script as a fixed, numbered draft or a named version, browse any of them read-only from the app bar, export them, restore one into the script or into a new script, and manage the list.

**Spec:** `docs/proposals/script-drafts-and-cuts.md` (approved 9. 10. 2026). Phase 1 only. Cuts, title-page/header draft tokens and Compare are later phases.

**Architecture:** A snapshot row stores metadata. Its payload is a `StepkgSnapshot` written as a compressed blob to the existing `FileStorage`. Attachments are referenced by storage key, never copied. Viewing a snapshot loads it into an ephemeral in-memory PGlite repository wrapped in a read-only guard. The workspace mounts under a nested `ScriptRepositoryProvider`, so editor, panels, attribute manager, settings and export read snapshot data without per-panel adapters. Restore reuses the `.stepkg` replace core with merged input: snapshot content plus current settings, title page, title and anchor-filtered comments.

**Tech Stack:** PGlite/Drizzle, `@stagistic/stepkg`, React, react-router, react-aria, TipTap, moon.

## Key decisions (review before implementation)

- **Code name is `snapshot`; UI says Draft / Version.** `app-core/src/drafts` and `routes/script/drafts` already mean unsaved form drafts.
- **Payload lives in `FileStorage`, not in a DB column.** The local PGlite holds the whole database in WASM memory and IDBFS persists whole files. An unlimited number of full snapshots in `jsonb` would grow memory and sync cost for every session.
- **Viewing uses an ephemeral repository, not snapshot-aware panels.** One in-memory PGlite per tab is created lazily and reused across snapshots. Writes are blocked twice: in the UI and by a repository proxy that throws `ReadOnlySnapshotError`.
- **Routes:** `/script/:scriptId/snapshots/:snapshotId/editor` and `/export`. Current stays at `/script/:scriptId/editor|export`. ViewSwitcher keeps the snapshot segment.
- **Draft numbers come from `scripts.last_draft_number`, not `max(number)`.** Numbers are never reused after deletion. Mark as version keeps the number, which renders as “from Draft 7”. A version saved directly has no number.

## Global constraints

- No `SCRIPT_DOCUMENT_SCHEMA_VERSION` bump. After schema changes, run `moon run db:db-generate`, or run `moon run db:db-compile-migrations` after manual SQL.
- Extend the subfolder repo modules wired in `createLocalPgliteRepository` (`repo/package/*`, `repo/document/*`), not their flat duplicates in `repo/`.
- A snapshot is immutable except `kind` (draft → version only), `name` and `note`.
- In snapshot view nothing writes: editor, header title, settings, title page, attribute manager, sidebar panels, comments, active-block tracking. Copy-to-clipboard and export stay available. Copy to cuts arrives in phase 2.
- Restore never loses data. The current state is always saved first as a draft noted “Before restoring <label>”.
- Product register: quiet. No banner. Read-only state is communicated by the app-bar label and the Restore action.
- No commits or staging.

## Review focus

- Restore vs. autosave: a pending editor save must never overwrite restored content. Flush, suspend saves, restore, then remount the workspace from storage.
- Comment rule: after restore, a current thread survives only if its anchor exists in the restored document (block id, or `commentAnchor` mark via `collectCommentAnchorThreadIds`). Marks for threads that no longer exist are stripped, so deleted threads never come back.
- Blob safety: no deletion path removes a blob referenced by a snapshot payload or by a snapshot attachment ref. Paths: `repo/attachments.ts` (3 sites), `.stepkg` replace `removedStorageKeys`, and snapshot delete.
- Snapshots survive `.stepkg` Replace existing (the script row is updated, not deleted) and are removed with the script (cascade plus payload blob cleanup).
- Ephemeral repository: unique PGliteWorker id per tab (no cross-tab leader sharing). Store registries are keyed by repository instance (`createRepositoryStoreRegistry`); check that collection ids such as `script-music:${scriptId}` do not collide between the live and snapshot repositories.
- Older snapshots (lower `documentSchemaVersion`) open through the same path as `.stepkg` import. Newer ones are rejected with a clear message.

## Task 1: Schema and queries

- [ ] Add `script_snapshots` with these columns:
    - `id`, `script_id` (FK cascade), `kind` (`draft` | `version`), `number` (int, null for directly saved versions), `name`, `note`;
    - `payload_storage_key`, `payload_sha256`, `payload_byte_length`, `document_schema_version`, `summary_metadata` (jsonb `ScriptSummaryMetadata`);
    - `created_at`, `updated_at`, `created_by`.
- [ ] Add a unique index `(script_id, number)` where `number` is not null, and an index on `(script_id, created_at)`.
- [ ] Add `script_snapshot_attachment_refs` (`snapshot_id` FK cascade, `storage_key`; PK on both; index on `storage_key`).
- [ ] Add `scripts.last_draft_number integer not null default 0`. Duplicate and import start at 0. `.stepkg` replace keeps the value.
- [ ] Add queries: insert, list by script (newest first), get, update name/note/kind, delete, allocate the next draft number atomically, and list storage keys referenced by snapshots.
- [ ] Add `filterUnreferencedStorageKeys(tx, keys)`, which checks `script_attachments` and snapshot refs, and route every blob deletion through it.
- [ ] Generate and compile migrations. Add node tests: numbering after deletion, cascade on script delete, the reference filter.

## Task 2: Snapshot repository API

- [ ] Extend `ScriptRepository` with these methods:
    - `getScriptSnapshotsSource(scriptId)` (reactive) and `listScriptSnapshots`;
    - `createScriptSnapshot(scriptId, {kind, name?, note?})`;
    - `updateScriptSnapshot(scriptId, snapshotId, {name?, note?, kind?: 'version'})`;
    - `deleteScriptSnapshot`;
    - `loadScriptSnapshotPayload(snapshotId): StepkgSnapshot`.
- [ ] Create: build the payload with `readScriptPackageSource` and `mapScriptPackageSourceToStepkg`. That mapping is in app-core today; move it or the equivalent into `@stagistic/stepkg`/db so the repository can call it. Serialize with stable JSON and deflate, save the blob, then commit the row and attachment refs in one transaction. Delete the blob if the transaction fails.
- [ ] Validation: a version requires a non-empty name. Kind changes only from draft to version.
- [ ] Delete: commit the row delete, then delete the payload blob and any now-unreferenced attachment blobs on a best-effort basis.
- [ ] Record outbox ops (`snapshot.create`, `snapshot.update`, `snapshot.delete`) following the existing pattern. The outbox is currently disabled.
- [ ] Node tests: payload round-trip equals the package source, immutability, version naming rules, delete cleanup.

## Task 3: Restore

- [ ] Extract the replace core of `restoreScriptFromPackage` into a transactional helper that accepts a prepared `storageKeyByAttachment`, so a caller can reuse existing blobs instead of saving copies. Keep `.stepkg` behaviour identical.
- [ ] `restoreScriptSnapshot(scriptId, snapshotId)`:
    1. Create the before-restore draft with note `Before restoring <label>`.
    2. Build merged input. From the snapshot: document, characters, groups, genders, locations, scenes, music, attachments and bindings. From current: settings, title page, title and subtitle.
    3. Apply the comment rule to current threads and messages. Strip `commentAnchor` marks whose thread does not survive.
    4. Run the replace core with existing storage keys and recompute summary metadata.
    5. Keep snapshots and `last_draft_number`.
- [ ] `restoreScriptSnapshotAsNew(snapshotId, title)`: `remapStepkgIds`, load attachment blobs, `mapStepkgSnapshotToPackageWrite`, `createScriptFromPackage`. Default title is `<script title> — <label>`.
- [ ] Node tests:
    - the replace/keep table from the spec;
    - the comment rule for block and range anchors, including deleted-thread marks;
    - blobs referenced only by the before-restore draft survive;
    - restore-as-new produces fresh ids and is independent of the source.

## Task 4: Read-only snapshot repository

- [ ] Add `createSnapshotViewRepository({createDb, fileStorage})` in `@stagistic/db`. It reuses one lazily created in-memory database, clears the previous snapshot script, and loads the payload by writing package rows with existing storage keys. No blob writes. File storage is read-through to the live storage.
- [ ] Wrap it in a read-only proxy. Reads, `allocate*`, reactive sources, `getAttachmentBlob` and `getScriptPackageSource` pass. Every mutation throws `ReadOnlySnapshotError`.
- [ ] App wiring: web gets a second PGliteWorker (`memory://`, unique id per tab) using the existing worker script. Desktop gets its equivalent. Pass the factory through the app root next to `scriptRepository`.
- [ ] Node tests: loaded snapshot reads match the payload; every mutation is rejected; switching snapshots leaves no residue.

## Task 5: Workspace, routing and read-only gating

- [ ] Add the snapshot routes to `apps/web` and `apps/desktop`, both reusing `ScriptWorkspaceRoute`.
- [ ] In snapshot mode, the workspace resolves the snapshot and shows a loader (“Opening Draft 3”). It mounts children under a nested `ScriptRepositoryProvider` (snapshot repository) and a new `ScriptAccessProvider`, which exposes `{isReadOnly, snapshot, liveRepository}`. No autosave controller, save handlers or `setActiveBlock` writes run.
- [ ] Editor: add `isReadOnly` to `EditorProps`. TipTap `editable: false`. Hide gutter controls, block action, context and type menus, music and character suggestion overlays, and structure-mutating commands. Search replace already follows `isEditable`.
- [ ] Panels: Structure, scene metadata, Characters, Music and Comments render data but hide or disable every mutation.
- [ ] Attribute manager, settings modal and title page open read-only.
- [ ] Header in snapshot mode: static title showing the live script name, no sync indicator. Download exports the snapshot (`.stepkg` and `.stagistic` from the snapshot repository).
- [ ] Browser tests: typing does nothing; no mutation control is reachable in editor, panels, attribute manager or settings; the proxy is never hit during normal use.

## Task 6: App-bar selector, dialogs and export

- [ ] `app-core/src/snapshots`: a store and hook over `getScriptSnapshotsSource` from the live repository, plus actions (create, update, delete, restore, restore as new).
- [ ] Add section and separator support to `@stagistic/ui` `DropdownMenu` if it is missing.
- [ ] Add `SnapshotSwitcher` next to `ScriptTitle` in `scriptIdentity`. The trigger shows `Current`, `Draft 3` or the version name. Menu contents:
    - Current;
    - Versions (by name, with “from Draft N” where present);
    - Drafts (newest first, with date and reason; scrollable; a filter field beyond a threshold);
    - actions: Save as new draft…, Save as version…, Manage drafts and versions….
- [ ] In snapshot mode, show a quiet `Restore…` control next to the switcher with Restore to this script and Restore as new script.
- [ ] Dialogs in `packages/ui/src/dialogs/script/`:
    - `SaveSnapshotModal`: draft has an optional reason; version has a required name and an optional note.
    - `RestoreSnapshotModal`: states what is replaced, what is kept and that the current state is saved first.
    - `ManageSnapshotsModal`: rename and edit note, Mark as version, delete with confirmation.
- [ ] Before creating a snapshot from Current, flush the editor. After Restore to this script, remount the workspace from storage and navigate to Current. After Restore as new script, navigate to the new script.
- [ ] Export view, Current: the Download PDF control adds Save as draft and download and Save as version and download…. Snapshot: the PDF file name is `<title> – <label>.pdf`.
- [ ] Browser tests:
    - switching between Current and a snapshot;
    - create draft and version, rename, Mark as version, delete;
    - restore reloads the editor with restored content and no stale autosave follows;
    - restore as new opens the new script;
    - snapshot PDF file name.

## Task 7: Verification

- [ ] Run `moon run db:test`, `moon run app-core:test`, `moon run app-routes:test-browser`, `moon run editor:test-browser`, `moon run ui:test-browser`, `moon run root:typecheck` and `moon run root:lint`. Known editor browser reds (overlay viewport-fit, cueCaret) are pre-existing and must not be masked.
- [ ] In the Synara browser:
    - save Draft 1 and a version;
    - edit, then open Draft 1 and confirm it is read-only;
    - export its PDF;
    - restore it and verify the before-restore draft, comments and music attachments;
    - restore a version as a new script;
    - check the menu with many drafts.
- [ ] Measure the time to open a snapshot (cold and warm) and the payload size on the example script. Report the numbers.
- [ ] Run `graphify update .` and review the full diff. Leave it uncommitted.

## Out of phase 1

- Cuts (phase 2).
- Title-page mode From latest draft or version and the `{{draft}}` token (phase 3).
- Compare, snapshots inside `.stepkg`, sync (phase 4).
- User documentation in `apps/docs`, written after the feature is verified.

## Implementation notes (10. 10. 2026)

- Payload building and restore merging live in `app-core/src/snapshots` (it already owns the stepkg mapping); `@stagistic/db` only stores rows and blobs, so it gains no stepkg dependency. Restore reuses `restoreScriptFromPackage` with `existingStorageKey` attachments.
- Read-only is enforced three times: UI gating (`useScriptReadOnlyState`), the editor `ReadOnlyGuardExtension` (drops doc-changing transactions, since TipTap commands ignore `editable`), and `createReadOnlyScriptRepository`.
- Restore as new script remaps block ids with the new `remapStepkgBlockIds`. Found while testing: `.stepkg` Import as new copy keeps block ids (`remapStepkgIds` tests assert it), so importing a package whose script still exists locally yields a copy with an empty document. Left unchanged; needs a decision.
- Measured in the dev build on the example script: opening a stored state ≈ 4.8 s vs ≈ 3.7 s for switching to Current (editor mount and pagination dominate); payload ≈ 36 KB compressed, mostly the title-page logo.
- Pre-existing reds, unchanged by this work: PGlite-heavy node tests time out when the whole repo runs in parallel (pass with `--maxWorkers=2`); `ui` AppLayout public-preview copy test; editor browser `useEditorAutosave` pagination ×3, `useEditorLifecycle` scene numbering, `MiniScriptEditor` scene number, flaky `sceneDeletion` / `musicPillInteraction`; lint errors in untouched files.
