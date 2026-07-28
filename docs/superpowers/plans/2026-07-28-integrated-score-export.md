# Integrated Score Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Integrated score template with odd-page book/music/score units, vector score-PDF insertion, stable dual numbering, and reference-first character filtering shared with Basic.

**Architecture:** Export becomes page-oriented before PDF drawing. A complete unfiltered reference pass assigns the top-right page mark and bottom-center integrated number; preserved character filtering then removes non-retained block lines and score pages without reflowing retained content. A final `pdf-lib` compositor interleaves vector score pages, resolves odd-page blanks, and overlays the integrated footer on every counted page.

**Tech Stack:** TypeScript, React 19, React Aria Components, `@stagistic/export`, jsPDF, `pdf-lib`, `@pdf-lib/fontkit`, IndexedDB-backed attachment blobs, `vite-plus/test`.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-07-28-integrated-score-export-design.md`.
- Template ID: `integrated-score`; label: `Integrated score`.
- Integrated score separation and score insertion are fixed behaviour with no switches.
- Only `open` music participates; ignore `hit`.
- Explicit and implicit music ends behave identically.
- Score PDFs are copied without scaling, cropping, or page-size conversion.
- Missing, unavailable, encrypted, or malformed score PDFs do not block export.
- Both top-right page marks and bottom-center integrated numbers stay identical to the complete export when preserved filtering is enabled.
- Preserved filtering is equivalent to physically removing filtered-out pages from the complete PDF; retained content does not reflow.
- Post-script automatic parity blanks show only the integrated number, in Basic and Integrated score.
- Basic and Integrated score share one ephemeral `BasicExportConfig`; template switching does not reset it.
- No database schema changes.
- Do not change `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Do not commit. At each task boundary, prepare a suggested file set and commit message for user review.
- Preserve unrelated worktree changes.
- Test imports use `import {describe, it, expect} from "vite-plus/test"`.
- Canonical checks are focused package tests/typechecks, `npx tsc -b`, and `pnpm lint`.

---

## File Structure

### `packages/export` - semantic plans, page layout, filtering, and PDF composition

- Modify `packages/export/package.json` and `pnpm-lock.yaml` - add `pdf-lib` and `@pdf-lib/fontkit`.
- Modify `packages/export/src/config.ts` and `config.test.ts` - add the default-on preservation option.
- Modify `packages/export/src/scriptData.ts` - expose Integrated score attachment metadata.
- Modify `packages/export/src/plan.ts` - type visibility, unit-boundary, and score post-step plans.
- Modify `packages/export/src/visualLine.ts` - replace the flat item stream with owned physical pages.
- Create `packages/export/src/pageModel.ts` - exact generated/score/blank page contracts.
- Create `packages/export/src/pageModel.test.ts` - construction and identity coverage.
- Modify `packages/export/src/transcribeExportPlan.ts` and tests - emit owned pages and defer integrated footers.
- Create `packages/export/src/applyPreservedFilter.ts` and tests - remove lines/pages without reflow.
- Create `packages/export/src/integratedScore/deriveIntegratedScoreExportPlan.ts` and tests - derive open-music boundaries and score insertions.
- Create `packages/export/src/composePhysicalPages.ts` and tests - interleave score descriptors, resolve parity, assign both reference number systems.
- Create `packages/export/src/pdf/resolveScorePdfs.ts` and tests - validate PDFs and expose page counts/binary data.
- Create `packages/export/src/pdf/composeFinalPdf.ts` and tests - vector merge plus final integrated footer.
- Modify `packages/export/src/pdf/drawPdf.ts`, `pdf.worker.ts`, and `renderPdfInWorker.ts` - page-oriented generated drawing and final composition.
- Modify `packages/export/src/index.ts` - export new public contracts/functions.

### `packages/ui` - reusable inline information tooltip

- Create `packages/ui/src/atoms/InlineTooltip.tsx`.
- Create `packages/ui/src/atoms/InlineTooltip.module.css`.
- Create `packages/ui/src/atoms/InlineTooltip.browser.test.tsx`.
- Modify `packages/ui/src/index.ts` - public export.

### `packages/app-routes` - shared state, attachment access, templates, and warnings

- Modify `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx` - expose attachment state.
- Modify `packages/app-routes/src/routes/script/export/useExportScriptData.ts` - include attachment metadata.
- Modify `packages/app-routes/src/routes/script/export/ExportProvider.tsx` - own shared config and attachment resolver/cache.
- Modify `packages/app-routes/src/routes/script/export/ExportControlPanel.tsx` - render the warning below the picker.
- Modify `packages/app-routes/src/routes/script/export/registry.ts` - register Integrated score.
- Refactor `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx` - consume shared config.
- Create `packages/app-routes/src/routes/script/export/templates/IntegratedScoreExportTemplate.tsx`.
- Create `packages/app-routes/src/routes/script/export/IntegratedScoreWarning.tsx` and browser test.
- Modify `packages/app-routes/src/routes/script/export/modules/CharacterFilterModule.tsx` and create its browser test.
- Modify `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.tsx` and its browser test.
- Modify `packages/app-routes/src/routes/script/export/modules/modules.module.css` and `ExportControlPanel.module.css`.
- Modify `packages/app-routes/src/routes/script/export/useExportPreview.ts` - async score resolution, stale-run warning state, and final worker request.

---

### Task 1: Add stable-pagination and score contracts

**Files:**

- Modify: `packages/export/src/config.ts`
- Modify: `packages/export/src/config.test.ts`
- Modify: `packages/export/src/scriptData.ts`
- Modify: `packages/export/src/plan.ts`
- Create: `packages/export/src/pageModel.ts`
- Create: `packages/export/src/pageModel.test.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Produces `CharacterFilterValue.preserveFullScriptPagination`.
- Produces `ExportIntegratedScoreAttachment`.
- Produces exact page ownership and unit-boundary contracts consumed by Tasks 2-6.

- [ ] **Step 1: Add failing default and contract tests**

In `config.test.ts`, extend the existing default assertion:

```ts
expect(BASIC_DEFAULTS.characterFilter).toEqual({
    mode: 'all',
    characterIds: [],
    preserveFullScriptPagination: true,
});
```

Create compile-time construction coverage in `packages/export/src/pageModel.test.ts`:

```ts
import {
    describe,
    expect,
    it,
} from "vite-plus/test";

