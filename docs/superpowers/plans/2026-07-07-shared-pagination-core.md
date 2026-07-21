# Shared Pagination Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the editor's widow/orphan/keep-together pagination algorithm into one shared, height-agnostic package that both the editor and the PDF export drive, so page breaks are decided by identical rules in exactly one place.

**Architecture:** A new package `@stagistic/script-pagination` holds a pure `paginate(blocks, metrics)` function plus the block-type classification and `selectSplitPoint`. The editor feeds DOM-measured heights and DOM line maps and turns the returned plan into ProseMirror spacer `Decoration`s; the export feeds math-computed heights and math line maps and turns the plan into PDF visual lines + page breaks. The core never measures or renders — no DOM, no ProseMirror, no jsPDF.

**Tech Stack:** TypeScript (ESM, strict), `vite-plus/test` (aliased `vp test`) for unit + browser tests, pnpm workspaces.

## Global Constraints

- Package scope/name: `@stagistic/script-pagination`, dir `packages/script-pagination`, `"private": true`, `"type": "module"`, `"main": "./src/index.ts"`. Copy `package.json`/`tsconfig.json` shape from `packages/export`.
- Test imports: `import { describe, it, expect } from 'vite-plus/test'`.
- The core package has **zero runtime dependencies** (no `@stagistic/script`, no `@tiptap/*`, no `jspdf`, no DOM). Only a `typescript` devDependency.
- The editor package must **not** gain a dependency on `@stagistic/export`.
- **Hard gate — no editor visual regression:** the editor's rendered page breaks, spacer heights, dividers, and `PageInfo` (`startPos/endPos/startOffset/endOffset`) must be byte-for-byte equivalent to today's output. Existing editor pagination browser tests must pass unchanged.
- Block-type classification is fixed: splittable = `stageDirection`, `dialogue`, `lyrics`, `aside`; orphan-candidate = `character`, `scene`. Thresholds: `MIN_SPLIT_LINES_BEFORE = 2`, `MIN_SPLIT_LINES_AFTER = 2`, `FIT_EPSILON_PX = 1`, `orphanThreshold = 2 * lineHeightPx`.
- Never commit automatically — this repo's owner commits. Each task's final step **prepares** a commit (stages + writes the message to `.git/COMMIT_MSG` via a plain message string in the plan) and asks the owner to run `git commit`. Do not run `git commit`.
- Co-author trailer for any prepared commit message: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

**New package `packages/script-pagination/`**
- `package.json`, `tsconfig.json` — package scaffold.
- `src/index.ts` — public exports.
- `src/types.ts` — `BlockLine`, `PaginatorBlock`, `PaginatorMetrics`, `PlacedFragment`, `PageBreak`, `PageInfo`, `PaginationPlan`.
- `src/blockTypes.ts` — classification sets + `isSplittableBlockType` / `isOrphanCandidateBlockType` + threshold constants.
- `src/selectSplitPoint.ts` — moved verbatim from the editor (already pure).
- `src/paginate.ts` — the core algorithm.
- `src/blockTypes.test.ts`, `src/selectSplitPoint.test.ts`, `src/paginate.test.ts` — unit tests.

**Editor (becomes an adapter)**
- Modify `packages/editor/src/editor/tiptap/extensions/pagination/layout/buildPaginationState.ts` — build `PaginatorBlock[]`, call `paginate`, translate the plan to decorations + `PageInfo`.
- Modify `packages/editor/src/editor/tiptap/extensions/pagination/constants.ts` — re-export classification/thresholds from the shared package (keep `DEFAULT_OPTIONS`).
- Delete `packages/editor/src/editor/tiptap/extensions/pagination/layout/selectSplitPoint.ts` (moved).
- `packages/editor/package.json` — add `@stagistic/script-pagination` dependency.

**Export (becomes an adapter)**
- Modify `packages/export/src/transcribeExportPlan.ts` — build `PaginatorBlock[]` (math), call `paginate`, translate the plan to `VisualLine`s + `__page_break__` items.
- `packages/export/package.json` — add `@stagistic/script-pagination` dependency.

---

## Task 1: Scaffold the `@stagistic/script-pagination` package

**Files:**
- Create: `packages/script-pagination/package.json`
- Create: `packages/script-pagination/tsconfig.json`
- Create: `packages/script-pagination/src/index.ts`
- Test: `packages/script-pagination/src/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: an installable workspace package `@stagistic/script-pagination` whose `src/index.ts` is its entry.

- [ ] **Step 1: Write the failing test**

`packages/script-pagination/src/smoke.test.ts`:
```ts
import {describe, expect, it} from 'vite-plus/test';

import {PACKAGE_NAME} from './index';

describe('@stagistic/script-pagination', () => {
    it('exposes its package name marker', () => {
        expect(PACKAGE_NAME).toBe('@stagistic/script-pagination');
    });
});
```

- [ ] **Step 2: Create the package scaffold**

`packages/script-pagination/package.json`:
```json
{
    "name": "@stagistic/script-pagination",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "./src/index.ts",
    "scripts": {
        "lint": "eslint .",
        "test": "vp test run",
        "test:watch": "vp test watch"
    },
    "devDependencies": {
        "typescript": "^5.9.2"
    }
}
```

`packages/script-pagination/tsconfig.json`:
```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src",
        "lib": ["ES2022"]
    },
    "include": ["src/**/*"]
}
```

`packages/script-pagination/src/index.ts`:
```ts
export const PACKAGE_NAME = '@stagistic/script-pagination';
```

- [ ] **Step 3: Install and run the test**

Run: `pnpm install`
Then: `npx vp test run packages/script-pagination/`
Expected: 1 file, 1 test passed.

- [ ] **Step 4: Prepare commit (do not commit)**

Stage and hand off:
```bash
git add packages/script-pagination pnpm-lock.yaml
```
Proposed message: `chore(pagination): scaffold @stagistic/script-pagination package`. Ask the owner to commit.

---

## Task 2: Block-type classification + thresholds

**Files:**
- Create: `packages/script-pagination/src/blockTypes.ts`
- Test: `packages/script-pagination/src/blockTypes.test.ts`
- Modify: `packages/script-pagination/src/index.ts`

**Interfaces:**
- Produces:
  - `SPLITTABLE_BLOCK_TYPES: ReadonlySet<string>`
  - `ORPHAN_PUSHDOWN_TYPES: ReadonlySet<string>`
  - `MIN_SPLIT_LINES_BEFORE: number` (= 2), `MIN_SPLIT_LINES_AFTER: number` (= 2), `FIT_EPSILON_PX: number` (= 1)
  - `isSplittableBlockType(type: string | undefined): boolean`
  - `isOrphanCandidateBlockType(type: string | undefined): boolean`

- [ ] **Step 1: Write the failing test**

`packages/script-pagination/src/blockTypes.test.ts`:
```ts
import {describe, expect, it} from 'vite-plus/test';

