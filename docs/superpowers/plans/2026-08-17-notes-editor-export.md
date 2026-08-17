# Notes Editor and Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show non-editable `[[ ... ]]` delimiters around italic note blocks and let users hide notes from PDF exports.

**Architecture:** Reuse the aside block's CSS-generated delimiter pattern and extend the existing block-conversion normalizer for note syntax. Add a shared `showNotes` export option that filters note nodes before character filtering and pagination, then expose it through one small export module shared by both templates.

**Tech Stack:** TypeScript, React, Tiptap/ProseMirror, CSS Modules, Vite Plus tests, React Aria `Switch` wrapper.

## Global Constraints

- Notes remain stored without delimiters; Stagistic serialization remains `[[ ... ]]`.
- `showNotes` defaults to `true` for Basic and Integrated Score exports.
- Hidden notes are removed before pagination.
- The note block default is italic.
- Do not bump `SCRIPT_DOCUMENT_SCHEMA_VERSION`; stored document shape and meaning do not change.
- Do not change the database schema.
- Do not redesign the export settings panel beyond the new compact `Content` module.
- Do not commit. Prepare a commit message for user review only.
- Preserve the existing uncommitted spellcheck changes in `packages/editor/src/editor/tiptap/nodes/createScriptNode.ts`, `packages/editor/src/editor/surface/useScriptEditorInstance.ts`, and `packages/editor/src/editor/surface/surfaceReuse.browser.test.tsx`.

---

### Task 1: Note delimiters, conversion normalization, and italic default

**Files:**
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/commands.test.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/commands.ts`
- Modify: `packages/editor/src/editor/blocks/note/note.module.css`
- Modify: `packages/script/src/blocks/specs/note.ts`
- Modify: `packages/editor/src/editor/mini/MiniScriptEditor.browser.test.tsx`

**Interfaces:**
- Consumes: existing `setBlockTypeWithSelection`, `updateBlockType`, and `updateBlockTypeForSelection` commands.
- Produces: conversion behavior that removes one outer `[[` / `]]` pair when the destination block type is `note`.

- [ ] **Step 1: Write failing command tests**

Add cases proving conversion of `[[ rewrite this ]]` yields `rewrite this`, incomplete delimiters remain unchanged, cursor mapping accounts for the removed opening delimiter, and bulk conversion normalizes every selected block.

- [ ] **Step 2: Verify the command tests fail for missing note normalization**

Run: `pnpm --filter @stagistic/editor test -- src/editor/tiptap/scriptBlock/commands.test.ts`

Expected: the new note conversion assertions fail because `[[` and `]]` remain in `textContent`.

- [ ] **Step 3: Implement one delimiter normalizer used by all conversion paths**

Replace the aside-only helper with a helper that resolves delimiters from the destination type:

```ts
const BLOCK_DELIMITERS: Partial<Record<BlockNodeType, readonly [string, string]>> = {
    aside: ['(', ')'],
    note: ['[[', ']]'],
};
```

Delete only one complete outer pair, deleting the closing delimiter before the opening delimiter so positions remain valid. Call it from `updateBlockType`, `updateBlockTypeForSelection`, and `setBlockTypeWithSelection`, preserving the existing selection restoration flow.

- [ ] **Step 4: Verify command tests pass**

Run: `pnpm --filter @stagistic/editor test -- src/editor/tiptap/scriptBlock/commands.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing browser assertions for note presentation**

Extend the mini editor browser test with a note block assertion that its computed font style is `italic`, and that `::before` / `::after` computed `content` values are `"[["` and `"]]"`.

- [ ] **Step 6: Verify the browser assertion fails**

Run: `pnpm --filter @stagistic/editor test:browser -- src/editor/mini/MiniScriptEditor.browser.test.tsx`

Expected: the note pseudo-element content and italic style assertions fail.

- [ ] **Step 7: Implement note presentation and default**

Set `noteSpec.defaultSettings.isItalic` to `true`. Update `note.module.css` to mirror the aside mechanics with two-character delimiters: relative positioning, left padding for `[[`, non-interactive pseudo-elements, closing `]]`, and an empty-block trailing-break rule that keeps the caret between visible delimiters.

- [ ] **Step 8: Verify editor tests pass**

Run the Task 1 Node and browser commands again. Expected: PASS.

---

### Task 2: Export configuration and note filtering

**Files:**
- Modify: `packages/export/src/config.ts`
- Modify: `packages/export/src/config.test.ts`
- Modify: `packages/export/src/deriveBasicExportPlan.ts`
- Modify: `packages/export/src/deriveBasicExportPlan.test.ts`
- Modify: `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx`

**Interfaces:**
- Produces: `BasicExportConfig.showNotes: boolean` and inherited `IntegratedScoreExportConfig.showNotes`.
- Produces: `deriveBasicExportPlan(config, script)` whose output document excludes `note` blocks when `showNotes` is false.

