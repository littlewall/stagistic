# Shared pagination core (`@stagistic/script-pagination`)

**Date:** 2026-07-07
**Status:** Approved design

## Problem

Two independent engines paginate the same script:

- **Editor** (`packages/editor/.../pagination/`) measures rendered **DOM** block
  heights and line positions, then decides page breaks with widow/orphan and
  keep-together rules: non-splittable block types are pushed whole to the next
  page, `character`/`scene` headings get an orphan pushdown, and splittable
  blocks split only with ≥2 lines on each side.
- **Export** (`packages/export/src/transcribeExportPlan.ts`) computes block
  heights **mathematically** on the monospace grid, but greedily fills line by
  line with **none** of those rules.

After the character-highlight underline change, per-block heights already match
between the two. The remaining divergence is purely the missing break rules in
the export: e.g. a heading the editor pushes to the next page (to keep it with
its content) is left at the bottom of the previous page in the export, so the
export fits one extra block per page.

Porting the rules into the export as a second copy would mean every future
pagination change must be made twice. Instead, **extract the algorithm into one
shared, height-agnostic core** that both sides drive.

## Decision

Create a new package **`@stagistic/script-pagination`** holding the pure
pagination algorithm and the block-type classification. Both the editor and the
export depend on it through thin adapters:

- The **editor adapter** feeds DOM-measured heights and DOM-built line maps, and
  turns the resulting plan into ProseMirror `Decoration` spacers.
- The **export adapter** feeds math-computed heights and math line maps, and
  turns the plan into PDF visual lines + page breaks.

The core is height-source-agnostic: it never measures or renders anything, so
the rules live in exactly one place. Editor behaviour must not change.

## Package

- `@stagistic/script-pagination` at `packages/script-pagination`, following the
  existing package conventions (`package.json`, `tsconfig`, `vp test`).
- **No dependency on ProseMirror, the DOM, or `@stagistic/export`.** May depend
  on `@stagistic/script` only if it needs shared block-type names; otherwise
  block types are passed as plain strings. The editor must not depend on the
  export.

## Core API (height-agnostic)

```ts
interface BlockLine {
  startPos: number;   // opaque line identifier, echoed back on a split
  topRel: number;     // line top relative to the block's border-box top
}

interface PaginatorBlock {
  key: string;                 // opaque block id, echoed back in the plan
  height: number;              // total block height incl. spacing-before/after
  splittable: boolean;
  orphanCandidate: boolean;
  forcedBreak?: 'new-page' | 'odd-page';
  getLines?: () => BlockLine[]; // lazy; only consulted for splittable blocks
}

interface PaginatorMetrics {
  contentHeight: number;   // pageHeight - marginTop - marginBottom
  topSpacing: number;      // marginTop
  bottomSpacing: number;   // marginBottom
  orphanThreshold: number; // e.g. 2 * lineHeight
  minLinesBefore: number;
  minLinesAfter: number;
  epsilonPx: number;
}

function paginate(blocks: PaginatorBlock[], metrics: PaginatorMetrics): PaginationPlan;
```

`PaginationPlan` carries enough for both consumers:

```ts
interface PlacedFragment {
  blockKey: string;
  pageIndex: number;   // 0-based
  yTop: number;        // y within the page, measured from the page top
  fromLine: number;    // inclusive index into getLines() (0 for whole blocks)
  toLine: number;      // exclusive; = line count for the final fragment
  isBlockStart: boolean;
  isBlockEnd: boolean;
}

interface PageBreak {
  kind: 'block' | 'inline-split' | 'odd-blank';
  atBlockKey: string;
  breakPos?: number;   // opaque BlockLine.startPos for inline splits
  leftover: number;    // unused space above the break (for spacer height)
}

interface PaginationPlan {
  pageCount: number;
  fragments: PlacedFragment[]; // ordered
  breaks: PageBreak[];         // ordered
}
```

