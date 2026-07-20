# Actless Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow scripts with no act blocks across creation, import, editing, and page marks.

**Architecture:** Script shape remains derived only from the editor document. Explicit document factories create actful or actless initial content; the creation store preserves any explicitly supplied document, and editor deletion removes any targeted act without special-casing the first.

**Tech Stack:** TypeScript, React 19, Tiptap/ProseMirror, React Aria Components, Vite Plus tests, CSS Modules.

## Global Constraints

- Multi-act is the default new-script choice.
- The choice is initialization-only and is never persisted as script metadata.
- Script structure is owned by the editor document and saved through the existing document source/autosave path.
- Stagistic syntax remains unchanged.
- No database schema or migration changes.
- Use fat-arrow functions, guard clauses, `clsx`, React Aria wrappers from `@stagistic/ui`, and files no longer than 300 lines.

---

### Task 1: Explicit initial document shapes and persistence

**Files:**
- Create: `packages/script/src/document/scriptDocument.test.ts`
- Modify: `packages/script/src/document/scriptDocument.ts`
- Modify: `packages/app-core/src/scripts/scriptsStore.test.ts`
- Modify: `packages/app-core/src/scripts/scriptsStore.ts`
- Modify: `packages/app-routes/src/global-modals/modals/importStagisticFile.test.ts`

**Interfaces:**
- Produces: `createActlessScriptDocument(blockId?: string, settings?: EditorSettingsOverride): ScriptDocument`.
- Preserves: `createDefaultScriptDocument(...)` returns the existing `ACT ONE` plus scene shape.
- Preserves: `createScript(title, initialContent?)` forwards explicitly supplied content even when all blocks have empty text.

- [ ] **Step 1: Write failing factory tests**

Add tests asserting `createDefaultScriptDocument()` has block types `['act', 'scene']` and `createActlessScriptDocument()` has `['scene']` with stable IDs.

- [ ] **Step 2: Verify the factory test fails**

Run: `pnpm --filter @stagistic/script test -- src/document/scriptDocument.test.ts`

Expected: FAIL because `createActlessScriptDocument` is not exported.

- [ ] **Step 3: Implement the actless factory**

Extract the scene creation shared by both factories. Keep `createEmptyScriptDocument` and `createDefaultScriptDocument` multi-act for compatibility, and add `createActlessScriptDocument` returning only the scene block.

- [ ] **Step 4: Verify factory tests pass**

Run: `pnpm --filter @stagistic/script test -- src/document/scriptDocument.test.ts`

Expected: PASS.

- [ ] **Step 5: Write a failing creation-store test**

Capture `createScriptWithId` input in `scriptsStore.test.ts`, call `createScript('One act', createActlessScriptDocument('scene-1'))`, and assert its `initialContent.content` contains only the `scene` block.

- [ ] **Step 6: Verify the store test fails**

Run: `pnpm --filter @stagistic/app-core test -- src/scripts/scriptsStore.test.ts`

Expected: FAIL because `normalizeInitialContent` currently discards a text-empty explicit document.

- [ ] **Step 7: Preserve explicit initial content**

Change `normalizeInitialContent` so only `undefined` means “use repository/default seeding.” For any supplied `ScriptDocument`, run block-ID and structure normalization directly and preserve its explicit scene-only shape.

- [ ] **Step 8: Strengthen the import regression test**

In `importStagisticFile.test.ts`, inspect the document passed to `createScript` and assert block types equal `['scene']` for a source containing `# Scene`.

- [ ] **Step 9: Run task tests**

Run: `pnpm --filter @stagistic/app-core test -- src/scripts/scriptsStore.test.ts && pnpm --filter @stagistic/app-routes test -- src/global-modals/modals/importStagisticFile.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/script/src/document/scriptDocument.ts packages/script/src/document/scriptDocument.test.ts packages/app-core/src/scripts/scriptsStore.ts packages/app-core/src/scripts/scriptsStore.test.ts packages/app-routes/src/global-modals/modals/importStagisticFile.test.ts
git commit -m "feat(script): preserve actless initial documents"
```

