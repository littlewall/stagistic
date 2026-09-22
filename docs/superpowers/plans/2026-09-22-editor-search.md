# Editor Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add instant, case-insensitive text search to the script editor with highlighted results, cyclic navigation, keyboard shortcuts, and collapsed-scene reveal.

**Architecture:** A custom Tiptap `SearchExtension` owns criteria, matches, active result, commands, and ProseMirror decorations. A pure block-local matcher keeps text semantics testable, while `useEditorSearch` binds extension state to the existing toolbar, hotkeys, scene expansion, and scrolling without duplicating result state in React.

**Tech Stack:** TypeScript, React, Tiptap 3 / ProseMirror, `@tanstack/react-hotkeys`, React Aria Components, CSS Modules, Vite+ tests, Moon.

**Spec:** `docs/superpowers/specs/2026-09-22-editor-search-design.md`

## Global Constraints

- Search is literal, instant, case-insensitive, Unicode-aware, and exact with respect to diacritics.
- A match may cross inline-mark boundaries but never a script-block boundary.
- Search includes content hidden by scene collapse.
- Search navigation must not focus the editor or change its ProseMirror selection.
- Empty query shows the search icon; a non-empty query shows `current / total`, including `0 / 0`.
- All matches use background color only; the active result is more saturated and has no border, outline, or box shadow.
- The search-options popover remains an empty padded wrapper.
- Do not add the official Tiptap package; implement a custom extension compatible with the repository's Tiptap version.
- Do not increment `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Use Moon for formatting, lint, typechecking, and tests.
- Run `graphify update .` after code changes.
- Never commit. At each review checkpoint, prepare the diff and suggested commit message; the user performs the commit.
- Preserve unrelated work already present in the dirty worktree.

## Review Focus

1. A query containing regex punctuation such as `a+b?` must be matched literally — pinned in Task 1 matcher tests.
2. A query spanning marked and unmarked text must map to one correct ProseMirror range — pinned in Task 1 matcher tests.
3. Deleting the active occurrence during editing must select the closest following occurrence without moving the caret — pinned in Task 2 extension tests.
4. Enter pressed during IME composition must not navigate — pinned in Task 4 editor browser tests.
5. `Cmd+F` / `Ctrl+F` while an unrelated input or modal owns focus must remain untouched — pinned in Task 4 editor browser tests.

---

## File Structure

### New files

- `packages/editor/src/editor/tiptap/extensions/search/types.ts` — stable criteria, result, and snapshot contracts.
- `packages/editor/src/editor/tiptap/extensions/search/findSearchResults.ts` — pure block-local text matcher and ProseMirror position mapping.
- `packages/editor/src/editor/tiptap/extensions/search/findSearchResults.test.ts` — matcher semantics and edge cases.
- `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.ts` — plugin key, state transitions, commands, and decorations.
- `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.module.css` — passive and active highlight backgrounds.
- `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.test.ts` — plugin state, navigation, edit mapping, and selection preservation.
- `packages/editor/src/editor/tiptap/extensions/search/index.ts` — public exports for the search extension.
- `packages/editor/src/editor/hooks/useEditorSearch.ts` — toolbar binding, shortcut handling, scene reveal, and scrolling.
- `packages/editor/src/editor/tiptap/extensions/search/search.browser.test.tsx` — full editor interaction and visual behavior.

### Modified files

- `packages/editor/src/editor/tiptap/extensions/index.ts` — re-export search extension APIs.
- `packages/editor/src/editor/useEditorExtensions.ts` — register `SearchExtension` once per editor.
- `packages/editor/src/editor/components/EditorToolbar.tsx` — replace local placeholder state with `useEditorSearch`.
- `packages/editor/src/editor/components/EditorToolbar.test.tsx` — retain placement coverage and verify empty server-rendered fallback.
- `packages/ui/src/atoms/SearchInput.tsx` — forward an input ref.
- `packages/ui/src/molecules/SearchControl.tsx` — forward the ref, announce result changes, and expose input keyboard handling.
- `packages/ui/src/molecules/SearchControl.browser.test.tsx` — ref, live-region, IME, and navigation callback coverage.

---

### Task 1: Pure Block-Local Search Matcher

**Files:**

- Create: `packages/editor/src/editor/tiptap/extensions/search/types.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/search/findSearchResults.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/search/findSearchResults.test.ts`

**Interfaces:**

- Consumes: `ScriptBlockNodeType`, `isScriptBlockNodeName`, and `normalizeBlockNodeType`.
- Produces: `SearchCriteria`, `SearchResult`, `EditorSearchSnapshot`, `DEFAULT_SEARCH_CRITERIA`, and `findSearchResults(doc, criteria)`.

- [ ] **Step 1: Define the stable search contracts**

Create `types.ts` with these exact public shapes:

```ts
import type {ScriptBlockNodeType} from '@stagistic/script';
import type {DecorationSet} from '@tiptap/pm/view';

