# Live Pagination Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply page, typography, and header/footer settings without rebuilding the mounted Tiptap editor while preserving intentional rebuilds for blocks, structure, and visual settings.

**Architecture:** Move mutable pagination options into the extension storage shared by Tiptap command and plugin contexts. Separate live settings from the editor surface rebuild signature, and keep the pagination extension instance stable for the lifetime of the React editor mount.

**Tech Stack:** TypeScript, React 19, Tiptap 3, ProseMirror, Vite Plus browser tests, pnpm.

## Global Constraints

- Keep one live editor instance; do not render a second editor or mask rebuilds.
- `page`, `typography`, and `headerFooter` update live.
- `blocks`, `structure`, and `visual` remain rebuild-triggering settings.
- Do not change persistence or modal draft ownership.
- Use fat-arrow functions, guard clauses, and keep every file below 300 lines.

---

### Task 1: Make Pagination Storage the Mutable Options Owner

**Files:**
- Modify: `packages/editor/src/editor/tiptap/extensions/pagination/optionsPropagation.browser.test.tsx`
- Modify: `packages/editor/src/editor/tiptap/extensions/pagination/layout/paginationGolden.browser.test.tsx`
- Modify: `packages/editor/src/editor/tiptap/extensions/pagination/types.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/PaginationExtension.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/pagination/plugin/createPaginationPlugin.ts`

**Interfaces:**
- Consumes: `PaginationOptions`, `PaginationStorage`, `updatePaginationSettings(settings)`.
- Produces: `PaginationStorage.options: PaginationOptions`; `createPaginationPlugin(storage: PaginationStorage)`.

- [ ] **Step 1: Point the regression test at shared storage and observable plugin state**

Replace the extension-options helper with storage access:

```ts
const getPaginationStorage = (editor: TiptapEditor) => editor.storage.Pagination as {
    options?: {pageHeight: number, pageWidth: number},
    optionsVersion: number,
};
```

Assert `getPaginationStorage(editor).options?.pageHeight` becomes `2000`. Add an async test that calls the command and waits until:

```ts
paginationKey.getState(editor.state)?.pagination.pageHeight === 2000
```

Use the test file's connected DOM host and a bounded polling helper with a 10-second deadline.

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @stagistic/editor test:browser
```

Expected: the storage assertion receives `undefined`, and the plugin state remains at the original `1123` page height.

- [ ] **Step 3: Add mutable options to pagination storage**

Extend the storage interface:

```ts
export interface PaginationStorage {
    options: PaginationOptions,
    optionsVersion: number,
    state: PaginationState,
    forceRecalcToken: number,
}
```

Initialize and update it in `PaginationExtension`:

```ts
addStorage() {
    return {
        options: this.options,
        optionsVersion: 0,
        state: createInitialPaginationState(this.options),
        forceRecalcToken: 0,
    };
},
```

```ts
if (arePaginationSettingsApplied(this.storage.options, settings)) {
    return true;
}

this.storage.options = {
    ...this.storage.options,
    ...settings,
};
```

Pass only the shared storage to `createPaginationPlugin(this.storage)`.

- [ ] **Step 4: Make every plugin option read use storage**

Change the plugin factory and layout helper to consume `PaginationStorage`:

```ts
const computeLayoutMetrics = (
    storage: PaginationStorage,
    view: {dom: {clientWidth: number}},
) => {
    const options = storage.options;
    const heightKey = `${options.pageWidth}|${options.marginLeft}|`
        + `${options.marginRight}|${options.lineHeightPx}`;
    const contentWidth = Math.max(
        0,
        view.dom.clientWidth - options.marginLeft - options.marginRight,
    );

    return {heightKey, contentWidth};
};
```

Use `storage.options` for initial pagination state and `buildPaginationState`; use `storage` directly for version, state, and force-recalc reads/writes.

Add a golden-test invariant that the plugin's `pagination.pageHeight` equals the rendered `--editor-page-height`. Update the inline page-boundary snapshot because the fixed plugin now receives the existing responsive `renderScale`; the old snapshot captured the stale unscaled options.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm --filter @stagistic/editor test:browser
pnpm --filter @stagistic/editor typecheck
```

