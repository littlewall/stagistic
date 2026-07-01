# Editor Headers & Footers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the configured headers and footers inside the editor page margins as a non-interactive overlay, with per-page tokens resolved (`{{page}}`, `{{page_number}}`, `{{script_title}}`, `{{draft_date}}`).

**Architecture:** Pure token/mark logic lives in `@stagistic/script`. A React overlay (`HeaderFooterOverlay`) sits as a sibling inside `EditorCanvas`, reads live `PaginationState`, and paints header/footer bands at the regular per-page geometry (each page is exactly `pageHeight` tall). No pagination widget decorations; nothing shifts editor content.

**Tech Stack:** TypeScript, React, TipTap/ProseMirror, `vite-plus/test` (`vp test run`).

**Spec:** `docs/superpowers/specs/2026-07-01-editor-headers-footers-design.md`

---

## File Structure

**`@stagistic/script` (pure logic):**
- Create `packages/script/src/settings/headerFooterText.ts` — `toRoman`, `buildPageMark`, `resolveHeaderFooterText`.
- Create `packages/script/src/settings/headerFooterText.test.ts` — unit tests.
- Modify `packages/script/src/settings/index.ts` — re-export the new module.

**`@stagistic/editor`:**
- Create `packages/editor/src/editor/headerFooter/resolvePageStructureMarks.ts` — pure page→(act,scene) mapping.
- Create `packages/editor/src/editor/headerFooter/resolvePageStructureMarks.test.ts` — unit tests.
- Create `packages/editor/src/editor/headerFooter/usePaginationState.ts` — reactive `PaginationState` hook.
- Create `packages/editor/src/editor/headerFooter/usePageStructureMarks.ts` — walks the doc, returns per-page marks.
- Create `packages/editor/src/editor/components/HeaderFooterOverlay.tsx` — the overlay.
- Create `packages/editor/src/editor/components/HeaderFooterOverlay.module.css` — overlay styles.
- Modify `packages/editor/src/editor/components/EditorCanvas.tsx` — render overlay, add props.
- Modify `packages/editor/src/editor/components/editorShell/EditorShell.tsx` — extend canvas props + forward.
- Modify `packages/editor/src/editor/contracts.ts` — add `scriptTitle` / `draftDate` to `EditorDocumentProps`.
- Modify `packages/editor/src/editor/Editor.tsx` — pass the three values into the canvas.

**`@stagistic/app-routes`:**
- Modify `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx` — pass `scriptTitle` + resolved `draftDate`.

---

## Task 1: `toRoman` (script)

**Files:**
- Create: `packages/script/src/settings/headerFooterText.ts`
- Test: `packages/script/src/settings/headerFooterText.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
    describe, expect, it,
} from 'vite-plus/test';

import {toRoman} from './headerFooterText';

describe('toRoman', () => {
    it('converts common act numbers', () => {
        expect(toRoman(1)).toBe('I');
        expect(toRoman(2)).toBe('II');
        expect(toRoman(4)).toBe('IV');
        expect(toRoman(9)).toBe('IX');
        expect(toRoman(14)).toBe('XIV');
    });

    it('returns an empty string for non-positive input', () => {
        expect(toRoman(0)).toBe('');
        expect(toRoman(-3)).toBe('');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test headerFooterText`
Expected: FAIL — `toRoman` is not exported / module missing.

- [ ] **Step 3: Write minimal implementation**

Create `packages/script/src/settings/headerFooterText.ts`:

```ts
const ROMAN_NUMERALS: ReadonlyArray<readonly [number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

export const toRoman = (value: number): string => {
    let remaining = Math.floor(value);

    if (remaining <= 0) {
        return '';
    }

    let result = '';

    for (const [numeral, symbol] of ROMAN_NUMERALS) {
        while (remaining >= numeral) {
            result += symbol;
            remaining -= numeral;
        }
    }

    return result;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test headerFooterText`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/settings/headerFooterText.ts packages/script/src/settings/headerFooterText.test.ts
