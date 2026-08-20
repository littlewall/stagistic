# Scene Heading Protected Deletion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a scene heading impossible to delete via ordinary text editing, and add explicit, confirmation-gated deletion of a single scene heading from the block-action menu and the attribute manager.

**Architecture:** The scene number moves from a left-gutter CSS `::before` to an inline widget decoration at the start of the block's text (still computed, never stored). A keymap barrier plus a `filterTransaction` guard prevent scene nodes from being removed by editing. Explicit deletion mirrors the existing **act deletion** flow (`buildDeleteActContent`/`removeActBlockById` → `editor.commands.setContent`) and the existing **DeleteMusicModal** confirmation, surfaced from the editor to app-routes via a new `DeleteSceneRequest`. Removing the heading node lets `documentProjection` prune the `scriptScenes` row and cascade `scriptSceneLocations` (places) with no extra deletion code.

**Tech Stack:** TypeScript, TipTap/ProseMirror, React, Drizzle + PGlite, vite-plus (`vp test`) with a separate browser project (`test:browser`), eslint + stylelint.

**Spec:** `docs/superpowers/specs/2026-08-18-scene-heading-deletion-design.md`

## Global Constraints

- **Never run `git commit` / `git push`** (AGENTS.md golden rule). Each task's final step stages the changes and proposes a commit message; the user performs the commit.
- **v1 scope:** delete the **single scene heading block only**. Do NOT implement "delete whole scene (heading + blocks under it)" or typed ("delete block") confirmation — deferred.
- **Barrier applies to deletion only.** Arrow-key navigation (`ArrowUp/Down/Left/Right`) must keep ProseMirror's default behavior across scene boundaries; only `Backspace`/`Delete` are constrained.
- **Range/programmatic deletion that would remove a scene node is rejected as a whole in v1** (the offending edit is blocked; nothing is deleted). This is the simple, safe interpretation of the spec's "scene node survives" for range selections.
- **First scene is never deletable.** The block-action provider returns `[]` for it (hiding the `⋮` trigger via `BlockGutterControls.tsx:72`), and the attribute manager hides/disables its delete control.
- **Modal copy (verbatim):** Title `Delete scene heading?` — Body `Its synopsis and places will be removed. Blocks in this scene stay and move under the previous scene.` — Buttons `Cancel` / `Delete heading`.
- **Known limitation (intended):** undo restores the heading block but NOT `synopsis`/`places` (projection re-creates an empty scene). Assert this in tests so it's deliberate.
- `vite.config.ts` is the test-runner config; the gitignored compiled `vite.config.js` must never be edited/committed.

**Commands (run from repo root unless noted):**
- Node/logic tests (one pkg): `pnpm -C packages/<pkg> test` → single file: `pnpm -C packages/<pkg> exec vp test run <relative-path>`
- Browser tests (editor): `pnpm -C packages/editor test:browser` → single file: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts <relative-path>`
- Browser tests (app-routes): `pnpm -C packages/app-routes test:browser`
- Typecheck: `pnpm typecheck` — Lint: `pnpm lint`

---

## File Structure

- `packages/editor/src/editor/tiptap/extensions/SceneNumberingExtension.ts` — swap node decoration for an inline widget at block start.
- `packages/editor/src/editor/blocks/scene/scene.module.css` — remove gutter positioning; style the inline widget.
- `packages/editor/src/editor/tiptap/scriptBlock/sceneDeletionGuard.ts` *(new)* — pure predicates for the keymap barrier.
- `packages/editor/src/editor/tiptap/scriptBlock/handlers/index.ts` — call the barrier from `handleKeyDown`.
- `packages/editor/src/editor/tiptap/extensions/SceneGuardExtension.ts` *(new)* — `filterTransaction` rejecting non-explicit scene-node removal.
- `packages/editor/src/editor/hooks/blockMutations.ts` — add `removeSceneBlockById` + `buildDeleteSceneHeadingContent` (mirror the act helpers).
- `packages/editor/src/editor/components/blockActions/sceneActions.ts` *(new)* — `resolveSceneActions` provider (empty for first scene).
- `packages/editor/src/editor/components/blockActions/blockActionRegistry.ts` — register the provider.
- `packages/editor/src/editor/components/blockActions/actionTypes.ts` — add `'delete'` to `BlockActionIcon`.
- `packages/editor/src/editor/contracts.ts` — add `DeleteSceneRequest` + wire into `EditorStructureRequests`.
- `packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.tsx` (+ `.module.css`) *(new)* — confirmation modal.
- app-routes editor host — render the modal on request, run the delete on confirm.
- `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx` + `packages/ui/src/dialogs/AttributeManagerSceneDetail.tsx` — delete control + first-scene guard.

---

### Task 1: Scene number as inline widget decoration — ✅ DONE (verified)

> Also fixed a regression: excluded the `.scene-number` widget from `copyVisibleScriptSelection` in `scriptBlock/clipboard.ts` (widget text leaked into DOM-based clipboard). Updated `useEditorLifecycle.browser.test.tsx` to assert the number on the widget span instead of the block dataset. Remaining `paginationGolden` + `BlockActionMenu` screenshot reds are pre-existing (fail identically at baseline).

**Files:**
- Modify: `packages/editor/src/editor/tiptap/extensions/SceneNumberingExtension.ts`
- Modify: `packages/editor/src/editor/blocks/scene/scene.module.css`
- Test: `packages/editor/src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx` *(new)*

**Interfaces:**
- Produces: unchanged public surface (`SceneNumberingExtension`). Widgets carry class `scene-number` and attribute `data-scene-number`.

- [x] **Step 1: Write the failing browser test**

```tsx
// sceneNumbering.browser.test.tsx
import {expect, test} from 'vitest';
import {mountEditorWithDoc} from '../../../test-utils/mountEditor'; // reuse existing editor test harness

test('scene number renders as a non-editable widget at the start of the scene text', async () => {
    const {container} = await mountEditorWithDoc([
        {type: 'scene', text: 'INT. HOUSE'},
        {type: 'stageDirection', text: 'A room.'},
    ]);

    const scene = container.querySelector('[data-block-type="scene"]')!;
    const widget = scene.querySelector('.scene-number') as HTMLElement;

    expect(widget).not.toBeNull();
    expect(widget.getAttribute('data-scene-number')).toBe('1');
    expect(widget.getAttribute('contenteditable')).toBe('false');
    // widget precedes the text content in DOM order
    expect(scene.textContent?.startsWith('1')).toBe(true);
});
```

> If `mountEditorWithDoc`/`test-utils` differ, use the harness already used by `musicNode.browser.test.tsx` in the same package — mirror its setup imports.

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx`
Expected: FAIL (`.scene-number` widget not found — number is still a `::before`).

