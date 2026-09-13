# Scene Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a playwright to collapse scene content inside the editor while keeping the scene heading visible and remembering the choice locally per script.

**Architecture:** A Tiptap extension owns transient collapse state, derives scene ranges from the flat ProseMirror document, and hides scene-body blocks with node decorations. A React overlay renders accessible chevron controls outside `contenteditable`; the route owns `localStorage` persistence and passes the collapsed scene IDs through a controlled editor prop.

**Tech Stack:** React, TypeScript, Tiptap/ProseMirror plugins and decorations, React Aria-based `IconButton`, CSS Modules, Vitest/Vite Plus browser tests.

**Spec:** Approved bounded design captured in “Global Constraints” below; no separate design document was created.

## Global Constraints

- Collapse state is personal UI state keyed by script ID, not part of `ScriptDocument`, DB projections, exports, or collaboration state.
- Do not change `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Keep the existing 4px scene sticker visually unchanged; place a separate chevron button immediately to its right.
- Expanded scene: downward chevron, revealed only by scene-heading hover/focus. Collapsed scene: rightward chevron, always visible with restrained utility emphasis.
- A collapsed heading remains editable and shows the English UI copy `Scene content is collapsed` beneath it in IBM Plex Sans.
- Hide blocks after the scene heading up to, but not including, the next `scene` or `act` block. Do not render a collapse control for a scene with no body blocks.
- Collapsing the scene containing the selection moves the caret to the end of its heading.
- `Enter` on a collapsed heading expands it before the existing scene Enter behavior runs.
- `ArrowDown` from a collapsed heading jumps to the next `scene` or `act` heading. `ArrowUp` from that following heading returns to the collapsed scene heading.
- Focusing a hidden body block automatically expands its scene. Structure navigation targets a scene heading and therefore preserves collapse state; Characters and Music target body blocks and therefore expand.
- Collapsing reflows editor pagination. Export output remains based on the full document.
- Use fat-arrow functions, guard clauses, `clsx`, design tokens, and files under 300 lines.
- Use the shared `IconButton`; do not build a bespoke square button.
- Do not commit. At each checkpoint, prepare a suggested commit message for the user to review and commit.

---

## File Structure

### New files

- `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapseModel.ts` — pure scene-range and navigation queries.
- `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapseModel.test.ts` — unit coverage for flat-document boundaries.
- `packages/editor/src/editor/tiptap/extensions/sceneCollapse/SceneCollapseExtension.ts` — plugin state, decorations, commands, reconciliation, and change notification.
- `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapse.browser.test.tsx` — editor-level collapse, selection, keyboard, focus, and layout behavior.
- `packages/editor/src/editor/components/sceneCollapse/SceneCollapseOverlay.tsx` — chevron controls and collapsed helper labels.
- `packages/editor/src/editor/components/sceneCollapse/SceneCollapseOverlay.module.css` — overlay positioning and visual states.
- `packages/editor/src/editor/components/sceneCollapse/SceneCollapseOverlay.browser.test.tsx` — control visibility, accessibility, and interaction coverage.
- `packages/app-routes/src/routes/script/editor/scene/useCollapsedSceneIds.ts` — validated per-script `localStorage` adapter.
- `packages/app-routes/src/routes/script/editor/scene/useCollapsedSceneIds.browser.test.tsx` — persistence, corruption, and script-switch coverage.

### Modified files

- `packages/editor/src/editor/tiptap/extensions/index.ts` — export collapse extension APIs.
- `packages/editor/src/editor/useEditorExtensions.ts` — install the extension with a stable change callback ref.
- `packages/editor/src/editor/tiptap/scriptBlock/handlers/index.ts` — intercept Enter/up/down at collapsed boundaries before ordinary block behavior.
- `packages/editor/src/editor/contracts.ts` — add the controlled scene-collapse contract.
- `packages/editor/src/editor/Editor.tsx` — synchronize controlled IDs with plugin state without rebuilding the editor surface.
- `packages/editor/src/editor/components/EditorCanvas.tsx` — mount the scene-collapse overlay.
- `packages/editor/src/editor/blocks/scene/scene.module.css` — reserve helper-label space on collapsed headings and hide decorated body blocks.
- `packages/app-routes/src/storageKeys.ts` — define the namespaced persistence key.
- `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx` — bind the current script ID to the persistence hook and editor prop.
- `packages/editor/src/index.ts` — export the public controlled-state type if consumers need it.

---

### Task 1: Pure scene-collapse model

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapseModel.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapseModel.test.ts`