export interface SearchCriteria {
    query: string;
    caseSensitive: boolean;
    blockTypes: readonly ScriptBlockNodeType[] | null;
}

export interface SearchResult {
    from: number;
    to: number;
    blockId: string | null;
    blockType: ScriptBlockNodeType;
}

export interface EditorSearchSnapshot {
    criteria: SearchCriteria;
    results: readonly SearchResult[];
    currentIndex: number;
    decorations: DecorationSet;
}

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
    query: '',
    caseSensitive: false,
    blockTypes: null,
};
```

- [ ] **Step 2: Write failing matcher tests**

Create `findSearchResults.test.ts`. Build ProseMirror documents with `DocumentWithSettings`, `Text`, `Bold`, and `ScriptBlockNodes`, then assert these cases explicitly:

```ts
it('matches case-insensitively and keeps diacritics exact', () => {
    const doc = createDocument([block('dialogue', 'd1', 'Light LIGHT líght')]);

    expect(findSearchResults(doc, criteria('light')).map(result => [result.from, result.to])).toHaveLength(2);
});

it('treats regex punctuation as literal text', () => {
    const doc = createDocument([block('dialogue', 'd1', 'a+b? then ab')]);

    expect(findSearchResults(doc, criteria('a+b?'))).toHaveLength(1);
});

it('matches across adjacent text nodes separated by a mark', () => {
    const doc = createDocument([markedBlock('dialogue', 'd1', [plain('moon'), bold('light')])]);
    const [result] = findSearchResults(doc, criteria('moonlight'));

    expect(doc.textBetween(result.from, result.to)).toBe('moonlight');
});

it('does not match across block boundaries', () => {
    const doc = createDocument([block('dialogue', 'd1', 'moon'), block('dialogue', 'd2', 'light')]);

    expect(findSearchResults(doc, criteria('moonlight'))).toEqual([]);
});

it('returns non-overlapping results in document order', () => {
    const doc = createDocument([block('dialogue', 'd1', 'aaaa')]);

    expect(findSearchResults(doc, criteria('aa'))).toHaveLength(2);
});

it('supports case-sensitive and block-type criteria', () => {
    const doc = createDocument([block('dialogue', 'd1', 'Light light'), block('stageDirection', 's1', 'light')]);
    const results = findSearchResults(doc, {
        query: 'Light',
        caseSensitive: true,
        blockTypes: ['dialogue'],
    });

    expect(results).toMatchObject([{blockId: 'd1', blockType: 'dialogue'}]);
});
```

- [ ] **Step 3: Run the matcher test and confirm the red state**

Run:

```bash
moon run editor:test -- src/editor/tiptap/extensions/search/findSearchResults.test.ts
```

Expected: FAIL because `findSearchResults` and its types do not exist.

- [ ] **Step 4: Implement literal matching and position mapping**

Implement `findSearchResults.ts` with a text-segment map per script block. Use UTF-16 offsets throughout because JavaScript regex indices and ProseMirror text positions use compatible offsets.

```ts
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {isScriptBlockNodeName, normalizeBlockNodeType} from '../../scriptCore';
import type {SearchCriteria, SearchResult} from './types';