Expected: both commands pass. The golden page boundaries use the same scaled page height as the rendered CSS.

Commit:

```bash
git add packages/editor/src/editor/tiptap/extensions
git commit -m "fix(editor): share live pagination options through storage"
```

---

### Task 2: Keep Live Settings Outside the Editor Rebuild Boundary

**Files:**
- Create: `packages/editor/src/editor/editorSettings/rebuildSettings.ts`
- Modify: `packages/editor/src/editor/editorSettings/index.ts`
- Modify: `packages/editor/src/editor/Editor.tsx`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts`
- Modify: `packages/editor/src/editor/surface/surfaceReuse.browser.test.tsx`

**Interfaces:**
- Consumes: resolved `EditorSettings`, existing `usePaginationSettings`, React header/footer overlay props.
- Produces: `selectEditorRebuildSettings(settings: EditorSettings): Pick<EditorSettings, 'blocks' | 'structure' | 'visual'>`.

- [ ] **Step 1: Add the observable failing surface tests**

Extend `SettingsHarness` with one live-settings button that changes page height, base line height, and header text in one state update. Assert the following after the click:

```ts
expect(editorDom()).toBe(initialDom);
expect(document.querySelector('[data-header-footer-layer="true"]')?.textContent)
    .toContain('Updated header');
```

Add a block-settings button that changes `blocks.dialogue.spacingBeforeEm`, then wait for and assert a different editor DOM instance:

```ts
await waitFor(() => editorDom() !== initialDom);
expect(editorDom()).not.toBe(initialDom);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @stagistic/editor test:browser
```

Expected: the live-settings assertion observes a different editor DOM instance.

- [ ] **Step 3: Add an explicit rebuild-settings selector**

Create:

```ts
import type {EditorSettings} from '@stagistic/script';

export const selectEditorRebuildSettings = (
    settings: EditorSettings,
): Pick<EditorSettings, 'blocks' | 'structure' | 'visual'> => ({
    blocks: settings.blocks,
    structure: settings.structure,
    visual: settings.visual,
});
```

Export it from `editorSettings/index.ts`. In `Editor.tsx`, compute it from `resolvedSettings` and use it instead of the complete resolved settings in `surfaceSignature`.

- [ ] **Step 4: Stabilize pagination and block-derived extension identities**

Create pagination once per React mount:

```ts
const paginationExtensionRef = useRef<ReturnType<typeof createPaginationExtension> | null>(null);

if (!paginationExtensionRef.current) {
    paginationExtensionRef.current = createPaginationExtension(resolvedSettings, sizeScale);
}

const paginationExtension = paginationExtensionRef.current;
```

Import `useRef`. Change the dependencies for `blockShortcuts`, `blockNextElements`, and `blockCasing` from the full `resolvedSettings` object to `resolvedSettings.blocks`. Keep structure and visual changes in the surface signature so they still rebuild intentionally.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm --filter @stagistic/editor test:browser
pnpm --filter @stagistic/editor test
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/editor lint
```

Expected: all commands pass without warnings or snapshot changes.

Commit:

```bash
git add packages/editor/src/editor
git commit -m "fix(editor): keep pagination settings live"
```

---

### Task 3: Final Repository Verification

**Files:**
- Update: `graphify-out/` through the project graph command if tracked output changes.

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: verified editor package and current knowledge graph.

- [ ] **Step 1: Refresh the knowledge graph**

Run:

```bash
graphify update .
```

Expected: command exits successfully.

- [ ] **Step 2: Run repository checks**

Run:

```bash
pnpm --filter @stagistic/editor test
pnpm --filter @stagistic/editor test:browser
pnpm --filter @stagistic/editor typecheck
pnpm --filter @stagistic/editor lint
git diff --check
git status --short
```

Expected: tests, typecheck, lint, and diff check pass. Status contains no unintended files.

- [ ] **Step 3: Commit graph output only if tracked files changed**

If `git status --short graphify-out` reports tracked changes, run:

```bash
git add graphify-out
git commit -m "chore: update code graph"
```

Otherwise make no additional commit.