git commit -m "feat(script): add toRoman for act numbering"
```

---

## Task 2: `buildPageMark` (script)

**Files:**
- Modify: `packages/script/src/settings/headerFooterText.ts`
- Test: `packages/script/src/settings/headerFooterText.test.ts`

- [ ] **Step 1: Add the failing test**

Append inside `headerFooterText.test.ts` (add the import to the existing `./headerFooterText` import line: `buildPageMark`):

```ts
describe('buildPageMark', () => {
    it('formats act-scene-page with a Roman act', () => {
        expect(buildPageMark({actIndex: 1, sceneNumber: 1, pageNumber: 1})).toBe('I-1-1');
        expect(buildPageMark({actIndex: 2, sceneNumber: 3, pageNumber: 12})).toBe('II-3-12');
    });

    it('omits the act component when there is no act', () => {
        expect(buildPageMark({actIndex: null, sceneNumber: 1, pageNumber: 1})).toBe('1-1');
        expect(buildPageMark({actIndex: 0, sceneNumber: 2, pageNumber: 5})).toBe('2-5');
    });

    it('clamps the scene component to at least 1', () => {
        expect(buildPageMark({actIndex: null, sceneNumber: 0, pageNumber: 3})).toBe('1-3');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test headerFooterText`
Expected: FAIL — `buildPageMark` is not exported.

- [ ] **Step 3: Implement**

Append to `packages/script/src/settings/headerFooterText.ts`:

```ts
export interface PageMarkParts {
    actIndex: number | null,
    sceneNumber: number,
    pageNumber: number,
}

export const buildPageMark = ({actIndex, sceneNumber, pageNumber}: PageMarkParts): string => {
    const scene = Math.max(1, sceneNumber);

    if (actIndex == null || actIndex <= 0) {
        return `${scene}-${pageNumber}`;
    }

    return `${toRoman(actIndex)}-${scene}-${pageNumber}`;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test headerFooterText`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/settings/headerFooterText.ts packages/script/src/settings/headerFooterText.test.ts
git commit -m "feat(script): add buildPageMark for act-scene-page marks"
```

---

## Task 3: `resolveHeaderFooterText` (script) + export

**Files:**
- Modify: `packages/script/src/settings/headerFooterText.ts`
- Modify: `packages/script/src/settings/index.ts`
- Test: `packages/script/src/settings/headerFooterText.test.ts`

- [ ] **Step 1: Add the failing test**

Add `resolveHeaderFooterText` to the `./headerFooterText` import line, then append:

```ts
describe('resolveHeaderFooterText', () => {
    const ctx = {
        scriptTitle: 'Hamlet',
        draftDate: '07/01/2026',
        pageMark: 'I-1-1',
        pageNumber: 1,
    };

    it('replaces all tokens', () => {
        expect(resolveHeaderFooterText('{{script_title}} — {{draft_date}}', ctx))
            .toBe('Hamlet — 07/01/2026');
        expect(resolveHeaderFooterText('{{page}}', ctx)).toBe('I-1-1');
        expect(resolveHeaderFooterText('{{page_number}}', ctx)).toBe('1.');
    });

    it('does not treat {{page}} as part of {{page_number}}', () => {
        expect(resolveHeaderFooterText('{{page_number}}', {...ctx, pageMark: 'X'})).toBe('1.');
    });

    it('falls back to Untitled for an empty title', () => {
        expect(resolveHeaderFooterText('{{script_title}}', {...ctx, scriptTitle: ''}))
            .toBe('Untitled');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test headerFooterText`
Expected: FAIL — `resolveHeaderFooterText` is not exported.

- [ ] **Step 3: Implement**

Append to `packages/script/src/settings/headerFooterText.ts`:

```ts
export interface HeaderFooterTextContext {
    scriptTitle: string,
    draftDate: string,
    pageMark: string,
    pageNumber: number,
}

export const resolveHeaderFooterText = (
    text: string,
    ctx: HeaderFooterTextContext,
): string => text
    .replaceAll('{{page_number}}', `${ctx.pageNumber}.`)
    .replaceAll('{{page}}', ctx.pageMark)
    .replaceAll('{{script_title}}', ctx.scriptTitle || 'Untitled')
    .replaceAll('{{draft_date}}', ctx.draftDate);
```

- [ ] **Step 4: Export from the settings barrel**

In `packages/script/src/settings/index.ts`, add after the existing exports:

```ts
export * from './headerFooterText';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test headerFooterText`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/script/src/settings/headerFooterText.ts packages/script/src/settings/headerFooterText.test.ts packages/script/src/settings/index.ts
git commit -m "feat(script): add resolveHeaderFooterText token resolver"
```

---

## Task 4: `resolvePageStructureMarks` (editor, pure)

**Files:**
- Create: `packages/editor/src/editor/headerFooter/resolvePageStructureMarks.ts`
- Test: `packages/editor/src/editor/headerFooter/resolvePageStructureMarks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
    describe, expect, it,
} from 'vite-plus/test';

import {resolvePageStructureMarks} from './resolvePageStructureMarks';

describe('resolvePageStructureMarks', () => {
    const blocks = [
        {pos: 0, blockType: 'act'},
        {pos: 5, blockType: 'scene'},
        {pos: 10, blockType: 'stageDirection'},
        {pos: 20, blockType: 'scene'},
        {pos: 30, blockType: 'act'},
        {pos: 35, blockType: 'scene'},
    ];

    it('attributes each page to the act/scene active at its start', () => {
        const marks = resolvePageStructureMarks(blocks, [
            {startPos: 0},
            {startPos: 12},
            {startPos: 32},
        ]);

        expect(marks).toEqual([
            {actIndex: 1, sceneNumber: 0},
            {actIndex: 1, sceneNumber: 1},
            {actIndex: 2, sceneNumber: 1},
        ]);
    });

    it('returns a null act when no act precedes the page', () => {
        const marks = resolvePageStructureMarks(
            [{pos: 0, blockType: 'scene'}, {pos: 4, blockType: 'dialogue'}],
            [{startPos: 2}],
        );

        expect(marks).toEqual([{actIndex: null, sceneNumber: 1}]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/editor test resolvePageStructureMarks`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `packages/editor/src/editor/headerFooter/resolvePageStructureMarks.ts`:

```ts
export interface StructureBlockPos {
    pos: number,
    blockType: string | undefined,
}

export interface PageStartInfo {
    startPos: number,
}

export interface PageStructureMark {
    actIndex: number | null,
    sceneNumber: number,
}

export const resolvePageStructureMarks = (
    blocks: StructureBlockPos[],
    pages: PageStartInfo[],
): PageStructureMark[] => {
    const sorted = [...blocks].sort((a, b) => a.pos - b.pos);
    const running: {pos: number, actIndex: number, sceneNumber: number}[] = [];
    let actIndex = 0;
    let sceneNumber = 0;

    for (const block of sorted) {
        if (block.blockType === 'act') {
            actIndex += 1;
        }

        if (block.blockType === 'scene') {
            sceneNumber += 1;
        }

        running.push({pos: block.pos, actIndex, sceneNumber});
    }

    return pages.map(page => {
        let current = {actIndex: 0, sceneNumber: 0};

        for (const entry of running) {
            if (entry.pos <= page.startPos) {
                current = {actIndex: entry.actIndex, sceneNumber: entry.sceneNumber};
            } else {
                break;
            }
        }

        return {
            actIndex: current.actIndex > 0 ? current.actIndex : null,
            sceneNumber: current.sceneNumber,
        };
    });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/editor test resolvePageStructureMarks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/headerFooter/resolvePageStructureMarks.ts packages/editor/src/editor/headerFooter/resolvePageStructureMarks.test.ts
git commit -m "feat(editor): add resolvePageStructureMarks for page marks"
```

---

## Task 5: `usePaginationState` hook (editor)

**Files:**
- Create: `packages/editor/src/editor/headerFooter/usePaginationState.ts`

No unit test (thin React/TipTap subscription; verified via the overlay + manual check in Task 9).

- [ ] **Step 1: Implement**

Create `packages/editor/src/editor/headerFooter/usePaginationState.ts`:

```ts
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    useEffect,
    useState,
} from 'react';

import {paginationKey} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import type {PaginationState} from '../tiptap/extensions/pagination/types';

const readState = (editor: TiptapEditor | null): PaginationState | null => {
    if (!editor) {
        return null;
    }

    return paginationKey.getState(editor.state)?.pagination ?? null;
};

export const usePaginationState = (editor: TiptapEditor | null): PaginationState | null => {
    const [state, setState] = useState<PaginationState | null>(() => readState(editor));

    useEffect(() => {
        if (!editor) {
            setState(null);

            return;
        }

        const update = () => setState(readState(editor));

        update();
        editor.on('transaction', update);

        return () => {
            editor.off('transaction', update);
        };
    }, [editor]);

    return state;
};
```

- [ ] **Step 2: Verify `paginationKey` is exported**

Run: `grep -n "export const paginationKey" packages/editor/src/editor/tiptap/extensions/pagination/plugin/createPaginationPlugin.ts`
Expected: one match (it is exported).

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/headerFooter/usePaginationState.ts
git commit -m "feat(editor): add usePaginationState hook"
```

---

## Task 6: `usePageStructureMarks` hook (editor)

**Files:**
- Create: `packages/editor/src/editor/headerFooter/usePageStructureMarks.ts`

- [ ] **Step 1: Implement**

Create `packages/editor/src/editor/headerFooter/usePageStructureMarks.ts`:

```ts
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useMemo} from 'react';

import {isScriptBlockNodeName} from '../scriptCore';
import type {PageInfo} from '../tiptap/extensions/pagination/types';
import {
    type PageStructureMark,
    resolvePageStructureMarks,
    type StructureBlockPos,
} from './resolvePageStructureMarks';

export const usePageStructureMarks = (
    editor: TiptapEditor | null,
    pages: readonly PageInfo[],
): PageStructureMark[] => {
    return useMemo(() => {
        if (!editor) {
            return [];
        }

        const blocks: StructureBlockPos[] = [];

        editor.state.doc.forEach((node, offset) => {
            if (!isScriptBlockNodeName(node.type.name)) {
                return;
            }

            blocks.push({
                pos: offset,
                blockType: (node.attrs as {blockType?: string}).blockType,
            });
        });

        return resolvePageStructureMarks(blocks, pages.map(page => ({startPos: page.startPos})));
        // `pages` is a fresh array on every pagination recalc (which follows any doc
        // change), so this recomputes exactly when the layout or structure changes.
    }, [editor, pages]);
};
```

- [ ] **Step 2: Verify the `scriptCore` import path**

Run: `grep -rn "isScriptBlockNodeName" packages/editor/src/editor/scriptCore*`
Expected: a match (same module `buildPaginationState.ts` imports from `../../../scriptCore`). If the path differs, adjust the import to match that module's resolution.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/headerFooter/usePageStructureMarks.ts
git commit -m "feat(editor): add usePageStructureMarks hook"
```

---

## Task 7: `HeaderFooterOverlay` component + styles (editor)

**Files:**
- Create: `packages/editor/src/editor/components/HeaderFooterOverlay.tsx`
- Create: `packages/editor/src/editor/components/HeaderFooterOverlay.module.css`

- [ ] **Step 1: Create the stylesheet**

Create `packages/editor/src/editor/components/HeaderFooterOverlay.module.css`:

```css
.layer {
    position: absolute;
    pointer-events: none;
    user-select: none;
    z-index: 1;
}

.band {
    position: absolute;
    display: flex;
    align-items: center;
    font-family: var(--font-family-mono);
    font-size: var(--editor-font-size, calc(13px * var(--size-scale)));
    line-height: 1.2;
    color: var(--color-text);
    opacity: 0.6;
    white-space: nowrap;
}

.cell {
    position: absolute;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
}

.left {
    left: 0;
    text-align: left;
}

.center {
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
}

.right {
    right: 0;
    text-align: right;
}

.bold {
    font-weight: 700;
}

.italic {
    font-style: italic;
}

.underline {
    text-decoration: underline;
}
```

- [ ] **Step 2: Create the component**

Create `packages/editor/src/editor/components/HeaderFooterOverlay.tsx`:

```tsx
import {
    type HeaderFooterCellSettings,
    type HeaderFooterRowSettings,
    type HeaderFooterSettings,
    buildPageMark,
    resolveHeaderFooterText,
} from '@stagistic/script';
import {clsx} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type CSSProperties,
    type RefObject,
    useLayoutEffect,
    useState,
} from 'react';

import {usePaginationState} from '../headerFooter/usePaginationState';
import {usePageStructureMarks} from '../headerFooter/usePageStructureMarks';
import styles from './HeaderFooterOverlay.module.css';

const ALIGNMENTS = ['left', 'center', 'right'] as const;

type HeaderFooterOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    headerFooter: HeaderFooterSettings,
    scriptTitle: string,
    draftDate: string,
};

type ContentGeometry = {
    top: number,
    left: number,
    width: number,
    height: number,
    innerWidth: number,
};

const getContentElement = (canvas: HTMLElement | null): HTMLElement | null => {
    const prosemirror = canvas?.querySelector<HTMLElement>('.ProseMirror');

    return prosemirror?.parentElement ?? null;
};

const renderCells = (
    row: HeaderFooterRowSettings,
    resolve: (cell: HeaderFooterCellSettings) => string,
) => ALIGNMENTS.map(alignment => {
    const cell = row[alignment];

    if (cell.isHiddenInEditor) {
        return null;
    }

    const text = resolve(cell);

    if (!text) {
        return null;
    }

    return (
        <span
            key={alignment}
            className={clsx(
                styles.cell,
                styles[alignment],
                cell.isBold && styles.bold,
                cell.isItalic && styles.italic,
                cell.isUnderline && styles.underline,
            )}
        >{text}
        </span>
    );
});

export const HeaderFooterOverlay = ({
    editor,
    canvasRef,
    headerFooter,
    scriptTitle,
    draftDate,
}: HeaderFooterOverlayProps) => {
    const pagination = usePaginationState(editor);
    const marks = usePageStructureMarks(editor, pagination?.pages ?? []);
    const [geometry, setGeometry] = useState<ContentGeometry | null>(null);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const content = getContentElement(canvas);

        if (!content) {
            setGeometry(null);

            return;
        }

        const measure = () => {
            const marginLeft = pagination?.marginLeft ?? 0;
            const marginRight = pagination?.marginRight ?? 0;

            setGeometry({
                top: content.offsetTop,
                left: content.offsetLeft,
                width: content.offsetWidth,
                height: content.offsetHeight,
                innerWidth: Math.max(0, content.clientWidth - marginLeft - marginRight),
            });
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(content);

        return () => {
            observer.disconnect();
        };
    }, [canvasRef, pagination]);

    if (!editor || !pagination || !geometry || pagination.pageCount <= 0) {
        return null;
    }

    const {
        pageHeight, marginTop, marginBottom, marginLeft,
    } = pagination;

    const layerStyle: CSSProperties = {
        top: geometry.top,
        left: geometry.left,
        width: geometry.width,
        height: geometry.height,
    };

    return (
        <div className={styles.layer} style={layerStyle} aria-hidden="true">
            {pagination.pages.map((page, index) => {
                const pageNumber = index + 1;
                const mark = marks[index] ?? {actIndex: null, sceneNumber: 0};
                const pageMark = buildPageMark({
                    actIndex: mark.actIndex,
                    sceneNumber: mark.sceneNumber,
                    pageNumber,
                });
                const resolve = (cell: HeaderFooterCellSettings) => resolveHeaderFooterText(cell.text, {
                    scriptTitle,
                    draftDate,
                    pageMark,
                    pageNumber,
                });
                const bandLeft = marginLeft;
                const top = index * pageHeight;

                return (
                    <div key={page.startPos + '-' + index}>
                        <div
                            className={styles.band}
                            style={{
                                top,
                                left: bandLeft,
                                width: geometry.innerWidth,
                                height: marginTop,
                            }}
                        >
                            {renderCells(headerFooter.header, resolve)}
                        </div>
                        <div
                            className={styles.band}
                            style={{
                                top: top + pageHeight - marginBottom,
                                left: bandLeft,
                                width: geometry.innerWidth,
                                height: marginBottom,
                            }}
                        >
                            {renderCells(headerFooter.footer, resolve)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/components/HeaderFooterOverlay.tsx packages/editor/src/editor/components/HeaderFooterOverlay.module.css
git commit -m "feat(editor): add HeaderFooterOverlay component"
```

---

## Task 8: Wire the overlay through the editor tree

**Files:**
- Modify: `packages/editor/src/editor/contracts.ts`
- Modify: `packages/editor/src/editor/components/EditorCanvas.tsx`
- Modify: `packages/editor/src/editor/components/editorShell/EditorShell.tsx`
- Modify: `packages/editor/src/editor/Editor.tsx`

- [ ] **Step 1: Extend `EditorDocumentProps`**

In `packages/editor/src/editor/contracts.ts`, replace the `EditorDocumentProps` interface with:

```ts
export interface EditorDocumentProps {
    initialValue: ScriptDocument,
    persistentCharacters?: readonly PersistentCharacterRef[],
    scriptTitle?: string,
    draftDate?: string,
}
```

- [ ] **Step 2: Add overlay props to `EditorCanvas` and render it**

In `packages/editor/src/editor/components/EditorCanvas.tsx`:

Add the imports near the other component imports:

```tsx
import type {HeaderFooterSettings} from '@stagistic/script';

import {HeaderFooterOverlay} from './HeaderFooterOverlay';
```

Extend `EditorCanvasProps` with:

```tsx
    headerFooter: HeaderFooterSettings,
    scriptTitle?: string,
    draftDate?: string,
```

Destructure them in the component signature (add to the existing destructured params):

```tsx
    headerFooter,
    scriptTitle = '',
    draftDate = '',
```

Render the overlay as the last sibling inside `<section>` (after `EditorBlockActionsOverlay`):

```tsx
            <HeaderFooterOverlay
                editor={editor}
                canvasRef={canvasRef}
                headerFooter={headerFooter}
                scriptTitle={scriptTitle}
                draftDate={draftDate}
            />
```

- [ ] **Step 3: Forward the props through `EditorShell`**

In `packages/editor/src/editor/components/editorShell/EditorShell.tsx`:

Add the import:

```tsx
import type {HeaderFooterSettings} from '@stagistic/script';
```

Extend the canvas props interface (the one used as `canvas: <name>` — currently holding `editor`, `autoFocus`, `persistentCharacters`, `characterColorSaturation`) with:

```tsx
    headerFooter: HeaderFooterSettings,
    scriptTitle?: string,
    draftDate?: string,
```

Add them to the `canvas` destructure:

```tsx
        headerFooter,
        scriptTitle,
        draftDate,
```

Pass them to `<EditorCanvas>`:

```tsx
                    <EditorCanvas
                        editor={editor}
                        persistentCharacters={persistentCharacters}
                        characterColorSaturation={characterColorSaturation}
                        autoFocus={autoFocus}
                        headerFooter={headerFooter}
                        scriptTitle={scriptTitle}
                        draftDate={draftDate}
                    />
```

- [ ] **Step 4: Supply the values from `Editor`**

In `packages/editor/src/editor/Editor.tsx`, read the new document fields (extend the `document` destructure at the top of the component):

```tsx
    const {
        initialValue,
        persistentCharacters = [],
        scriptTitle,
        draftDate,
    } = document;
```

Extend the `canvas` prop passed to `<EditorShell>`:

```tsx
                        canvas={{
                            autoFocus,
                            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
                            editor,
                            persistentCharacters,
                            headerFooter: resolvedSettings.headerFooter,
                            scriptTitle,
                            draftDate,
                        }}
```

- [ ] **Step 5: Verify it type-checks and existing tests pass**

Run: `pnpm --filter @stagistic/editor lint && pnpm --filter @stagistic/editor test`
Expected: no lint/type errors; existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/editor/contracts.ts packages/editor/src/editor/components/EditorCanvas.tsx packages/editor/src/editor/components/editorShell/EditorShell.tsx packages/editor/src/editor/Editor.tsx
git commit -m "feat(editor): wire HeaderFooterOverlay through the editor tree"
```

---

## Task 9: Supply title + draft date from the route

**Files:**
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`

- [ ] **Step 1: Import `resolveDraftDate`**

In `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`, add:

```tsx
import {resolveDraftDate} from './editor/settings/draftDate';
```

- [ ] **Step 2: Pass the values into `<ScriptEditor>`'s `document`**

Replace the `document={{ ... }}` prop on `<ScriptEditor>` with:

```tsx
                        document={{
                            initialValue: resolvedEditorInitialValue,
                            persistentCharacters: normalizedConfirmedCharacterRecords,
                            scriptTitle: currentScript?.name ?? '',
                            draftDate: resolveDraftDate(titlePageDraft),
                        }}
```

- [ ] **Step 3: Verify it type-checks**

Run: `pnpm --filter @stagistic/app-routes lint`
Expected: no lint/type errors. (If `@stagistic/app-routes` is not the exact package name, run `grep '"name"' packages/app-routes/package.json` and use that.)

- [ ] **Step 4: Commit**

```bash
git add packages/app-routes/src/routes/script/ScriptEditorRoute.tsx
git commit -m "feat(app-routes): supply script title and draft date to the editor"
```

---

## Task 10: Manual verification in the editor

The overlay is visual; the user verifies UI changes themselves (do not auto-start the dev server).

- [ ] **Step 1: Ask the user to confirm in the running editor:**
  - Footer center shows the integrated page number (`1.`, `2.`, …) on every page, bold by default.
  - The page-mark cell (`{{page}}` → `I-1-1`) is hidden by default; unhiding it in settings shows the act-scene-page mark, matching the act/scene at each page's top.
  - `{{script_title}}` / `{{draft_date}}` resolve correctly where used.
  - Header/footer text is **not selectable**, **does not shift** page content, and is visibly **dimmed (~60%)**.
  - Cells with "Hide in editor" enabled do not appear.

- [ ] **Step 2: Run the full logic test suite for both packages**

Run: `pnpm --filter @stagistic/script test && pnpm --filter @stagistic/editor test`
Expected: PASS.

---

## Self-Review Notes

- **Spec coverage:** overlay approach (Task 7–8), no content shift / non-selectable / 60% opacity (Task 7 CSS), `isHiddenInEditor` filtering (Task 7 `renderCells`), all-page numbering (Task 7 loop), tokens incl. `{{page}}`=act-scene-page and `{{page_number}}`=`#.` (Task 3), page-mark semantics & edge cases (Task 2 + Task 4), data flow for title/draft date (Task 8–9). All covered.
- **Types are consistent across tasks:** `PageMarkParts`, `HeaderFooterTextContext`, `PageStructureMark`, `StructureBlockPos`, `PageStartInfo`, `ContentGeometry`, and the `scriptTitle`/`draftDate` props are used with the same shapes wherever referenced.
- **Assumptions to confirm during execution (each has a verification step):** `paginationKey` export (Task 5.2), `scriptCore` import path for `isScriptBlockNodeName` (Task 6.2), `.ProseMirror` parent is the padded `.content` element (Task 10 visual check), exact package names for `pnpm --filter` (Task 9.3).
```
