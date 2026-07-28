# Export title page — design

**Date:** 2026-07-08
**Status:** Approved for planning

## Goal

Render a title page as the first page of the exported script PDF, laid out
faithfully to the NMI *Format Guidelines 2024* p.73 reference, driven entirely
by the title-page settings already stored in the DB.

## Context / current state

The title-page data model and persistence already exist:

- `TitlePageSettings` (`packages/script/src/titlePage/types.ts`):
  `subtitle`, `credits: {credit, authors[]}[]`, `source`, `draftDateMode`,
  `draftDate`, `dateFormat`, `contact`, `copyright`.
- DB layer (`packages/db/src/repo/titlePage.ts`, `queries/scripts/titlePageFields.ts`)
  and the editor settings panel (`TitlePageSettingsPanel.tsx`).
- `ScriptData.titlePage` and `ScriptData.scriptTitle` are already carried into export.

The export pipeline:

```
deriveBasicExportPlan(config, script)  → ExportPlan (doc, pagination, postSteps)
transcribeExportPlan(plan, settings)   → TranscriptResult { pageWidthPx, pageHeightPx,
                                                            marginLeftPx, marginTopPx, items }
renderPdfInWorker(transcript, opts)    → Blob   (drawPdf via jsPDF, in a worker)
ExportPreview                          → renders the Blob with pdf.js
```

`TranscriptResult.items` is a flat `PageItem[]` = `VisualLine`
(`{y, runs:[{text,x,fontSizePx,bold,italic,underline,fontFamily}]}`) or
`{type:'__page_break__'}`. `drawPdf` walks the items with jsPDF, one `addPage`
per break.

**The title page is not rendered anywhere today** — nothing turns
`ScriptData.titlePage` into transcript items. `config.blankPages.betweenTitleAndScript`
already anticipates it.

Export currently has **no page numbering / header-footer**, so title-page number
suppression is out of scope.

## Decisions

- **Typeface:** Courier Prime — the same embedded TTF the script body uses
  (`packages/export/src/pdf/fonts.ts`). It covers Latin + diacritics, which the
  jsPDF core fonts (WinAnsi) do not. Title-page runs must carry a `fontFamily`
  containing `"Courier"` so `drawPdf` selects the embedded TTF, not core Courier.
- **Inclusion:** always render the title page as page 1 (minimum: the script
  title, falling back to `"Untitled"`). No new toggle.
- **Layout:** faithful to NMI p.73.

## Layout (NMI p.73)

Same coordinate space (CSS px) as the script transcript. Page box + margins from
`settings.page`.

**Top-anchored group** (fractions of page height from the top):

- **Title** — centered, upper third (~28% down). Courier Prime, bold, larger
  than body (title emphasis).
- **Subtitle** — centered, directly below the title, body size, only if present.
- **Credits** — centered, ~48% down. One line per credit:
  `"{credit} {authors joined by ', '}"` (e.g. `written by Jane Doe, John Smith`).
  Order preserved as stored. No wrapping (single line per credit).
- **Source** — centered, below credits, italic, only if present.

**Bottom-anchored group** (measured up from the bottom margin):

- **Contact** — right-aligned, italic, bottom-right. Multi-line (split on `\n`).
- **Draft date** — left-aligned, bottom-left. Formatted per `dateFormat`
  (`auto` → today; `manual` → `draftDate`).
- **Copyright** — centered, near the bottom, only if present.

Centering in mono: `x = (pageWidthPx − charCount·charWidthPx) / 2`.
Right align: `x = pageWidthPx − marginRightPx − textWidthPx`.
Left align: `x = marginLeftPx`. `charWidthPx = fontSizePx · CHAR_WIDTH_EM`
(reuse the constant from `transcribeExportPlan`).

## Components

### 1. `buildTitlePageItems` (new)

`packages/export/src/titlePage/buildTitlePageItems.ts`

```ts
buildTitlePageItems(
  titlePage: TitlePageSettings | null,
  scriptTitle: string,
  settings: EditorSettings,
): VisualLine[]
```

Pure function: settings + data → absolutely-positioned `VisualLine[]` for one
page, implementing the layout above. No page break inside; the caller appends
the break. Independently unit-testable.

### 2. `ExportPlan` extension

`packages/export/src/plan.ts` — add `titlePage: TitlePageSettings | null` and
`scriptTitle: string`. `deriveBasicExportPlan` copies them from `ScriptData`.
This keeps "plan → transcript" self-contained (matches existing
`transcribeExportPlan.test.ts` boundary).

### 3. `transcribeExportPlan` wiring

Prepend to the emitted items:

```
[...titleItems, PAGE_BREAK, ...(PAGE_BREAK × blankPagesBeforeScript.count), ...scriptItems]
```

The prepended breaks are pushed as raw `PAGE_BREAK_ITEM`s (not via the internal
`pushBreak`, whose consecutive-break collapsing is only for odd-page blanks and
would eat intentional blank pages).

### 4. Blank-page relocation

Remove the `blankPagesBeforeScript` special path from `drawPdf`
(`packages/export/src/pdf/drawPdf.ts`), `pdf.worker.ts`, and `renderPdfInWorker`.
Blank pages become ordinary page breaks in the transcript. Result: uniform model
— page 1 = title, then N blanks, then script — and simpler `drawPdf`.

## Testing

- Unit tests for `buildTitlePageItems`:
  - title centering + fallback to `"Untitled"`
  - credit line assembly with single vs multiple authors (comma-joined)
  - bottom anchoring of contact / date / copyright
  - optional fields omitted when empty (subtitle, source, copyright)
  - draft date `auto` vs `manual`, both `dateFormat`s
- Update `transcribeExportPlan.test.ts` for the new prepended title + blank
  pages and the `ExportPlan` shape.

## Out of scope

- Page numbering / header-footer on the title page (export has none yet).
- An include-title-page toggle (decided: always).
- Credit line wrapping (single line per credit for now).