interface TextSegment {
    textFrom: number;
    textTo: number;
    docFrom: number;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const collectText = (block: ProseMirrorNode, blockFrom: number) => {
    const segments: TextSegment[] = [];
    let text = '';

    block.descendants((node, relativeFrom) => {
        if (!node.isText || !node.text) {
            return true;
        }

        segments.push({
            textFrom: text.length,
            textTo: text.length + node.text.length,
            docFrom: blockFrom + 1 + relativeFrom,
        });
        text += node.text;

        return false;
    });

    return {segments, text};
};

const mapRange = (segments: readonly TextSegment[], from: number, to: number) => {
    const start = segments.find(segment => from >= segment.textFrom && from < segment.textTo);
    const end = segments.find(segment => to > segment.textFrom && to <= segment.textTo);

    if (!start || !end) {
        return null;
    }

    return {
        from: start.docFrom + from - start.textFrom,
        to: end.docFrom + to - end.textFrom,
    };
};
```

Traverse script blocks in document order, skip blocks excluded by `blockTypes`, run `new RegExp(escapeRegExp(query), caseSensitive ? 'gu' : 'giu')`, and convert each non-overlapping match through `mapRange` into a `SearchResult`.

- [ ] **Step 5: Run matcher tests and project typecheck**

Run:

```bash
moon run editor:test -- src/editor/tiptap/extensions/search/findSearchResults.test.ts
moon run editor:typecheck
```

Expected: matcher tests PASS and editor typecheck PASS.

- [ ] **Step 6: Prepare the review checkpoint**

Run `git diff -- packages/editor/src/editor/tiptap/extensions/search`. Do not commit. Suggested user commit message: `feat(editor): add block-local search matcher`.

---

### Task 2: Tiptap Search State, Commands, and Decorations

**Files:**

- Create: `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.module.css`
- Create: `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.test.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/search/index.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/index.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts`

**Interfaces:**

- Consumes: `findSearchResults`, `SearchCriteria`, `EditorSearchSnapshot`, and `DEFAULT_SEARCH_CRITERIA` from Task 1.
- Produces: `SearchExtension`, `getEditorSearchSnapshot(state)`, and Tiptap commands `setSearchCriteria`, `clearSearch`, `goToNextSearchResult`, and `goToPreviousSearchResult`.

- [ ] **Step 1: Write failing extension-state tests**

Create a test editor containing `DocumentWithSettings`, `Text`, `Bold`, `ScriptBlockNodes`, and `SearchExtension`. Add tests with these assertions:

```ts
it('chooses the first result at or after the current selection and wraps', () => {
    const editor = createSearchEditor('light one light two');
    editor.commands.setTextSelection(8);

    editor.commands.setSearchCriteria(criteria('light'));

    const snapshot = getEditorSearchSnapshot(editor.state);
    expect(snapshot.results).toHaveLength(2);
    expect(snapshot.currentIndex).toBe(1);
});

it('navigates cyclically without changing the editor selection', () => {
    const editor = createSearchEditor('light one light two');
    editor.commands.setTextSelection(3);
    const selectionBefore = editor.state.selection.from;
    editor.commands.setSearchCriteria(criteria('light'));

    editor.commands.goToPreviousSearchResult();
    expect(getEditorSearchSnapshot(editor.state).currentIndex).toBe(1);
    expect(editor.state.selection.from).toBe(selectionBefore);

    editor.commands.goToNextSearchResult();
    expect(getEditorSearchSnapshot(editor.state).currentIndex).toBe(0);
    expect(editor.state.selection.from).toBe(selectionBefore);
});

it('preserves the mapped active occurrence after editing', () => {
    const editor = createSearchEditor('light one light two');
    editor.commands.setSearchCriteria(criteria('light'));
    editor.commands.goToNextSearchResult();
    const activeBefore = activeResult(editor).from;

    editor.commands.insertContentAt(1, 'new ');

    expect(activeResult(editor).from).toBe(activeBefore + 4);
});

it('selects the closest following occurrence when the active one is deleted', () => {
    const editor = createSearchEditor('light one light two light');
    editor.commands.setSearchCriteria(criteria('light'));
    editor.commands.goToNextSearchResult();
    const removed = activeResult(editor);
    const transaction = editor.state.tr.delete(removed.from, removed.to);
    const expectedSelection = transaction.selection.from;

    editor.view.dispatch(transaction);

    expect(activeResult(editor).from).toBeGreaterThanOrEqual(removed.from);
    expect(editor.state.selection.from).toBe(expectedSelection);
});

it('clears results and decorations', () => {
    const editor = createSearchEditor('light');
    editor.commands.setSearchCriteria(criteria('light'));

    editor.commands.clearSearch();

    const snapshot = getEditorSearchSnapshot(editor.state);
    expect(snapshot.criteria.query).toBe('');
    expect(snapshot.results).toEqual([]);
    expect(snapshot.currentIndex).toBe(-1);
    expect(snapshot.decorations.find()).toEqual([]);
});
```

- [ ] **Step 2: Run the extension test and confirm the red state**

Run:

```bash
moon run editor:test -- src/editor/tiptap/extensions/search/SearchExtension.test.ts
```

Expected: FAIL because `SearchExtension` and its commands do not exist.

- [ ] **Step 3: Implement plugin metadata and state transitions**

In `SearchExtension.ts`, define one `PluginKey<EditorSearchSnapshot>` and this closed metadata union:

```ts
type SearchMeta = {type: 'criteria'; criteria: SearchCriteria} | {type: 'clear'} | {type: 'next'} | {type: 'previous'};
```

Implement helpers with these responsibilities:

```ts
const findInitialIndex = (results: readonly SearchResult[], origin: number) => {
    const index = results.findIndex(result => result.from >= origin);

    return results.length === 0 ? -1 : index === -1 ? 0 : index;
};

const moveIndex = (current: number, count: number, delta: -1 | 1) => {
    if (count === 0) {
        return -1;
    }

    return (current + delta + count) % count;
};
```

On criteria changes, recalculate from `transaction.doc` and choose from `transaction.selection.anchor`. On `docChanged`, map the old active result's `from` through `transaction.mapping`, recalculate, then choose the exact mapped occurrence or the closest following result with wraparound. On next/previous metadata, retain results and update only `currentIndex` and decorations.

- [ ] **Step 4: Build passive and active decorations**

Create inline decorations for each result. Every result has a stable match attribute; only the active result has the current attribute.

```ts
const buildDecorations = (doc: ProseMirrorNode, results: readonly SearchResult[], currentIndex: number) =>
    DecorationSet.create(
        doc,
        results.map((result, index) =>
            Decoration.inline(result.from, result.to, {
                class: index === currentIndex ? `${styles.match} ${styles.current}` : styles.match,
                'data-editor-search-match': 'true',
                ...(index === currentIndex ? {'data-editor-search-current': 'true'} : {}),
            }),
        ),
    );
```

Use only background colors in `SearchExtension.module.css`:

```css
.match {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.current {
    background: color-mix(in srgb, var(--color-accent) 38%, transparent);
}
```

Use the existing `--color-accent` token defined in `packages/ui/styles/tokens.css`. Do not introduce a new global token for this feature.

- [ ] **Step 5: Add Tiptap command declarations and implementations**

Add module augmentation and dispatch metadata without changing selection or history:

```ts
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        editorSearch: {
            setSearchCriteria: (criteria: SearchCriteria) => ReturnType;
            clearSearch: () => ReturnType;
            goToNextSearchResult: () => ReturnType;
            goToPreviousSearchResult: () => ReturnType;
        };
    }
}
```

Each command must dispatch `tr.setMeta(editorSearchPluginKey, meta).setMeta('addToHistory', false)` and return `true`. `getEditorSearchSnapshot` returns plugin state or an empty snapshot with `DecorationSet.empty`.

- [ ] **Step 6: Export and register the extension**

Create `search/index.ts` exporting the extension, snapshot getter, constants, and types. Re-export it from the Decorations section of `tiptap/extensions/index.ts`. Add `SearchExtension` to `useEditorExtensions.ts` beside other decoration extensions, with no hook dependency because it is a stable extension object.

- [ ] **Step 7: Run extension tests, editor tests, and typecheck**

Run:

```bash
moon run editor:test -- src/editor/tiptap/extensions/search/SearchExtension.test.ts
moon run editor:test
moon run editor:typecheck
```

Expected: all three commands PASS. Confirm the tests assert that `editor.state.selection` is unchanged after every navigation command.

- [ ] **Step 8: Prepare the review checkpoint**

Run `git diff -- packages/editor/src/editor/tiptap/extensions packages/editor/src/editor/useEditorExtensions.ts`. Do not commit. Suggested user commit message: `feat(editor): add search extension state and decorations`.

---

### Task 3: Search Input Ref, Keyboard Contract, and Live Status

**Files:**

- Modify: `packages/ui/src/atoms/SearchInput.tsx`
- Modify: `packages/ui/src/molecules/SearchControl.tsx`
- Modify: `packages/ui/src/molecules/SearchControl.browser.test.tsx`

**Interfaces:**

- Consumes: existing `Input`, `IconButton`, and controlled `SearchControl` props.
- Produces: a forwarded `HTMLInputElement` ref, `onPreviousResult`, `onNextResult`, and input `onKeyDown` compatibility for the editor binding.

- [ ] **Step 1: Write failing component browser tests**

Extend the existing harness with callback spies and a ref. Add these cases:

```tsx
it('forwards the search input ref', async () => {
    const ref = createRef<HTMLInputElement>();

    await mount(<SearchControl ref={ref} value="light" currentResult={1} resultCount={2} aria-label="Search script" readOnly />);

    expect(ref.current).toBe(document.querySelector('input[aria-label="Search script"]'));
});

