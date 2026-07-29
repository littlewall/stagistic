# Landing Mini-Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the supplied `One Small Light` screenshot excerpt as a compact, fixed-structure interactive landing preview with visual and caret parity to the real editor.

**Architecture:** Add a public `MiniScriptEditor` to `@stagistic/editor` with a deliberately small TipTap extension profile. A mini-only guard preserves the top-level block signature and protected music node, while the actual editor runtime, music caret behavior, script blocks, character palette, and block-anchor geometry provide parity with the main editor. The Astro landing hydrates the component as a React island and supplies the screenshot's 12-block `One Small Light` fixture.

**Tech Stack:** TypeScript, React 19, TipTap 3, ProseMirror, Astro 7, CSS Modules, Vite Plus browser tests

## Global Constraints

- Do not render a header, status, sidebar, toolbar, settings, context menu, or block-type control.
- The fixed sequence and text match the supplied screenshot's 12 blocks exactly.
- Inline content and the music title are editable; block count, IDs, types, order, and protected music placement are immutable.
- Enter navigates to the next block; Shift+Enter inserts a hard break.
- Backspace/Delete stop at block boundaries.
- Do not add History or expose undo/redo.
- The entire existing preview rectangle is the editor and owns its internal vertical scrollbar.
- Desktop preview is `35rem` wide and only tall enough for the fixture plus about one spare line.
- Typography is Courier Prime `16px` / `1.2`, with real default block spacing and `ch` indents.
- Character cue decorations use the maximum supported color saturation.
- The active icon is bare and centered on the first text line using computed padding-top and line-height.
- Clicking after a trailing music pill moves the caret before the pill.
- Do not change persisted `ScriptDocument` shape or `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Follow the repository's canonical checks. Do not use oxlint/oxfmt.
- Never commit. Prepare the working tree and report a suggested commit message for the user.

---

### Task 1: Fixed document signature and keyboard guard

**Files:**
- Create: `packages/editor/src/editor/mini/MiniEditorGuardExtension.ts`
- Create: `packages/editor/src/editor/mini/MiniEditorGuardExtension.test.ts`

**Interfaces:**
- Consumes: TipTap `Editor`, ProseMirror `Node`, `Transaction`, `Plugin`, and the fixed initial `ScriptDocument`.
- Produces:

```ts
export type MiniEditorStructureSignature = {
    blocks: readonly {id: string, type: string}[],
    music: {blockId: string, musicId: string},
};

export const buildMiniEditorStructureSignature:
    (doc: ProseMirrorNode) => MiniEditorStructureSignature | null;

export const matchesMiniEditorStructureSignature:
    (doc: ProseMirrorNode, signature: MiniEditorStructureSignature) => boolean;

export const MiniEditorGuardExtension: Extension<{
    signature: MiniEditorStructureSignature,
}>;
```

- [ ] **Step 1: Write failing signature tests**

Cover the accepted initial document and reject each structural mutation
independently:

```ts
expect(matchesMiniEditorStructureSignature(originalDoc, signature)).toBe(true);
expect(matchesMiniEditorStructureSignature(withRemovedBlock, signature)).toBe(false);
expect(matchesMiniEditorStructureSignature(withReorderedBlocks, signature)).toBe(false);
expect(matchesMiniEditorStructureSignature(withChangedBlockType, signature)).toBe(false);
expect(matchesMiniEditorStructureSignature(withRemovedMusic, signature)).toBe(false);
expect(matchesMiniEditorStructureSignature(withMovedMusic, signature)).toBe(false);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
pnpm --filter @stagistic/editor test -- \
  src/editor/mini/MiniEditorGuardExtension.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement signature extraction and comparison**

Walk direct document children, resolve each script block's stable `attrs.id`
and TipTap node type, and locate exactly one `musicStart` node by `musicId`.
Return `null` for malformed source documents. Compare every field exactly;
allow changes only below the protected structural attributes.

- [ ] **Step 4: Add failing keyboard and transaction tests**

Create a TipTap editor using the five-block fixture and assert:

```ts
expect(blockCount(editor)).toBe(5);
press(editor, 'Backspace', {at: 'start-of-character'});
expect(blockCount(editor)).toBe(5);
press(editor, 'Delete', {at: 'end-of-character'});
expect(blockCount(editor)).toBe(5);
press(editor, 'Enter', {at: 'character'});
expect(activeBlockId(editor)).toBe('mini-aside');
press(editor, 'Enter', {at: 'dialogue'});
expect(blockCount(editor)).toBe(5);
press(editor, 'Shift-Enter', {at: 'dialogue'});
expect(hasHardBreak(editor, 'mini-dialogue')).toBe(true);
```

Also dispatch direct join, split, cross-block delete, block-attribute change,
and music-delete transactions and assert that the editor document remains
unchanged.

- [ ] **Step 5: Implement the mini-only ProseMirror plugin**

Use `filterTransaction` to reject every document-changing transaction whose
result does not match the captured signature. Add high-priority keyboard
handling that:

- consumes Backspace at the start of a script block;
- consumes Delete at the end of a script block;
- maps Enter to a selection at the start of the next fixed block;
- consumes Enter in the final block;
- maps Shift+Enter to `setHardBreak`;
- preserves Tab/Shift+Tab indentation only in Stage direction and returns
  `false` for Tab in other block types.

- [ ] **Step 6: Run the focused test**

Run:

```bash
pnpm --filter @stagistic/editor test -- \
  src/editor/mini/MiniEditorGuardExtension.test.ts
```

Expected: PASS.

---

### Task 2: Locked music presentation and mini editor surface

**Files:**
- Modify: `packages/editor/src/editor/tiptap/nodes/MusicStartNode.ts`
- Modify: `packages/editor/src/editor/tiptap/nodes/MusicPill.tsx`
- Create: `packages/editor/src/editor/mini/miniCharacters.ts`
- Create: `packages/editor/src/editor/mini/MiniBlockTypeIndicator.tsx`
- Create: `packages/editor/src/editor/mini/MiniScriptEditor.tsx`
- Create: `packages/editor/src/editor/mini/MiniScriptEditor.module.css`
- Create: `packages/editor/src/editor/mini/MiniScriptEditor.browser.test.tsx`
- Modify: `packages/editor/src/index.ts`
- Modify: `packages/editor/package.json`

**Interfaces:**
- Consumes: `ScriptDocument`, real `ScriptBlockNodes`, `CharacterTagMark`,
  `CharacterTagInputExtension`, `CharacterSuggestionsOverlay`,
  `MusicStartNode`, `MusicNumberingExtension`, `BLOCK_ICONS`, and Task 1's
  guard.
- Produces:

```ts
export type MiniScriptEditorProps = {
    document: ScriptDocument,
    className?: string,
    staticFallback?: ReactNode,
};

export const MiniScriptEditor: (props: MiniScriptEditorProps) => ReactElement;
```

and a backward-compatible music option:

```ts
MusicStartNode.configure({locked: true});
```

- [ ] **Step 1: Write failing locked-music browser assertions**

Render a configured `MusicStartNode` and assert that its title is editable
while activation does not render `[data-music-menu="start"]` and Backspace,
Delete, or a selected range cannot remove the protected node.

- [ ] **Step 2: Add the locked music option**

Extend `MusicStartNodeOptions` and `MusicStartPillProps` with
`locked?: boolean`. In locked mode:

- keep the existing pill markup and title input;
- do not attach pill activation/focus behavior;
- never render `MusicPillMenuPopover`;
- do not expose unassign/manage/end actions;
- retain `contentEditable={false}` on the node wrapper and
  `contentEditable` only on the title.

Default `locked` to `false` so the main editor is unchanged.

- [ ] **Step 3: Write failing mini-editor browser tests**

Use a five-block document and cover:

```ts
expect(blockTypes()).toEqual([
    'scene',
    'stageDirection',
    'character',
    'aside',
    'dialogue',
]);
await replaceCharacterText('ANNA / BORIS');
await typeStageDirection('@bo');
expect(suggestionLabels()).toContain('BORIS');
await confirmSuggestion('BORIS');
expect(stageDirectionHasTag('BORIS')).toBe(true);
expect(document.querySelector('[data-mini-block-indicator]')).toBeTruthy();
expect(document.querySelector('button[data-mini-block-indicator]')).toBeNull();
```

Append enough dialogue text to overflow the surface and assert
`scrollHeight > clientHeight` while the component's outer height is unchanged.

- [ ] **Step 4: Implement live in-memory characters**

