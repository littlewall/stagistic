# Editor Surface Cache Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [x]`) syntax.

**Goal:** Switching Editor ↔ Export re-attaches a live cached Tiptap instance instead of rebuilding it, eliminating the measured ~1.45s remount cost (~0.5s instance build + ~0.9s pagination re-measure on an ~87-page script) and fixing a latent stale-content reset on remount.

**Architecture:** The workspace owns an `EditorSurfaceCache` holding `{signature, editor, characterColorRefs}`. `ScriptEditor` accepts the cache: signature hit → reuse the live instance (tiptap v3 `EditorContent` re-attaches surviving DOM natively); miss → build and store. `useEditorLifecycle` skips the expensive `setContent` initial-apply for restored instances (re-seeds autosave baseline + live snapshot from the *current* doc). `updatePaginationSettings` gets an equality no-op guard so a cache-hit mount doesn't trigger a full re-measure.

**Tech Stack:** Tiptap v3 (`new Editor()` core API), React 19, `vite-plus/test` (unit + browser).

## Progress (resumption state)

- ✅ **Task 12 done** — `settingsEqual.ts` + guard in `PaginationExtension.ts`; unit + pagination browser tests green.
- ✅ **Task 13 done** — `surface/editorSurfaceCache.ts` + unit tests green.
- ✅ **Task 14 done** — `useEditorCharacterColors` accepts optional `refs` bundle; full editor suite green (101 unit + 48 browser).
- ⬜ **Tasks 15–18 remaining.**