import type {ExportPhysicalPage} from './pageModel';

describe('ExportPhysicalPage', () => {
    it('separates semantic identity from final physical position', () => {
        const page: ExportPhysicalPage = {
            kind: 'script',
            items: [],
            sourceBlockIds: ['block-1'],
            musicId: null,
            scorePageIndex: null,
            unitStart: 'none',
            startsOnOddPage: false,
            scoreInsertionAfterMusicIds: [],
            referencePageMark: '1-7',
            referenceScriptPageNumber: 7,
            referenceIntegratedPageNumber: 11,
        };

        expect(page.referenceScriptPageNumber).toBe(7);
        expect(page.referenceIntegratedPageNumber).toBe(11);
    });
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
pnpm test packages/export/src/config.test.ts packages/export/src/pageModel.test.ts
```

Expected: FAIL because the preservation property and page model do not exist.

- [ ] **Step 3: Add the exact configuration and data contracts**

In `config.ts`:

```ts
export interface CharacterFilterValue {
    mode: 'all' | 'only',
    characterIds: string[],
    preserveFullScriptPagination: boolean,
}
```

Set:

```ts
characterFilter: {
    mode: 'all',
    characterIds: [],
    preserveFullScriptPagination: true,
},
```

In `scriptData.ts`:

```ts
export interface ExportIntegratedScoreAttachment {
    musicId: string,
    filename: string,
    storageKey: string,
}
```

Add `integratedScores: ExportIntegratedScoreAttachment[]` to `ScriptData`.

- [ ] **Step 4: Add page and post-step contracts**

Create `pageModel.ts` with:

```ts
import type {VisualLine} from './visualLine';

export type ExportPhysicalPageKind =
    | 'title'
    | 'initial'
    | 'script'
    | 'score'
    | 'parity-blank';

export type ExportUnitStart = 'none' | 'music' | 'score' | 'book';

export interface OwnedVisualLine extends VisualLine {
    sourceBlockId: string | null,
}

export interface ExportPhysicalPage {
    kind: ExportPhysicalPageKind,
    items: OwnedVisualLine[],
    sourceBlockIds: string[],
    musicId: string | null,
    scorePageIndex: number | null,
    unitStart: ExportUnitStart,
    startsOnOddPage: boolean,
    scoreInsertionAfterMusicIds: string[],
    referencePageMark: string | null,
    referenceScriptPageNumber: number | null,
    referenceIntegratedPageNumber: number | null,
}

export interface ResolvedScorePdf {
    musicId: string,
    filename: string,
    bytes: Uint8Array,
    pageCount: number,
}
```

In `plan.ts`, replace the untyped post step:

```ts
export interface IntegratedScoreInsertion {
    musicId: string,
    startBlockId: string,
    firstMusicBlockId: string | null,
    effectiveEndBlockId: string,
    nextBlockId: string | null,
    owningSceneBlockId: string | null,
    attachment: ExportIntegratedScoreAttachment | null,
}

export interface IntegratedScorePostStep {
    kind: 'integrated-score',
    insertions: IntegratedScoreInsertion[],
}

export type ExportPostStep = IntegratedScorePostStep;
```

Add `visibleBlockIds: string[] | null` to `PaginationOverrides`. Re-export all
new types from `index.ts`.

- [ ] **Step 5: Update existing fixtures and verify**

Every `CharacterFilterValue` literal gains
`preserveFullScriptPagination: true`; every `ScriptData` fixture gains
`integratedScores: []`; every `PaginationOverrides` fixture gains
`visibleBlockIds: null`.

Run:

```bash
pnpm test packages/export/src/config.test.ts packages/export/src/pageModel.test.ts packages/export/src/filterByCharacter.test.ts packages/export/src/deriveBasicExportPlan.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: all focused tests and export typecheck PASS.

- [ ] **Step 6: Prepare the review boundary**

Suggested files: Task 1 files only.

Suggested commit message:

```text
feat(export): add integrated page contracts
```

Do not commit.

---

### Task 2: Emit owned physical pages from transcription

**Files:**

- Modify: `packages/export/src/visualLine.ts`
- Modify: `packages/export/src/transcribeExportPlan.ts`
- Modify: `packages/export/src/transcribeExportPlan.test.ts`
- Modify: `packages/export/src/pdf/drawPdf.ts`

**Interfaces:**

- Consumes `ExportPhysicalPage` and `OwnedVisualLine` from Task 1.
- Produces `TranscriptResult.pages: ExportPhysicalPage[]`.
- Defers the integrated page number until final PDF composition.
- Converts odd-page requests into page metadata; it does not insert parity
  blanks.

- [ ] **Step 1: Write failing page-oriented transcription tests**

Replace flat-stream helpers with page helpers and add:

```ts
it('keeps source block ownership and stable page references', () => {
    const transcript = transcribeExportPlan(
        plan([
            block('scene', 's1', 'Scene one'),
            block('dialogue', 'd1', 'First line'),
        ]),
        DEFAULT_EDITOR_SETTINGS,
    );
    const scriptPage = transcript.pages.find(page => page.kind === 'script');

    expect(scriptPage?.sourceBlockIds).toEqual(['s1', 'd1']);
    expect(scriptPage?.items.map(item => item.sourceBlockId)).toEqual(['s1', 'd1']);
    expect(scriptPage?.referencePageMark).toBe('1-1');
    expect(scriptPage?.referenceScriptPageNumber).toBe(1);
    expect(scriptPage?.referenceIntegratedPageNumber).toBeNull();
});

it('defers odd-page balancing to physical composition', () => {
    const transcript = transcribeExportPlan({
        ...plan([
            block('scene', 's1', 'Scene one'),
            block('scene', 's2', 'Scene two'),
        ]),
        pagination: {
            forcedBreaks: [{blockId: 's2', kind: 'odd-page'}],
            visibleBlockIds: null,
        },
    }, DEFAULT_EDITOR_SETTINGS);
    const secondScenePage = transcript.pages.find(page => (
        page.kind === 'script' && page.sourceBlockIds.includes('s2')
    ));

    expect(transcript.pages.some(page => page.kind === 'parity-blank')).toBe(false);
    expect(secondScenePage).toMatchObject({
        startsOnOddPage: true,
        referencePageMark: '2-2',
    });
});
```

- [ ] **Step 2: Run and confirm the flat-stream implementation fails**

Run:

```bash
pnpm test packages/export/src/transcribeExportPlan.test.ts
```

Expected: FAIL because `TranscriptResult.pages` and owned line metadata do not exist.

- [ ] **Step 3: Make prepared blocks carry IDs**

Extend `PreparedBlock`:

```ts
interface PreparedBlock {
    blockId: string,
    blockType: string,
    block: NonNullable<EditorSettings['blocks'][string]>,
    fontSizePx: number,
    lineHeightPx: number,
    spacingBeforePx: number,
    spacingAfterPx: number,
    baseX: number,
    availableWidthPx: number,
    charWidthPx: number,
    wrapped: WrappedLine[],
}
```

Set `blockId` from `getScriptBlockId(node) ?? String(index)`. Every generated
line becomes:

```ts
const visualLine: OwnedVisualLine = {
    sourceBlockId: item.blockId,
    y,
    runs: line.segments.map(segment => {
        const run = makeRun(
            segment.text,
            runX,
            item.block,
            item.fontSizePx,
            segment.style,
        );

        runX += segment.text.length * item.charWidthPx;

        return run;
    }),
};
```

Title, initial-page, and generated header/footer lines use
`sourceBlockId: null`.

- [ ] **Step 4: Replace flat page breaks with physical pages**

Change `TranscriptResult` in `visualLine.ts`:

```ts
export interface TranscriptResult {
    pageWidthPx: number,
    pageHeightPx: number,
    marginLeftPx: number,
    marginTopPx: number,
    pages: ExportPhysicalPage[],
    postSteps: ExportPostStep[],
    visibleBlockIds: string[] | null,
}
```

Have `transcribeExportPlan` return ordered title, initial, and script pages.
Assign reference page marks and script counters while building script pages,
before any preserved filtering. Leave
`referenceIntegratedPageNumber: null` on every page.

```ts
const oddStartBlockIds = new Set(
    plan.pagination.forcedBreaks
        .filter(item => item.kind === 'odd-page')
        .map(item => item.blockId),
);
```

Pass `new-page` to the paginator for both forced-break kinds:

```ts
forcedBreak: forcedBreak === 'odd-page' ? 'new-page' : forcedBreak,
```

After layout, set `startsOnOddPage: true` on the generated page whose first
source block is in `oddStartBlockIds`. Do not create an `oddBlank` page.

Do not render `{{page_number}}` into page items. Keep other configured
header/footer cells. Store `postSteps` and `visibleBlockIds` on the transcript
for Tasks 5-6.

- [ ] **Step 5: Draw generated pages from the page array**

Update `drawPdf` so it:

1. creates the first generated page;
2. draws `page.items`;
3. calls `doc.addPage()` between generated pages;
4. never draws score descriptors;
5. never draws the integrated footer.

Use this exact selection for the intermediate generated PDF:

```ts
const generatedPages = transcript.pages.filter(page => page.kind !== 'score');
```

Task 6 replaces this intermediate-only API with final composition.

- [ ] **Step 6: Verify transcription and generated drawing**

Run:

```bash
pnpm test packages/export/src/transcribeExportPlan.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: PASS, including title, initial-page, wrapping, ownership,
header/footer, and deferred-odd-page cases migrated to `pages`.

- [ ] **Step 7: Prepare the review boundary**

Suggested commit message:

```text
refactor(export): model transcript as physical pages
```

Do not commit.

---

### Task 3: Implement reference-first character filtering

**Files:**

- Modify: `packages/export/src/deriveBasicExportPlan.ts`
- Modify: `packages/export/src/deriveBasicExportPlan.test.ts`
- Create: `packages/export/src/applyPreservedFilter.ts`
- Create: `packages/export/src/applyPreservedFilter.test.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Produces `applyPreservedFilter(pages, visibleBlockIds)`.
- Keeps both stored reference-number systems unchanged.
- Leaves retained line coordinates untouched.

- [ ] **Step 1: Write failing semantic-plan tests**

Add to `deriveBasicExportPlan.test.ts`:

```ts
it('paginates the full document and records visible blocks when preservation is on', () => {
    const result = deriveBasicExportPlan({
        ...BASIC_DEFAULTS,
        characterFilter: {
            mode: 'only',
            characterIds: ['bob'],
            preserveFullScriptPagination: true,
        },
    }, scriptData());

    expect(result.doc.content).toHaveLength(scriptData().doc.content.length);
    expect(result.pagination.visibleBlockIds).toContain('sceneB');
    expect(result.pagination.visibleBlockIds).not.toContain('sceneA');
});

it('keeps compact filter-first behaviour when preservation is off', () => {
    const result = deriveBasicExportPlan({
        ...BASIC_DEFAULTS,
        characterFilter: {
            mode: 'only',
            characterIds: ['bob'],
            preserveFullScriptPagination: false,
        },
    }, scriptData());

    expect(result.doc.content.map(node => node.attrs?.id)).toContain('sceneB');
    expect(result.doc.content.map(node => node.attrs?.id)).not.toContain('sceneA');
    expect(result.pagination.visibleBlockIds).toBeNull();
});
```

- [ ] **Step 2: Write failing page-removal tests**

Create `applyPreservedFilter.test.ts` with fixtures containing two source blocks
on one page and a later page:

```ts
const result = applyPreservedFilter(pages, new Set(['kept']));

expect(result[0].items).toEqual([
    expect.objectContaining({
        sourceBlockId: 'kept',
        y: 240,
    }),
]);
expect(result[0]).toMatchObject({
    referencePageMark: '1-5',
    referenceScriptPageNumber: 5,
    referenceIntegratedPageNumber: 8,
});
expect(result.some(page => page.sourceBlockIds.includes('removed-only'))).toBe(false);
```

Also assert title/initial pages remain and score pages survive only when their
`musicId` belongs to a retained insertion supplied through
`retainedMusicIds`.

- [ ] **Step 3: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/deriveBasicExportPlan.test.ts packages/export/src/applyPreservedFilter.test.ts
```

Expected: FAIL because the plan still filters first and the helper is absent.

- [ ] **Step 4: Derive full layout plus visible IDs**

In `deriveBasicExportPlan`:

```ts
const filteredDoc = filterScriptByCharacter(
    script.doc,
    config.characterFilter,
    script.characters,
);
const preserve = config.characterFilter.mode === 'only'
    && config.characterFilter.preserveFullScriptPagination;
const doc = preserve ? script.doc : filteredDoc;
const visibleBlockIds = preserve
    ? filteredDoc.content.flatMap(node => {
        const id = getScriptBlockId(node);

        return id ? [id] : [];
    })
    : null;
```

Build forced scene breaks from `doc`, then return `visibleBlockIds` in
`pagination`.

- [ ] **Step 5: Implement exact non-reflow filtering**

Use this public signature:

```ts
export const applyPreservedFilter = (
    pages: ExportPhysicalPage[],
    visibleBlockIds: ReadonlySet<string>,
    retainedMusicIds: ReadonlySet<string>,
): ExportPhysicalPage[]
```

For `script` pages, retain items whose `sourceBlockId` is `null` or visible.
Determine page survival from retained non-null content lines, not headers.
Never change `x`, `y`, reference marks, or reference numbers.

Keep:

- all `title` and `initial` pages;
- a `script` page with at least one retained content line;
- a `score` page whose `musicId` is in `retainedMusicIds`.

Drop parity blanks here; Task 5 recomputes them from retained boundaries.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm test packages/export/src/deriveBasicExportPlan.test.ts packages/export/src/applyPreservedFilter.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: PASS with unchanged coordinates and dual reference numbers.

- [ ] **Step 7: Prepare the review boundary**

Suggested commit message:

```text
feat(export): preserve reference pagination when filtering
```

Do not commit.

---

### Task 4: Derive Integrated score unit boundaries

**Files:**

- Create: `packages/export/src/integratedScore/deriveIntegratedScoreExportPlan.ts`
- Create: `packages/export/src/integratedScore/deriveIntegratedScoreExportPlan.test.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Produces `deriveIntegratedScoreExportPlan(config, script): ExportPlan`.
- Emits one `IntegratedScoreInsertion` per open music in document order.
- Reuses Basic leading pages, scene breaks, and visibility semantics.

- [ ] **Step 1: Write failing boundary tests**

Cover this exact document order:

```ts
[
    block('scene', 'scene-1', 'Scene one'),
    musicStartBlock('start-a', 'music-a', 'open'),
    block('lyric', 'lyric-a', 'First lyric'),
    musicOutBlock('out-a'),
    block('dialogue', 'book-a', 'Back to book'),
]
```

Assert:

```ts
expect(step.insertions).toEqual([
    expect.objectContaining({
        musicId: 'music-a',
        startBlockId: 'start-a',
        firstMusicBlockId: 'lyric-a',
        effectiveEndBlockId: 'out-a',
        nextBlockId: 'book-a',
        owningSceneBlockId: 'scene-1',
    }),
]);
```

Add separate cases for:

- `next-music`, `scene-end`, and `document-end`;
- a zero-block music-text interval;
- a `hit` with an uploaded attachment, producing no insertion;
- a filtered-out owning scene, excluded from `retainedMusicIds`;
- a missing attachment, producing `attachment: null`.

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/integratedScore/deriveIntegratedScoreExportPlan.test.ts
```

Expected: FAIL because the derivation module does not exist.

- [ ] **Step 3: Build music inputs and scene ownership**

Map `plan.doc.content` into `MusicBlockInput[]` with
`collectMusicAtoms`. Build `blockIndexById` and `sceneBlockIdByBlockId` while
walking `groupScenes(plan.doc)`.

Use `deriveMusicTimeline(inputs).music.filter(music => music.mode === 'open')`.
For each open music:

```ts
const startIndex = blockIndexById.get(music.startBlockId) ?? -1;
const endIndex = blockIndexById.get(music.effectiveEndBlockId) ?? startIndex;
const firstMusicBlockId = getBlockIdAt(startIndex + 1);
const nextBlockId = getBlockIdAt(endIndex + 1);
```

Join attachment metadata by `musicId`.

- [ ] **Step 4: Add required generated-page boundaries**

Start from `deriveBasicExportPlan(config, script)`. Merge `new-page` forced
breaks before every non-null `firstMusicBlockId` and `nextBlockId`. Deduplicate
by `(blockId, kind)` without replacing a stronger existing `odd-page` scene
break.

Set `postSteps` to:

```ts
[{
    kind: 'integrated-score',
    insertions,
}]
```

Do not insert odd blanks during derivation; Task 5 applies physical parity after
score interleaving.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm test packages/export/src/integratedScore/deriveIntegratedScoreExportPlan.test.ts packages/export/src/deriveBasicExportPlan.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: all boundary and Basic regression tests PASS.

- [ ] **Step 6: Prepare the review boundary**

Suggested commit message:

```text
feat(export): derive integrated score units
```

Do not commit.

---

### Task 5: Compose reference pages, score descriptors, parity, and numbering

**Files:**

- Create: `packages/export/src/composePhysicalPages.ts`
- Create: `packages/export/src/composePhysicalPages.test.ts`
- Modify: `packages/export/src/transcribeExportPlan.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Consumes generated script pages, score page counts, post steps, and optional
  visibility.
- Produces final ordered `ExportPhysicalPage[]` with complete-reference numbers.
- Recomputes filtered parity while retaining both reference values.
- Is called only after score PDFs have been resolved and their page counts are
  known.

- [ ] **Step 1: Write failing full-composition tests**

Use generated one-page book/music/book fixtures and a two-page score:

```ts
const result = composeReferencePages({
    generatedPages,
    postSteps: [integratedStep],
    scorePageCounts: new Map([['music-a', 2]]),
});

expect(result.map(page => [page.kind, page.unitStart])).toEqual([
    ['script', 'none'],
    ['parity-blank', 'none'],
    ['script', 'music'],
    ['parity-blank', 'none'],
    ['score', 'score'],
    ['score', 'none'],
    ['script', 'book'],
]);
```

Assert script references ignore score/blanks while integrated references count
them:

```ts
expect(result.map(page => page.referenceScriptPageNumber))
    .toEqual([1, null, 2, null, null, null, 3]);
expect(result.map(page => page.referenceIntegratedPageNumber))
    .toEqual([1, 2, 3, 4, 5, 6, 7]);
```

- [ ] **Step 2: Write failing preserved-filter parity tests**

Create a complete reference with retained integrated numbers `1, 2, 7`.
Remove the middle unit and assert:

```ts
expect(filtered.map(page => page.referenceIntegratedPageNumber))
    .toEqual([1, 2, 6, 7]);
expect(filtered[2]).toMatchObject({
    kind: 'parity-blank',
    referencePageMark: null,
    referenceScriptPageNumber: null,
    referenceIntegratedPageNumber: 6,
});
```

Also assert that no blank is retained when the next required unit already
starts odd physically.

- [ ] **Step 3: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/composePhysicalPages.test.ts
```

Expected: FAIL because the compositor does not exist.

- [ ] **Step 4: Implement reference composition**

Use:

```ts
export const composeReferencePages = ({
    generatedPages,
    postSteps,
    scorePageCounts,
}: {
    generatedPages: ExportPhysicalPage[],
    postSteps: ExportPostStep[],
    scorePageCounts: ReadonlyMap<string, number>,
}): ExportPhysicalPage[]
```

Mark the generated page beginning at `firstMusicBlockId` as `unitStart:
'music'`, the page beginning at `nextBlockId` as `unitStart: 'book'`, and the
last generated page containing `effectiveEndBlockId` with
`scoreInsertionAfterMusicIds`.

When an insertion has a resolved page count, insert that many `score`
descriptors after the marked generated page; the first uses `unitStart:
'score'` and `startsOnOddPage: true`. Mark the first music/book generated page
with both its `unitStart` and `startsOnOddPage: true`. A scene page already
marked `startsOnOddPage` retains that flag. Before every page with
`startsOnOddPage: true`, insert one parity blank only when the next physical
page would be even.

Each inserted score descriptor sets:

```ts
{
    kind: 'score',
    musicId: insertion.musicId,
    scorePageIndex,
    items: [],
    sourceBlockIds: [],
}
```

where `scorePageIndex` is zero-based within that attachment. Every generated or
blank page sets `scorePageIndex: null`.

Assign page marks/script counters only to `script` pages. Assign sequential
integrated values to every `script`, `score`, and post-script parity page.

- [ ] **Step 5: Implement filtered physical recomposition**

Use:

```ts
export const composeFilteredPages = (
    referencePages: ExportPhysicalPage[],
    visibleBlockIds: ReadonlySet<string>,
    retainedMusicIds: ReadonlySet<string>,
): ExportPhysicalPage[]
```

Call `applyPreservedFilter`, then reinsert parity blanks before retained unit
starts. Choose the blank reference number as:

```ts
const blankReference = nextPage.referenceIntegratedPageNumber === null
    ? null
    : nextPage.referenceIntegratedPageNumber - 1;
```

Require that value to be positive and unused; otherwise throw an invariant
error because parity changed without a removed reference page.

- [ ] **Step 6: Wire composition into transcription**

Export:

```ts
export const composeTranscriptPages = (
    transcript: TranscriptResult,
    scorePageCounts: ReadonlyMap<string, number>,
): ExportPhysicalPage[]
```

It first calls `composeReferencePages`. When
`transcript.visibleBlockIds` is non-null, derive retained music IDs from each
insertion's `owningSceneBlockId` and call `composeFilteredPages`.

Basic passes `postSteps: []` and an empty score-page-count map, so it shares
reference numbering and blank rules without score insertion.

Task 6 calls this function inside the PDF worker after resolving score PDFs.

- [ ] **Step 7: Verify**

Run:

```bash
pnpm test packages/export/src/composePhysicalPages.test.ts packages/export/src/transcribeExportPlan.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: PASS for full, preserved, compact, Basic, and Integrated page order.

- [ ] **Step 8: Prepare the review boundary**

Suggested commit message:

```text
feat(export): compose stable physical page units
```

Do not commit.

---

### Task 6: Merge vector score PDFs and draw final integrated footers

**Files:**

- Modify: `packages/export/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `packages/export/src/pdf/resolveScorePdfs.ts`
- Create: `packages/export/src/pdf/resolveScorePdfs.test.ts`
- Create: `packages/export/src/pdf/composeFinalPdf.ts`
- Create: `packages/export/src/pdf/composeFinalPdf.test.ts`
- Modify: `packages/export/src/pdf/drawPdf.ts`
- Modify: `packages/export/src/pdf/pdf.worker.ts`
- Modify: `packages/export/src/pdf/renderPdfInWorker.ts`
- Modify: `packages/export/src/pdf/fonts.ts`

**Interfaces:**

- Produces `resolveScorePdfs(requests): Promise<ResolvedScorePdfResult>`.
- Produces `composeFinalPdf(transcript, scores): Promise<Blob>`.
- Preserves source PDF vectors/page boxes and overlays one shared footer.

- [ ] **Step 1: Add the PDF dependencies**

Run:

```bash
pnpm --filter @stagistic/export add pdf-lib @pdf-lib/fontkit
```

Expected: `packages/export/package.json` and `pnpm-lock.yaml` change.

- [ ] **Step 2: Write failing score-resolution tests**

Create valid, malformed, and missing binary fixtures:

```ts
const result = await resolveScorePdfs([
    {
        musicId: 'valid',
        filename: 'valid.pdf',
        bytes: validTwoPagePdf,
    },
    {
        musicId: 'broken',
        filename: 'broken.pdf',
        bytes: new Uint8Array([1, 2, 3]),
    },
]);

expect(result.resolved.get('valid')?.pageCount).toBe(2);
expect(result.unavailableMusicIds).toEqual(['broken']);
```

- [ ] **Step 3: Implement non-blocking validation**

Use:

```ts
export interface ScorePdfRequest {
    musicId: string,
    filename: string,
    bytes: Uint8Array,
}

export interface ResolvedScorePdfResult {
    resolved: Map<string, ResolvedScorePdf>,
    unavailableMusicIds: string[],
}
```

Load each request with `PDFDocument.load(bytes)`. Catch per-file failures,
record the music ID, and continue. Preserve the original bytes in
`ResolvedScorePdf`.

- [ ] **Step 4: Write failing final-composition tests**

Generate one script page at `612 x 792` points and a two-page source score whose
page boxes are `601 x 791` and `602 x 792`. Assert:

```ts
const reader = await PDFDocument.load(await blob.arrayBuffer());

expect(reader.getPageCount()).toBe(3);
expect(reader.getPage(1).getSize()).toEqual({width: 601, height: 791});
expect(reader.getPage(2).getSize()).toEqual({width: 602, height: 792});
expect(resolveIntegratedFooterPlacement({
    pageWidth: 612,
    textWidth: 12,
    footerOffsetFromBottom: 36,
})).toEqual({x: 300, y: 36});
```

Task 5 already asserts that a parity blank descriptor has no page mark. Task 9
visually verifies that the final blank PDF page has no top-right content.

- [ ] **Step 5: Expose Courier Prime bytes**

Refactor `fonts.ts` to export:

```ts
export const loadCourierPrimeFontBytes = async (
    style: 'normal' | 'bold' | 'italic' | 'bolditalic',
): Promise<Uint8Array>
```

Keep jsPDF registration using the same loader. `composeFinalPdf` registers
fontkit and embeds the resolved footer style.

- [ ] **Step 6: Implement final vector composition**

Use:

```ts
export interface IntegratedFooterPlacementInput {
    pageWidth: number,
    textWidth: number,
    footerOffsetFromBottom: number,
}

export const resolveIntegratedFooterPlacement = ({
    pageWidth,
    textWidth,
    footerOffsetFromBottom,
}: IntegratedFooterPlacementInput) => ({
    x: (pageWidth - textWidth) / 2,
    y: footerOffsetFromBottom,
});

export const composeFinalPdf = async ({
    generatedPdf,
    pages,
    scores,
    footer,
}: {
    generatedPdf: Uint8Array,
    pages: ExportPhysicalPage[],
    scores: ReadonlyMap<string, ResolvedScorePdf>,
    footer: IntegratedFooterStyle,
}): Promise<Blob>
```

Load the generated intermediate PDF and every resolved score document. Walk
`pages`:

- copy the next generated page for `title`, `initial`, `script`, and
  `parity-blank`;
- copy the indexed source score page for `score`;
- draw the stored integrated number only when non-null;
- use the same centered X and footer Y for every page;
- draw underline when the footer style requests it.

Return:

```ts
new Blob([await output.save()], {type: 'application/pdf'})
```

- [ ] **Step 7: Update worker messages**

Define:

```ts
interface StartMessage {
    type: 'START',
    transcript: TranscriptResult,
    scoreRequests: ScorePdfRequest[],
    footer: IntegratedFooterStyle,
}

type WorkerResponse =
    | {
        type: 'DONE',
        blob: Blob,
        unavailableMusicIds: string[],
    }
    | {type: 'ERROR', message: string};
```

The worker resolves scores, recomposes physical pages with only successfully
resolved page counts, then:

```ts
const pages = composeTranscriptPages(
    transcript,
    new Map(Array.from(resolved.values()).map(score => [
        score.musicId,
        score.pageCount,
    ])),
);
const generatedPdf = await drawPdf({
    ...transcript,
    pages: pages.filter(page => page.kind !== 'score'),
});
const blob = await composeFinalPdf({
    generatedPdf: new Uint8Array(await generatedPdf.arrayBuffer()),
    pages,
    scores: resolved,
    footer,
});
```

Return `unavailableMusicIds` with the final Blob.

- [ ] **Step 8: Verify**

Run:

```bash
pnpm test packages/export/src/pdf/resolveScorePdfs.test.ts packages/export/src/pdf/composeFinalPdf.test.ts packages/export/src/transcribeExportPlan.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: all PDF composition tests PASS without rasterizing source score pages.

- [ ] **Step 9: Prepare the review boundary**

Suggested commit message:

```text
feat(export): merge vector score pdf pages
```

Do not commit.

---

### Task 7: Add the reusable inline tooltip and filter switch

**Files:**

- Create: `packages/ui/src/atoms/InlineTooltip.tsx`
- Create: `packages/ui/src/atoms/InlineTooltip.module.css`
- Create: `packages/ui/src/atoms/InlineTooltip.browser.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.tsx`
- Modify: `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/export/modules/CharacterFilterModule.tsx`
- Create: `packages/app-routes/src/routes/script/export/modules/CharacterFilterModule.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/export/modules/modules.module.css`

**Interfaces:**

- Produces `InlineTooltip({className?, label, tooltip})`.
- Exposes the default-on `Preserve full-script pagination` switch.

- [ ] **Step 1: Write failing InlineTooltip browser coverage**

Render:

```tsx
<InlineTooltip
    label="?"
    tooltip="Keep page numbers aligned."
/>
```

Assert the button has text `?`, receives the optional class, opens the tooltip
on hover, and opens it after keyboard focus with `userEvent.tab()`.

- [ ] **Step 2: Implement InlineTooltip**

Create:

```tsx
export interface InlineTooltipProps {
    className?: string,
    label: ReactNode,
    tooltip: ReactNode,
}

export const InlineTooltip = ({
    className,
    label,
    tooltip,
}: InlineTooltipProps) => (
    <Tooltip label={tooltip}>
        <button
            type="button"
            className={clsx(styles.trigger, className)}
        >
            {label}
        </button>
    </Tooltip>
);
```

CSS:

```css
.trigger {
    cursor: help;
    padding: 0;
    font: inherit;
    color: var(--color-text-muted);
    background: transparent;
    border: 0;
    border-bottom: 1px dashed currentcolor;
}

.trigger:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
}
```

Export the component and props from `@stagistic/ui`.

- [ ] **Step 3: Refactor Blank pages**

Replace the bespoke tooltip/button with:

```tsx
<InlineTooltip
    className={styles.balancingBlankIndicator}
    label="+1"
    tooltip={BALANCING_BLANK_EXPLANATION}
/>
```

Delete duplicated trigger chrome from `modules.module.css`, retaining only
layout-specific sizing if the browser test needs it.

- [ ] **Step 4: Write failing CharacterFilterModule browser coverage**

Use a stateful harness and assert:

```ts
expect(preserveSwitch.checked).toBe(true);
await userEvent.click(preserveSwitch);
expect(readValue().preserveFullScriptPagination).toBe(false);
await userEvent.hover(infoButton);
expect(tooltip.textContent).toBe(
    'Keep page numbers and content positions aligned with the complete script.',
);
```

Also verify selecting characters preserves the property instead of dropping it.

- [ ] **Step 5: Render the preserve row**

Every `onChange` branch spreads or explicitly retains
`preserveFullScriptPagination`. Add below the selected-character controls:

```tsx
<div className={styles.switchWithInfo}>
    <Switch
        isSelected={value.preserveFullScriptPagination}
        onChange={preserveFullScriptPagination => onChange({
            ...value,
            preserveFullScriptPagination,
        })}
    >
        Preserve full-script pagination
    </Switch>
    <InlineTooltip
        label="?"
        tooltip="Keep page numbers and content positions aligned with the complete script."
    />
</div>
```

- [ ] **Step 6: Verify UI packages**

Run:

```bash
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/app-routes test:browser -- CharacterFilterModule BlankPagesModule
pnpm --filter @stagistic/ui typecheck
pnpm --filter @stagistic/app-routes typecheck
```

Expected: focused tooltip/filter/blank browser coverage PASS.

- [ ] **Step 7: Prepare the review boundary**

Suggested commit message:

```text
feat(export): add preserved pagination control
```

Do not commit.

---

### Task 8: Share template state and integrate attachment warnings

**Files:**

- Modify: `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx`
- Modify: `packages/app-routes/src/routes/script/export/useExportScriptData.ts`
- Modify: `packages/app-routes/src/routes/script/export/ExportProvider.tsx`
- Modify: `packages/app-routes/src/routes/script/export/ExportControlPanel.tsx`
- Modify: `packages/app-routes/src/routes/script/export/registry.ts`
- Modify: `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx`
- Create: `packages/app-routes/src/routes/script/export/templates/IntegratedScoreExportTemplate.tsx`
- Create: `packages/app-routes/src/routes/script/export/IntegratedScoreWarning.tsx`
- Create: `packages/app-routes/src/routes/script/export/IntegratedScoreWarning.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/export/useExportPreview.ts`
- Modify: `packages/app-routes/src/routes/script/export/ExportControlPanel.module.css`

**Interfaces:**

- Export context owns `config`, `setConfig`, attachment Blob caching, and current
  unavailable-score IDs.
- Both templates consume the same config.
- Integrated warning counts only retained open music.

- [ ] **Step 1: Expose attachment state through settings context**

Add to `ScriptSettingsModalContextValue`:

```ts
musicAttachmentsState: ReturnType<typeof useMusicAttachmentsState>,
```

Include the existing `musicAttachmentsState` instance in `contextValue` and its
memo dependencies. Do not create a second attachment store.

- [ ] **Step 2: Add export attachment metadata**

In `useExportScriptData`, read `musicAttachmentsState.integratedScoresByMusic`
and produce:

```ts
integratedScores: Array.from(
    musicAttachmentsState.integratedScoresByMusic.entries(),
).flatMap(([musicId, attachment]) => attachment ? [{
    musicId,
    filename: attachment.filename,
    storageKey: attachment.storageKey,
}] : []),
```

Pass `musicAttachmentsState.getBlob` to `ExportProvider` separately so
`ScriptData` stays serializable and derivation stays pure.

- [ ] **Step 3: Move Basic config into ExportProvider**

Expose:

```ts
config: BasicExportConfig,
setConfig: Dispatch<SetStateAction<BasicExportConfig>>,
getAttachmentBlob: (storageKey: string) => Promise<Blob | null>,
unavailableScoreMusicIds: Set<string>,
setUnavailableScoreMusicIds: (ids: Set<string>) => void,
```

Move `cloneDefaults` to a shared `cloneBasicExportDefaults` export and call it
once in `ExportProvider`. Remove local state and keyed remount dependence from
`BasicExportTemplate`.

- [ ] **Step 4: Register Integrated score**

Create `IntegratedScoreExportTemplate` with the same four modules as Basic and:

```ts
useExportPreview({
    config,
    derive: deriveIntegratedScoreExportPlan,
});
```

Register:

```ts
'integrated-score': {
    label: 'Integrated score',
    Component: IntegratedScoreExportTemplate,
    defaults: BASIC_DEFAULTS,
},
```

Remove `key={templateId}` from the active template. Template switching must
abort/restart preview generation but must not reset shared config.

- [ ] **Step 5: Write failing warning browser tests**

Cover:

- no warning in Basic;
- `3 music numbers are missing an Integrated score PDF`;
- collapsed list by default;
- `Review missing music` expands every row;
- filtered-out scene music is absent;
- selecting `music-a` invokes `openAttributeManagerMusic('music-a')`;
- unavailable runtime IDs use
  `music numbers could not include an Integrated score PDF`.

- [ ] **Step 6: Implement warning derivation and disclosure**

Use the same `deriveMusicTimeline` inputs as the export plan. Keep only open
music whose owning scene survives the current character filter. Missing means
no attachment metadata; unavailable means the latest worker run returned the
music ID.

Render the component immediately below `TemplatePicker`. Each row is a native
button whose visible label is:

```text
{formattedMusicNumber} {title}
```

On press, call the already exposed `openAttributeManagerMusic(musicId)`.

- [ ] **Step 7: Resolve and cache attachment Blobs in useExportPreview**

For Integrated score:

1. derive the semantic plan;
2. collect attachment storage keys required by preserved/full or compact mode;
3. read each Blob from a route-lifetime `Map<string, Promise<Uint8Array | null>>`;
4. omit null Blobs from worker requests;
5. pass requests to `renderPdfInWorker`;
6. store returned `unavailableMusicIds` only when the run is still current.

Basic passes no score requests.

Abort and stale-run checks remain before and after every async boundary.

- [ ] **Step 8: Add shared-state browser coverage**

Render the control panel, change Character filter and Initial pages in Basic,
switch to Integrated score, and assert the same values remain. Change Page
breaks in Integrated score, switch back, and assert Basic shows the changed
value.

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser -- IntegratedScoreWarning ExportControlPanel
pnpm --filter @stagistic/app-routes typecheck
```

Expected: warning and shared-state tests PASS.

- [ ] **Step 9: Prepare the review boundary**

Suggested commit message:

```text
feat(export): add integrated score template
```

Do not commit.

---

### Task 9: End-to-end regression coverage and verification

**Files:**

- Create: `packages/export/src/integratedScore/integratedScoreExport.test.ts`
- Modify: `packages/export/src/testUtils.ts`
- Update: `graphify-out/` through `graphify update .`.

**Interfaces:**

- Verifies the complete approved design without introducing new production
  interfaces.

- [ ] **Step 1: Add a representative end-to-end export fixture**

Build a two-scene script:

- Scene 1 contains Bob and an open music with explicit out plus a two-page
  score.
- Scene 2 contains Alice and an open music ending implicitly at document end
  with no score.
- Scene 2 starts on an odd page.

Export full Integrated score and Bob-only preserved Integrated score. Assert
the Bob PDF's retained page marks and integrated values exactly equal the
corresponding pages in the full artifact; assert Alice's pages and score warning
are absent.

- [ ] **Step 2: Add the manual-page-removal invariant**

Convert both artifacts into page manifests:

```ts
interface PageManifestEntry {
    kind: ExportPhysicalPageKind,
    pageMark: string | null,
    integratedNumber: number | null,
    sourceBlockIds: string[],
    musicId: string | null,
}
```

Build the manifests directly from `composeTranscriptPages` output. Filter the
full manifest to pages containing retained Bob blocks or Bob music, then insert
the one parity descriptor required before the next retained odd-page unit.
Assert it equals the Bob-only manifest. This is the executable version of the
approved "physically tear pages out" rule.

- [ ] **Step 3: Run focused package suites**

Run:

```bash
pnpm test packages/export/src
pnpm --filter @stagistic/app-routes test
pnpm --filter @stagistic/ui test
pnpm --filter @stagistic/app-routes test:browser
pnpm --filter @stagistic/ui test:browser
```

Expected: all focused suites PASS. Do not change unrelated golden snapshots or
viewport assumptions to mask existing failures.

- [ ] **Step 4: Run canonical type and lint checks**

Run:

```bash
npx tsc -b
pnpm lint
```

Expected: PASS. If a pre-existing unrelated failure appears, establish the
baseline once per AGENTS.md and report it without loosening assertions.

- [ ] **Step 5: Render and visually inspect PDFs**

Generate and inspect:

1. Basic with no filter;
2. Basic with preserved character filtering and number gaps;
3. Basic with compact filtering;
4. Integrated score with one valid score;
5. Integrated score with a missing score;
6. Integrated score with an unreadable score;
7. Integrated score with explicit and implicit ends;
8. Integrated score with filtered scenes.

Render every PDF with Poppler:

```bash
pdftoppm -png output.pdf tmp/pdfs/integrated-score-check
```

Confirm:

- retained text stays on the same numbered reference pages;
- top-right and bottom-center values match the complete artifact;
- score vectors remain sharp;
- every required unit begins odd;
- parity blanks contain only the bottom-center number;
- all integrated footers share the same coordinates.

- [ ] **Step 6: Update the repository graph**

Run:

```bash
graphify update .
```

Expected: changed export/UI files are reflected in `graphify-out/`.

- [ ] **Step 7: Prepare the final review boundary**

Provide:

- changed-file summary;
- focused and canonical check results;
- rendered-PDF inspection result;
- any confirmed pre-existing failures;
- suggested commit groups/messages from Tasks 1-8.

Do not commit.