In `miniCharacters.ts`, derive normalized character keys from
`collectScriptCharacterStats(editor.getJSON(), new Set())`. Convert the keys to
stable in-memory `PersistentCharacterRef` records and update both:

- the mutable ref captured by `CharacterTagInputExtension`;
- a local `EditorSnapshotStore` character snapshot used by the existing
  `CharacterSuggestionsOverlay`.

Run the projection after initialization and every document-changing
transaction. Do not write to any repository or browser storage.

- [ ] **Step 5: Implement the active block indicator**

Listen to TipTap selection/transaction updates, resolve the active block using
`getActiveScriptBlockFromState`, and render the corresponding `BLOCK_ICONS`
entry in a non-interactive element:

```tsx
<span
    aria-hidden="true"
    data-mini-block-indicator
    className={styles.blockIndicator}
>
    {BLOCK_ICONS[activeBlockType]}
</span>
```

Reuse the geometry from `useBlockActionsOverlayAnchor`: read computed
`paddingTop`, `lineHeight`, and `fontSize`, then position the icon center at
`blockRect.top - rootRect.top + root.scrollTop + paddingTop + lineHeight / 2`.
Recalculate after transactions, scroll, and `ResizeObserver` callbacks. Render
only the SVG icon; do not render a button-like background, border, radius,
tooltip, hover state, `tabIndex`, or pointer cursor.

- [ ] **Step 6: Build the minimal TipTap profile**

`MiniScriptEditor` creates and destroys its own editor instance. Configure only:

- `DocumentWithSettings`;
- `Text`;
- `HardBreak`;
- `CharacterTagMark`;
- `CharacterTagInputExtension`;
- `ScriptBlockNodes`;
- `MusicStartNode.configure({locked: true})`;
- `MusicNumberingExtension`;
- the caret-boundary subset of `MusicCommandsExtension`, without menus;
- `EditorRuntimeExtension` configured with the mini character refs and maximum
  supported saturation;
- character runtime decoration support needed by the actual suggestion/tag
  visuals;
- `MiniEditorGuardExtension`.

Do not include History, pagination, `ScriptBehaviorExtension`,
`EmptyEnterChooserExtension`, music creation/removal UI, block actions,
toolbar, or autosave hooks.

Render `EditorContent`, the reused character suggestion overlay, and
`MiniBlockTypeIndicator` inside one fixed-height scroll container. Export the
component and props from `packages/editor/src/index.ts`. Add
`@tiptap/extension-hard-break` at the same TipTap version as the other editor
dependencies.

- [ ] **Step 7: Implement compact canvas styling**

Define the product-editor variables required by reused block, suggestion,
character-tag, icon, and music styles locally. The surface must use:

```css
.root {
    scrollbar-gutter: stable;
    position: relative;
    overflow: hidden auto;
    overscroll-behavior: contain;
}

.content {
    --mini-edge: clamp(8px, 1vw, 12px);
    --mini-indicator-size: clamp(24px, 2.5vw, 28px);

    padding:
        var(--space-xl)
        var(--mini-edge)
        var(--space-2xl)
        calc(var(--mini-edge) + var(--mini-indicator-size) + var(--mini-edge));
}
```

Keep real block typography and compact block-specific indents. Do not inherit
the main canvas's printable page margins or pagination width.

- [ ] **Step 8: Run focused editor checks**

Run:

```bash
pnpm --filter @stagistic/editor test -- \
  src/editor/mini/MiniEditorGuardExtension.test.ts
pnpm --filter @stagistic/editor test:browser -- \
  src/editor/mini/MiniScriptEditor.browser.test.tsx
pnpm --filter @stagistic/editor typecheck
```

Expected: all PASS.

---

### Task 3: Screenshot-faithful compact landing integration

**Files:**
- Modify: `apps/landing/package.json`
- Modify: `apps/landing/astro.config.mjs`
- Create: `apps/landing/src/components/mini-editor/miniEditorDocument.ts`
- Create: `apps/landing/src/components/mini-editor/LandingMiniEditor.tsx`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/index.module.css`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: Task 2's exported `MiniScriptEditor`.
- Produces: one `client:load` React island replacing all existing
  `scriptExcerptBar`, `previewWorkspace`, `previewOutline`, and static
  `scriptBody` markup.

- [ ] **Step 1: Add landing React support and dependencies**

Run:

```bash
pnpm --filter @stagistic/landing add \
  @astrojs/react react@^19.2.4 react-dom@^19.2.4 \
  @stagistic/editor@workspace:* @stagistic/script@workspace:*