- [x] **Step 3: Convert decorations to inline widgets**

In `buildSceneNumberDecorations`, replace `Decoration.node(...)` with a widget placed at the block content start (`pos + 1`):

```ts
const widget = () => {
    const el = document.createElement('span');
    el.className = 'scene-number';
    el.setAttribute('data-scene-number', String(sceneNumber));
    el.setAttribute('contenteditable', 'false');
    el.textContent = `${sceneNumber}.`;
    return el;
};

decorations.push(Decoration.widget(pos + 1, widget, {
    side: -1,            // sit before inline content, at the very start
    ignoreSelection: true,
    key: `scene-number-${sceneNumber}`,
}));
```

Keep the existing `transactionTouchesStructureBlocks` recompute logic unchanged.

- [x] **Step 4: Style the widget; remove gutter positioning**

In `scene.module.css`, delete the `&[data-scene-number]::before { ... }` block and add:

```css
.scene :global(.scene-number) {
    pointer-events: none;
    user-select: none;
    margin-right: var(--space-sm);
    font-weight: var(--font-weight-bold);
    font-style: normal;
    color: var(--color-text-muted);
    text-transform: none;
    text-decoration: none;
}
```

- [x] **Step 5: Run tests to verify pass**

Run: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx`
Expected: PASS. Then `pnpm -C packages/editor test:browser` to confirm no regression in music/scene screenshots.

- [x] **Step 6: Verify export is unaffected**

Run: `pnpm -C packages/export test`
Expected: PASS (number was never in block text; `scenes.test.ts` unchanged).

- [x] **Step 7: Stage & propose commit (user commits)**

```bash
git add packages/editor/src/editor/tiptap/extensions/SceneNumberingExtension.ts \
        packages/editor/src/editor/blocks/scene/scene.module.css \
        packages/editor/src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx
```
Proposed message: `feat(editor): render scene number as inline widget at text start`

---

### Task 2: Keymap deletion barrier (Backspace at scene start, Delete before scene) — ✅ DONE (verified)

> `sceneDeletionGuard.ts` (predicates), unit test (7 pass), live keymap browser test (4 pass, real `userEvent` keys). Wired into `handleKeyDown` after the Tab block. Editor typecheck + eslint + stylelint clean. Full editor browser suite: only the 2 pre-existing screenshot reds remain.

**Files:**
- Create: `packages/editor/src/editor/tiptap/scriptBlock/sceneDeletionGuard.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/handlers/index.ts`
- Test: `packages/editor/src/editor/tiptap/scriptBlock/sceneDeletionGuard.test.ts` *(new)*

**Interfaces:**
- Produces:
  - `shouldBlockBackspace(state: EditorState): boolean` — true when a collapsed caret sits at the start of a `scene` block (a Backspace there would merge/remove it).
  - `shouldBlockForwardDelete(state: EditorState): boolean` — true when a collapsed caret sits at the end of a block whose next sibling is a `scene` block.

- [x] **Step 1: Write failing unit tests**

```ts
// sceneDeletionGuard.test.ts
import {expect, test} from 'vitest';
import {shouldBlockBackspace, shouldBlockForwardDelete} from './sceneDeletionGuard';
import {buildState} from './test-helpers/buildState'; // small helper: builds an EditorState from block descriptors + caret

test('blocks Backspace at the start of a scene block', () => {
    const state = buildState([{type: 'scene', text: 'INT. HOUSE'}], {block: 0, offset: 0});
    expect(shouldBlockBackspace(state)).toBe(true);
});

test('does not block Backspace mid scene text', () => {
    const state = buildState([{type: 'scene', text: 'INT. HOUSE'}], {block: 0, offset: 4});
    expect(shouldBlockBackspace(state)).toBe(false);
});

test('blocks forward Delete at end of block preceding a scene', () => {
    const state = buildState(
        [{type: 'stageDirection', text: 'A room.'}, {type: 'scene', text: 'INT. HOUSE'}],
        {block: 0, offset: 7},
    );
    expect(shouldBlockForwardDelete(state)).toBe(true);
});

test('does not block forward Delete when next block is not a scene', () => {
    const state = buildState(
        [{type: 'stageDirection', text: 'A room.'}, {type: 'dialogue', text: 'Hi'}],
        {block: 0, offset: 7},
    );
    expect(shouldBlockForwardDelete(state)).toBe(false);
});
```

> If no `buildState` helper exists, add a minimal one under `scriptBlock/test-helpers/` using the editor's existing schema builder (see how `sceneReorder`/guard tests construct docs). Keep it in this task.

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm -C packages/editor exec vp test run src/editor/tiptap/scriptBlock/sceneDeletionGuard.test.ts`
Expected: FAIL (`shouldBlockBackspace` not defined).

- [x] **Step 3: Implement the guard predicates**

```ts
// sceneDeletionGuard.ts
import type {EditorState} from '@tiptap/pm/state';
import {normalizeBlockNodeType} from '../scriptCore';

const isSceneNode = (node: {attrs: {blockType?: unknown}, type: {name: string}} | null | undefined) =>
    !!node && normalizeBlockNodeType(node.attrs.blockType ?? node.type.name) === 'scene';

export const shouldBlockBackspace = (state: EditorState): boolean => {
    const {$from, empty} = state.selection;
    if (!empty) return false;
    const parent = $from.parent;
    return isSceneNode(parent) && $from.parentOffset === 0;
};

export const shouldBlockForwardDelete = (state: EditorState): boolean => {
    const {$from, empty} = state.selection;
    if (!empty) return false;
    if ($from.parentOffset !== $from.parent.content.size) return false; // not at block end
    const indexInDoc = $from.index(0); // top-level index of current block
    const nextTopLevel = state.doc.maybeChild(indexInDoc + 1);
    return isSceneNode(nextTopLevel);
};
```

> Verify `$from.index(0)` returns the top-level block index in this schema; if blocks are nested under acts, resolve the top-level depth used elsewhere (see `collectTopLevelBlocks` in `sceneReorder.ts`) and adjust.

- [x] **Step 4: Wire into `handleKeyDown`**

In `handlers/index.ts`, immediately after the `Tab` handling block (before resolving the per-type handler), add:

```ts
if (event.key === 'Backspace' && shouldBlockBackspace(editor.state)) {
    event.preventDefault();
    return true;
}

if (event.key === 'Delete' && shouldBlockForwardDelete(editor.state)) {
    event.preventDefault();
    return true;
}
```

Import: `import {shouldBlockBackspace, shouldBlockForwardDelete} from '../sceneDeletionGuard';`

- [x] **Step 5: Run unit tests to verify pass**

Run: `pnpm -C packages/editor exec vp test run src/editor/tiptap/scriptBlock/sceneDeletionGuard.test.ts`
Expected: PASS.

- [x] **Step 6: Add a browser test for the live keymap**

```tsx
// sceneDeletion.browser.test.tsx (new)
test('Backspace at scene start does not merge the scene into the previous block', async () => {
    const {editor, placeCaret, pressKey, blockTypes} = await mountEditorWithDoc([
        {type: 'stageDirection', text: 'A room.'},
        {type: 'scene', text: 'INT. HOUSE'},
    ]);
    placeCaret({block: 1, offset: 0});
    await pressKey('Backspace');
    expect(blockTypes()).toEqual(['stageDirection', 'scene']); // scene survives, no merge
});

test('ArrowLeft still moves the caret out of the scene block', async () => {
    const {placeCaret, pressKey, caretBlockIndex} = await mountEditorWithDoc([
        {type: 'stageDirection', text: 'A room.'},
        {type: 'scene', text: 'INT. HOUSE'},
    ]);
    placeCaret({block: 1, offset: 0});
    await pressKey('ArrowLeft');
    expect(caretBlockIndex()).toBe(0); // navigation unaffected
});
```

Run: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts src/editor/tiptap/scriptBlock/sceneDeletion.browser.test.tsx`
Expected: PASS.

- [x] **Step 7: Stage & propose commit (user commits)**

```bash
git add packages/editor/src/editor/tiptap/scriptBlock/sceneDeletionGuard.ts \
        packages/editor/src/editor/tiptap/scriptBlock/sceneDeletionGuard.test.ts \
        packages/editor/src/editor/tiptap/scriptBlock/handlers/index.ts \
        packages/editor/src/editor/tiptap/scriptBlock/sceneDeletion.browser.test.tsx
```
Proposed message: `feat(editor): block Backspace/Delete from removing a scene heading`

---

### Task 3: Transaction guard for range / programmatic scene removal — ✅ DONE (verified)

> `SceneGuardExtension.ts` rejects any doc-changing transaction that reduces the scene count, bypassing on `sceneDeleteAllowed` (Task 4) and `preventUpdate` (every sanctioned structural mutation via `setContent(..., {emitUpdate: false})`). Registered in `useEditorExtensions.ts`. Browser test (2 pass: range-delete spanning a scene rejected; select-all + Delete keeps both scenes). Editor typecheck + eslint clean; full editor browser suite green except the 2 pre-existing screenshot reds.

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/SceneGuardExtension.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts` (register the extension)
- Test: `packages/editor/src/editor/tiptap/extensions/sceneGuard.browser.test.tsx` *(new)*

**Interfaces:**
- Produces: `SceneGuardExtension` (TipTap `Extension`). Transactions carrying meta `sceneDeleteAllowed === true` bypass the guard.
- Consumes (Task 4 sets the meta): `tr.setMeta('sceneDeleteAllowed', true)`.

- [x] **Step 1: Write the failing browser test**

```tsx
// sceneGuard.browser.test.tsx
test('deleting a range that spans a scene heading is rejected (nothing deleted)', async () => {
    const {selectRange, pressKey, blockTypes, textOf} = await mountEditorWithDoc([
        {type: 'stageDirection', text: 'Before'},
        {type: 'scene', text: 'INT. HOUSE'},
        {type: 'stageDirection', text: 'After'},
    ]);
    selectRange({fromBlock: 0, fromOffset: 3}, {toBlock: 2, toOffset: 2}); // spans the scene
    await pressKey('Delete');
    expect(blockTypes()).toEqual(['stageDirection', 'scene', 'stageDirection']); // scene intact
    expect(textOf(0)).toBe('Before');
});

test('select-all + Delete keeps every scene node', async () => {
    const {selectAll, pressKey, blockTypes} = await mountEditorWithDoc([
        {type: 'scene', text: 'S1'}, {type: 'dialogue', text: 'hi'}, {type: 'scene', text: 'S2'},
    ]);
    selectAll();
    await pressKey('Delete');
    expect(blockTypes().filter(t => t === 'scene').length).toBe(2);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts src/editor/tiptap/extensions/sceneGuard.browser.test.tsx`
Expected: FAIL (scene node gets removed by the range delete).

- [x] **Step 3: Implement the guard extension**

```ts
// SceneGuardExtension.ts
import {Extension} from '@tiptap/core';
import type {Node as PmNode} from '@tiptap/pm/model';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {isScriptBlockNodeName, normalizeBlockNodeType} from '../scriptCore';

const countSceneNodes = (doc: PmNode): number => {
    let n = 0;
    doc.descendants(node => {
        if (!isScriptBlockNodeName(node.type.name)) return true;
        if (normalizeBlockNodeType(node.attrs.blockType) === 'scene') n += 1;
        return false;
    });
    return n;
};

export const SceneGuardExtension = Extension.create({
    name: 'sceneGuard',
    addProseMirrorPlugins() {
        return [new Plugin({
            key: new PluginKey('sceneGuard'),
            filterTransaction(tr, state) {
                if (!tr.docChanged) return true;
                if (tr.getMeta('sceneDeleteAllowed') === true) return true;
                // Reject any edit that reduces the number of scene nodes.
                return countSceneNodes(tr.doc) >= countSceneNodes(state.doc);
            },
        })];
    },
});
```

- [x] **Step 4: Register the extension**

In `useEditorExtensions.ts`, add `SceneGuardExtension` to the extensions array (near `SceneNumberingExtension`). Import it.

- [x] **Step 5: Run tests to verify pass**

Run: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts src/editor/tiptap/extensions/sceneGuard.browser.test.tsx`
Expected: PASS. Then `pnpm -C packages/editor test:browser` — confirm no regressions (esp. reorder, act insert/delete, which must NOT reduce scene count except through the sanctioned meta).

> If any legitimate flow (e.g. act delete, scene reorder via `setContent`) trips the guard, tag its transaction with `sceneDeleteAllowed` (act/scene structural mutations already dispatch via `structureRequestMutations.ts` — set the meta there). Note it and cover with the existing structure tests.

- [x] **Step 6: Stage & propose commit (user commits)**

```bash
git add packages/editor/src/editor/tiptap/extensions/SceneGuardExtension.ts \
        packages/editor/src/editor/useEditorExtensions.ts \
        packages/editor/src/editor/tiptap/extensions/sceneGuard.browser.test.tsx
