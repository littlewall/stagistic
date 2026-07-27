# Attribute Manager Music and Character Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add music search/create/delete and character rename to the Attribute Manager while keeping document markers and catalog records consistent.

**Architecture:** Extend the shared list panel with optional search, create, grouping, and detail-action affordances. Keep document mutation in a pure `@stagistic/script` helper, then reuse the existing document-override/autosave path before deleting music from the catalog. Keep character drafts in a focused hook so edited names update the list and detail immediately.

**Tech Stack:** TypeScript, React 19, React Aria wrappers from `@stagistic/ui`, Vite Plus tests, CSS modules.

## Global Constraints

- Do not change the database schema or `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Assigned music deletion removes its start and paired explicit out markers before deleting the catalog row.
- Unassigned music appears under `Unassigned` with an empty number cell.
- Do not create commits; the user reviews and commits.
- Keep every modified or new TypeScript/React file at or below 300 lines.

---

### Task 1: Remove Music Markers from Script Documents

**Files:**
- Create: `packages/script/src/music/removeMusicFromScriptDocument.ts`
- Create: `packages/script/src/music/removeMusicFromScriptDocument.test.ts`
- Modify: `packages/script/src/index.ts`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useCharacterDocumentActions.ts`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useScriptEditorCharacters.ts`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useScriptEditorCharacters.types.ts`
- Modify: `packages/app-routes/src/routes/script/useScriptCharactersContextValue.ts`

**Interfaces:**
- Produces: `removeMusicFromScriptDocument(document, musicId): {value: ScriptDocument, changed: boolean}`.
- Produces: `applyDocumentChange(change): Promise<boolean>` on the private result of `useScriptCharactersContextValue`.

- [ ] Write a failing unit test proving the helper removes the matching `musicStart` and paired `musicOut`, while preserving unrelated music.
- [ ] Run `pnpm exec vp test run packages/script/src/music/removeMusicFromScriptDocument.test.ts` and confirm the missing helper causes RED.
- [ ] Implement the recursive immutable transform using `buildScriptBlockIndex` to identify the explicit end block.
- [ ] Export the helper and expose the existing document action’s `applyChange` as `applyDocumentChange`.
- [ ] Re-run the focused test and `pnpm --filter @stagistic/script typecheck`.

### Task 2: Music List Search, Create, and Unassigned Group

**Files:**
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.module.css`
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/attributeManagerMusicItems.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/attributeManagerMusicItems.test.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx`

**Interfaces:**
- `AttributeManagerListPanel` gains optional `search`, `createAction`, and `renderDetailAction` props.
- Unassigned items use `group: {id: "unassigned", label: "Unassigned"}` and `number: ""`.

- [ ] Write failing tests for title filtering, a visible create action, and the trailing `Unassigned` group without dash numbers.
- [ ] Run the focused UI and app-routes tests and confirm RED for the missing affordances.
- [ ] Add the optional toolbar and detail action without changing the structure-panel default.
- [ ] Wire the existing `AddMusicModal` so a created music item becomes selected.
- [ ] Re-run focused tests and package typechecks.

### Task 3: Character Rename

**Files:**
- Create: `packages/ui/src/dialogs/useAttributeManagerCharacterNames.ts`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharacterDetail.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.module.css`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/characters/useCharacterActions.ts`
- Modify: `packages/app-routes/src/routes/script/ScriptCharactersContext.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx`

**Interfaces:**
- `AttributeManagerCharactersPanel` gains `draftScopeKey`, `renamingCharacterIds`, and `onRenameCharacter`.
- `onRenameCharacter(characterId, previousName, nextName)` returns a promise so failed persistence retains the draft.

- [ ] Write failing browser tests for draft reflection, blur persistence, Escape reset, and empty/duplicate validation.
- [ ] Run the focused browser test and confirm RED because the Name field is absent.
- [ ] Implement keyed drafts and the validated Name form.
- [ ] Return the rename promise from the existing character action and wire it through the modal.
- [ ] Re-run focused tests and package typechecks.

### Task 4: Confirmed Music Deletion

**Files:**
- Create: `packages/app-routes/src/routes/script/settings/DeleteAttributeManagerMusicModal.tsx`
- Create: `packages/app-routes/src/routes/script/settings/DeleteAttributeManagerMusicModal.module.css`
- Create: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx`

**Interfaces:**
- `ScriptAttributeManagerModal` receives `onDeleteMusic(musicId): Promise<void>`.
- Provider deletion calls `applyDocumentChange(removeMusicFromScriptDocument(currentDocument, musicId))`, then `musicState.deleteMusic(musicId)` only after the document change succeeds.

- [ ] Write failing browser tests proving delete waits for confirmation and calls document removal before catalog deletion for assigned music.
- [ ] Run the focused browser test and confirm RED because the trash action and dialog are absent.
- [ ] Add the destructive header action and pending/error-safe confirmation dialog.
- [ ] Extract task-specific provider orchestration if needed to keep `ScriptSettingsModalProvider.tsx` under 300 lines.
- [ ] Re-run focused tests and package typechecks.

### Task 5: Verification and Graph Refresh

**Files:**
- Modify: `graphify-out/*` through the graphify updater.

- [ ] Run focused script, UI browser, and app-routes browser tests.
- [ ] Run `pnpm --filter @stagistic/script typecheck`, `pnpm --filter @stagistic/ui typecheck`, and `pnpm --filter @stagistic/app-routes typecheck`.
- [ ] Run `pnpm lint` and `npx tsc -b`.
- [ ] Run `graphify update .`.
- [ ] Run `git diff --check` and inspect `git diff --stat` plus all changed files.

### Task 6: Refine Music Grouping and Detail Headers

**Files:**
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.module.css`
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.browser.test.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharacterDetail.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerPlaceDetail.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerCharactersPanel.browser.test.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerPlacesPanel.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/attributeManagerMusicItems.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/attributeManagerMusicItems.test.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx`

**Interfaces:**
- `AttributeManagerListItem` gains `detailSubtitle?: string | null`.
- `AttributeManagerListPanel` gains `hideDetailTypeLabel?: boolean`.
- Items with `number: ""` render without the number column.

- [x] Add failing browser tests for a visible create icon, unnumbered-row alignment, hidden detail type, and a wrapping detail subtitle.
- [x] Add failing builder tests proving assigned music is grouped by its containing act, unused acts are absent, and the scene is exposed as `detailSubtitle`.
- [x] Run focused UI and app-routes tests and confirm RED for the missing behavior.
- [x] Implement the shared list changes, matching the proven Places icon CSS.
- [x] Remove Character and Place type labels; keep Structure's Scene label.
- [x] Wire music to hide its type label and render the scene beneath the full title.
- [x] Re-run focused tests, package checks, canonical checks, and `graphify update .`.