**Interfaces:**
- Consumes: ProseMirror `Node`, `isScriptBlockNodeName`, and `normalizeBlockNodeType`.
- Produces:

```ts
export interface SceneCollapseRange {
    sceneBlockId: string,
    headingFrom: number,
    headingTo: number,
    bodyBlocks: readonly {from: number, to: number}[],
    nextBoundary: {blockId: string, from: number, to: number} | null,
}

export const buildSceneCollapseRanges = (
    doc: ProseMirrorNode,
): readonly SceneCollapseRange[] => {};

export const reconcileCollapsedSceneIds = (
    ranges: readonly SceneCollapseRange[],
    requestedIds: Iterable<string>,
): readonly string[] => {};

export const findCollapsedSceneContainingPosition = (
    ranges: readonly SceneCollapseRange[],
    collapsedIds: ReadonlySet<string>,
    position: number,
): SceneCollapseRange | null => {};

export const findPreviousCollapsedScene = (
    ranges: readonly SceneCollapseRange[],
    collapsedIds: ReadonlySet<string>,
    boundaryFrom: number,
): SceneCollapseRange | null => {};
```

- [ ] **Step 1: Write failing model tests**

Cover these explicit documents:

```ts
const doc = buildDoc([
    block('act', 'a1'),
    block('scene', 's1'),
    block('stageDirection', 'b1'),
    block('dialogue', 'b2'),
    block('scene', 's2'),
    block('act', 'a2'),
    block('scene', 's3'),
]);
```

Assert that `s1` owns `b1` and `b2` but not `s2`; `s2` has no body and ends at `a2`; `s3` has no body and ends at document end. Also assert that unknown/deleted IDs are removed, positions inside `b1` resolve to `s1`, the `s1` heading does not resolve as hidden content, and the boundary at `s2` resolves back to collapsed `s1` for upward navigation.

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run:

```bash
pnpm test -- packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapseModel.test.ts
```

Expected: FAIL because `sceneCollapseModel.ts` does not exist.

- [ ] **Step 3: Implement one top-level document walk**

Walk only top-level script blocks, close the current scene on `scene` or `act`, and collect each intervening block’s `{from, to}`. Sort reconciled IDs by document order so persistence and equality checks are deterministic. Treat missing/empty IDs as invalid.

- [ ] **Step 4: Run the focused unit test**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Prepare review checkpoint**

Review only the pure range semantics. Suggested commit message for the user: `feat(editor): model collapsible scene ranges`.

---

### Task 2: Tiptap collapse state and decorations

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/sceneCollapse/SceneCollapseExtension.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapse.browser.test.tsx`
- Modify: `packages/editor/src/editor/tiptap/extensions/index.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts`
- Modify: `packages/editor/src/editor/blocks/scene/scene.module.css`

**Interfaces:**
- Consumes: Task 1 model helpers.
- Produces:

```ts
export interface SceneCollapseSnapshot {
    collapsedSceneIds: readonly string[],
    ranges: readonly SceneCollapseRange[],
    decorations: DecorationSet,
}