```
Proposed message: `feat(editor): reject non-explicit transactions that drop a scene node`

---

### Task 4: Editor scene-delete mutation + command — ✅ DONE (verified)

> Added `removeSceneBlockById` + `buildDeleteSceneHeadingContent(currentValue, blockId): ScriptDocument | null` to `blockMutations.ts` (recursive filter mirroring `removeActBlockById`, guarded on `getScriptBlockNodeType(node) === 'scene'`). Re-exported both from `structureRequestMutations.ts`. Unit test `blockMutations.scene.test.ts` (6 pass): removes only the target scene, re-parents trailing blocks as siblings (flat top-level list → automatic), null when not found / not a scene, attrs preserved by reference, `removeSceneBlockById` change flag. Editor typecheck + eslint clean.
>
> **Deviation from the illustrative snippet (intentional, per the plan's own Step-4 note "match the exact meta/emit pattern used by act delete"):** No standalone `deleteSceneHeading`/`sceneDeletionCommand.ts`. The illustrative `deleteSceneHeading` snippet does a raw `setContent` + dispatch and never fires `onValueChange`, which would violate requirement (c) (projection must persist/prune). Instead the delete is applied in Task 5's `deleteSceneRequest` handler via the shared `tryCommitDocument` → `commitDocument` path — identical to `deleteActRequest`. That path already: (a) makes it one undo unit (setContent transaction is in history → undo restores the heading), (b) stamps `preventUpdate` so Task 3's `SceneGuardExtension` permits the scene-count drop (no separate `sceneDeleteAllowed` meta needed for this flow), and (c) fires `onValueChange`/`onIndexChange` so the projection prunes the `scriptScenes` row + cascades places.

**Files:**
- Modify: `packages/editor/src/editor/hooks/blockMutations.ts` (add `removeSceneBlockById`, `buildDeleteSceneHeadingContent`)
- Create: `packages/editor/src/editor/hooks/sceneDeletionCommand.ts` (a `deleteSceneHeading(editor, blockId)` helper) OR add a TipTap command in an existing commands extension — pick the pattern matching act delete.
- Test: `packages/editor/src/editor/hooks/blockMutations.scene.test.ts` *(new)*

**Interfaces:**
- Produces:
  - `removeSceneBlockById(content: ScriptNode[], blockId: string): [ScriptNode[], boolean]` — removes only the scene block node (mirror of `removeActBlockById`).
  - `buildDeleteSceneHeadingContent(currentValue: ScriptDocument, blockId: string): ScriptDocument | null` — mirror of `buildDeleteActContent`.
  - `deleteSceneHeading(editor, blockId): void` — applies the new document via `editor.commands.setContent(...)` and dispatches with `sceneDeleteAllowed` meta so Task 3's guard permits it.

- [x] **Step 1: Write failing unit tests**

```ts
// blockMutations.scene.test.ts
import {expect, test} from 'vitest';
import {buildDeleteSceneHeadingContent} from './blockMutations';

const doc = {content: [
    {type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'S1'}]},
    {type: 'stageDirection', attrs: {id: 'b1'}, content: [{type: 'text', text: 'x'}]},
    {type: 'scene', attrs: {id: 's2'}, content: [{type: 'text', text: 'S2'}]},
]} as any;

test('removes only the targeted scene block; following blocks remain as siblings', () => {
    const next = buildDeleteSceneHeadingContent(doc, 's2')!;
    expect(next.content.map((n: any) => n.attrs.id)).toEqual(['s1', 'b1']);
});

test('re-parenting a non-first scene keeps blocks under the previous scene', () => {
    const withTail = {content: [...doc.content, {type: 'dialogue', attrs: {id: 'd1'}, content: []}]} as any;
    const next = buildDeleteSceneHeadingContent(withTail, 's2')!;
    // s2 gone; d1 now follows b1 with no scene boundary between them and s1
    expect(next.content.map((n: any) => n.attrs.id)).toEqual(['s1', 'b1', 'd1']);
});