- **Export** uses `fragments`: each visual line `i` of a block sits on
  `fragment.pageIndex` at `fragment.yTop + (i - fromLine) * lineHeight`, and a
  `PageBreak` emits a PDF page break.
- **Editor** uses `breaks`: `leftover` + spacing gives each spacer's height, and
  `atBlockKey` / `breakPos` gives the anchor position; `pageCount` and fragment
  order feed the header/footer page-structure marks currently tracked via
  `offsetCursor`.

Field-level details may be refined during implementation as long as the two
adapters can reconstruct their current outputs.

## Shared classification (moves into the package)

- `SPLITTABLE_BLOCK_TYPES` (`stageDirection`, `dialogue`, `lyrics`, `aside`)
- `ORPHAN_PUSHDOWN_TYPES` (`character`, `scene`)
- `MIN_SPLIT_LINES_BEFORE`, `MIN_SPLIT_LINES_AFTER`, `FIT_EPSILON_PX`
- Helpers `isSplittableBlockType(type)`, `isOrphanCandidateBlockType(type)`

Both adapters classify blocks through these, so the two sides can never drift.
`selectSplitPoint` (already a pure function over `BlockLine[]`) moves into the
core unchanged.

## Adapters

**Editor** (`buildPaginationState` becomes a thin adapter):
- Traverse `view.state.doc`; per script block build a `PaginatorBlock` with
  `height` from `resolveBlockMeasurement`, `getLines` from `buildLineMap`,
  `splittable`/`orphanCandidate` from the shared helpers. `forcedBreak` is
  currently unused in the editor (none passed).
- Run `paginate`; translate `breaks` → spacer `Decoration`s (reusing
  `createSpacerElement`) and derive the page-structure offsets. Measurement,
  caching, and decoration DOM stay in the editor.

**Export** (`transcribeExportPlan` becomes a thin adapter):
- Per block compute `height = spacingBefore + lines*lineHeight + spacingAfter`
  and `getLines` = math (`topRel = spacingBefore + i*lineHeight`,
  `startPos = i`). `forcedBreak` from `plan.pagination.forcedBreaks`.
- Run `paginate`; emit `VisualLine`s at the fragment y-positions and
  `__page_break__` items at each `PageBreak`. Text shaping/wrapping stays in the
  export.

## Metrics (unified from settings)

Both adapters derive identical metrics from `EditorSettings`:
`contentHeight = page.heightPx - marginTopPx - marginBottomPx`,
`topSpacing = marginTopPx`, `bottomSpacing = marginBottomPx`,
`orphanThreshold = 2 * (fontSizePx * lineHeight)`, `minLines* = 2`,
`epsilonPx = 1`.

## Testing

- **Core (unit):** `paginate` cases — non-splittable pushed whole, orphan
  pushdown for `character`/`scene`, split honouring min-lines-before/after,
  relaxed split fallback, forced `new-page`/`odd-page`. Pure inputs, no DOM.
- **Editor (regression):** existing pagination browser tests pass unchanged; add
  a golden check that page boundaries for a sample document are identical before
  and after the refactor. **No visual regression is the hard gate.**
- **Export:** existing `transcribeExportPlan` tests stay green; add tests for the
  newly gained behaviour (a `character` heading near the page bottom is pushed to
  the next page; a non-splittable block is not torn mid-page).
- **Parity:** manual — user confirms the sample script's page-1 block set now
  matches between editor and export.

## Rollout order (for the plan)

1. Create the package; move classification + `selectSplitPoint`; implement
   `paginate` with unit tests replicating current editor behaviour.
2. Refactor the editor to drive the core; confirm pagination tests + golden
   check stay green (no visual regression).
3. Refactor the export to drive the core; add widow/orphan/keep-together tests.
4. Delete the now-duplicated logic from both sides.

## Out of scope

- Changing any break *rule* (only relocating the existing editor rules).
- Music-pill grid alignment (separate follow-up).
- The character highlight-intensity setting (separate spec).
