# Character Delimiter and Default Indent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atomically canonicalize typed character delimiters and set the default character left indent to `20ch`.

**Architecture:** Keep delimiter behavior in the existing script-block text input handler and reuse `normalizeCharacterEditorDelimiters`. Keep layout ownership in the canonical character block spec so all default-settings consumers inherit the same value.

**Tech Stack:** TypeScript, ProseMirror/Tiptap, Vite Plus tests, pnpm.

## Global Constraints

- Do not commit; leave changes for user review and provide a suggested commit message.
- Use arrow functions and existing repository formatting.
- Do not bump `SCRIPT_DOCUMENT_SCHEMA_VERSION`; the stored document shape and semantics do not change.
- Do not alter explicit per-script settings or the landing mini editor.

---

### Task 1: Atomic character delimiter input

**Files:**
- Create: `packages/editor/src/editor/tiptap/scriptBlock/handlers/textInput.test.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/handlers/textInput.ts`

**Interfaces:**
- Consumes: `normalizeCharacterEditorDelimiters(line: string): string`
- Produces: existing `handleTextInput(editor, from, to, text, blockCasing?)` behavior with one dispatched normalized transaction

- [ ] **Step 1: Write the failing regression test**

Create a real ProseMirror character block containing `ALEX `, call `handleTextInput` with `/`, record every dispatched document text, and assert:

```ts
expect(dispatchedTexts).toEqual(['ALEX/']);
expect(state.selection.from).toBe(6);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @stagistic/editor test -- src/editor/tiptap/scriptBlock/handlers/textInput.test.ts
```

Expected: FAIL because the current handler dispatches `ALEX /` and then `ALEX/`.

- [ ] **Step 3: Implement one-transaction normalization**

Build the prospective block text around the current selection, normalize it, replace the active block once, and set the caret after the normalized delimiter.

- [ ] **Step 4: Run the test and verify GREEN**

Run the same focused editor test. Expected: PASS with one dispatched state.

### Task 2: Default character indent

**Files:**
- Create: `packages/script/src/blocks/derived/defaultBlockSettings.test.ts`
- Modify: `packages/script/src/blocks/specs/character.ts`

**Interfaces:**
- Consumes: `buildDefaultBlockSettings(): BlockSettings`
- Produces: character defaults with `indentLeftChars: 20` and `indentRightChars: 3`

- [ ] **Step 1: Write the failing default-layout test**

Assert the derived character settings equal the hand-checked layout contract:

```ts
expect(buildDefaultBlockSettings().character).toMatchObject({
    indentLeftChars: 20,
    indentRightChars: 3,
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @stagistic/script test -- src/blocks/derived/defaultBlockSettings.test.ts
```

Expected: FAIL because the current left indent is `30`.

- [ ] **Step 3: Change the canonical default**

Set `characterSpec.defaultSettings.indentLeftChars` to `20`.

- [ ] **Step 4: Run the test and verify GREEN**

Run the same focused script test. Expected: PASS.

### Task 3: Verification and handoff

**Files:**
- Verify all files changed in Tasks 1–2.

**Interfaces:**
- Consumes: completed delimiter and layout changes
- Produces: verified uncommitted patch

- [ ] **Step 1: Run package tests**

```bash
pnpm --filter @stagistic/editor test
pnpm --filter @stagistic/script test
```

- [ ] **Step 2: Run package typechecks**

```bash
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/script typecheck
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

- [ ] **Step 4: Update the knowledge graph**

```bash
graphify update .
```

- [ ] **Step 5: Review the final diff**

Confirm there are no unrelated changes, no schema-version bump, and no commit.