### Task 2: New-script shape choice

**Files:**
- Create: `packages/ui/src/atoms/RadioChoiceGroup.tsx`
- Create: `packages/ui/src/atoms/RadioChoiceGroup.module.css`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/dialogs/types.ts`
- Modify: `packages/ui/src/dialogs/NewScriptModal.tsx`
- Modify: `packages/ui/src/dialogs/NewScriptModal.module.css`
- Create: `packages/ui/src/dialogs/NewScriptModal.browser.test.tsx`
- Modify: `packages/app-routes/src/global-modals/modals/globalModalTypes.ts`
- Modify: `packages/app-routes/src/global-modals/modals/useGlobalModalMutations.ts`

**Interfaces:**
- Produces: `type NewScriptShape = 'multi-act' | 'one-act'` from `@stagistic/ui`.
- Changes: `NewScriptModalProps.onCreate(name: string, shape: NewScriptShape)`.
- Changes: global `handleCreate(name: string, shape: NewScriptShape): Promise<void>`.

- [ ] **Step 1: Write failing modal browser tests**

Cover the selected `Multi-act` default, submission of `multi-act`, selection/submission of `one-act`, and reset to `multi-act` after close/reopen.

- [ ] **Step 2: Verify modal tests fail**

Run: `pnpm --filter @stagistic/ui test:browser -- src/dialogs/NewScriptModal.browser.test.tsx`

Expected: FAIL because the choice UI and callback argument do not exist.

- [ ] **Step 3: Add the React Aria choice wrapper**

Wrap `RadioGroup` and `Radio` from `react-aria-components` in `RadioChoiceGroup.tsx`. The wrapper accepts an accessible label, `value`, `onChange`, and options with `value`, `label`, and `description`. Style flat bordered options, selected state, keyboard focus, disabled state, and compact typography with existing tokens.

- [ ] **Step 4: Add the modal choice**

Store `NewScriptShape` in the modal, initialize/reset it to `multi-act`, render choices below the title input, and pass it to `onCreate` on submit.

- [ ] **Step 5: Verify modal tests pass**

Run: `pnpm --filter @stagistic/ui test:browser -- src/dialogs/NewScriptModal.browser.test.tsx`

Expected: PASS.

- [ ] **Step 6: Wire the choice to document factories**

Update `handleCreate` to choose `createDefaultScriptDocument()` for `multi-act` and `createActlessScriptDocument()` for `one-act`, then pass that document to `scriptActions.createScript(name, initialContent)`.

- [ ] **Step 7: Run UI and route type checks**

Run: `pnpm --filter @stagistic/ui typecheck && pnpm --filter @stagistic/app-routes typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/atoms/RadioChoiceGroup.tsx packages/ui/src/atoms/RadioChoiceGroup.module.css packages/ui/src/index.ts packages/ui/src/dialogs/types.ts packages/ui/src/dialogs/NewScriptModal.tsx packages/ui/src/dialogs/NewScriptModal.module.css packages/ui/src/dialogs/NewScriptModal.browser.test.tsx packages/app-routes/src/global-modals/modals/globalModalTypes.ts packages/app-routes/src/global-modals/modals/useGlobalModalMutations.ts
git commit -m "feat(app): choose initial script structure"
```

### Task 3: Delete the first act

**Files:**
- Create: `packages/editor/src/editor/hooks/blockMutations.test.ts`
- Modify: `packages/editor/src/editor/hooks/blockMutations.ts`
- Modify: `packages/editor/src/editor/hooks/structureRequestMutations.ts`
- Modify: `packages/editor/src/editor/actCommands/useBuildActCommands.ts`
- Modify: `packages/editor/src/editor/hooks/useEditorStructureRequests.ts`
- Modify: `packages/app-routes/src/routes/script/editor/structure/StructureRowAct.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/structure/StructureRowAct.browser.test.tsx`

**Interfaces:**
- Produces: `buildDeleteActContent(currentValue: ScriptDocument, blockId: string): {nextContent: ScriptNode[] | undefined, didChange: boolean}`.
- Both editor deletion paths consume the same helper and apply no first-act guard.

- [ ] **Step 1: Write failing deletion-helper test**

Build `[act-1, scene-1, act-2, scene-2]`, delete `act-1`, and assert the result is `[scene-1, act-2, scene-2]` with all scene nodes unchanged.

- [ ] **Step 2: Verify deletion test fails**

Run: `pnpm --filter @stagistic/editor test -- src/editor/hooks/blockMutations.test.ts`

Expected: FAIL because `buildDeleteActContent` does not exist.

- [ ] **Step 3: Add and use the shared deletion helper**

Implement the helper using `removeActBlockById`. Replace both first-node guards in `useBuildActCommands.ts` and `useEditorStructureRequests.ts` with this helper.

- [ ] **Step 4: Add a failing first-act UI test**

Assert `StructureRowActStatic` with `isFirstAct` exposes `Delete act Act` and clicking it invokes `onDelete('act-1')`.

- [ ] **Step 5: Verify the UI test fails**

Run: `pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/editor/structure/StructureRowAct.browser.test.tsx`

Expected: FAIL because the first-act delete button is hidden.

- [ ] **Step 6: Show the delete action for every act**

Remove the `isFirstAct` visibility condition around the existing delete button. Keep first-act static/non-draggable behavior unchanged.

- [ ] **Step 7: Run deletion tests**

Run: `pnpm --filter @stagistic/editor test -- src/editor/hooks/blockMutations.test.ts && pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/editor/structure/StructureRowAct.browser.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/editor/src/editor/hooks/blockMutations.ts packages/editor/src/editor/hooks/blockMutations.test.ts packages/editor/src/editor/hooks/structureRequestMutations.ts packages/editor/src/editor/actCommands/useBuildActCommands.ts packages/editor/src/editor/hooks/useEditorStructureRequests.ts packages/app-routes/src/routes/script/editor/structure/StructureRowAct.tsx packages/app-routes/src/routes/script/editor/structure/StructureRowAct.browser.test.tsx
git commit -m "feat(editor): allow deleting the first act"
```

### Task 4: Syntax, page-mark, and full verification

**Files:**
- Verify: `packages/script/src/parsing/parseStagistic.test.ts`
- Verify: `packages/script/src/serialization/serializeStagistic.test.ts`
- Verify: `packages/editor/src/editor/headerFooter/resolvePageStructureMarks.test.ts`
- Verify: `packages/script/src/settings/headerFooterText.test.ts`

**Interfaces:**
- Confirms: actless Stagistic `#` headings remain scenes.
- Confirms: `actIndex: null` produces `SCENE-PAGE`.

- [ ] **Step 1: Run focused syntax and pagination regressions**

Run: `pnpm --filter @stagistic/script test -- src/parsing/parseStagistic.test.ts src/serialization/serializeStagistic.test.ts src/settings/headerFooterText.test.ts && pnpm --filter @stagistic/editor test -- src/editor/headerFooter/resolvePageStructureMarks.test.ts`

Expected: PASS, including existing actless parser, serializer, structure-mark, and page-mark cases.

- [ ] **Step 2: Run affected package tests**

Run: `pnpm --filter @stagistic/script test && pnpm --filter @stagistic/app-core test && pnpm --filter @stagistic/editor test && pnpm --filter @stagistic/ui test && pnpm --filter @stagistic/app-routes test`

Expected: PASS.

- [ ] **Step 3: Run repository validation**

Run: `pnpm typecheck && pnpm lint`

Expected: PASS with no errors or warnings.

- [ ] **Step 4: Update the knowledge graph**

Run: `graphify update .`

Expected: successful incremental graph update.

- [ ] **Step 5: Inspect the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended source, test, plan, and graph files are changed.