it('announces a non-empty result position politely', async () => {
    await mount(<SearchControl value="light" currentResult={1} resultCount={2} aria-label="Search script" readOnly />);
    const output = document.querySelector('output[aria-label="Search result position"]');

    expect(output?.getAttribute('aria-live')).toBe('polite');
    expect(output?.textContent).toBe('1 / 2');
});

it('leaves Enter behavior to the supplied input handler', async () => {
    const onKeyDown = vi.fn();
    const input = await mount(<SearchControl value="light" currentResult={1} resultCount={2} aria-label="Search script" onKeyDown={onKeyDown} readOnly />);

    await userEvent.type(input, '{Enter}');

    expect(onKeyDown).toHaveBeenCalledOnce();
});
```

Add an IME regression harness that dispatches a composing `KeyboardEvent('keydown', {key: 'Enter', isComposing: true, bubbles: true})` and verifies the editor-supplied handler can observe `nativeEvent.isComposing` without the component invoking result callbacks itself.

- [ ] **Step 2: Run UI browser tests and confirm the red state**

Run:

```bash
moon run ui:test-browser -- src/molecules/SearchControl.browser.test.tsx
```

Expected: the ref and live-region assertions FAIL.

- [ ] **Step 3: Forward refs through both UI layers**

Convert `SearchInput` and `SearchControl` to `forwardRef<HTMLInputElement, Props>`, pass the ref to `Input`, and set display names:

```tsx
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>((props, ref) => {
    const {size = 'md', className, startAdornment, endAdornment, ...inputProps} = props;

    return (
        <div className={clsx(styles.field, SIZE_CLASS[size], className)}>
            {resolvedStartAdornment}
            <Input {...inputProps} ref={ref} type="search" className={styles.input} />
            {resolvedEndAdornment}
        </div>
    );
});