test('returns null when block id is not a scene / not found', () => {
    expect(buildDeleteSceneHeadingContent(doc, 'nope')).toBeNull();
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm -C packages/editor exec vp test run src/editor/hooks/blockMutations.scene.test.ts`
Expected: FAIL (`buildDeleteSceneHeadingContent` not defined).

- [x] **Step 3: Implement the mutation helpers**

Mirror `removeActBlockById`/`buildDeleteActContent` in the same file. Because scenes are flat top-level nodes with no children, removal is a filter by `attrs.id` guarded on scene node type:

```ts
export const removeSceneBlockById = (
    content: ScriptNode[],
    blockId: string,
): [ScriptNode[], boolean] => {
    let didChange = false;
    const next = content.filter(node => {
        const isTarget = node.attrs?.id === blockId
            && (resolveScriptBlockNodeType(node.type) ?? node.type) === 'scene';
        if (isTarget) didChange = true;
        return !isTarget;
    });
    return [next, didChange];
};

export const buildDeleteSceneHeadingContent = (
    currentValue: ScriptDocument,
    blockId: string,
): ScriptDocument | null => {
    const [nextContent, didChange] = removeSceneBlockById(currentValue.content, blockId);
    if (!didChange) return null;
    return {...currentValue, content: nextContent};
};
```

> Use the same `resolveScriptBlockNodeType`/`ScriptNode`/`ScriptDocument` imports the act helpers already use in this file. If acts nest their children (multi-act docs), reuse the recursive walk pattern from `removeActBlockById` instead of a flat filter so scenes inside an act are found.

- [x] **Step 4: Implement `deleteSceneHeading`**

Mirror the act-delete dispatch in `structureRequestMutations.ts` (`setContent` + a follow-up `editor.view.dispatch` carrying meta). Ensure the applied transaction carries `sceneDeleteAllowed`:

```ts
export const deleteSceneHeading = (editor: Editor, blockId: string): void => {
    const nextDocument = buildDeleteSceneHeadingContent(editor.getJSON() as ScriptDocument, blockId);
    if (!nextDocument) return;
    editor.commands.setContent(nextDocument, {emitUpdate: false});
    const tr = editor.state.tr.setMeta('sceneDeleteAllowed', true).setMeta('addToHistory', true);
    editor.view.dispatch(tr);
    editor.commands.focus();
};
```

> Match the exact meta/emit pattern used by act delete in `structureRequestMutations.ts` (it may split into a surgical transaction + a value-change dispatch). The key requirements: (a) it is one undo unit, (b) the guard permits it, (c) `onValueChange` fires so the projection persists and prunes the `scriptScenes` row.

- [x] **Step 5: Run tests to verify pass**

Run: `pnpm -C packages/editor exec vp test run src/editor/hooks/blockMutations.scene.test.ts`
Expected: PASS.

- [x] **Step 6: Stage & propose commit (user commits)**

```bash
git add packages/editor/src/editor/hooks/blockMutations.ts \
        packages/editor/src/editor/hooks/blockMutations.scene.test.ts \
        packages/editor/src/editor/hooks/sceneDeletionCommand.ts
```
Proposed message: `feat(editor): add scene-heading delete mutation and command`

---

### Task 5: Delete-scene contract + request wiring — ✅ DONE (verified)

> Added `DeleteSceneRequest {sceneHeadingBlockId: string, requestId: number}` to `contracts.ts` (mirrors `DeleteActRequest`), added `deleteSceneRequest?: DeleteSceneRequest | null` to `EditorStructureRequests`, re-exported the type from `index.ts`. Handler in `useEditorStructureRequests.ts` mirrors `deleteActRequest`: dedupe by numeric `requestId`, `buildDeleteSceneHeadingContent` → `tryCommitDocument` (shared act-delete commit path). Editor typecheck (isolated) + eslint clean.
>
> **Deviation:** `requestId` is `number`, not the plan's illustrative `string`/`crypto.randomUUID()`. Every existing structure request (`DeleteActRequest`, `MoveSceneRequest`, …) uses a numeric `requestId` with a numeric dedupe ref; matching that keeps the consumer uniform. Task 8's host will generate it from a counter instead of `randomUUID()`.

**Files:**
- Modify: `packages/editor/src/editor/contracts.ts` (add `DeleteSceneRequest`, extend `EditorStructureRequests`)
- Modify: `packages/editor/src/editor/hooks/useEditorStructureRequests.ts` (handle the new request → call `deleteSceneHeading`)
- Modify: `packages/editor/src/index.ts` (export `DeleteSceneRequest`)
- Test: covered via Task 8 (app-routes) + typecheck here

**Interfaces:**
- Produces:
  ```ts
  export interface DeleteSceneRequest {
      requestId: string,
      sceneHeadingBlockId: string,
  }
  ```
  added to `EditorStructureRequests` as `deleteSceneRequest?: DeleteSceneRequest | null`.
- Consumes: `deleteSceneHeading` (Task 4). The request is fulfilled by the same effect pattern as `deleteActRequest` in `useEditorStructureRequests.ts`.

- [x] **Step 1: Add the contract type**

Mirror `DeleteActRequest` (contracts.ts:80). Add `deleteSceneRequest` to `EditorStructureRequests` (contracts.ts:184) and re-export from `index.ts`.

- [x] **Step 2: Handle the request**

In `useEditorStructureRequests.ts`, mirror the `deleteActRequest` effect: when `deleteSceneRequest` changes and is non-null, call `deleteSceneHeading(editor, deleteSceneRequest.sceneHeadingBlockId)`. Dedupe by `requestId` exactly as the act path does.

- [x] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (new field optional; no consumer breakage).

- [x] **Step 4: Stage & propose commit (user commits)**

```bash
git add packages/editor/src/editor/contracts.ts \
        packages/editor/src/editor/hooks/useEditorStructureRequests.ts \
        packages/editor/src/index.ts
```
Proposed message: `feat(editor): add DeleteSceneRequest structure request`

---

### Task 6: Block-action provider for scene delete (+ first-scene protection) — ✅ DONE (verified)

> `sceneActions.ts` exposes `isFirstSceneBlock(doc, blockId)` (walks the doc, returns the first `scene` block's id) + `resolveSceneActions(context)` (one `Delete scene heading` command for non-first scene blocks, `[]` otherwise). Registered in `blockActionRegistry.ts`; `'delete'` added to `BlockActionIcon`; `BlockActionMenu.tsx` maps `'delete'` → `<TrashIcon>` (renamed the `MusicIcon` helper → `ActionIcon`). Unit test (4 pass), browser test (2 pass: non-first scene shows the ⋮ action trigger + `Delete scene heading` menuitem; first scene has no action trigger). Editor typecheck + eslint clean.
>
> **Deviation:** the command `requestDeleteScene(blockId)` is surfaced via a new `SceneCommandsExtension` (mirrors `MusicCommandsExtension`), configured with `onRequestDeleteScene` threaded through `useEditorExtensions.ts` → `Editor.tsx` → `EditorLifecycleCallbacks`. This is the "expose it the same way the music-remove request is dispatched" path the Step-3 note calls for.

**Files:**
- Create: `packages/editor/src/editor/components/blockActions/sceneActions.ts`
- Modify: `packages/editor/src/editor/components/blockActions/blockActionRegistry.ts`
- Modify: `packages/editor/src/editor/components/blockActions/actionTypes.ts` (add `'delete'` icon)
- Modify: icon rendering map in `BlockActionMenu.tsx` (map `'delete'` → a trash icon)
- Test: `packages/editor/src/editor/components/blockActions/sceneActions.test.ts` *(new)*

**Interfaces:**
- Consumes: `BlockActionContext {editor, blockId, blockType}` (actionTypes.ts:26), the delete command trigger from Task 5 (`onRequestDeleteScene` supplied through editor props — see note).
- Produces: `resolveSceneActions(context): readonly BlockActionItem[]` — one `Delete scene heading` command for scene blocks that are NOT the first scene; `[]` otherwise.

- [x] **Step 1: Write failing unit tests**

```ts
// sceneActions.test.ts
import {expect, test} from 'vitest';
import {isFirstSceneBlock} from './sceneActions';
import {buildDoc} from '../../tiptap/scriptBlock/test-helpers/buildState';

test('first scene block is detected', () => {
    const doc = buildDoc([{type: 'scene', id: 's1'}, {type: 'scene', id: 's2'}]);
    expect(isFirstSceneBlock(doc, 's1')).toBe(true);
    expect(isFirstSceneBlock(doc, 's2')).toBe(false);
});

test('non-scene block is never the first scene', () => {
    const doc = buildDoc([{type: 'stageDirection', id: 'b1'}, {type: 'scene', id: 's1'}]);
    expect(isFirstSceneBlock(doc, 'b1')).toBe(false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/editor exec vp test run src/editor/components/blockActions/sceneActions.test.ts`
Expected: FAIL (`isFirstSceneBlock` not defined).

- [x] **Step 3: Implement provider + first-scene predicate**

```ts
// sceneActions.ts
import type {Node as PmNode} from '@tiptap/pm/model';
import {isScriptBlockNodeName, normalizeBlockNodeType} from '../../tiptap/scriptCore';
import type {BlockActionContext, BlockActionItem} from './actionTypes';

export const isFirstSceneBlock = (doc: PmNode, blockId: string): boolean => {
    let firstSceneId: string | null = null;
    doc.descendants(node => {
        if (firstSceneId) return false;
        if (!isScriptBlockNodeName(node.type.name)) return true;
        if (normalizeBlockNodeType(node.attrs.blockType) === 'scene') {
            firstSceneId = typeof node.attrs.id === 'string' ? node.attrs.id : null;
        }
        return false;
    });
    return firstSceneId === blockId;
};

export const resolveSceneActions = (
    {editor, blockId, blockType}: BlockActionContext,
): readonly BlockActionItem[] => {
    if (blockType !== 'scene') return [];
    if (isFirstSceneBlock(editor.state.doc, blockId)) return [];
    return [{
        kind: 'command',
        id: 'delete-scene-heading',
        label: 'Delete scene heading',
        icon: 'delete',
        run: () => editor.commands.requestDeleteScene?.(blockId),
    }];
};
```

> `requestDeleteScene` is a thin command that surfaces the `DeleteSceneRequest` to the host (so app-routes can show the modal). Add it alongside the editor commands that already surface requests (mirror how music `onRequestRemoveMusic` is triggered). If commands can't reach host callbacks directly, expose it the same way the existing music-remove request is dispatched from the pill.

- [x] **Step 4: Register provider + add `'delete'` icon**

- In `blockActionRegistry.ts`: `const BLOCK_ACTION_PROVIDERS = [resolveMusicBoundaryActions, resolveSceneActions] as const;`
- In `actionTypes.ts`: `export type BlockActionIcon = 'music' | 'musicStart' | 'musicHit' | 'musicOut' | 'delete';`
- In `BlockActionMenu.tsx`: map `'delete'` to a trash/delete icon from `@stagistic/ui` (use an existing icon; grep the icon barrel for `Trash`/`Delete`).

- [x] **Step 5: Run tests to verify pass**

Run: `pnpm -C packages/editor exec vp test run src/editor/components/blockActions/sceneActions.test.ts && pnpm typecheck`
Expected: PASS.

- [x] **Step 6: Browser test — first scene hides the ⋮ trigger**

```tsx
// sceneActions.browser.test.tsx
test('first scene has no block-action trigger; a later scene does', async () => {
    const {triggerFor} = await mountEditorWithDoc([
        {type: 'scene', text: 'S1'}, {type: 'dialogue', text: 'hi'}, {type: 'scene', text: 'S2'},
    ]);
    expect(await triggerFor({block: 0})).toBeNull();     // first scene: no ⋮
    expect(await triggerFor({block: 2})).not.toBeNull();  // second scene: ⋮ present
});
```

Run: `pnpm -C packages/editor exec vp test run -c vitest.browser.config.ts src/editor/components/blockActions/sceneActions.browser.test.tsx`
Expected: PASS.

- [x] **Step 7: Stage & propose commit (user commits)**

```bash
git add packages/editor/src/editor/components/blockActions/sceneActions.ts \
        packages/editor/src/editor/components/blockActions/sceneActions.test.ts \
        packages/editor/src/editor/components/blockActions/sceneActions.browser.test.tsx \
        packages/editor/src/editor/components/blockActions/blockActionRegistry.ts \
        packages/editor/src/editor/components/blockActions/actionTypes.ts \
        packages/editor/src/editor/components/blockActions/BlockActionMenu.tsx
```
Proposed message: `feat(editor): add Delete scene heading block action (hidden on first scene)`

---

### Task 7: Confirmation modal component — ✅ DONE (verified)

> `DeleteSceneHeadingModal.tsx` (+ `.module.css`) mirrors `DeleteMusicModal` exactly (same `ModalDialog` + `Button` primitives, `isDeleting` disables close/Cancel and drives the danger button's `isPending`). Verbatim copy: title `Delete scene heading?`, body `Its synopsis and places will be removed. Blocks in this scene stay and move under the previous scene.`, primary `Delete heading` (danger), secondary `Cancel`. Browser test (3 pass: exact copy present; `onConfirm` fires on `Delete heading`; `onClose` fires on `Cancel`). App-routes typecheck + eslint + stylelint clean.
>
> **Deviation:** the plan's illustrative test used `@testing-library/react`; this repo has no such dep, so the test mirrors the package's actual convention (`AddMusicModal.browser.test.tsx`): `createRoot` render + `userEvent` from `vite-plus/test/browser` + a `findButton` text-content query.

**Files:**
- Create: `packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.tsx`
- Create: `packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.module.css`
- Test: `packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.browser.test.tsx` *(new)*

**Interfaces:**
- Produces:
  ```ts
  interface DeleteSceneHeadingModalProps {
      isOpen: boolean,
      onClose: () => void,
      onConfirm: () => void | Promise<void>,
      isDeleting?: boolean,
  }
  ```

- [x] **Step 1: Write the failing browser test**

```tsx
// DeleteSceneHeadingModal.browser.test.tsx
import {expect, test, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DeleteSceneHeadingModal} from './DeleteSceneHeadingModal';

test('renders the exact copy and fires onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<DeleteSceneHeadingModal isOpen onClose={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByText('Delete scene heading?')).toBeInTheDocument();
    expect(screen.getByText(/Its synopsis and places will be removed\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Delete heading'}));
    expect(onConfirm).toHaveBeenCalledOnce();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/app-routes exec vp test run -c vitest.browser.config.ts src/routes/script/editor/scene/DeleteSceneHeadingModal.browser.test.tsx`
Expected: FAIL (module not found).

- [x] **Step 3: Implement the modal**

Mirror `DeleteMusicModal.tsx` structure (same dialog primitive, button variants, `isDeleting` disabled state). Copy is fixed (Global Constraints). Primary button label `Delete heading` (destructive variant), secondary `Cancel`.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm -C packages/app-routes exec vp test run -c vitest.browser.config.ts src/routes/script/editor/scene/DeleteSceneHeadingModal.browser.test.tsx`
Expected: PASS.

- [x] **Step 5: Stage & propose commit (user commits)**

```bash
git add packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.tsx \
        packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.module.css \
        packages/app-routes/src/routes/script/editor/scene/DeleteSceneHeadingModal.browser.test.tsx
```
Proposed message: `feat(app-routes): add DeleteSceneHeadingModal`

---

### Task 8: Wire block-action delete → modal → editor (editor host) — ✅ DONE (verified)

> Host is `ScriptEditorRoute.tsx`. Extracted the delete handshake into a `useSceneDeletionState` hook (mirrors the existing `useScriptMusicState` extraction): holds `pendingSceneDelete`, `deleteSceneRequest`, and a numeric `requestId` counter; exposes `requestDeleteScene`/`closeSceneDeleteModal`/`confirmDeleteScene`. Route passes `onRequestDeleteScene={requestDeleteScene}`, `requests={{updateMusicRequest, deleteSceneRequest}}`, and renders `<DeleteSceneHeadingModal>` on `pendingSceneDelete`. Hook browser test (4 pass: request opens pending; confirm raises `s2:1` and closes; cancel clears without a request; second confirm increments to `s3:2`; confirm-with-nothing-pending is a no-op). App-routes typecheck + eslint clean.
>
> **Deviations:** (1) `requestId` is a numeric counter (`useRef`), not `crypto.randomUUID()` — matches the Task 5 `DeleteSceneRequest.requestId: number` contract and the existing `updateMusicRequest` pattern. (2) The plan's illustrative test mounts the whole editor host via a `mountEditorHost` helper that does not exist; a full-route mount needs the repository/workspace/settings/character providers. Since the menu→command→callback edge is already covered by Task 6's browser test, the modal→confirm edge by Task 7's, and the request→delete edge by Task 5's handler, the new test locks the remaining host glue (callback → modal → deduped request) at the hook seam, consistent with how `useScriptMusicState` is tested.

**Files:**
- Modify: the app-routes editor host that renders `<Editor>` and owns `EditorStructureRequests` (find via `grep -rln "moveSceneRequest\|deleteActRequest" packages/app-routes/src`).
- Test: `*.browser.test.tsx` alongside that host *(new)*

**Interfaces:**
- Consumes: editor's `onRequestDeleteScene` surface (Task 6 command → host callback) and `deleteSceneRequest` prop (Task 5).
- Produces: on menu "Delete scene heading", the host opens `DeleteSceneHeadingModal`; on confirm it sets `deleteSceneRequest = {requestId, sceneHeadingBlockId}` so the editor runs `deleteSceneHeading`.

- [x] **Step 1: Write the failing browser test**

```tsx
test('deleting a scene heading from the menu removes only the heading and reparents content', async () => {
    const {openBlockMenu, clickMenuItem, confirmModal, blockTypes} = await mountEditorHost([
        {type: 'scene', text: 'S1'},
        {type: 'scene', text: 'S2'},
        {type: 'dialogue', text: 'line'},
    ]);
    await openBlockMenu({block: 1});           // second scene
    await clickMenuItem('Delete scene heading');
    await confirmModal('Delete heading');
    expect(blockTypes()).toEqual(['scene', 'dialogue']); // S2 gone, dialogue reparented under S1
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/app-routes exec vp test run -c vitest.browser.config.ts <new-test-path>`
Expected: FAIL (no modal / delete not wired).

- [x] **Step 3: Wire the host**

- Hold `pendingSceneDelete: {blockId: string} | null` state.
- Pass an `onRequestDeleteScene={(blockId) => setPendingSceneDelete({blockId})}` to `<Editor>` (the prop the Task 6 command calls).
- Render `<DeleteSceneHeadingModal isOpen={pendingSceneDelete !== null} onClose={() => setPendingSceneDelete(null)} onConfirm={...}/>`.
- On confirm, set `deleteSceneRequest={{requestId: crypto.randomUUID(), sceneHeadingBlockId: pendingSceneDelete.blockId}}` and clear pending. Mirror how `deleteActRequest` requestIds are generated in this host.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm -C packages/app-routes exec vp test run -c vitest.browser.config.ts <new-test-path>`
Expected: PASS.

- [x] **Step 5: Stage & propose commit (user commits)** — proposed message: `feat(app-routes): wire scene-heading delete menu action to confirmation modal`

---

### Task 9: Attribute manager delete + first-scene guard — ✅ DONE (verified)

> **Deviations from the plan:**
> - **`AttributeManagerSceneDetail.tsx` NOT modified.** The delete affordance is rendered via the list panel's existing `renderDetailAction` slot in `ScriptAttributeManagerModal.tsx` (same slot the music delete button uses), keeping music/scene deletion consistent and avoiding a new prop surface on the shared detail component.
> - **No `deleteSceneRequest` channel.** The attribute manager renders in `ScriptSettingsModalProvider` — a *parent* of the editor route — so it cannot reach the editor's live request channel. Instead it follows the **music-delete precedent**: `deleteAttributeManagerScene` transforms the working document via `buildDeleteSceneHeadingContent` (newly exported from `@stagistic/editor`) and persists through `applyDocumentChange`, which re-renders the live editor and projections.
> - **First-scene guard resolved by document order, not `createdAt`.** The plan's `createdAt`-ordering caveat is moot: `sceneItems` are already built in document order (`useAttributeManagerItems` reads `liveStructure.rows`), so `firstSceneHeadingBlockId = attributeManagerScenes[0]?.id` is the document-first heading. `isFirstSceneBlock` from the editor is unnecessary here.
> - **Test lives in `ScriptAttributeManagerModal.browser.test.tsx`** (not a new file) as a `describe('ScriptAttributeManagerModal scene actions')` block — createRoot + userEvent, mirroring the music-actions tests. Covers: (a) first scene has no delete action, (b) non-first scene deletes only after confirming `Delete heading` → `onDeleteScene('s2')`, (c) deletion failure keeps the dialog open. 7/7 tests pass; app-routes typecheck + eslint clean.

**Files:**
- Modify: `packages/ui/src/dialogs/AttributeManagerSceneDetail.tsx` (add optional `onDelete?: () => void`, `canDelete: boolean`)
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx` (render delete control for scenes, reuse `DeleteSceneHeadingModal`, drive `deleteSceneRequest`)
- Test: `packages/app-routes/src/routes/script/settings/*.browser.test.tsx` (extend existing scene panel test)

**Interfaces:**
- Consumes: same `deleteSceneRequest` path as Task 8; `isFirstSceneBlock` semantics (the panel must know each scene item's heading block id and whether it is first).
- Produces: scene rows expose a delete affordance except for the first scene.

- [x] **Step 1: Write the failing browser test**

```tsx
test('attribute manager deletes a non-first scene and hides delete for the first', async () => {
    const {sceneRow, deleteButtonFor, confirmModal, sceneCount} = await mountAttributeManager({
        scenes: [{id: 's1', title: 'S1'}, {id: 's2', title: 'S2'}],
    });
    expect(deleteButtonFor('s1')).toBeNull();        // first scene: no delete
    await deleteButtonFor('s2')!.click();
    await confirmModal('Delete heading');
    expect(sceneCount()).toBe(1);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/app-routes exec vp test run -c vitest.browser.config.ts <scene-panel-test-path>`
Expected: FAIL.

- [x] **Step 3: Implement**

- `AttributeManagerSceneDetail`: add a delete button (mirroring the music/character delete button already in `ScriptAttributeManagerModal.tsx:165`), rendered only when `canDelete`.
- In `ScriptAttributeManagerModal.tsx`: compute `canDelete` per scene item (`!isFirst`), open `DeleteSceneHeadingModal` on press, and on confirm drive the same `deleteSceneRequest` used in Task 8 (route through the shared editor-request setter — the attribute manager must have access to the live editor request channel; if it doesn't, thread the same `onRequestDeleteScene` callback down from the editor host).

> Ordering of scene items here is `createdAt` (see `listScriptScenes`), which is NOT document order. "First scene" for protection must be resolved by **document order** (via the editor snapshot / `isFirstSceneBlock`), not list order. Pass the document-first scene heading id into the panel.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm -C packages/app-routes exec vp test run -c vitest.browser.config.ts <scene-panel-test-path>`
Expected: PASS.

- [x] **Step 5: Stage & propose commit (user commits)** — proposed message: `feat(app-routes): delete scene heading from the attribute manager`

---

### Task 10: Projection + undo behavior (db/integration) — ✅ DONE (verified)

> **Notes / deviations:**
> - **No projection source change needed.** Both tests passed on first run: `rebuildScriptProjection` already prunes scene rows absent from the document, and the `script_scene_locations.scene_id → script_scenes.id ON DELETE CASCADE` FK (migration `0017_add_scene_locations.sql`) removes the place assignments. The tests lock the contract in.
> - **Metadata seeded directly, not via query helpers.** The test attaches synopsis via a `scriptScenes` update and a place via a direct `scriptSceneLocations` insert keyed on `makeSceneId('s1','h2')` — enough to prove the cascade without pulling in the `replaceScriptSceneLocations` query surface.
> - **Undo limitation documented:** re-projecting the original document restores the deterministic scene *identity* row (`headingBlockId: 'h2'`) but with `synopsis: null`, `colorHex: null`, `locationId: null` and no scene-location rows — confirming v1 does not resurrect pruned user metadata.
> - 2/2 tests pass; db typecheck + eslint clean.

**Files:**
- Test: `packages/db/src/repo/documentProjection.scene-delete.test.ts` *(new, PGlite)*

**Interfaces:**
- Consumes: `documentProjection` reconciliation (existing) + `bulkDeleteScriptScenes` cascade to `scriptSceneLocations`.

- [x] **Step 1: Write the failing/asserting test**

```ts
// documentProjection.scene-delete.test.ts (PGlite, follow reference_test_db_conventions)
test('removing a scene heading prunes its scriptScenes row and cascades scene_locations', async () => {
    // 1. project a doc with scene s2 that has a place assigned
    // 2. project a doc with s2's heading block removed
    // 3. assert scriptScenes has no row for s2 and scriptSceneLocations has none for it
});

test('re-adding the same heading block id yields a fresh scene with empty metadata (undo limitation)', async () => {
    // project remove, then project the original doc again (simulating undo)
    // assert the scene row for s2 exists but synopsis is null and no places (documents the v1 limitation)
});
```

Follow the PGlite + hand-written-migration conventions from `sceneLocations.test.ts` in the same package.

- [x] **Step 2: Run test to verify it fails / captures behavior**

Run: `pnpm -C packages/db exec vp test run src/repo/documentProjection.scene-delete.test.ts`
Expected: first run RED where behavior differs; adjust assertions to the true reconciliation output, then GREEN.

- [x] **Step 3: Confirm no projection code change needed**

The projection already bulk-deletes scenes absent from the doc (`documentProjection.ts:171`). If the test proves it prunes correctly, no source change — the test only locks the contract in. If a gap appears (e.g., metadata not pruned), fix it in `documentProjection.ts` here.

- [x] **Step 4: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm -C packages/editor test:browser && pnpm -C packages/app-routes test:browser`
Expected: all PASS (note: pre-existing editor browser reds may exist per project notes — compare against baseline, do not fix unrelated reds).

- [x] **Step 5: Stage & propose commit (user commits)** — proposed message: `test(db): lock scene-heading deletion projection + undo limitation`

---

## Self-Review

**Spec coverage:**
- §1 number widget → Task 1. §2 barrier (Backspace/Delete + arrows unaffected) → Task 2; range/select-all → Task 3. §3 caret skips widget → Task 1 (`ignoreSelection`) + Task 2 arrow test. §4 explicit delete (menu + attr manager, heading only, metadata via projection) → Tasks 4–9. §5 modal copy → Task 7. §6 first-scene protection → Task 6 (menu) + Task 9 (attr manager). §7 invariant (first block a scene) → relied on, protected by Task 6. Known limitation (undo) → Task 10. Deferred items intentionally absent.
- Gap check: "attribute manager needs live editor" is called out in Task 9 Step 3 as the one place to resolve the request channel — flagged, not silently assumed.

**Placeholder scan:** No "TBD"/"handle edge cases" steps; each code step carries real code or an exact existing function to mirror by name+path.

**Type consistency:** `deleteSceneHeading`, `buildDeleteSceneHeadingContent`, `removeSceneBlockById`, `DeleteSceneRequest.sceneHeadingBlockId`, `deleteSceneRequest`, `isFirstSceneBlock`, `resolveSceneActions`, `sceneDeleteAllowed` meta, `'delete'` icon — used consistently across Tasks 3–9.
