# TODO — Code Quality Findings

Generated from a repo-wide analysis (knip dead-code scan, jscpd clone detection, manual verification). Levels: `low` | `medium` | `high` | `urgent`.

## Dead code

- [x] **[high]** Resolve the orphaned active-block sync hook
  `useEditorActiveBlockSync` ([packages/editor/src/editor/hooks/useEditorActiveBlockSync.ts](packages/editor/src/editor/hooks/useEditorActiveBlockSync.ts)) is never mounted, yet `usePointerDragInteraction.ts`, `usePointerDragState.ts`, and `useEditorMoveRequests.ts` still call its `setActiveBlockSyncSuppressed` — they suppress a sync that never runs. Possible regression.
  **Fix:** Deleted the hook and all suppression call sites (drag/move operations work without suppression since `useEditorLifecycle` already handles `onActiveBlockChange` via the runtime extension).

- [x] **[medium]** Delete the dead `characterTags` cluster (~580 lines)
  [characterTagDecorations.ts](packages/editor/src/editor/tiptap/fountainBlock/characterTagDecorations.ts) is unreferenced and is the sole consumer of `packages/editor/src/editor/tiptap/fountainBlock/characterTags/` (`cleanup.ts`, `rangeResolvers.ts`, `buildDecorations.ts`, `types.ts`). The live logic was extracted to `runtime/transactionGuards.ts`; originals were never removed.
  **Fix:** Deleted `characterTagDecorations.ts` and the entire `characterTags/` directory.

- [x] **[low]** Delete small verified-dead files
  [buildCharacterSnapshotFromDoc.ts](packages/editor/src/editor/live/buildCharacterSnapshotFromDoc.ts) (43 L), [useCanvasScrollLock.ts](packages/editor/src/editor/components/blockActions/useCanvasScrollLock.ts) (40 L), [scriptTypes.ts](packages/db/src/scriptTypes.ts) (16 L), empty dirs `apps/desktop/src/store/` and `apps/desktop/src/utils/`.
  **Fix:** Removed the files and directories.

- [ ] **[medium]** Prune ~70 unused exports and 52 unused exported types
  Highlights: most of the `packages/editor/src/editor/live/index.ts` barrel; `serializeDocument`/`parseDocument`/`computeContentHash` in [documentCodec.ts](packages/db/src/repo/documentCodec.ts); all ten `*Binding` exports in [registry.ts](packages/editor/src/editor/blocks/registry.ts); `collectChangedRanges`/`transactionMayAffectBlockStructure` in [transactionGuards.ts](packages/editor/src/editor/runtime/transactionGuards.ts); `runMigrations`/`prepareLocalDb`/`prepareLocalDbWithProgress` in `apps/web/src/db/index.ts`.
  **Fix:** Run `npx knip --include exports,types`, delete or un-export each confirmed hit (some resolve themselves via the duplication fixes below).

- [x] **[medium]** Remove deprecated legacy exports in `@stagistic/script`
  Legacy `fountainBlock` node type ([scriptDocument.ts:26](packages/script/src/document/scriptDocument.ts:26)) and the deprecated helper in [scriptDocumentHelpers.ts:110](packages/script/src/document/scriptDocumentHelpers.ts:110) are still exported post-cutover.
  **Fix:** Removed `ensureFountainBlockIds` (replaced with `ensureScriptBlockIds` in 4 call sites). Removed `nodeMode` prop from `EditorDocumentProps` and simplified `Editor.tsx` to always call `convertLegacyScriptDocumentToDefault` directly. Note: `ScriptDocumentNodeMode`/`convertDefaultScriptDocumentToLegacy` retained — still used in DB persistence layer.

## Dependencies & tooling

- [x] **[high]** Remove broken `.eslintrc.json` files
  [apps/web/.eslintrc.json](apps/web/.eslintrc.json) and [apps/desktop/.eslintrc.json](apps/desktop/.eslintrc.json) both extend `../../.eslintrc.json`, which does not exist (root uses flat [eslint.config.js](eslint.config.js)). They are dead at best, misleading at worst.
  **Fix:** Deleted both files; `react-hooks` rules are covered by `@dvdevcz/eslint` react config.

- [x] **[medium]** Drop unused dependencies
  `apps/web`: `platejs`, `@platejs/basic-nodes`, `@platejs/slate` (abandoned Plate.js experiment), `react-aria-components`, `clsx`, `drizzle-orm`, `@stagistic/script`, `@stagistic/shared`. `packages/editor`: `@tiptap/extension-drag-handle`, `@tiptap/extension-drag-handle-react`.
  **Fix:** Removed from `apps/web/package.json` and `packages/editor/package.json`. Removed matching `declare module` shims from `tiptapExtensionsCompat.d.ts`. Run `pnpm install` to update lockfile.