export const getSceneCollapseSnapshot = (
    state: EditorState,
): SceneCollapseSnapshot;

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        sceneCollapse: {
            setCollapsedScenes: (sceneBlockIds: readonly string[]) => ReturnType,
            toggleSceneCollapsed: (sceneBlockId: string) => ReturnType,
            expandSceneContainingPosition: (position: number) => ReturnType,
        },
    }
}
```

- [ ] **Step 1: Write failing browser tests for commands and decorations**

Mount an editor containing two non-empty scenes. Assert:

```ts
expect(editor.commands.toggleSceneCollapsed('s1')).toBe(true);
expect(sceneElement('s1')).toHaveAttribute('data-scene-collapsed', 'true');
expect(blockElement('b1')).toHaveAttribute('data-scene-content-collapsed', 'true');
expect(blockElement('s2')).not.toHaveAttribute('data-scene-content-collapsed');
expect(getComputedStyle(blockElement('b1')).display).toBe('none');
```

Also test toggle-expand, invalid scene IDs returning `false`, multiple independently collapsed scenes, document edits preserving valid IDs, and scene deletion pruning the removed ID.

- [ ] **Step 2: Run the focused browser test and verify failure**

Run:

```bash
pnpm --filter @stagistic/editor test:browser -- sceneCollapse.browser.test.tsx
```

Expected: FAIL because the extension and commands are absent.

- [ ] **Step 3: Implement plugin state and meta commands**

Use a dedicated `PluginKey<SceneCollapseSnapshot>`. Every command dispatches metadata with `addToHistory: false`. Rebuild node decorations from the current document and reconciled ID list:

```ts
Decoration.node(range.headingFrom, range.headingTo, {
    'data-scene-collapsed': 'true',
});

Decoration.node(block.from, block.to, {
    'data-scene-content-collapsed': 'true',
});
```

When collapsing a scene containing the current selection, set a `TextSelection` at the end of its heading in the same transaction. On a transaction whose selection lands inside a collapsed body, remove that scene ID before building decorations; this is the shared auto-expand rule used by Characters, Music, and future block navigation.

- [ ] **Step 4: Add CSS behavior**

In `scene.module.css`, keep the existing `::after` sticker rules unchanged. Add global decoration selectors scoped through the scene module:

```css
:global([data-scene-content-collapsed='true']) {
    display: none;
}

.scene[data-scene-collapsed='true'] {
    padding-bottom: var(--scene-collapse-summary-space, 1.5rem);
}
```

The reserved space belongs to the heading’s measured box, so pagination includes the one-line collapsed summary but excludes hidden body blocks.

- [ ] **Step 5: Install and export the extension**

Add `SceneCollapseExtension` before `ScriptBehaviorExtension` in `useEditorExtensions.ts`. Keep the extension instance stable; do not add collapsed IDs to `surfaceSignature` or rebuild the cached editor.

- [ ] **Step 6: Run focused tests**

Run the Task 1 unit test and Task 2 browser test. Expected: PASS.

- [ ] **Step 7: Prepare review checkpoint**

Suggested commit message for the user: `feat(editor): add scene collapse extension`.

---

### Task 3: Keyboard and programmatic navigation

**Files:**
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/handlers/index.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapse.browser.test.tsx`

**Interfaces:**
- Consumes: `getSceneCollapseSnapshot`, range queries, and `expandSceneContainingPosition` from Task 2.
- Produces:

```ts
export const handleSceneCollapseKeyDown = (
    editor: Editor,
    event: KeyboardEvent,
): boolean => {};
```

- [ ] **Step 1: Add failing browser tests for the complete navigation contract**

Test all of the following:

1. Collapsing `s1` with the caret in `b1` leaves the caret at the end of `s1`.
2. `Enter` at collapsed `s1` expands it, then creates/focuses the configured next block through the existing `handleEnter` path.
3. `ArrowDown` at collapsed `s1` moves to the next `scene` or `act` heading without exposing `b1`.
4. `ArrowUp` at the start of that following heading moves to the end of collapsed `s1`.
5. Calling `useFocusEditorBlock` for `b1` expands `s1`, scrolls `b1`, and flashes it.
6. `focusFirstCharacterBlock` targeting `b1` expands `s1`, scrolls, and flashes the character block.
7. `useFocusEditorMusic` targeting a music pill in `b1` expands `s1` before focusing the title.
8. Focusing `s1` itself leaves it collapsed, proving Structure sidebar semantics need no source-specific branch.