SearchInput.displayName = 'SearchInput';
```

Apply the same pattern to `SearchControl`, passing its ref to `SearchInput`. Preserve the current adornment markup, classes, sizing, clear button, divider, navigation buttons, and options popover.

- [ ] **Step 4: Add polite result announcements**

Set `aria-live="polite"` and `aria-atomic="true"` on the existing `<output>`. Keep the empty-query search icon outside the live region so focusing an empty search does not announce `0 / 0`.

- [ ] **Step 5: Run UI tests and typecheck**

Run:

```bash
moon run ui:test
moon run ui:test-browser -- src/molecules/SearchControl.browser.test.tsx
moon run ui:typecheck
```

Expected: all targeted UI checks PASS and existing search-control geometry assertions remain unchanged.

- [ ] **Step 6: Prepare the review checkpoint**

Run `git diff -- packages/ui/src/atoms/SearchInput.tsx packages/ui/src/molecules/SearchControl.tsx packages/ui/src/molecules/SearchControl.browser.test.tsx`. Do not commit. Suggested user commit message: `feat(ui): expose search control input behavior`.

---

### Task 4: Toolbar Binding, Enter Navigation, and Find Shortcut

**Files:**

- Create: `packages/editor/src/editor/hooks/useEditorSearch.ts`
- Modify: `packages/editor/src/editor/components/EditorToolbar.tsx`
- Modify: `packages/editor/src/editor/components/EditorToolbar.test.tsx`
- Create: `packages/editor/src/editor/tiptap/extensions/search/search.browser.test.tsx`

**Interfaces:**

- Consumes: `getEditorSearchSnapshot`, search commands from Task 2, and forwarded input ref from Task 3.
- Produces: `useEditorSearch({editor})`, returning controlled props consumed directly by `SearchControl`.

- [ ] **Step 1: Define the hook result contract**

Create `useEditorSearch.ts` with this exported API:

```ts
interface UseEditorSearchArgs {
    editor: TiptapEditor | null;
}

export interface UseEditorSearchResult {
    inputRef: RefObject<HTMLInputElement | null>;
    query: string;
    currentResult: number;
    resultCount: number;
    onQueryChange: ChangeEventHandler<HTMLInputElement>;
    onInputKeyDown: KeyboardEventHandler<HTMLInputElement>;
    onClear: () => void;
    onPreviousResult: () => void;
    onNextResult: () => void;
}
```

- [ ] **Step 2: Write failing full-editor browser tests for binding and navigation**

In `search.browser.test.tsx`, render `ScriptEditor` with two blocks containing mixed-case `light` occurrences. Expose the editor through `useEditorInstance`, then assert:

```ts
it('searches instantly and navigates while retaining input focus and editor selection', async () => {
    renderEditor(searchFixture());
    const editor = await getEditor();
    const input = await findSearchInput();
    const selectionBefore = editor.state.selection.from;

    await userEvent.type(input, 'LIGHT');
    expect(await resultText()).toBe('1 / 3');
    expect(document.activeElement).toBe(input);

    await userEvent.type(input, '{Enter}');
    expect(await resultText()).toBe('2 / 3');
    expect(document.activeElement).toBe(input);
    expect(editor.state.selection.from).toBe(selectionBefore);

    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(await resultText()).toBe('1 / 3');
});