- [x] **[low]** Remove stale `apps/web/prettier.config.js`
  No prettier dependency exists anywhere in the workspace.
  **Fix:** Deleted the file.

## Duplication

- [x] **[high]** Extract a shared document-walk helper in `packages/script/src/characters/`
  [characterRefsInScriptDocument.ts](packages/script/src/characters/characterRefsInScriptDocument.ts) and [renameCharacterInScriptDocument.ts](packages/script/src/characters/renameCharacterInScriptDocument.ts) contain six near-identical copies of the recursive `replaceNodes` scaffold (200+ duplicated lines) in safety-critical document mutations.
  **Fix:** Added `mapCharacterBlockNodes(nodes, visitor)` to `documentHelpers.ts`; rewrote all four mutation functions (`link`, `unlink`, `replace`, `rename`) as single-pass visitors. Removed ~200 lines of boilerplate.

- [x] **[medium]** Deduplicate transaction guards in `BlockUiEventsExtension`
  [BlockUiEventsExtension.ts:29-67](packages/editor/src/editor/tiptap/extensions/BlockUiEventsExtension.ts:29) contains 39 lines identical to [transactionGuards.ts:101-143](packages/editor/src/editor/runtime/transactionGuards.ts:101).
  **Fix:** Replaced local `hasFountainBlockNode` + `stepMayAffectBlockStructure` with imported `transactionMayAffectBlockStructure` from `runtime/transactionGuards`.

- [x] **[medium]** Re-share insert-act logic between act commands and structure requests
  [useBuildActCommands.ts:130-158](packages/editor/src/editor/actCommands/useBuildActCommands.ts:130) ≡ [useEditorStructureRequests.ts:116-144](packages/editor/src/editor/hooks/useEditorStructureRequests.ts:116) (29 L), plus a 9-line preamble also cloned into `useEditorMoveRequests.ts` — left behind by the "decouple act commands" refactor.
  **Fix:** Extracted `buildInsertActContent(currentValue, beforeBlockId)` into `structureRequestMutations.ts`; both hooks now delegate to it.

- [ ] **[medium]** Unify cross-package clones before they drift
  Character color math: [color.ts:1-20](packages/script/src/characters/color.ts:1) ≡ [colorUtils.ts:8-27](packages/ui/src/editor-panels/characterRowConfirmed/colorUtils.ts:8). Block indexing: [scriptBlockIndex.ts:175-194](packages/script/src/indexing/scriptBlockIndex.ts:175) ≡ [buildIndexSnapshotFromPmDoc.ts:144-166](packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts:144). Token scanning: [characterTokenScan.ts:42-64](packages/editor/src/editor/characters/characterTokenScan.ts:42) ≡ [tokenUtils.ts:8-30](packages/editor/src/editor/components/characterSuggestions/model/tokenUtils.ts:8).
  **Fix:** Move each algorithm to its lowest-level owning package (`@stagistic/script` or `@stagistic/shared`) and import everywhere else.

- [x] **[medium]** Stop re-implementing the dropdown in `SidebarPanelSelect`
  [SidebarPanelSelect.tsx:42-78](packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.tsx:42) duplicates 36 lines of open/close/outside-click/Escape logic from [Select.tsx:57-93](packages/ui/src/molecules/forms/Select.tsx:57).
  **Fix:** Extracted `useDropdownDismiss(isOpen, setIsOpen, containerRef)` into `packages/ui` (exported from `@stagistic/ui`); both components now call it.

- [x] **[medium]** Collapse `useSetCharacterColor` / `useSetCharacterGender`
  21-line identical block between [useSetCharacterColor.ts:48-68](packages/app-routes/src/routes/script/editor/characters/actions/useSetCharacterColor.ts:48) and [useSetCharacterGender.ts:67-87](packages/app-routes/src/routes/script/editor/characters/actions/useSetCharacterGender.ts:67).
  **Fix:** Extracted `runCharacterFieldUpdate` helper into `utils.ts`; both hooks now delegate the async update/error/refresh pattern to it.

- [x] **[low]** Use `@stagistic/shared` utilities in `jsonToBlocks.ts`
  [jsonToBlocks.ts](packages/db/src/rewrite/jsonToBlocks.ts) re-implements `isObjectRecord` and `collapseWhitespace` locally.
  **Fix:** Imported from `@stagistic/shared`, deleted local copies.

