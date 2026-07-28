# Editor Headers & Footers — Design

Date: 2026-07-01
Status: Approved (pending spec review)

## Goal

Render the configured Headers and Footers inside the editor page view. The
`HeaderFooterSettings` model and its settings panel already exist; this work is
the **editor rendering** only. Export/PDF and the title page are out of scope.

## Requirements (from the request)

- Show header/footer content positioned within each page (in the page margins).
- **Must not shift page content** — it is an overlay, not part of the flow.
- **Not selectable** by cursor.
- **60% lighter** than the editor body text.
- **Cells with `isHiddenInEditor` are not rendered.**
- Numbering is shown on **all pages** (the title page lives only in export).

## Settings model (existing — for reference)

`EditorSettings.headerFooter` = `{ header, footer }`, each a row of
`left` / `center` / `right` `HeaderFooterCellSettings`:
`{ text, isBold, isItalic, isUnderline, isHiddenInEditor }`.

Two cells are **fixed** (only style + editor visibility are user-configurable):

- **header · right** = `{{page}}` — the *page mark* `act-scene-page` (e.g. `I-1-1`).
  Default `isHiddenInEditor: true`.
- **footer · center** = `{{page_number}}` — the *integrated page number*, format
  `#.` (number + dot, e.g. `1.`). Default bold, visible.

Tokens usable in any cell text:

| Token | Resolves to |
|---|---|
| `{{page}}` | page mark `act-scene-page`, e.g. `I-1-1` |
| `{{page_number}}` | integrated page number, format `#.`, e.g. `1.` |
| `{{script_title}}` | script title (fallback `Untitled`) |
| `{{draft_date}}` | resolved draft date (via existing `resolveDraftDate`) |

### Page mark semantics (`{{page}}` = `I-1-1`)

`<roman act>-<global scene>-<global page>`:

- **act** — Roman numeral of the act active at the **start of the page** (first
  block on the page), in document order (I, II, III…).
- **scene** — **global** scene number (1-based across the whole script) active at
  the start of the page. Matches the existing global `sceneIndex` convention.
- **page** — **global** page number (`pageIndex + 1`), same value as the
  integrated page number but without the trailing dot.

Attribution rule: the act/scene are those active at the **first block of the
page** (page top).

### Edge cases (defaults — confirm during review)

- Page starts before the first act, or the script has no acts → **omit the act
  component**, mark becomes `<scene>-<page>` (e.g. `1-1`).
- Page starts before the first scene → scene component is **`1`**.
- These defaults keep the mark readable without special-casing empty scripts.

## Page geometry (verified in code)

- `.canvas` ([EditorCanvas.module.css](../../../packages/editor/src/editor/components/EditorCanvas.module.css))
  is the scroll surface (`position: relative`, page-width, `overflow: auto`) and
  already hosts sibling overlays (`CharacterSuggestionsOverlay`, etc.).
- `.content` (the ProseMirror mount) has `padding = page margins`:
  padding-top = first page's top margin, padding-bottom = last page's bottom
  margin; padding-left/right = horizontal margins for all pages.
- Pagination makes **every page exactly `pageHeight` tall**. Therefore page `i`
  (0-based) occupies the vertical band `[i·pageHeight, (i+1)·pageHeight]` measured
  from `.content`'s border-box top. So:
  - header band of page `i` = `[i·pageHeight, i·pageHeight + marginTop]`
  - footer band of page `i` = `[(i+1)·pageHeight − marginBottom, (i+1)·pageHeight]`
  - horizontal content span = `[marginLeft, pageWidth − marginRight]`
- All required numbers (`pageCount, pageHeight, marginTop, marginBottom,
  marginLeft, marginRight, pageWidth`) are already in `PaginationState`, in the
  same scaled pixels as the rendered `.content` box (both scale by `renderScale`),
  so no manual scale math is needed.

## Approach

A React overlay layer (not pagination widget decorations). It keeps all logic in
React where settings/title/date live, handles first and last pages uniformly,
and does not trigger repagination when header/footer text is edited.

## Components

### 1. Shared logic — `packages/script`

Pure and unit-tested; reusable by a future export path.

- `toRoman(n: number): string` — Arabic → Roman act numeral.
- `resolveHeaderFooterText(text, ctx)` — replaces all tokens.
  `ctx = { scriptTitle, draftDate, pageMark, pageNumber }`. `{{page_number}}`
  is formatted `#.`; `{{page}}` uses the already-built `pageMark` string.
- `buildPageMark({ actIndex, sceneIndex, pageNumber })` — assembles the
  `act-scene-page` string, applying the edge-case rules above.

### 2. Editor hooks — `packages/editor`

- `usePaginationState(editor)` — subscribes to `editor.on('transaction')`, reads
  the current `PaginationState` from the pagination plugin/storage, returns it
  (or `null` when unavailable). Re-renders consumers on pagination change.
- `usePageStructureMarks(editor, pages)` — walks `editor.state.doc` once per
  relevant change, builds a running `(actIndex, sceneIndex)` per block with its
  ProseMirror position, and maps each `pages[i].startPos` to the active
  `{ actIndex, sceneIndex }`. Global page number is `i + 1`.

### 3. Overlay — `packages/editor`

- `HeaderFooterOverlay` — sibling of the other overlays inside `EditorCanvas`.
  Props: `editor`, `canvasRef`, `headerFooter` (settings), `scriptTitle`,
  `draftDate`.
  - Measures `.content`'s top offset and width within the canvas (ref +
    `ResizeObserver`) to anchor the page coordinate origin.
  - For each page `i` in `0..pageCount-1`, renders a header band and a footer
    band at the computed Y bands, each a 3-cell (`left`/`center`/`right`) row
    spanning the content width.
  - Per cell: skip if `isHiddenInEditor` or resolved text is empty; otherwise
    render resolved text with bold/italic/underline.
  - Resolves tokens **per page** (`{{page}}` / `{{page_number}}` vary per page;
    title/date are constant).
- CSS module: `position: absolute`, `pointer-events: none`, `user-select: none`,
  `color: var(--color-text)`, `opacity: 0.6`.

## Data flow

`HeaderFooterOverlay` needs `headerFooter`, `scriptTitle`, and `draftDate`.
`resolvedSettings.headerFooter` is available where `usePaginationSettings` is
wired ([Editor.tsx](../../../packages/editor/src/editor/Editor.tsx)). Threading
`scriptTitle` and `titlePageSettings` (for `resolveDraftDate`) down to
`EditorCanvas` is finalized in the implementation plan.

## Testing

- `packages/script`: unit tests for `toRoman`, `buildPageMark` (including
  no-act / pre-scene edge cases), and `resolveHeaderFooterText` (all tokens,
  format `#.`, missing values).
- `packages/editor`: tests for `usePageStructureMarks` page→(act,scene) mapping
  over a representative doc, and a render test of `HeaderFooterOverlay` asserting
  band positions, `isHiddenInEditor` filtering, and non-selectable styling.

## Out of scope

- Export / PDF rendering of headers & footers.
- Title page rendering.
- Act-level scene reset or per-scene/per-act page reset (numbering is global).