it('does not navigate on composing Enter', async () => {
    renderEditor(searchFixture());
    const input = await findSearchInput();
    await userEvent.type(input, 'light');

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: 'Enter',
            isComposing: true,
            bubbles: true,
            cancelable: true,
        }),
    );

    expect(await resultText()).toBe('1 / 3');
});
```

Also cover `0 / 0`, disabled buttons, clear restoring the search icon, and button-based wraparound.

- [ ] **Step 3: Run the browser test and confirm the red state**

Run:

```bash
moon run editor:test-browser -- src/editor/tiptap/extensions/search/search.browser.test.tsx
```

Expected: FAIL because the toolbar still uses local query state and fixed zero counts.

- [ ] **Step 4: Derive toolbar values from plugin state**

Use `useEditorState` inside `useEditorSearch`:

```ts
const state = useEditorState({
    editor,
    selector: ({editor: stateEditor}) => {
        if (!stateEditor) {
            return {query: '', currentIndex: -1, resultCount: 0, activeFrom: null};
        }

        const snapshot = getEditorSearchSnapshot(stateEditor.state);
        const active = snapshot.currentIndex >= 0 ? snapshot.results[snapshot.currentIndex] : null;

        return {
            query: snapshot.criteria.query,
            currentIndex: snapshot.currentIndex,
            resultCount: snapshot.results.length,
            activeFrom: active?.from ?? null,
        };
    },
});
```

Expose `currentResult` as `currentIndex < 0 ? 0 : currentIndex + 1`. In `onQueryChange`, read the latest criteria directly from `getEditorSearchSnapshot(editor.state)` and call `setSearchCriteria({...criteria, query: event.target.value})`; do not store query or results in `useState`.

- [ ] **Step 5: Add Enter and Shift+Enter navigation**

Implement one handler and preserve IME input:

```ts
const onInputKeyDown: KeyboardEventHandler<HTMLInputElement> = event => {
    if (event.nativeEvent.isComposing || event.key !== 'Enter') {
        return;
    }

    event.preventDefault();

    if (event.shiftKey) {
        editor?.commands.goToPreviousSearchResult();
    } else {
        editor?.commands.goToNextSearchResult();
    }
};
```

The previous/next callbacks invoke the same commands. Clear invokes `clearSearch()` and immediately refocuses the input.

- [ ] **Step 6: Register scoped `Mod+F` through `@tanstack/react-hotkeys`**

Use a window target guarded for SSR. Do not use the hook-level `preventDefault` option because unrelated inputs must retain browser behavior; call `event.preventDefault()` only after passing the scope guard.

```ts
const ownsAnotherEditingContext = (target: EventTarget | null, editorElement: HTMLElement, searchInput: HTMLInputElement | null) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (editorElement.contains(target) || searchInput === target) {
        return false;
    }

    return Boolean(target.closest('input, textarea, [contenteditable="true"], [role="dialog"]'));
};
```

Register `useHotkey('Mod+F', callback, {enabled: Boolean(editor), target: getWindowTarget()})`. When allowed, prevent browser find, focus `inputRef.current`, and call `select()`.

- [ ] **Step 7: Test shortcut focus and scope**

Add browser tests that:

- place editor selection in the second block, press the platform Mod+F chord, and verify the search input is focused with its existing query selected;
- type a new query and verify the initial result is the first at or after the preserved editor selection, wrapping when needed;
- focus an unrelated input and press Mod+F, then verify the editor search did not receive focus;
- focus an input inside `[role="dialog"]` and verify the editor search did not receive focus.

Use `navigator.platform` only inside the browser test to select `{Meta>}` versus `{Control>}`; production code continues to use the library's `Mod` abstraction.

- [ ] **Step 8: Wire `EditorToolbar` to the hook**

Remove `searchQuery` local state. Call `const search = useEditorSearch({editor})` and pass:

```tsx
<SearchControl
    ref={search.inputRef}
    value={search.query}
    currentResult={search.currentResult}
    resultCount={search.resultCount}
    aria-label="Search script"
    placeholder="Find in script…"
    onChange={search.onQueryChange}
    onKeyDown={search.onInputKeyDown}
    onClear={search.onClear}
    onPreviousResult={search.onPreviousResult}
    onNextResult={search.onNextResult}