import {
    isOrphanCandidateBlockType,
    isSplittableBlockType,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
} from './blockTypes';

describe('block-type classification', () => {
    it('treats prose blocks as splittable', () => {
        expect(isSplittableBlockType('dialogue')).toBe(true);
        expect(isSplittableBlockType('stageDirection')).toBe(true);
        expect(isSplittableBlockType('lyrics')).toBe(true);
        expect(isSplittableBlockType('aside')).toBe(true);
    });

    it('treats headings as non-splittable orphan candidates', () => {
        expect(isSplittableBlockType('character')).toBe(false);
        expect(isSplittableBlockType('scene')).toBe(false);
        expect(isOrphanCandidateBlockType('character')).toBe(true);
        expect(isOrphanCandidateBlockType('scene')).toBe(true);
        expect(isOrphanCandidateBlockType('dialogue')).toBe(false);
    });

    it('handles undefined block types safely', () => {
        expect(isSplittableBlockType(undefined)).toBe(false);
        expect(isOrphanCandidateBlockType(undefined)).toBe(false);
    });

    it('pins the widow/orphan minimums', () => {
        expect(MIN_SPLIT_LINES_BEFORE).toBe(2);
        expect(MIN_SPLIT_LINES_AFTER).toBe(2);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vp test run packages/script-pagination/src/blockTypes.test.ts`
Expected: FAIL — `Cannot find module './blockTypes'`.

- [ ] **Step 3: Implement `blockTypes.ts`**

`packages/script-pagination/src/blockTypes.ts`:
```ts
export const SPLITTABLE_BLOCK_TYPES: ReadonlySet<string> = new Set([
    'stageDirection',
    'dialogue',
    'lyrics',
    'aside',
]);

export const ORPHAN_PUSHDOWN_TYPES: ReadonlySet<string> = new Set([
    'character',
    'scene',
]);

export const MIN_SPLIT_LINES_BEFORE = 2;
export const MIN_SPLIT_LINES_AFTER = 2;
export const FIT_EPSILON_PX = 1;

export const isSplittableBlockType = (type: string | undefined): boolean => (
    typeof type === 'string' && SPLITTABLE_BLOCK_TYPES.has(type)
);

export const isOrphanCandidateBlockType = (type: string | undefined): boolean => (
    typeof type === 'string' && ORPHAN_PUSHDOWN_TYPES.has(type)
);
```

- [ ] **Step 4: Re-export from index**

`packages/script-pagination/src/index.ts` (replace file):
```ts
export const PACKAGE_NAME = '@stagistic/script-pagination';

export * from './blockTypes';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vp test run packages/script-pagination/`
Expected: PASS (smoke + blockTypes).

- [ ] **Step 6: Prepare commit (do not commit)**

```bash
git add packages/script-pagination/src
```
Proposed message: `feat(pagination): add shared block-type classification`. Ask the owner to commit.

---

## Task 3: Move `selectSplitPoint` + `BlockLine` into the package

**Files:**
- Create: `packages/script-pagination/src/types.ts`
- Create: `packages/script-pagination/src/selectSplitPoint.ts`
- Test: `packages/script-pagination/src/selectSplitPoint.test.ts`
- Modify: `packages/script-pagination/src/index.ts`

**Interfaces:**
- Produces:
  - `interface BlockLine { startPos: number; topRel: number }`
  - `type SplitDecision = {kind:'split'; breakPos:number; fragmentHeight:number} | {kind:'pushDown'} | {kind:'forcePlace'}`
  - `selectSplitPoint(args: SelectSplitPointArgs): SplitDecision` where `SelectSplitPointArgs = { lines: BlockLine[]; consumedHeight: number; spaceLeft: number; minLinesBefore: number; minLinesAfter: number; epsilonPx: number; canPushDown: boolean }`

- [ ] **Step 1: Write the failing test**

`packages/script-pagination/src/selectSplitPoint.test.ts`:
```ts
import {describe, expect, it} from 'vite-plus/test';

import {selectSplitPoint} from './selectSplitPoint';
import type {BlockLine} from './types';

const lines = (count: number, height: number): BlockLine[] =>
    Array.from({length: count}, (_unused, index) => ({startPos: index, topRel: index * height}));

describe('selectSplitPoint', () => {
    it('splits at the deepest line that still fits with ≥2 lines each side', () => {
        const decision = selectSplitPoint({
            lines: lines(6, 10),
            consumedHeight: 0,
            spaceLeft: 35,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
            canPushDown: false,
        });

        expect(decision).toEqual({kind: 'split', breakPos: 3, fragmentHeight: 30});
    });

    it('pushes the whole block down when it cannot keep 2 lines before the break', () => {
        const decision = selectSplitPoint({
            lines: lines(6, 10),
            consumedHeight: 0,
            spaceLeft: 15,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
            canPushDown: true,
        });

        expect(decision).toEqual({kind: 'pushDown'});
    });

    it('force-places when nothing fits and it cannot push down', () => {
        const decision = selectSplitPoint({
            lines: lines(2, 10),
            consumedHeight: 0,
            spaceLeft: 5,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
            canPushDown: false,
        });

        expect(decision).toEqual({kind: 'forcePlace'});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vp test run packages/script-pagination/src/selectSplitPoint.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `types.ts` with `BlockLine`**

`packages/script-pagination/src/types.ts`:
```ts
export interface BlockLine {
    /** Opaque line identifier; echoed back as a split's breakPos. */
    startPos: number;
    /** Line top relative to the block's border-box top (includes padding-top). */
    topRel: number;
}
```

- [ ] **Step 4: Move `selectSplitPoint` verbatim**

`packages/script-pagination/src/selectSplitPoint.ts` (identical logic to the editor's current file, importing `BlockLine` from `./types`):
```ts
import type {BlockLine} from './types';

export type SplitDecision =
    | {kind: 'split'; breakPos: number; fragmentHeight: number}
    | {kind: 'pushDown'}
    | {kind: 'forcePlace'};

export interface SelectSplitPointArgs {
    lines: BlockLine[];
    consumedHeight: number;
    spaceLeft: number;
    minLinesBefore: number;
    minLinesAfter: number;
    epsilonPx: number;
    canPushDown: boolean;
}

export const selectSplitPoint = ({
    lines,
    consumedHeight,
    spaceLeft,
    minLinesBefore,
    minLinesAfter,
    epsilonPx,
    canPushDown,
}: SelectSplitPointArgs): SplitDecision => {
    const firstUnplaced = lines.findIndex(line => line.topRel >= consumedHeight - epsilonPx);

    if (firstUnplaced === -1) {
        return {kind: 'forcePlace'};
    }

    const findSplitIndex = (minBefore: number, minAfter: number): number | null => {
        const maxIndex = lines.length - minAfter;
        let best: number | null = null;

        for (let index = firstUnplaced + 1; index <= maxIndex; index += 1) {
            if (lines[index].topRel - consumedHeight <= spaceLeft + epsilonPx) {
                best = index;
            }
        }

        if (best === null || best - firstUnplaced < minBefore) {
            return null;
        }

        return best;
    };

    const buildSplit = (index: number): SplitDecision => ({
        kind: 'split',
        breakPos: lines[index].startPos,
        fragmentHeight: lines[index].topRel - consumedHeight,
    });

    const strict = findSplitIndex(minLinesBefore, minLinesAfter);

    if (strict !== null) {
        return buildSplit(strict);
    }

    if (canPushDown) {
        return {kind: 'pushDown'};
    }

    const relaxed = findSplitIndex(1, 1);

    if (relaxed !== null) {
        return buildSplit(relaxed);
    }

    return {kind: 'forcePlace'};
};
```

- [ ] **Step 5: Re-export from index**

Append to `packages/script-pagination/src/index.ts`:
```ts
export * from './types';
export * from './selectSplitPoint';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vp test run packages/script-pagination/`
Expected: PASS.

- [ ] **Step 7: Prepare commit (do not commit)**

```bash
git add packages/script-pagination/src
```
Proposed message: `feat(pagination): move selectSplitPoint into shared core`. Ask the owner to commit.

---

## Task 4: The `paginate()` core

This is the heart: a faithful, height-agnostic port of the editor's
`buildPaginationState` loop. It consumes abstract blocks and returns a plan both
adapters can render. It handles: normal fit, non-splittable whole-block
pushdown, orphan pushdown for `character`/`scene`, splittable splits via
`selectSplitPoint`, and export-only forced breaks (`new-page`/`odd-page`).

**Files:**
- Modify: `packages/script-pagination/src/types.ts`
- Create: `packages/script-pagination/src/paginate.ts`
- Test: `packages/script-pagination/src/paginate.test.ts`
- Modify: `packages/script-pagination/src/index.ts`

**Interfaces:**
- Consumes: `selectSplitPoint`, `BlockLine`.
- Produces:
```ts
interface PaginatorBlock {
    key: string;
    height: number;                 // total incl. spacing-before/after
    splittable: boolean;
    orphanCandidate: boolean;
    forcedBreak?: 'new-page' | 'odd-page';
    getLines?: () => BlockLine[];   // only consulted for splittable blocks
}
interface PaginatorMetrics {
    contentHeight: number;
    topSpacing: number;
    bottomSpacing: number;
    orphanThreshold: number;
    minLinesBefore: number;
    minLinesAfter: number;
    epsilonPx: number;
}
interface PlacedFragment {
    blockKey: string;
    pageIndex: number;              // 0-based
    contentTop: number;             // y of this fragment's first line, from page top
    fromLine: number;               // inclusive index into getLines() (0 for whole blocks)
    toLine: number;                 // exclusive
    isBlockStart: boolean;
    isBlockEnd: boolean;
}
interface PageBreak {
    kind: 'pushDown' | 'split' | 'forced' | 'oddBlank';
    atBlockKey: string;
    afterBlockKey: string | null;   // block whose end anchors a whole-block spacer (null at doc start)
    breakPos: number | null;        // BlockLine.startPos for splits, else null
    spacerHeight: number;           // leftover + bottomSpacing + topSpacing (editor spacer height)
    dividerOffset: number;          // leftover + bottomSpacing
    isInlineBreak: boolean;         // true for splits
}
interface PageInfo {
    index: number;                  // 1-based
    startKey: string;
    endKey: string;
    startOffset: number;
    endOffset: number;
}
interface PaginationPlan {
    pageCount: number;
    pages: PageInfo[];
    fragments: PlacedFragment[];
    breaks: PageBreak[];
    endSpacer: {afterBlockKey: string | null; height: number} | null;
}
```

- [ ] **Step 1: Add the core types**

Append to `packages/script-pagination/src/types.ts` the six interfaces above
(`PaginatorBlock`, `PaginatorMetrics`, `PlacedFragment`, `PageBreak`, `PageInfo`,
`PaginationPlan`) exactly as written in the Interfaces block.

- [ ] **Step 2: Write the failing tests**

`packages/script-pagination/src/paginate.test.ts`:
```ts
import {describe, expect, it} from 'vite-plus/test';

import {paginate} from './paginate';
import type {BlockLine, PaginatorBlock, PaginatorMetrics} from './types';

const LINE = 20;

const metrics = (overrides: Partial<PaginatorMetrics> = {}): PaginatorMetrics => ({
    contentHeight: 100,
    topSpacing: 10,
    bottomSpacing: 10,
    orphanThreshold: 2 * LINE,
    minLinesBefore: 2,
    minLinesAfter: 2,
    epsilonPx: 1,
    ...overrides,
});

const heading = (key: string): PaginatorBlock => ({
    key,
    height: LINE,
    splittable: false,
    orphanCandidate: true,
});

const prose = (key: string, lineCount: number): PaginatorBlock => {
    const lines: BlockLine[] = Array.from({length: lineCount}, (_u, index) => ({
        startPos: index,
        topRel: index * LINE,
    }));

    return {
        key,
        height: lineCount * LINE,
        splittable: true,
        orphanCandidate: false,
        getLines: () => lines,
    };
};

const pageOf = (plan: ReturnType<typeof paginate>, key: string) =>
    plan.fragments.find(fragment => fragment.blockKey === key)?.pageIndex;

describe('paginate', () => {
    it('keeps everything on one page when it fits', () => {
        const plan = paginate([heading('h1'), prose('d1', 3)], metrics());

        expect(plan.pageCount).toBe(1);
        expect(plan.breaks).toHaveLength(0);
        expect(pageOf(plan, 'h1')).toBe(0);
        expect(pageOf(plan, 'd1')).toBe(0);
    });

    it('pushes a non-splittable heading whole to the next page instead of tearing it', () => {
        // Fill the page to 90 of 100; a 20px heading cannot fit → whole block down.
        const plan = paginate(
            [prose('fill', 4), heading('h2'), prose('d2', 1)],
            metrics({contentHeight: 90}),
        );

        expect(pageOf(plan, 'fill')).toBe(0);
        expect(pageOf(plan, 'h2')).toBe(1);
        expect(plan.breaks.some(b => b.kind === 'pushDown' && b.atBlockKey === 'h2')).toBe(true);
    });

    it('applies orphan pushdown so a heading is not stranded with <2 lines under it', () => {
        // Page holds 100. fill uses 60. heading (20) fits, leaving 20 (<40 threshold)
        // and its dialogue would be orphaned → push the heading down.
        const plan = paginate(
            [prose('fill', 3), heading('h3'), prose('d3', 3)],
            metrics({orphanThreshold: 40}),
        );

        expect(pageOf(plan, 'fill')).toBe(0);
        expect(pageOf(plan, 'h3')).toBe(1);
    });

    it('splits a tall splittable block honouring min-lines on each side', () => {
        // Page holds 100 (5 lines). A 10-line block splits: 5 lines then 5 lines.
        const plan = paginate([prose('big', 10)], metrics());

        const fragments = plan.fragments.filter(f => f.blockKey === 'big');

        expect(fragments).toHaveLength(2);
        expect(fragments[0]).toMatchObject({pageIndex: 0, fromLine: 0, toLine: 5});
        expect(fragments[1]).toMatchObject({pageIndex: 1, fromLine: 5, toLine: 10});
        expect(plan.breaks.some(b => b.kind === 'split' && b.isInlineBreak)).toBe(true);
    });

    it('starts a block on a fresh page for a forced new-page break', () => {
        const plan = paginate(
            [prose('a', 1), {...heading('b'), forcedBreak: 'new-page'}],
            metrics(),
        );

        expect(pageOf(plan, 'a')).toBe(0);
        expect(pageOf(plan, 'b')).toBe(1);
        expect(plan.breaks.some(b => b.kind === 'forced' && b.atBlockKey === 'b')).toBe(true);
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vp test run packages/script-pagination/src/paginate.test.ts`
Expected: FAIL — `Cannot find module './paginate'`.

- [ ] **Step 4: Implement `paginate.ts`**

`packages/script-pagination/src/paginate.ts`:
```ts
import {selectSplitPoint} from './selectSplitPoint';
import type {
    PageBreak,
    PageInfo,
    PaginationPlan,
    PaginatorBlock,
    PaginatorMetrics,
    PlacedFragment,
} from './types';

export const paginate = (
    blocks: PaginatorBlock[],
    metrics: PaginatorMetrics,
): PaginationPlan => {
    const {
        contentHeight,
        topSpacing,
        bottomSpacing,
        orphanThreshold,
        minLinesBefore,
        minLinesAfter,
        epsilonPx,
    } = metrics;

    const fragments: PlacedFragment[] = [];
    const breaks: PageBreak[] = [];
    const pages: PageInfo[] = [];

    if (contentHeight <= 0) {
        return {pageCount: 1, pages: [], fragments: [], breaks: [], endSpacer: null};
    }

    let currentHeight = 0;
    let pageIndex = 0;
    let pageStartKey: string | null = null;
    let pageStartOffset = 0;
    let offsetCursor = 0;
    let lastBlockEndKey: string | null = null;

    const closePage = (endKeyOverride?: string) => {
        if (pageStartKey === null) {
            return;
        }

        pages.push({
            index: pageIndex + 1,
            startKey: pageStartKey,
            endKey: endKeyOverride ?? lastBlockEndKey ?? pageStartKey,
            startOffset: pageStartOffset,
            endOffset: offsetCursor,
        });
        pageIndex += 1;
        currentHeight = 0;
        pageStartKey = null;
    };

    const ensurePageStart = (key: string) => {
        if (pageStartKey === null) {
            pageStartKey = key;
            pageStartOffset = offsetCursor;
        }
    };

    blocks.forEach(block => {
        // --- Forced breaks (export only; editor blocks never set forcedBreak) ---
        if (block.forcedBreak && pageStartKey !== null) {
            const leftover = Math.max(0, contentHeight - currentHeight);

            breaks.push({
                kind: 'forced',
                atBlockKey: block.key,
                afterBlockKey: lastBlockEndKey,
                breakPos: null,
                spacerHeight: leftover + bottomSpacing + topSpacing,
                dividerOffset: leftover + bottomSpacing,
                isInlineBreak: false,
            });
            offsetCursor += leftover + bottomSpacing + topSpacing;
            closePage();

            // odd-page: if we would resume on an even page number, insert a blank page.
            if (block.forcedBreak === 'odd-page' && (pageIndex + 1) % 2 === 0) {
                breaks.push({
                    kind: 'oddBlank',
                    atBlockKey: block.key,
                    afterBlockKey: lastBlockEndKey,
                    breakPos: null,
                    spacerHeight: contentHeight + bottomSpacing + topSpacing,
                    dividerOffset: contentHeight + bottomSpacing,
                    isInlineBreak: false,
                });
                offsetCursor += contentHeight + bottomSpacing + topSpacing;
                pages.push({
                    index: pageIndex + 1,
                    startKey: block.key,
                    endKey: block.key,
                    startOffset: pageStartOffset,
                    endOffset: offsetCursor,
                });
                pageIndex += 1;
            }
        }

        // --- Orphan pushdown for heading-like blocks ---
        const remainingBefore = Math.max(0, contentHeight - currentHeight);
        const remainingAfter = Math.max(0, remainingBefore - block.height);
        const shouldPushDown = block.orphanCandidate
            && block.height <= remainingBefore
            && remainingAfter < orphanThreshold
            && lastBlockEndKey !== null;

        if (shouldPushDown) {
            const leftover = remainingBefore;

            breaks.push({
                kind: 'pushDown',
                atBlockKey: block.key,
                afterBlockKey: lastBlockEndKey,
                breakPos: null,
                spacerHeight: leftover + bottomSpacing + topSpacing,
                dividerOffset: leftover + bottomSpacing,
                isInlineBreak: false,
            });
            offsetCursor += leftover + bottomSpacing + topSpacing;
            closePage();
        }

        // --- Place the block, splitting only if splittable ---
        let blockRemaining = block.height;
        let lineMapConsumed = 0;
        let lines = block.getLines ? null : undefined; // undefined = never splittable

        while (blockRemaining > 0) {
            ensurePageStart(block.key);

            const spaceLeft = Math.max(0, contentHeight - currentHeight);

            if (blockRemaining <= spaceLeft + epsilonPx) {
                const totalLines = block.getLines ? block.getLines().length : 1;
                const consumedLines = block.height <= 0
                    ? 0
                    : Math.round((block.height - blockRemaining) / (block.height / totalLines));

                fragments.push({
                    blockKey: block.key,
                    pageIndex,
                    contentTop: topSpacing + currentHeight - lineMapConsumed,
                    fromLine: consumedLines,
                    toLine: totalLines,
                    isBlockStart: consumedLines === 0,
                    isBlockEnd: true,
                });
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndKey = block.key;
                break;
            }

            const canPushDown = currentHeight > 0;

            if (!block.splittable || !block.getLines) {
                if (canPushDown) {
                    const leftover = spaceLeft;

                    breaks.push({
                        kind: 'pushDown',
                        atBlockKey: block.key,
                        afterBlockKey: lastBlockEndKey,
                        breakPos: null,
                        spacerHeight: leftover + bottomSpacing + topSpacing,
                        dividerOffset: leftover + bottomSpacing,
                        isInlineBreak: false,
                    });
                    offsetCursor += leftover + bottomSpacing + topSpacing;
                    closePage();
                    continue;
                }

                // force-place an over-tall non-splittable block
                const totalLines = block.getLines ? block.getLines().length : 1;

                fragments.push({
                    blockKey: block.key,
                    pageIndex,
                    contentTop: topSpacing + currentHeight,
                    fromLine: 0,
                    toLine: totalLines,
                    isBlockStart: true,
                    isBlockEnd: true,
                });
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndKey = block.key;
                break;
            }

            if (!lines) {
                lines = block.getLines();
            }

            const consumedHeight = block.height - blockRemaining;
            const decision = selectSplitPoint({
                lines,
                consumedHeight,
                spaceLeft,
                minLinesBefore,
                minLinesAfter,
                epsilonPx,
                canPushDown,
            });

            if (decision.kind !== 'split') {
                if (decision.kind === 'pushDown' && canPushDown) {
                    const leftover = spaceLeft;

                    breaks.push({
                        kind: 'pushDown',
                        atBlockKey: block.key,
                        afterBlockKey: lastBlockEndKey,
                        breakPos: null,
                        spacerHeight: leftover + bottomSpacing + topSpacing,
                        dividerOffset: leftover + bottomSpacing,
                        isInlineBreak: false,
                    });
                    offsetCursor += leftover + bottomSpacing + topSpacing;
                    closePage();
                    continue;
                }

                const totalLines = lines.length;
                const consumedLines = lines.findIndex(line => line.topRel >= consumedHeight - epsilonPx);

                fragments.push({
                    blockKey: block.key,
                    pageIndex,
                    contentTop: topSpacing + currentHeight - consumedHeight,
                    fromLine: consumedLines < 0 ? 0 : consumedLines,
                    toLine: totalLines,
                    isBlockStart: consumedLines <= 0,
                    isBlockEnd: true,
                });
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndKey = block.key;
                break;
            }

            const {breakPos, fragmentHeight} = decision;
            const leftover = Math.max(0, spaceLeft - fragmentHeight);
            const fromLine = lines.findIndex(line => line.topRel >= consumedHeight - epsilonPx);
            const toLine = lines.findIndex(line => line.startPos === breakPos);

            fragments.push({
                blockKey: block.key,
                pageIndex,
                contentTop: topSpacing + currentHeight - consumedHeight,
                fromLine: fromLine < 0 ? 0 : fromLine,
                toLine: toLine < 0 ? lines.length : toLine,
                isBlockStart: consumedHeight <= 0,
                isBlockEnd: false,
            });

            currentHeight += fragmentHeight;
            offsetCursor += fragmentHeight;
            breaks.push({
                kind: 'split',
                atBlockKey: block.key,
                afterBlockKey: lastBlockEndKey,
                breakPos,
                spacerHeight: leftover + bottomSpacing + topSpacing,
                dividerOffset: leftover + bottomSpacing,
                isInlineBreak: true,
            });
            offsetCursor += leftover + bottomSpacing + topSpacing;
            blockRemaining = Math.max(0, blockRemaining - fragmentHeight);
            lineMapConsumed = consumedHeight + fragmentHeight;
            closePage(block.key);
        }
    });

    const remaining = Math.max(0, contentHeight - currentHeight);
    const endSpacerHeight = remaining + bottomSpacing;

    if (pageStartKey === null) {
        pageStartKey = lastBlockEndKey ?? '';
        pageStartOffset = offsetCursor;
    }

    offsetCursor += endSpacerHeight;
    pages.push({
        index: pageIndex + 1,
        startKey: pageStartKey,
        endKey: lastBlockEndKey ?? pageStartKey,
        startOffset: pageStartOffset,
        endOffset: offsetCursor,
    });

    return {
        pageCount: pages.length,
        pages,
        fragments,
        breaks,
        endSpacer: {afterBlockKey: lastBlockEndKey, height: endSpacerHeight},
    };
};
```

> Implementer note: the `contentTop` / `fromLine` / `toLine` arithmetic mirrors
> the editor's `placeRemainder` / split flow. If a `paginate` test fails on those
> fields, reconcile against `buildPaginationState`'s original loop
> (git history) — the break/offset arithmetic is authoritative and must not
> change; only the fragment bookkeeping is new.

- [ ] **Step 5: Re-export from index**

Append to `packages/script-pagination/src/index.ts`:
```ts
export * from './paginate';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vp test run packages/script-pagination/`
Expected: PASS (smoke, blockTypes, selectSplitPoint, paginate). If a fragment-field assertion fails, adjust the fragment bookkeeping (not the break/offset math) until green.

- [ ] **Step 7: Prepare commit (do not commit)**

```bash
git add packages/script-pagination/src
```
Proposed message: `feat(pagination): add height-agnostic paginate() core`. Ask the owner to commit.

---

## Task 5: Editor drives the shared core (no visual regression)

Refactor `buildPaginationState` into an adapter: build `PaginatorBlock[]` from
the doc (DOM-measured heights + DOM line maps), call `paginate`, and translate
the plan's `breaks`/`endSpacer` into the exact same `Decoration`s and
`PageInfo` the editor produces today. Classification/threshold constants now come
from the shared package.

**Files:**
- Modify: `packages/editor/package.json` (add dependency)
- Modify: `packages/editor/src/editor/tiptap/extensions/pagination/constants.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/pagination/layout/buildPaginationState.ts`
- Delete: `packages/editor/src/editor/tiptap/extensions/pagination/layout/selectSplitPoint.ts`
- Test: existing browser tests under `packages/editor/.../pagination/` and `packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx`

**Interfaces:**
- Consumes from Task 4: `paginate`, `PaginatorBlock`, `PaginationPlan`, `PageBreak`; from Task 2: `isSplittableBlockType`, `isOrphanCandidateBlockType`, `MIN_SPLIT_LINES_BEFORE`, `MIN_SPLIT_LINES_AFTER`, `FIT_EPSILON_PX`; from Task 3: `BlockLine`.
- Produces: unchanged `BuildPaginationStateResult` (decorations + `PaginationState`).

- [ ] **Step 1: Add the dependency**

Edit `packages/editor/package.json` `dependencies`, add:
```json
"@stagistic/script-pagination": "workspace:*",
```
Run: `pnpm install`

- [ ] **Step 2: Re-point the editor constants at the shared package**

Replace the classification/threshold exports in
`packages/editor/src/editor/tiptap/extensions/pagination/constants.ts` with a
re-export, keeping `DEFAULT_OPTIONS` local:
```ts
import {type PaginationOptions} from './types';

export {
    FIT_EPSILON_PX,
    isOrphanCandidateBlockType,
    isSplittableBlockType,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
    ORPHAN_PUSHDOWN_TYPES,
    SPLITTABLE_BLOCK_TYPES,
} from '@stagistic/script-pagination';

export const DEFAULT_OPTIONS: PaginationOptions = {
    pageHeight: 1123,
    pageWidth: 794,
    marginTop: 95,
    marginBottom: 95,
    marginLeft: 76,
    marginRight: 76,
    lineHeightPx: 22,
    dividerColor: 'var(--color-divider)',
    dividerThickness: 1,
    dividerInsetPx: 96,
};
```

- [ ] **Step 3: Capture a golden baseline BEFORE refactoring the loop**

Add a browser test that records today's page boundaries so the refactor can be
proven equivalent. Create
`packages/editor/src/editor/tiptap/extensions/pagination/layout/paginationGolden.browser.test.tsx`.
It mounts `ScriptEditor` with a multi-page document (≥3 pages: several `scene` +
`character` + long `dialogue` blocks so orphan pushdown and a split both fire),
reads `PaginationExtension` storage `state.pages`, and asserts the exact
`{startPos, endPos, startOffset, endOffset}` array. Model the harness on
`musicNode.browser.test.tsx` (`renderEditor`, `poll`, `afterEach`). Access state via
the editor instance:
```ts
import {PaginationExtension} from '../../PaginationExtension';
// after mounting and getting `editor`:
const state = () => (editor.storage as Record<string, {state?: {pages?: unknown[]}}>)
    .Pagination?.state?.pages ?? null;
const pages = await poll(state, 'pagination pages');
expect(pages).toMatchInlineSnapshot();
```
Run it once against the CURRENT code and commit the inline snapshot. This is the
regression oracle for Step 5.

Run: `npx vp test run -c packages/editor/vitest.browser.config.ts packages/editor/src/editor/tiptap/extensions/pagination/layout/paginationGolden.browser.test.tsx`
Expected: PASS with a populated snapshot.

- [ ] **Step 4: Refactor `buildPaginationState` into an adapter**

Rewrite `buildPaginationState.ts` so it (a) builds `PaginatorBlock[]`, (b) calls
`paginate`, (c) walks `plan.breaks` + `plan.endSpacer` to emit the same
decorations via `createSpacerElement`, and (d) builds `PaginationState['pages']`
from `plan.pages` by mapping each block `key` (the block's doc `pos`, stringified)
back to positions. Keep `resolveBlockMeasurement`, `buildLineMap`,
`createSpacerElement`, and `resultBuilders` as-is.

Key mapping rules (must hold for equivalence):
- `PaginatorBlock.key` = `String(offset)` (the block's doc position).
- `height` = `resolveBlockMeasurement(...).height`.
- `splittable` = `isSplittableBlockType(blockType)`; `orphanCandidate` =
  `isOrphanCandidateBlockType(blockType)`.
- `getLines` = `() => buildLineMap(view, offset, node, dom).lines` (its
  `cleanHeight` continues to correct `blockRemaining` exactly as today — preserve
  that adjustment inside the adapter when a split is requested, or precompute
  `height` from `cleanHeight`; keep behaviour identical to the golden).
- Decoration emission per `PageBreak`:
  - `afterBlockKey` → anchor pos = `Number(afterBlockKey) + node.nodeSize` of that
    block (i.e. the stored `lastBlockEndPos`). Track a `Map<key, endPos>` while
    building blocks.
  - `pushDown`/`forced`/`oddBlank`: `Decoration.widget(anchorPos, () =>
    createSpacerElement(spacerHeight, options, dividerOffset), {side: 1})`.
  - `split`: `Decoration.widget(breakPos, () => createSpacerElement(spacerHeight,
    options, dividerOffset, true), {side: 1})`.
- `plan.endSpacer` → `Decoration.widget(endPos, () =>
  createSpacerElement(height, options), {side: 1})` at `lastBlockEndPos` (or 0).
- `PageInfo` = `plan.pages` with `startPos = Number(startKey)`, `endPos =
  endMap.get(endKey)`, `startOffset`, `endOffset` passed through.
- `hasInlineBreaks` = `plan.breaks.some(b => b.isInlineBreak)`; keep
  `usedFallbackMeasurements`/`nextCache` behaviour from `resolveBlockMeasurement`.

Preserve the empty-doc / `contentHeight <= 0` early return via
`buildEmptyPaginationStateResult`.

- [ ] **Step 5: Delete the moved file and run the golden + suite**

Delete `packages/editor/src/editor/tiptap/extensions/pagination/layout/selectSplitPoint.ts`
and update its importers to `@stagistic/script-pagination`.

Run: `pnpm --filter @stagistic/editor exec tsc --noEmit`
Expected: no new errors.

Run: `npx vp test run -c packages/editor/vitest.browser.config.ts packages/editor/src/editor/tiptap/extensions/pagination packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx`
Expected: PASS, **golden snapshot unchanged**. If the golden differs, the adapter
is not equivalent — fix the adapter (never edit the snapshot).

- [ ] **Step 6: Prepare commit (do not commit)**

```bash
git add packages/editor pnpm-lock.yaml
```
Proposed message: `refactor(editor): drive pagination from @stagistic/script-pagination`. Ask the owner to commit.

---

## Task 6: Export drives the shared core (gains widow/orphan/keep-together)

Refactor `transcribeExportPlan` into an adapter: build `PaginatorBlock[]` with
math heights + math line maps, call `paginate`, and emit `VisualLine`s at the
plan's fragment positions plus `__page_break__` items at each `PageBreak`.

**Files:**
- Modify: `packages/export/package.json` (add dependency)
- Modify: `packages/export/src/transcribeExportPlan.ts`
- Test: `packages/export/src/transcribeExportPlan.test.ts`

**Interfaces:**
- Consumes from Task 4: `paginate`, `PaginatorBlock`, `PaginatorMetrics`; from
  Task 2: `isSplittableBlockType`, `isOrphanCandidateBlockType`,
  `MIN_SPLIT_LINES_BEFORE`, `MIN_SPLIT_LINES_AFTER`, `FIT_EPSILON_PX`.
- Produces: unchanged `TranscriptResult` (same `PageItem[]` shape drawn by
  `drawPdf`).

- [ ] **Step 1: Add the dependency**

Edit `packages/export/package.json` `dependencies`, add:
```json
"@stagistic/script-pagination": "workspace:*",
```
Run: `pnpm install`

- [ ] **Step 2: Write the failing tests (new behaviour)**

Add to `packages/export/src/transcribeExportPlan.test.ts`:
```ts
it('pushes a non-splittable heading whole to the next page instead of tearing it', () => {
    // 1123 tall page, 96 margins → ~931 usable. Fill page 1 with tall stage
    // directions, then a character heading whose following dialogue cannot fit.
    const fillers = Array.from({length: 40}, (_u, index) =>
        block('stageDirection', `sd${index}`, `Line number ${index} on the page.`));
    const transcript = transcribeExportPlan(plan([
        block('scene', 's1', 'Scene one'),
        ...fillers,
        block('character', 'lastHeading', 'ISABELLA'),
        block('dialogue', 'd1', 'A closing line of dialogue.'),
    ]), DEFAULT_EDITOR_SETTINGS);

    const breakIndex = transcript.items.findIndex(item => 'type' in item && item.type === '__page_break__');
    const isabellaIndex = transcript.items.findIndex(item =>
        !('type' in item) && item.runs.some(run => run.text === 'ISABELLA'));

    // The heading lands AFTER the page break (kept with its dialogue), not before.
    expect(breakIndex).toBeGreaterThan(-1);
    expect(isabellaIndex).toBeGreaterThan(breakIndex);
});
```

- [ ] **Step 3: Run to verify the new test fails (old greedy behaviour)**

Run: `npx vp test run packages/export/src/transcribeExportPlan.test.ts`
Expected: FAIL — today the heading stays on page 1 before the break.

- [ ] **Step 4: Refactor `transcribeExportPlan` into an adapter**

Keep the existing text pipeline (`getBlockRawText`, music labels, `wrapText`,
`normalizeBlockText`, `resolveLineX`, `makeRun`). Replace the manual
`cursor`/`ensureLineFits`/`applyForcedBreak` layout with:

1. First pass — for each `plan.doc.content` block compute what the layout needs
   and cache it keyed by index string:
   ```ts
   interface PreparedBlock {
       key: string;
       blockType: string;
       block: NonNullable<EditorSettings['blocks'][string]>;
       fontSizePx: number;
       lineHeightPx: number;
       spacingBeforePx: number;
       spacingAfterPx: number;
       baseX: number;
       availableWidthPx: number;
       charWidthPx: number;
       wrapped: string[];              // wrapText output
   }
   ```
   (Move the current per-block width/indent/spacing math here unchanged.)
2. Build `PaginatorBlock[]`:
   ```ts
   const paginatorBlocks = prepared.map(item => ({
       key: item.key,
       height: item.spacingBeforePx + item.wrapped.length * item.lineHeightPx + item.spacingAfterPx,
       splittable: isSplittableBlockType(item.blockType),
       orphanCandidate: isOrphanCandidateBlockType(item.blockType),
       forcedBreak: forcedBreakByBlockId.get(item.blockId)?.kind === 'odd-page'
           ? 'odd-page' as const
           : forcedBreakByBlockId.has(item.blockId) ? 'new-page' as const : undefined,
       getLines: () => item.wrapped.map((_line, index) => ({
           startPos: index,
           topRel: item.spacingBeforePx + index * item.lineHeightPx,
       })),
   }));
   ```
3. `const metrics = { contentHeight: settings.page.heightPx - settings.page.marginTopPx - settings.page.marginBottomPx, topSpacing: settings.page.marginTopPx, bottomSpacing: settings.page.marginBottomPx, orphanThreshold: 2 * settings.typography.fontSizePx * settings.typography.lineHeight, minLinesBefore: MIN_SPLIT_LINES_BEFORE, minLinesAfter: MIN_SPLIT_LINES_AFTER, epsilonPx: FIT_EPSILON_PX };`
4. `const layout = paginate(paginatorBlocks, metrics);`
5. Emit items in reading order. Walk `layout.fragments` (already ordered);
   between fragments whose `pageIndex` increases, push `PAGE_BREAK_ITEM`. For each
   fragment, for line index `i` in `[fromLine, toLine)`:
   ```ts
   const y = fragment.contentTop + (i - fragment.fromLine) * prepared.lineHeightPx;
   items.push({y, runs: [makeRun(prepared.wrapped[i], resolveLineX({...}), prepared.block, prepared.fontSizePx)]});
   ```
   Track the current page index to insert `PAGE_BREAK_ITEM` when it advances.
6. Return `{pageWidthPx, pageHeightPx, marginLeftPx, marginTopPx, items}` as today.

Remove the now-dead `pushPageBreak`, `ensureLineFits`, `applyForcedBreak`, and the
`LayoutCursor` type.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @stagistic/export exec tsc --noEmit`
Expected: no errors.

Run: `npx vp test run packages/export/`
Expected: PASS — the new pushdown test passes and the existing music/delimiter/
forced-break tests stay green.

- [ ] **Step 6: Prepare commit (do not commit)**

```bash
git add packages/export pnpm-lock.yaml
```
Proposed message: `refactor(export): drive pagination from @stagistic/script-pagination`. Ask the owner to commit.

---

## Task 7: Remove duplication + final verification

**Files:**
- Verify no orphaned copies: grep for `SPLITTABLE_BLOCK_TYPES` / `selectSplitPoint`
  outside the shared package.
- Modify: any stale importers found.

- [ ] **Step 1: Grep for duplicated logic**

Run:
```bash
grep -rn "selectSplitPoint\|SPLITTABLE_BLOCK_TYPES\|ORPHAN_PUSHDOWN_TYPES" packages --include=*.ts | grep -v script-pagination | grep -v dist
```
Expected: only re-exports/imports in `packages/editor/.../pagination/constants.ts`
and consumers. No second implementation.

- [ ] **Step 2: Full typecheck + targeted test run**

Run:
```bash
pnpm --filter @stagistic/script-pagination exec tsc --noEmit
pnpm --filter @stagistic/export exec tsc --noEmit
pnpm --filter @stagistic/editor exec tsc --noEmit
npx vp test run packages/script-pagination/ packages/export/
npx vp test run -c packages/editor/vitest.browser.config.ts packages/editor/src/editor/tiptap/extensions/pagination
```
Expected: all pass; editor golden snapshot unchanged.

- [ ] **Step 3: Manual parity check (owner)**

Ask the owner to open the sample script and confirm the export's page-1 block set
now matches the editor (the previously-extra trailing block is pushed to page 2).

- [ ] **Step 4: Prepare final commit (do not commit)**

```bash
git add packages
```
Proposed message: `chore(pagination): remove duplicated break logic`. Ask the owner to commit.

---

## Self-Review

**Spec coverage:**
- Shared height-agnostic core → Task 4. ✔
- New package `@stagistic/script-pagination`, no DOM/PM/export deps → Tasks 1–4. ✔
- Shared classification + `selectSplitPoint` moved → Tasks 2–3. ✔
- Editor adapter, no visual regression (golden) → Task 5. ✔
- Export adapter gains widow/orphan/keep-together → Task 6. ✔
- Unified metrics from settings → Tasks 5–6. ✔
- Delete duplication → Task 7. ✔
- Out-of-scope (rule changes, music pills, highlight setting) → untouched. ✔

**Placeholder scan:** No TBD/TODO; every code step shows code; the one implementer
note in Task 4 points at an authoritative reference (git history of
`buildPaginationState`) rather than deferring work.

**Type consistency:** `PaginatorBlock`/`PaginatorMetrics`/`PlacedFragment`/
`PageBreak`/`PageInfo`/`PaginationPlan` defined in Task 4 are used with the same
field names in Tasks 5–6. `selectSplitPoint`/`BlockLine` signatures match across
Tasks 3–4. `isSplittableBlockType`/`isOrphanCandidateBlockType` names are
consistent Tasks 2/5/6.

**Known risk to watch during execution:** the fragment bookkeeping
(`contentTop`/`fromLine`/`toLine`) in `paginate` is the only genuinely new logic;
the break/offset arithmetic is a verbatim port. The editor golden (Task 5 Step 3)
and the export pushdown test (Task 6 Step 2) are the two oracles that catch a
mistranslation.