- [ ] **Step 2: Run the focused browser tests and verify the keyboard failures**

Run:

```bash
pnpm --filter @stagistic/editor test:browser -- sceneCollapse.browser.test.tsx
```

Expected: command/decorations tests pass; keyboard boundary tests fail.

- [ ] **Step 3: Implement collapsed-boundary key handling**

Call `handleSceneCollapseKeyDown` in `handleKeyDown` after the empty-enter chooser handling and before block shortcuts/ordinary Enter. It must:

- return `false` for unrelated keys and selections;
- on `Enter` at a collapsed heading, dispatch expansion without preventing the event, then return `false` so the existing `handleEnter` executes;
- on `ArrowDown` at the end of a collapsed heading, prevent default and set selection at the end of `nextBoundary`;
- on `ArrowUp` at the start of a following structural heading, prevent default and set selection at the end of the immediately preceding collapsed heading.

Do not bind source-specific sidebar logic or modify the existing focus helpers. Programmatic selection into a hidden body is the single expansion mechanism: ProseMirror updates plugin decorations synchronously before `useFocusEditorBlock` and `focusFirstCharacterBlock` resolve their DOM targets, preserving their current scroll alignment and focus-flash behavior.

- [ ] **Step 4: Run navigation and existing handler tests**

Run:

```bash
pnpm test -- packages/editor/src/editor/tiptap/scriptBlock/handlers
pnpm --filter @stagistic/editor test:browser -- sceneCollapse.browser.test.tsx sceneNumbering.browser.test.tsx blockFocusFlash.browser.test.tsx
```

Expected: PASS, with scene deletion barriers and numbering unchanged.

- [ ] **Step 5: Prepare review checkpoint**

Suggested commit message for the user: `feat(editor): navigate across collapsed scenes`.

---

### Task 4: Scene collapse overlay

**Files:**
- Create: `packages/editor/src/editor/components/sceneCollapse/SceneCollapseOverlay.tsx`
- Create: `packages/editor/src/editor/components/sceneCollapse/SceneCollapseOverlay.module.css`
- Create: `packages/editor/src/editor/components/sceneCollapse/SceneCollapseOverlay.browser.test.tsx`
- Modify: `packages/editor/src/editor/components/EditorCanvas.tsx`

**Interfaces:**
- Consumes: `getSceneCollapseSnapshot`, `editor.commands.toggleSceneCollapsed`, shared `IconButton`, `Tooltip`, and `ChevronDownIcon`.
- Produces:

```ts
interface SceneCollapseOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
}

export const SceneCollapseOverlay = (
    props: SceneCollapseOverlayProps,
) => ReactNode;
```

- [ ] **Step 1: Write failing overlay browser tests**

Assert that:

- only scenes with at least one body block get a button;
- each button has stable `aria-label="Scene content"` and correct `aria-expanded`;
- expanded buttons are revealed when their heading is hovered or selected;
- collapsed buttons remain visible without hover/focus;
- clicking preserves the existing sticker element/pseudo-element styling and toggles only the requested scene;
- collapsed state renders `Scene content is collapsed` below the correct heading;
- the control remains aligned after editor scroll, window resize, and a pagination reflow.

- [ ] **Step 2: Run the focused overlay test and verify failure**

Run:

```bash
pnpm --filter @stagistic/editor test:browser -- SceneCollapseOverlay.browser.test.tsx
```

Expected: FAIL because the overlay is not mounted.

- [ ] **Step 3: Implement overlay geometry and lifecycle**

Render one overlay item per non-empty scene range outside `EditorContent`. Resolve each heading by its block ID and derive coordinates from the heading and canvas rectangles. Compute the button’s horizontal position from the page edge represented by:

```ts
const pageEdge = headingRect.left - parseFloat(getComputedStyle(heading).getPropertyValue('--editor-margin-left'));
```