/>
```

Keep the existing empty options-popover wrapper unchanged.

- [ ] **Step 9: Run toolbar and browser checks**

Run:

```bash
moon run editor:test -- src/editor/components/EditorToolbar.test.tsx
moon run editor:test-browser -- src/editor/tiptap/extensions/search/search.browser.test.tsx
moon run editor:typecheck
```

Expected: toolbar placement, instant search, navigation, clear, IME, shortcut, and focus-scope tests PASS.

- [ ] **Step 10: Prepare the review checkpoint**

Run `git diff -- packages/editor/src/editor/hooks/useEditorSearch.ts packages/editor/src/editor/components/EditorToolbar.tsx packages/editor/src/editor/components/EditorToolbar.test.tsx packages/editor/src/editor/tiptap/extensions/search/search.browser.test.tsx`. Do not commit. Suggested user commit message: `feat(editor): connect toolbar search and shortcuts`.

---

### Task 5: Collapsed-Scene Reveal and Active-Result Scrolling

**Files:**

- Modify: `packages/editor/src/editor/hooks/useEditorSearch.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/search/search.browser.test.tsx`

**Interfaces:**

- Consumes: `activeFrom` from the search snapshot, `getSceneCollapseSnapshot`, `findCollapsedSceneContainingPosition`, and `editor.commands.expandScene`.
- Produces: automatic scene expansion and centered scrolling for each newly active search result.

- [ ] **Step 1: Write a failing collapsed-scene browser test**

Create a fixture with an open first scene and a collapsed second scene whose body contains the only match. Collapse the second scene through the existing command before entering the query.

```ts
it('expands a collapsed scene and scrolls the active match into view', async () => {
    renderEditor(collapsedSearchFixture());
    const editor = await getEditor();
    editor.commands.setCollapsedScenes(['scene-2']);
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);

    await userEvent.type(await findSearchInput(), 'hidden light');

    await poll(() => document.querySelector('[data-editor-search-current="true"]'), 'active search decoration');
    expect(getSceneCollapseSnapshot(editor.state).collapsedSceneIds).not.toContain('scene-2');
    expect(scrollIntoView).toHaveBeenCalledWith({block: 'center', inline: 'nearest'});
});
```

Add a cleanup case: unmount immediately after activating a result and assert no exception or second scroll occurs from a stale animation-frame callback.

- [ ] **Step 2: Run the test and confirm the red state**

Run:

```bash
moon run editor:test-browser -- src/editor/tiptap/extensions/search/search.browser.test.tsx
```

Expected: the collapsed scene stays collapsed and `scrollIntoView` is not called.

- [ ] **Step 3: Reveal the containing scene in the search hook**

Add an effect keyed by `editor` and `state.activeFrom`. Read the current collapse snapshot, then locate a collapsed owner:

```ts
const snapshot = getSceneCollapseSnapshot(editor.state);
const containingScene = findCollapsedSceneContainingPosition(snapshot.ranges, new Set(snapshot.collapsedSceneIds), activeFrom);