```

Register `react()` in `apps/landing/astro.config.mjs`.

- [ ] **Step 2: Create the fixed landing fixture**

Build a materialized `ScriptDocument` with stable IDs and exactly the 12 blocks
shown in the supplied screenshot:

```ts
export const miniEditorDocument: ScriptDocument = {
    type: 'doc',
    content: [
        scene('mini-scene', 'Inside the lighthouse'),
        stageDirection('mini-stage-1', 'An old brass lamp stands beneath the great lens.'),
        character('mini-eli-1', 'ELI'),
        dialogue('mini-dialogue-1', 'No oil. No flame.'),
        character('mini-mara-1', 'MARA'),
        dialogue('mini-dialogue-2', 'My father said this lamp once answered a song.'),
        character('mini-eli-2', 'ELI'),
        aside('mini-aside', 'skeptically'),
        dialogue('mini-dialogue-3', 'Of course it did.'),
        character('mini-mara-2', 'MARA'),
        dialogue('mini-dialogue-4', 'Tonight, we need to believe him.'),
        stageDirectionWithMusic('mini-stage-2', 'Music starts to play.', 'mini-music', 'One Small Light'),
    ],
};
```

Use the actual script JSON names and character/music attribute constants from
`@stagistic/script`; do not parse `.stagistic` text in the browser.

- [ ] **Step 3: Add the island wrapper and static fallback**

`LandingMiniEditor.tsx` passes the fixture to `MiniScriptEditor`. Its fallback
uses matching script-block classes/data attributes and the same initial copy,
so server output occupies the final height before hydration.

- [ ] **Step 4: Replace the complete preview markup**

In `index.astro`, replace the current preview header, outline, and script body
with:

```astro
<LandingMiniEditor client:load />
```

Keep only the outer `heroScript` positioning wrapper required by the hero
composition.

- [ ] **Step 5: Replace obsolete preview CSS**

Remove styles for the window controls, document title, saved status, outline,
and static excerpt paragraphs. Set the desktop preview to `35rem × 27.25rem`,
keep the existing radius, border, and shadow, and change the hero grid so the
narrower preview gives the claim more horizontal space. The initial content
must end with about one line of spare vertical space.

At the mobile breakpoint, keep the same compact horizontal gutter contract;
do not restore the old printable-page padding.

- [ ] **Step 6: Run landing checks**

Run:

```bash
pnpm --filter @stagistic/landing typecheck
pnpm --filter @stagistic/landing build
```

Expected: both PASS and the build emits the hydrated mini-editor island.

---

### Task 4: Visual acceptance and repository verification

**Files:**
- Modify only files already listed if acceptance reveals a scoped defect.
- Update: `graphify-out/` via the repository's graphify command.

- [ ] **Step 1: Start the landing locally**

Run:

```bash
pnpm --filter @stagistic/landing dev --host 127.0.0.1
```

- [ ] **Step 2: Perform browser acceptance at desktop and mobile widths**

Verify at 1280×800 and 390×844:

- the complete old preview is gone;
- the entire card is the editor;
- there is no header, sidebar, toolbar, status, or menu;
- the active icon fits in the left gutter without reducing the right edge;
- Scene, Stage direction, Character, Aside, and Dialogue retain real editor
  styling;
- Enter, Shift+Enter, Backspace/Delete boundaries, `/`, and `@` work;
- long content scrolls inside the fixed card;
- the page itself does not gain horizontal overflow;
- focus and suggestions remain visible inside the card.

- [ ] **Step 3: Run canonical verification**

Run:

```bash
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/landing typecheck
pnpm --filter @stagistic/editor test -- \
  src/editor/mini/MiniEditorGuardExtension.test.ts
pnpm --filter @stagistic/editor test:browser -- \
  src/editor/mini/MiniScriptEditor.browser.test.tsx
pnpm --filter @stagistic/landing build
pnpm lint
```

Do not alter unrelated snapshots or assertions to hide pre-existing failures.

- [ ] **Step 4: Refresh the code graph**

Run:

```bash
graphify update .
```

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm no generated `vite.config.js`, database migration, schema-version
change, or unrelated user file is included. Report verification evidence and
suggested commit message `feat: add landing mini editor`; do not commit.