- [ ] **Step 1: Write failing export default and plan tests**

Assert that `BASIC_DEFAULTS.showNotes` and `INTEGRATED_SCORE_DEFAULTS.showNotes` are `true`. Add a script fixture containing a `note` between printable blocks and assert:

```ts
expect(deriveBasicExportPlan(BASIC_DEFAULTS, script).doc.content.map(node => node.type))
    .toContain('note');
expect(deriveBasicExportPlan({...BASIC_DEFAULTS, showNotes: false}, script).doc.content.map(node => node.type))
    .not.toContain('note');
```

Also assert that the forced-break plan is derived from the note-free document.

- [ ] **Step 2: Verify the export tests fail**

Run: `pnpm --filter @stagistic/export test -- src/config.test.ts src/deriveBasicExportPlan.test.ts`

Expected: TypeScript/test failure because `showNotes` does not exist and notes remain in the plan.

- [ ] **Step 3: Add the config field and filter before planning**

Add `showNotes: boolean` to `BasicExportConfig` and set it to `true` in `BASIC_DEFAULTS`. In `deriveBasicExportPlan`, derive an input document:

```ts
const inputDoc = config.showNotes
    ? script.doc
    : {...script.doc, content: script.doc.content.filter(node => getScriptBlockNodeType(node) !== 'note')};
```

Pass `inputDoc` into character filtering and use the resulting document for pagination. When full-script pagination is preserved, use `inputDoc` rather than the original document so hidden notes never reach PDF transcription.

- [ ] **Step 4: Update template default cloning**

Copy `showNotes` in `cloneDefaults()` so each mounted template has its own complete `BasicExportConfig` value.

- [ ] **Step 5: Verify export tests pass**

Run the Task 2 export test command. Expected: PASS.

---

### Task 3: Export Content module

**Files:**
- Create: `packages/app-routes/src/routes/script/export/modules/ContentModule.tsx`
- Create: `packages/app-routes/src/routes/script/export/modules/ContentModule.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx`

**Interfaces:**
- Consumes: `value: boolean` and `onChange: (showNotes: boolean) => void`.
- Produces: a `Content` options module with a `Show notes` switch.

- [ ] **Step 1: Write the failing browser test**

Render `ContentModule` with `value={true}`, assert the `Show notes` switch is selected, toggle it, and assert the real change handler receives `false`.

- [ ] **Step 2: Verify the browser test fails**

Run: `pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/export/modules/ContentModule.browser.test.tsx`

Expected: import/module failure because `ContentModule` does not exist.

- [ ] **Step 3: Implement the module**

Use the existing module layout and shared `Switch`:

```tsx
export const ContentModule = ({value, onChange}: {
    value: boolean,
    onChange: (value: boolean) => void,
}) => (
    <div className={styles.module}>
        <h3 className={styles.title}>Content</h3>
        <Switch isSelected={value} onChange={onChange}>Show notes</Switch>
    </div>
);
```

- [ ] **Step 4: Wire the module before page breaks**

Mount `ContentModule` in `BasicExportTemplate` immediately before `PageBreakModule` and update the complete config with `{...previous, showNotes}`.

- [ ] **Step 5: Verify the module and template tests pass**

Run the Task 3 browser test and the existing `ScriptExportRoute` browser test. Expected: PASS.

---

### Task 4: Landing syntax copy and final verification

**Files:**
- Modify: `apps/landing/src/pages/syntax.astro`

**Interfaces:**
- Consumes: existing landing syntax reference content.
- Produces: author-note documentation without any claim that notes are never printed.

- [ ] **Step 1: Update the landing copy**

Change the example from `[[ a note to self — never printed ]]` to `[[ a note to self ]]`, change the reference label from `Author note (never printed)` to `Author note`, and remove the rendered note `(the note is not printed)` without changing the documented `[[ ... ]]` syntax.

- [ ] **Step 2: Run focused package checks**

Run:

```bash
pnpm --filter @stagistic/script typecheck
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/export typecheck
pnpm --filter @stagistic/app-routes typecheck
pnpm --filter @stagistic/landing typecheck
pnpm --filter @stagistic/export test
```

Expected: all commands PASS, except any already documented pre-existing browser failures must be reported without weakening assertions.

- [ ] **Step 3: Run canonical lint on changed implementation files**

Run `pnpm lint`. Expected: PASS or report unrelated baseline failures.

- [ ] **Step 4: Update the code graph**

Run: `graphify update .`

Expected: graph outputs refresh successfully.

- [ ] **Step 5: Review the final diff and prepare the commit message**

Confirm user changes are preserved and no schema or migration files changed. Suggested commit message for the user:

```text
feat: style notes and add export visibility control
```

Do not run `git commit`.