Place the button after the existing marker width plus token spacing. Place the helper label at the heading content edge in the padding reserved by Task 2. Recompute in one `requestAnimationFrame` on editor transactions, canvas scroll, window resize, and `ResizeObserver` notifications; clean up all listeners, observer, and pending frame on unmount.

- [ ] **Step 4: Implement accessible controls and styling**

Use:

```tsx
<Tooltip label={isCollapsed ? 'Expand scene' : 'Collapse scene'}>
    <IconButton
        variant="ghost"
        size="xs"
        aria-label="Scene content"
        aria-expanded={!isCollapsed}
        isSelected={isCollapsed}
        onPress={() => editor.commands.toggleSceneCollapsed(sceneBlockId)}
    >
        <ChevronDownIcon aria-hidden="true" />
    </IconButton>
</Tooltip>
```

Rotate the existing down chevron to point right when collapsed. Expanded controls are non-interactive while visually hidden; make them visible and tabbable when their heading is active or hovered. Collapsed controls are always visible and tabbable. Use `--state-selected` only for the collapsed utility state, neutral hover for expanded state, and no shadow.

- [ ] **Step 5: Mount the overlay**

Mount `SceneCollapseOverlay` next to `EditorBlockActionsOverlay` in `EditorCanvas.tsx`, sharing the existing `canvasRef`. Do not merge it into the active-block gutter overlay: multiple collapsed scene controls must remain visible simultaneously.

- [ ] **Step 6: Run focused and regression browser tests**

Run:

```bash
pnpm --filter @stagistic/editor test:browser -- SceneCollapseOverlay.browser.test.tsx sceneCollapse.browser.test.tsx sceneNumbering.browser.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Prepare review checkpoint**

Suggested commit message for the user: `feat(editor): add scene collapse controls`.

---

### Task 5: Per-script local persistence and controlled wiring

**Files:**
- Create: `packages/app-routes/src/routes/script/editor/scene/useCollapsedSceneIds.ts`
- Create: `packages/app-routes/src/routes/script/editor/scene/useCollapsedSceneIds.browser.test.tsx`
- Modify: `packages/app-routes/src/storageKeys.ts`
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`
- Modify: `packages/editor/src/editor/contracts.ts`
- Modify: `packages/editor/src/editor/Editor.tsx`
- Modify: `packages/editor/src/index.ts`

**Interfaces:**
- Produces route hook:

```ts
export interface CollapsedSceneIdsState {
    collapsedSceneIds: readonly string[],
    setCollapsedSceneIds: (sceneBlockIds: readonly string[]) => void,
}

export const useCollapsedSceneIds = (
    storageScope: string,
): CollapsedSceneIdsState => {};
```

- Produces editor contract:

```ts
export interface EditorSceneCollapseProps {
    collapsedSceneIds: readonly string[],
    onCollapsedSceneIdsChange: (sceneBlockIds: readonly string[]) => void,
}
```

Add `sceneCollapse?: EditorSceneCollapseProps` to the existing `EditorProps` interface.

- [ ] **Step 1: Write failing persistence-hook tests**

Use two scopes, `script-1` and `script-2`. Assert initial empty state, write/read round trip, deduplication and rejection of non-string entries, independent state across scopes, reload on scope change, and graceful fallback for malformed JSON or unavailable storage.