Resumption notes:
- Everything is **uncommitted** in the working tree (user commits at the end; two earlier completed plans included: view-switcher, script-workspace-shared-load).
- `pnpm --filter @stagistic/editor test` runs the unit suite; `pnpm test run <file>` inside the package works as a filter. `vp lint` config is broken repo-wide (`@stylistic` not found) — verify via `tsc --noEmit` instead.
- `tsc --noEmit` in packages/editor reports **pre-existing** errors in `model.test.ts`, `shortcuts.test.ts`, `tab.test.ts` (untouched files) — ignore them; check only files this plan touches.
- TEMP perf instrumentation is live in app-routes (`perfInstrumentation.ts`, marks in `layout/AppHeader.tsx`, Profiler in `ScriptWorkspaceRoute.tsx`, effect in `ScriptEditorRoute.tsx`) + measurement harness `packages/editor/src/editor/perfMount.browser.test.tsx` — removal is Task 18 Step 3.
- Baseline measurement (user's ~87-page script, dev): editor route commit ~540ms, pagination stable ~1450ms after switch.

## Global Constraints

- No commits (feature ships as a whole; user commits). Verify with `tsc --noEmit`, `pnpm test`, per-package `test:browser`.
- Without a cache prop, `ScriptEditor` must behave exactly as today (tests, other consumers).
- Signature invalidation must mirror today's `useEditor` deps semantics: rebuild when initial content, resolved settings, sizeScale, or enableBlockUiEvents change.
- Character-color refs are captured by extensions via closure → the refs bundle must live in the cache entry alongside the editor.

## Evidence (from investigation)

- Isolated mount (500 blocks/22 pages): editor ~70ms, pagination ~200ms; user's script (~87 pages): commit at ~540ms, pagination stable at ~1450ms after switch.
- `useEditorLifecycle` initial-apply runs `setContent(initialValue)` on every mount → resets to stale load-time doc (autosave flushes on unmount, so DB is newer than what remount shows → data-loss vector when typing resumes). Cache + skip-apply fixes both.
- tiptap v3 `EditorContent` unmount parks the editor DOM in a detached div; `init()` re-appends it and recreates node views (only cue pills are React node views — cheap).
- `updatePaginationSettings` unconditionally bumps `optionsVersion` + dispatches → needs equality guard.

---

## File Structure

- `packages/editor/src/editor/tiptap/extensions/PaginationExtension.ts` — equality no-op guard. (modify)
- `packages/editor/src/editor/surface/editorSurfaceCache.ts` — cache + refs bundle factory. (create)
- `packages/editor/src/editor/surface/editorSurfaceCache.test.ts` — unit tests. (create)
- `packages/editor/src/editor/surface/useScriptEditorInstance.ts` — cache-aware instance hook (replaces `useEditor`). (create)
- `packages/editor/src/editor/hooks/useEditorCharacterColors.ts` — accept external refs bundle. (modify)
- `packages/editor/src/editor/hooks/useEditorLifecycle.ts` + `editorLifecycleSync.ts` types — restored-mount light path. (modify)
- `packages/editor/src/editor/contracts.ts` — `surfaceCache` prop. (modify)
- `packages/editor/src/editor/Editor.tsx` — integrate hook + signature. (modify)
- `packages/editor/src/index.ts` — export cache API. (modify)
- `packages/editor/src/editor/surface/surfaceReuse.browser.test.tsx` — reuse/content-preservation browser test. (create)
- `packages/app-routes/src/routes/script/ScriptWorkspaceContext.tsx` — extend value with cache. (modify)
- `packages/app-routes/src/routes/script/ScriptWorkspaceRoute.tsx` — create/destroy cache. (modify)
- `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx` — pass cache prop. (modify)

---

### Task 12: Pagination settings equality guard

**Files:**
- Modify: `packages/editor/src/editor/tiptap/extensions/PaginationExtension.ts`
- Test: extend `packages/editor/src/editor/tiptap/extensions/pagination/pagination.browser.test.tsx`

- [x] **Step 1: Failing test** — in the pagination browser test add:

```tsx
it('does not bump optionsVersion when updatePaginationSettings receives identical values', async () => {
    renderEditor();
    await waitForElement('[contenteditable="true"]');

    const editor = /* expose via a captured onCreate or query the instance from the test render helper */
    // Simplest: render with a ref-callback prop is not available; instead assert via storage through a second command call:
});
```

Practical shape (the helper returns the editor): change `renderEditor` to also register `editor` via `EditorInstanceProvider` is heavyweight — instead unit-test the guard logic directly by extracting it:

```ts
// packages/editor/src/editor/tiptap/extensions/pagination/settingsEqual.ts
import type {PaginationOptions} from '../types';

export const arePaginationSettingsApplied = (
    current: PaginationOptions,
    incoming: Partial<PaginationOptions>,
): boolean => (Object.keys(incoming) as (keyof PaginationOptions)[])
    .every(key => current[key] === incoming[key]);
```

Unit test `settingsEqual.test.ts`:

```ts
import {describe, expect, it} from 'vite-plus/test';

import {DEFAULT_OPTIONS} from './constants';
import {arePaginationSettingsApplied} from './settingsEqual';

describe('arePaginationSettingsApplied', () => {
    it('returns true for an identical subset', () => {
        expect(arePaginationSettingsApplied(DEFAULT_OPTIONS, {pageHeight: DEFAULT_OPTIONS.pageHeight})).toBe(true);
    });

    it('returns false when any value differs', () => {
        expect(arePaginationSettingsApplied(DEFAULT_OPTIONS, {pageHeight: DEFAULT_OPTIONS.pageHeight + 1})).toBe(false);
    });
});
```

- [x] **Step 2: Run test — fails (module missing).**
- [x] **Step 3: Implement `settingsEqual.ts` and guard the command:**

```ts
updatePaginationSettings: (settings: Partial<PaginationOptions>) => () => {
    if (arePaginationSettingsApplied(this.options, settings)) {
        return true;
    }
    // ...existing body unchanged
},
```

- [x] **Step 4: Unit test passes; existing pagination browser test still passes.**

---

### Task 13: `EditorSurfaceCache` module

**Files:**
- Create: `packages/editor/src/editor/surface/editorSurfaceCache.ts`
- Test: `packages/editor/src/editor/surface/editorSurfaceCache.test.ts`

**Interfaces (produced):**

```ts
export type MutableRefLike<T> = {current: T};

export type CharacterColorRefsBundle = {
    colorByCharacterIdRef: MutableRefLike<ReadonlyMap<string, string>>,
    rememberedColorByKeyRef: MutableRefLike<ReadonlyMap<string, string>>,
    rememberedColorSaturationRef: MutableRefLike<number | null>,
    persistentCharactersRef: MutableRefLike<readonly PersistentCharacterRef[]>,
};

export const createCharacterColorRefsBundle = (): CharacterColorRefsBundle => ({
    colorByCharacterIdRef: {current: new Map()},
    rememberedColorByKeyRef: {current: new Map()},
    rememberedColorSaturationRef: {current: null},
    persistentCharactersRef: {current: []},
});

export type EditorSurfaceEntry = {
    signature: string,
    editor: TiptapEditor,
    characterColorRefs: CharacterColorRefsBundle,
};

export type EditorSurfaceCache = {
    acquire: (signature: string) => EditorSurfaceEntry | null,
    store: (entry: EditorSurfaceEntry) => void,
    destroy: () => void,
};
```

`createEditorSurfaceCache()`: single-entry; `acquire` returns entry on signature match, otherwise destroys+clears a stale entry and returns null; `store` destroys a previously cached different editor; `destroy` destroys+clears.

- [x] **Step 1: Failing unit test** (use a stub `{destroy: vi.fn(), isDestroyed: false}` cast as the editor): acquire-miss returns null; store→acquire same signature returns entry; acquire different signature destroys stale + returns null; store replacing destroys previous; destroy clears.
- [x] **Step 2: Implement; tests pass.**

---

### Task 14: `useEditorCharacterColors` accepts an external refs bundle

**Files:**
- Modify: `packages/editor/src/editor/hooks/useEditorCharacterColors.ts`

- [x] **Step 1:** Add optional `refs?: CharacterColorRefsBundle` arg. Replace the four `useRef` declarations with:

```ts
const localRefs = useRef<CharacterColorRefsBundle | null>(null);

if (!localRefs.current) {
    localRefs.current = createCharacterColorRefsBundle();
}

const {
    colorByCharacterIdRef,
    rememberedColorByKeyRef,
    rememberedColorSaturationRef,
    persistentCharactersRef,
} = refs ?? localRefs.current;
```

The update effect and return value stay unchanged (plain `{current}` containers behave identically; `useEditorExtensions` already types refs as `{current: ...}`).

- [x] **Step 2:** Typecheck + existing editor unit/browser tests pass (no behavior change without the arg).

---

### Task 15: Cache-aware instance + restored lifecycle in `Editor.tsx`

**Files:**
- Create: `packages/editor/src/editor/surface/useScriptEditorInstance.ts`
- Modify: `packages/editor/src/editor/Editor.tsx`, `packages/editor/src/editor/hooks/useEditorLifecycle.ts`, `packages/editor/src/editor/contracts.ts`, `packages/editor/src/index.ts`

- [ ] **Step 1: `useScriptEditorInstance`** — replaces `useEditor`:

```ts
import {Editor as TiptapEditor} from '@tiptap/core';
// state: {signature, editor, isRestored, ownsEditor}
```

Behavior:
- `useState` initializer: with cache → `cache.acquire(signature)`; hit → `{editor, isRestored: true, ownsEditor: false}`; miss → `new TiptapEditor({extensions, content, autofocus, editorProps: {attributes: {'data-editor': 'true'}}})`, `cache.store({signature, editor, characterColorRefs})`, `{isRestored: false, ownsEditor: false}`. Without cache → create, `ownsEditor: true`.
- Render-phase signature swap (React "adjust state during render"): when `state.signature !== signature` → if `ownsEditor` destroy old; re-run creation (cache path: `acquire` destroys the stale entry); `setState(next)`.
- Unmount effect cleanup: destroy only when `ownsEditor`.
- StrictMode note: double-invoked initializer self-heals with cache (second call hits the just-stored entry → same instance). No-cache dev double-create matches historical tiptap behavior; tests unaffected.
- Returns `{editor, isRestored}`.

- [ ] **Step 2: Signature in `Editor.tsx`:**

```ts
const surfaceSignature = useMemo(() => JSON.stringify({
    content: initialContentSignature,
    settings: resolvedSettings,
    sizeScale,
    blockUi: Boolean(onBlockUiEvent),
}), [initialContentSignature, resolvedSettings, sizeScale, onBlockUiEvent]);
```

Refs bundle: `surfaceCache?.acquire`-hit entry's bundle must be the one passed to `useEditorCharacterColors`. Order of operations in the component:

```ts
const surfaceEntryRef = useRef<EditorSurfaceEntry | null>(null);
// resolved once per mount before character colors:
if (surfaceCache && !surfaceEntryRef.current) {
    surfaceEntryRef.current = surfaceCache.acquire(surfaceSignature);
}
const characterColorRefs = surfaceEntryRef.current?.characterColorRefs ?? /* fresh bundle kept in a ref */;
```

(Implementation detail: fold this resolution into `useScriptEditorInstance` so acquire happens exactly once — the hook takes `{surfaceCache, signature, characterColorRefs: () => bundle}` and returns `{editor, isRestored, characterColorRefs}`; `useEditorCharacterColors` receives the returned bundle. Keep the hook the single owner of acquire/store.)

Replace `useEditor(...)` call with the new hook; delete the `useEditor` import; pass `isRestored` to `useEditorLifecycle`.

- [ ] **Step 3: `useEditorLifecycle` restored light path** — add `isRestored: boolean` to the `editor` arg group. In the initial-apply effect:

```ts
const hasAppliedInitialRef = useRef(false);

useEffect(() => {
    if (!instance) {
        return;
    }

    if (isRestored && !hasAppliedInitialRef.current) {
        hasAppliedInitialRef.current = true;
        revisionRef.current = 0;
        lastEmittedActiveBlockIdRef.current = undefined;

        const currentValue = stripScriptSettings(instance.getJSON() as ScriptDocument);

        syncInitialValue(currentValue, initialSerialized, revisionRef.current);
        // reuse the existing snapshot-emit tail (buildIndexSnapshotFromPmDoc / syncRuntimeSnapshotFromEditor)
        return;
    }

    hasAppliedInitialRef.current = true;
    // ...existing full apply (setContent, sanitize, doc attrs, selection, baseline, snapshot emit)
}, [/* existing deps + isRestored */]);
```

Rationale: skip only the first effect run of a restored mount; later `initialValue` prop changes (e.g. character-confirm override) re-run the full apply as today.

- [ ] **Step 4: `contracts.ts`** — add optional top-level prop `surfaceCache?: EditorSurfaceCache` to `EditorProps`; export cache API from `packages/editor/src/index.ts` (`createEditorSurfaceCache`, types).
- [ ] **Step 5:** Typecheck editor package; run editor unit + browser suites — all pass with **no cache** (unchanged behavior).

---

### Task 16: Browser test — instance reuse + content preservation

**Files:**
- Create: `packages/editor/src/editor/surface/surfaceReuse.browser.test.tsx`

- [ ] **Step 1:** Test plan (structure mirrors `pagination.browser.test.tsx` helpers):
1. `const cache = createEditorSurfaceCache()`; mount `ScriptEditor` with `surfaceCache={cache}` and a multi-page doc; wait for `[contenteditable]`; capture `const dom1 = document.querySelector('[data-editor]')`.
2. Type into the editor (dispatch an insertText transaction via the instance obtained from a test-only `onBlockUiEvent`? simpler: locate the ProseMirror view DOM and use `userEvent.type` after focusing) — or assert content preservation by dispatching through `document.querySelector` + `execCommand` is flaky; preferred: read the editor from `cache` via a test helper — add `acquirePeek?`: NOT needed — the test can hold its own reference: after first mount, `cache.acquire(signature)` cannot be called without the signature; instead capture the instance via `onValueChange` callback (fires with editor value) or via typing + DOM assertion:
   - `await userEvent.click(editorDom)`; `await userEvent.keyboard('XYZQ')`; assert `editorDom.textContent` contains `XYZQ`.
3. Unmount; assert cache kept the editor alive (DOM detached, not destroyed).
4. Remount with identical props + same cache; wait for `[contenteditable]`; assert:
   - the same DOM node instance is re-attached (`document.querySelector('[data-editor]') === dom1` — tiptap re-parents the original `view.dom`),
   - `XYZQ` is still present (no stale reset),
   - pagination dividers present without full re-measure wait (count > 0 quickly).
5. Control: remount WITHOUT cache → different DOM node, `XYZQ` gone (documents old behavior as baseline).
- [ ] **Step 2:** Run; iterate until green. Run the whole editor browser suite.

---

### Task 17: Workspace wiring

**Files:**
- Modify: `packages/app-routes/src/routes/script/ScriptWorkspaceContext.tsx`, `ScriptWorkspaceRoute.tsx`, `ScriptEditorRoute.tsx`

- [ ] **Step 1: Context value type:**

```ts
export type ScriptWorkspaceValue = ScriptEditorController & {
    editorSurfaceCache: EditorSurfaceCache,
};
```

Provider/hook generics update accordingly (import `EditorSurfaceCache` from `@stagistic/editor`). Update the context unit test stub.

- [ ] **Step 2: Workspace route:**

```ts
const editorSurfaceCache = useMemo(() => createEditorSurfaceCache(), []);

useEffect(() => () => {
    editorSurfaceCache.destroy();
}, [editorSurfaceCache, scriptId]);

const workspaceValue = useMemo(
    () => ({...controller, editorSurfaceCache}),
    [controller, editorSurfaceCache],
);
```

(`scriptId` in deps: switching scripts within the mounted workspace destroys the stale surface; signature would also miss, but explicit destroy frees memory promptly.)

- [ ] **Step 3: Editor route:** `const {editorSurfaceCache, ...} = useScriptWorkspace();` → `<ScriptEditor surfaceCache={editorSurfaceCache} ...>`.
- [ ] **Step 4:** Typecheck app-routes + web; `pnpm test`; app-routes + editor + ui browser suites.

---

### Task 18: Perf verification + cleanup

- [ ] **Step 1:** Extend `perfMount.browser.test.tsx`: cached remount measurement (mount with cache → unmount → remount with same cache; log timings). Expect editor-visible in tens of ms; pagination stable without full re-measure.
- [ ] **Step 2:** User verifies in-app with the TEMP instrumentation: switch Export → Editor; `[perf] editor visible + pagination stable` should drop from ~1450ms to well under ~200ms.
- [ ] **Step 3:** After confirmation: delete TEMP instrumentation (`perfInstrumentation.ts`, marks in `AppHeader.tsx`, Profiler in `ScriptWorkspaceRoute.tsx`, effect in `ScriptEditorRoute.tsx`) and delete `perfMount.browser.test.tsx`. Final full verification run.

---

## Out of scope (flagged, not fixed here)

- **Settings-change stale reset (pre-existing):** changing script settings while editing rebuilds the editor from the workspace's load-time `initialValue` (same `setContent` vector). The cache does not change this path. Candidate follow-up: keep workspace `initialValue` fresh via `onValueSynced`.
- **Export surface:** the future Export view creates its own read-only instance (export-only config, filtered doc) cached the same way; export config changes rebuild only the export surface behind a non-blocking overlay.

## Self-Review

- Root cause (rebuild + pagination re-measure + stale reset) addressed by reuse + skip-apply + pagination guard. ✔
- No-cache behavior preserved (Task 15 Step 5, Task 16 control case). ✔
- Refs closure problem solved by bundling refs in the cache entry (Task 13/14/15). ✔
- Signature mirrors today's rebuild semantics. ✔
- Types consistent: `EditorSurfaceCache`/`EditorSurfaceEntry`/`CharacterColorRefsBundle` defined once in Task 13, consumed in 14/15/17. ✔