- [ ] **[low]** Clean up remaining self-clones
  `structureRequestMutations.ts` (3 clones, see param-drilling item below), [structureReorder.ts:71-84 vs 161-174](packages/editor/src/editor/hooks/structureReorder.ts:161), [useImportScriptModalState.ts:135-156 vs 163-184](packages/ui/src/dialogs/importScript/useImportScriptModalState.ts:163), [characterSuggestions/model.ts:75-88 vs 179-192](packages/editor/src/editor/components/characterSuggestions/model.ts:179), [characters/read.ts:38-53 vs 68-83](packages/db/src/queries/scripts/characters/read.ts:68), [coreMutations.ts:132-158 vs 162-186](packages/db/src/repo/characterHandlers/coreMutations.ts:162), [createPaginationPlugin.ts:108-119 vs 221-231](packages/editor/src/editor/tiptap/extensions/pagination/plugin/createPaginationPlugin.ts:221).
  **Fix:** Extract a local helper per file; each clone pair shares an obvious seam.

- [ ] **[low]** Deduplicate config/CSS clones
  `apps/desktop/vite.config.ts` ≡ `apps/web/vite.config.ts` (22 L); [PageHeader.module.css:1-15](packages/ui/src/organisms/PageHeader.module.css:1) cloned into `ScriptSettingsRoute.module.css`; 12-line self-clone in `apps/landing/src/pages/index.module.css`.
  **Fix:** Shared vite config fragment in the workspace root; reuse the `PageHeader` styles via the component instead of copying the CSS; landing self-clone → shared class.

## Antipatterns & overcomplication

- [x] **[high]** Introduce a commit context in `structureRequestMutations.ts`
  Module functions take 10–12 positional args including four `MutableRefObject`s ([structureRequestMutations.ts:310-330](packages/editor/src/editor/hooks/structureRequestMutations.ts:310)); the arg bundle is re-threaded through every call site, which produced the file's three self-clones.
  **Fix:** Introduced `CommitContext` interface; `commitDocument`/`tryCommitDocument`/`tryCommitSceneReorder` each take `ctx` as first arg. Both hooks build `CommitContext | null` via `useMemo`; each `useCallback`/`useEffect` dep array shrinks from 5–6 items to 1–2. `useEditorMoveRequests` now accepts `commitContext` directly instead of 6 individual args.

- [ ] **[medium]** Split `jsonToBlocks.ts` and move it out of `rewrite/`
  [jsonToBlocks.ts](packages/db/src/rewrite/jsonToBlocks.ts) is 1,073 lines mixing extraction, sanitization, ID resolution, persistence, audit, and rebuild — and it is now core pipeline code (used by `repo/content.ts` and the persist layer), not migration scaffolding, despite the `rewrite/` directory name.
  **Fix:** Rename the directory (e.g. `blocksCodec/`) and split into `extract`, `sanitize`, `persist`, `rebuild` modules.

- [ ] **[medium]** Make the web boot loader report real progress (or simplify it)
  [App.tsx:24-58](apps/web/src/App.tsx:24) shows progress jumping 0 → 1 after `document.fonts.ready`, while the expensive PGlite WASM + migrations bootstrap runs lazily after "Ready". `prepareLocalDbWithProgress` exists for exactly this and is never called.
  **Fix:** Call `prepareLocalDbWithProgress` during boot and feed its updates to `LoaderOverlay` — or drop the progress UI and the unused bootstrap API.

- [ ] **[medium]** Break up the `useEditorLifecycle` god-hook
  [useEditorLifecycle.ts](packages/editor/src/editor/hooks/useEditorLifecycle.ts) (563 L) handles block sanitization, ID dedup, hotkeys, autosave bridging, sidebar projection rebuilds, and perf metrics in one hook.
  **Fix:** Split into focused hooks (`useBlockSanitizer`, `useEditorHotkeys`, `useSidebarProjectionSync`) composed by a thin lifecycle hook.

- [x] **[low]** Remove duplicate export aliases
  `fountainParser` + `parseFountain` ([parser/index.ts:74](packages/script/src/fountain/parser/index.ts:74)), `fountainSerializer` + `serializeFountain` ([serializer.ts](packages/script/src/fountain/serializer.ts)), `EmptyEnterBlockChooserOverlay` exported both default and named, settings types exported from both `settings/types.ts` and `settings/index.ts`.
  **Fix:** Renamed `fountainParser` → `parseFountain` (removed alias). Removed unused `serializeFountain` alias. Removed redundant `export default` from `EmptyEnterBlockChooserOverlay` and updated the import in `EditorCanvas.tsx`.