- [ ] **Step 2: Run the focused hook test and verify failure**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- useCollapsedSceneIds.browser.test.tsx
```

Expected: FAIL because the hook is absent.

- [ ] **Step 3: Implement the storage adapter**

Add:

```ts
export const SCENE_COLLAPSE_STORAGE_KEY = 'stagistic.editor.scene-collapse';
```

Store a JSON string array at `${SCENE_COLLAPSE_STORAGE_KEY}:${storageScope}`. Normalize to unique non-empty strings. Follow `useSidebarLayout.ts`: guard SSR, ignore read/write exceptions, and replace state when `storageScope` changes.

- [ ] **Step 4: Add the controlled editor contract**

In `Editor.tsx`, keep `onCollapsedSceneIdsChange` in a ref so cached editor extensions never capture a stale route callback. Pass that ref into `SceneCollapseExtension`. In a `useLayoutEffect`, call `editor.commands.setCollapsedScenes(sceneCollapse.collapsedSceneIds)` whenever the controlled IDs or editor instance changes. The plugin view reports reconciled IDs through the callback ref only when the ordered ID list actually changes.

- [ ] **Step 5: Bind persistence in the route**

In `ScriptEditorRoute.tsx`:

```ts
const sceneCollapse = useCollapsedSceneIds(currentScriptId ?? 'new-script');

<DeferredScriptEditor
    sceneCollapse={{
        collapsedSceneIds: sceneCollapse.collapsedSceneIds,
        onCollapsedSceneIdsChange: sceneCollapse.setCollapsedSceneIds,
    }}
    // existing props
/>
```

`DeferredScriptEditorProps` already extends `Omit<EditorProps, 'settings'>` and forwards remaining props, so it needs no change. Do not put the scope or local-storage access inside `@stagistic/editor`.

- [ ] **Step 6: Test controlled reconciliation**

Extend `sceneCollapse.browser.test.tsx` to mount controlled IDs containing one valid and one deleted scene ID. Assert the editor collapses the valid scene and reports only the valid ID once, without marking the document dirty or invoking autosave.

- [ ] **Step 7: Run persistence and editor tests**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- useCollapsedSceneIds.browser.test.tsx
pnpm --filter @stagistic/editor test:browser -- sceneCollapse.browser.test.tsx SceneCollapseOverlay.browser.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Prepare review checkpoint**

Suggested commit message for the user: `feat(editor): persist collapsed scenes per script`.

---

### Task 6: Integrated sidebar and pagination regressions

**Files:**
- Create: `packages/app-routes/src/routes/script/editor/scene/sceneCollapseNavigation.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/characters/ScriptCharactersSidebar.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx`
- Modify: `packages/editor/src/editor/tiptap/extensions/sceneCollapse/sceneCollapse.browser.test.tsx`

**Interfaces:**
- Consumes: completed editor API; produces no new runtime API.

- [ ] **Step 1: Add route-level failing regression tests**

Mount a script with a collapsed first scene and visible second scene. Assert:

- Structure click on the first scene focuses its heading and leaves it collapsed.
- Character click whose first occurrence is inside the first scene expands it and focuses/flashes the matching block.
- Music click whose start block is inside the first scene expands it and focuses the music title.
- Switching to a second script restores its own collapse set; switching back restores the first.

- [ ] **Step 2: Add editor pagination assertions**

Capture page count and scene placements with a long first scene, collapse it, force pagination, and assert the page count decreases and later scene placement updates. Expand it and assert the original layout returns. Verify serialized editor JSON is byte-for-byte unchanged by collapse/expand.

- [ ] **Step 3: Run focused route and pagination tests**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- ScriptCharactersSidebar.browser.test.tsx ScriptMusicSidebar.browser.test.tsx sceneCollapseNavigation.browser.test.tsx
pnpm --filter @stagistic/editor test:browser -- sceneCollapse.browser.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run canonical package verification**

Run:

```bash
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/app-routes typecheck
pnpm lint
pnpm test
pnpm --filter @stagistic/editor test:browser
pnpm --filter @stagistic/app-routes test:browser
```

Record any pre-existing browser reds without changing golden snapshots, assertions, or viewport settings.

- [ ] **Step 5: Refresh the code graph**

Run:

```bash
graphify update .
```

Confirm the new extension, overlay, route persistence hook, and their relationships appear in `graphify-out/graph.json`.

- [ ] **Step 6: Prepare final handoff**

Show `git diff --check`, `git status --short`, the exact verification results, and the suggested commit sequence. Do not commit. Suggested final squashed message: `feat(editor): add per-script scene collapsing`.