if (containingScene) {
    editor.commands.expandScene(containingScene.sceneBlockId);
}
```

Import `findCollapsedSceneContainingPosition` directly from `sceneCollapseModel`; do not duplicate its range logic.

- [ ] **Step 4: Scroll after the expanded DOM has rendered**

Schedule two animation frames, then query only inside `editor.view.dom`:

```ts
const firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(() => {
        if (editor.isDestroyed) {
            return;
        }

        editor.view.dom.querySelector<HTMLElement>('[data-editor-search-current="true"]')?.scrollIntoView({block: 'center', inline: 'nearest'});
    });
});
```

Cancel both stored frame IDs in effect cleanup. Do not call `editor.commands.focus()` or set selection during reveal or scroll.

- [ ] **Step 5: Run collapsed-scene and existing scene-collapse checks**

Run:

```bash
moon run editor:test-browser -- src/editor/tiptap/extensions/search/search.browser.test.tsx
moon run editor:test-browser -- src/editor/tiptap/extensions/sceneCollapse/sceneCollapse.browser.test.tsx
moon run editor:typecheck
```

Expected: search reveal tests PASS and existing scene-collapse behavior remains green.

- [ ] **Step 6: Prepare the review checkpoint**

Run `git diff -- packages/editor/src/editor/hooks/useEditorSearch.ts packages/editor/src/editor/tiptap/extensions/search/search.browser.test.tsx`. Do not commit. Suggested user commit message: `feat(editor): reveal hidden search results`.

---

### Task 6: Visual Contract and Final Verification

**Files:**

- Modify: `packages/editor/src/editor/tiptap/extensions/search/SearchExtension.module.css`
- Modify: `packages/editor/src/editor/tiptap/extensions/search/search.browser.test.tsx`
- Modify only if formatting requires it: files changed in Tasks 1–5

**Interfaces:**

- Consumes: search decorations and full editor behavior from Tasks 1–5.
- Produces: verified passive/active appearance and a clean handoff for user review.

- [ ] **Step 1: Add visual assertions for passive and active matches**

In the editor browser test, search a document with at least two occurrences and inspect computed styles:

```ts
it('uses only background intensity to distinguish the active result', async () => {
    renderEditor(searchFixture());
    await userEvent.type(await findSearchInput(), 'light');
    const matches = [...document.querySelectorAll<HTMLElement>('[data-editor-search-match="true"]')];
    const active = document.querySelector<HTMLElement>('[data-editor-search-current="true"]');
    const passive = matches.find(match => match !== active);

    expect(active).not.toBeNull();
    expect(passive).not.toBeUndefined();
    expect(getComputedStyle(active!).backgroundColor).not.toBe(getComputedStyle(passive!).backgroundColor);
    expect(getComputedStyle(active!).borderStyle).toBe('none');
    expect(getComputedStyle(active!).outlineStyle).toBe('none');
    expect(getComputedStyle(active!).boxShadow).toBe('none');
});
```

- [ ] **Step 2: Run the visual browser test and correct only feature styles**

Run:

```bash
moon run editor:test-browser -- src/editor/tiptap/extensions/search/search.browser.test.tsx
```

Expected: PASS. If a highlight assertion fails, adjust only `SearchExtension.module.css`; do not alter viewport settings or unrelated golden snapshots.

- [ ] **Step 3: Format and lint the touched projects**

Run:

```bash
moon run root:format
moon run editor:lint
moon run ui:lint
moon run root:format-check
```

Expected: formatting and lint checks PASS. If `ui:lint` reports the known “No files found to lint” task failure without a source diagnostic, record it as a toolchain limitation rather than changing lint configuration.

- [ ] **Step 4: Run the complete relevant verification matrix**

Run:

```bash
moon run ui:test
moon run ui:test-browser
moon run ui:typecheck
moon run editor:test
moon run editor:test-browser
moon run editor:typecheck
```

Expected: targeted search tests PASS. For any unrelated existing browser red, establish the baseline once according to `AGENTS.md`, report it with its exact test name, and do not mutate snapshots, assertions, or viewport configuration to hide it.

- [ ] **Step 5: Refresh the code graph and inspect the final diff**

Run:

```bash
graphify update .
git diff --check
git status --short
git diff -- packages/editor/src/editor/tiptap/extensions/search packages/editor/src/editor/hooks/useEditorSearch.ts packages/editor/src/editor/components/EditorToolbar.tsx packages/ui/src/atoms/SearchInput.tsx packages/ui/src/molecules/SearchControl.tsx
```

Expected: Graphify update completes, `git diff --check` is clean, and the diff contains no `SCRIPT_DOCUMENT_SCHEMA_VERSION` or database changes.

- [ ] **Step 6: Prepare the final review checkpoint**

Do not commit. Summarize changed files, verification results, any confirmed unrelated failures, and suggested user commit message: `feat(editor): add script search`.

---

## Completion Checklist

- [ ] Empty query shows the search icon.
- [ ] Non-empty query shows `current / total` or `0 / 0`.
- [ ] Matching is instant, literal, case-insensitive, Unicode-aware, and exact for diacritics.
- [ ] Matches cross inline marks but not script blocks.
- [ ] All matches have a light background; the active match has a stronger background and no border.
- [ ] Buttons, Enter, and Shift+Enter navigate cyclically.
- [ ] Editor selection and search-input focus remain stable during navigation.
- [ ] `Cmd+F` / `Ctrl+F` focuses and selects the editor search without stealing the shortcut from unrelated inputs or dialogs.
- [ ] Collapsed scenes are searched and expanded when their result becomes active.
- [ ] The active result scrolls to the center of the editor canvas.
- [ ] Case sensitivity and block types exist in the criteria model without filter UI.
- [ ] Options popover remains an empty wrapper.
- [ ] `SCRIPT_DOCUMENT_SCHEMA_VERSION` is unchanged.
- [ ] Targeted tests, typechecks, format checks, and Graphify update have been run.
- [ ] No commit was created by the agent.
