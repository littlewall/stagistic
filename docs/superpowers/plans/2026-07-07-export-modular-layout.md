# Modular Export View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the placeholder export view into a modular, template-driven export environment whose paginated preview is byte-identical to the exported PDF, starting with a "Basic" template (script as-is + character filter, page-break rules, blank pages).

**Architecture:** The editor's TipTap pagination is the single source of truth. A per-template pure `derive*` function turns ephemeral config into an `ExportPlan` (transformed doc + pagination overrides). An offscreen, clean-mode measure surface renders that plan; a DOM transcriber reads real `VisualLine` coordinates; a Web Worker draws them with jsPDF into a Blob; pdf.js previews that same Blob. Templates compose reusable controlled modules as JSX (A+B).

**Tech Stack:** TipTap v3, React 19, `vite-plus/test` (unit + browser), new deps `jspdf` (worker draw) and `pdfjs-dist` (preview). Vite `?worker` import for the worker. `pdf-lib` is out of scope (later score phase).

## Global Constraints

- **No incremental git commits.** The feature ships as one unit; the user makes the final commit (per CLAUDE.md). Each task ends with a **verification** step, not a commit.
- **Verify with:** `pnpm --filter <pkg> exec tsc --noEmit`, `pnpm --filter <pkg> test run <file>` (unit), and `pnpm --filter <pkg> test:browser run <file>` (browser). `vp lint` is broken repo-wide — do **not** rely on it; use `tsc --noEmit`.
- **Test imports:** `import {describe, it, expect} from "vite-plus/test"`. Browser tests use the `*.browser.test.tsx` suffix.
- **Ephemeral only:** no export config touches the DB. All export state lives in component state.
- **Source of truth:** never re-paginate in the PDF layer. All layout-affecting options are applied upstream (doc transform + pagination overrides) so the measured DOM already reflects them.
- **Clean mode:** the measure surface renders with editor-only decorations disabled; those decorations MUST be layout-neutral (M0 gates this).
- **DB schema:** this plan changes no `packages/db/src/` schema — no migration step.

---

## File Structure

**New package `@stagistic/export`** — pure, framework-agnostic (no React, no DOM, no editor dep):
- `packages/export/package.json` — new workspace package. (create)
- `packages/export/src/index.ts` — public exports. (create)
- `packages/export/src/config.ts` — `BasicExportConfig` + sub-values + `BASIC_DEFAULTS`. (create)
- `packages/export/src/plan.ts` — `ExportPlan`, `PaginationOverrides`, `ForcedBreak`, `BlankPageSentinel`. (create)
- `packages/export/src/scriptData.ts` — `ScriptData`, `ExportCharacter`. (create)
- `packages/export/src/visualLine.ts` — `VisualRun`, `VisualLine`, `PageItem`, `TranscriptResult` (shared with editor + worker). (create)
- `packages/export/src/scenes.ts` — `groupScenes`, `sceneMentionsCharacter` (pure doc helpers). (create)
- `packages/export/src/filterByCharacter.ts` — `filterScriptByCharacter`. (create)
- `packages/export/src/deriveBasicExportPlan.ts` — the Basic template's plan function. (create)
- `packages/export/src/pdf/drawPdf.ts` — jsPDF drawing from `TranscriptResult` → `Blob`. (create)
- `packages/export/src/pdf/fonts.ts` — base64 TTF registration. (create)
- `packages/export/src/pdf/pdf.worker.ts` — worker entry: message → `drawPdf` → Blob. (create)
- `packages/export/src/pdf/renderPdfInWorker.ts` — main-thread client that posts to the worker and resolves a Blob. (create)

**`packages/editor`** — DOM/TipTap pieces:
- `packages/editor/src/editor/export/cleanMode.ts` — clean-mode flag + storage read by decoration extensions. (create)
- `packages/editor/src/editor/export/transcribeSurface.ts` — walk the paginated DOM → `TranscriptResult`. (create)
- `packages/editor/src/editor/export/ExportMeasureSurface.tsx` — offscreen clean paginated surface for an `ExportPlan`. (create)
- `packages/editor/src/editor/tiptap/nodes/CuePill.tsx` + `CuePill.module.css` — audit/fix layout-neutrality (M0). (modify if needed)
- `packages/editor/src/editor/tiptap/marks/CharacterTagMark.ts` — audit layout-neutrality (M0). (modify if needed)
- `packages/editor/src/index.ts` — export the new export/* API. (modify)

**`packages/ui`** — presentational chrome:
- `packages/ui/src/export/ExportPanel.tsx` (+ `.module.css`) — panel + `.Input`/`.Options` sections. (create)

**`packages/app-routes`** — route + wiring:
- `packages/app-routes/src/routes/script/export/ExportProvider.tsx` — context: machinery + artifact state. (create)
- `packages/app-routes/src/routes/script/export/useExportPreview.ts` — debounced, cancellable cycle. (create)
- `packages/app-routes/src/routes/script/export/registry.ts` — `templateId → {label, description, Component, defaults}`. (create)
- `packages/app-routes/src/routes/script/export/TemplatePicker.tsx` — template select. (create)
- `packages/app-routes/src/routes/script/export/ExportControlPanel.tsx` — picker + active template + download. (create)
- `packages/app-routes/src/routes/script/export/ExportPreview.tsx` — pdf.js viewer. (create)
- `packages/app-routes/src/routes/script/export/ExportDownloadButton.tsx` — download the Blob. (create)
- `packages/app-routes/src/routes/script/export/modules/CharacterFilterModule.tsx` — controlled module. (create)
- `packages/app-routes/src/routes/script/export/modules/PageBreakModule.tsx` — controlled module. (create)
- `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.tsx` — controlled module. (create)
- `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx` — composes modules. (create)
- `packages/app-routes/src/routes/script/export/useExportScriptData.ts` — assemble `ScriptData` from workspace. (create)
- `packages/app-routes/src/routes/script/ScriptExportRoute.tsx` — replace placeholder with the shell. (modify)

---

## Milestone M0 — Prerequisite: decorations are layout-neutral

Gates everything. Confirm (and fix) that editor-only decorations add zero layout.

### Task 1: Layout-neutrality guard for character tags and cue pills

**Files:**
- Test: `packages/editor/src/editor/export/decorationNeutrality.browser.test.tsx` (create)
- Modify only if a test fails: `packages/editor/src/editor/tiptap/nodes/CuePill.module.css`, `packages/editor/src/editor/tiptap/marks/CharacterTagMark.ts`

**Interfaces:**
- Consumes: existing editor mount test helpers (find how `cueNode.browser.test.tsx` mounts an editor and reuse that harness).
- Produces: a proven invariant — decorations do not change block height. No exported symbols.

- [ ] **Step 1: Find the existing browser-test editor harness**

Run: `sed -n '1,60p' packages/editor/src/editor/tiptap/nodes/cueNode.browser.test.tsx`
Expected: see how a TipTap editor is mounted in jsdom/browser mode and how nodes are inserted. Reuse that exact mounting approach below (do not invent a new one).

- [ ] **Step 2: Write the failing neutrality test**

Measure a block's height with the decoration active vs. a plain-text equivalent; assert equality (±0.5px tolerance for sub-pixel rounding).

```tsx
import {describe, it, expect} from "vite-plus/test";
// + the mount helper discovered in Step 1

describe("decoration layout-neutrality", () => {
    it("character tag mark adds no height", async () => {
        const {editorEl} = await mountEditorWithContent(/* a dialogue block with a @Character tag */);
        const tagged = editorEl.querySelector<HTMLElement>("[data-block-id='tagged']")!;
        const plain = editorEl.querySelector<HTMLElement>("[data-block-id='plain']")!;
        expect(Math.abs(tagged.getBoundingClientRect().height - plain.getBoundingClientRect().height)).toBeLessThan(0.5);
    });

    it("cue pill adds no height to its line", async () => {
        const {editorEl} = await mountEditorWithContent(/* a block with a cue vs. one without */);
        const withCue = editorEl.querySelector<HTMLElement>("[data-block-id='withCue']")!;
        const withoutCue = editorEl.querySelector<HTMLElement>("[data-block-id='withoutCue']")!;
        expect(Math.abs(withCue.getBoundingClientRect().height - withoutCue.getBoundingClientRect().height)).toBeLessThan(0.5);
    });
});
```

(Replace `data-block-id` with the real block id attribute observed in Step 1's harness output.)

- [ ] **Step 3: Run the test**

Run: `pnpm --filter @stagistic/editor test:browser run decorationNeutrality`
Expected: PASS if decorations are already neutral; FAIL if a decoration inflates height.

- [ ] **Step 4: If FAIL, fix the offending decoration**

Reimplement the offender as layout-neutral: color/weight only for `characterTag`; for `CuePill`, make the frame an overlay (absolutely-positioned pseudo-element or `box-shadow`/outline that does not grow the box, or negative-margin inset), so the pill's box does not add inline width/height to the text flow. Re-run Step 3 until PASS.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @stagistic/editor test:browser run decorationNeutrality`
Expected: PASS. Record in the plan whether any decoration needed a fix.

---

## Milestone M1 — Pure logic (no DOM): types, filter, derive

### Task 2: Scaffold the `@stagistic/export` package + core types

**Files:**
- Create: `packages/export/package.json`, `packages/export/src/index.ts`, `packages/export/src/config.ts`, `packages/export/src/plan.ts`, `packages/export/src/scriptData.ts`, `packages/export/src/visualLine.ts`
- Test: `packages/export/src/config.test.ts`

**Interfaces:**
- Consumes: `ScriptDocument` from `@stagistic/script`; `TitlePageSettings` from `@stagistic/script`.
- Produces (imported by every later task):
  - `BasicExportConfig`, `CharacterFilterValue`, `PageBreakValue`, `BlankPagesValue`, `BlankPageSpec`, `BASIC_DEFAULTS`
  - `ExportPlan`, `PaginationOverrides`, `ForcedBreak` (`{blockId: string; kind: 'new-page' | 'odd-page'}`), `BlankPageSentinel` (`{count: number; countsInNumbering: boolean}`), `ExportPostStep`
  - `ScriptData` (`{doc: ScriptDocument; characters: ExportCharacter[]; scriptTitle: string; titlePage: TitlePageSettings | null}`), `ExportCharacter` (`{id: string; key: string; displayName: string}`)
  - `VisualRun`, `VisualLine`, `PageItem`, `TranscriptResult`

- [ ] **Step 1: Create the package manifest**

Copy the shape of an existing leaf package (e.g. `cat packages/script/package.json`) and adapt:

```json
{
  "name": "@stagistic/export",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "@stagistic/script": "workspace:*",
    "jspdf": "^2.5.2"
  }
}
```

Then run `pnpm install` at the repo root so the workspace links.

- [ ] **Step 2: Write the types**

`config.ts`:
```ts
export interface CharacterFilterValue {
    mode: 'all' | 'only';
    characterIds: string[]; // used when mode === 'only'
}
export interface PageBreakValue {
    actOnNewPage: boolean;
    sceneOnNewPage: boolean;
    sceneOnOddPage: boolean; // implies a new page too
}
export interface BlankPageSpec { count: number; countsInNumbering: boolean; }
export interface BlankPagesValue { betweenTitleAndScript: BlankPageSpec; }
export interface BasicExportConfig {
    characterFilter: CharacterFilterValue;
    pageBreaks: PageBreakValue;
    blankPages: BlankPagesValue;
}
export const BASIC_DEFAULTS: BasicExportConfig = {
    characterFilter: {mode: 'all', characterIds: []},
    pageBreaks: {actOnNewPage: false, sceneOnNewPage: false, sceneOnOddPage: false},
    blankPages: {betweenTitleAndScript: {count: 0, countsInNumbering: false}},
};
```

`plan.ts`:
```ts
import type {ScriptDocument} from '@stagistic/script';

export interface ForcedBreak { blockId: string; kind: 'new-page' | 'odd-page'; }
export interface BlankPageSentinel { count: number; countsInNumbering: boolean; }
export interface PaginationOverrides {
    forcedBreaks: ForcedBreak[];
    blankPagesBeforeScript: BlankPageSentinel;
}
export interface ExportPostStep { kind: string; } // extended later (score merge)
export interface ExportPlan {
    doc: ScriptDocument;
    pagination: PaginationOverrides;
    postSteps: ExportPostStep[];
}
```

`scriptData.ts`:
```ts
import type {ScriptDocument, TitlePageSettings} from '@stagistic/script';

export interface ExportCharacter { id: string; key: string; displayName: string; }
export interface ScriptData {
    doc: ScriptDocument;
    characters: ExportCharacter[];
    scriptTitle: string;
    titlePage: TitlePageSettings | null;
}
```

`visualLine.ts`:
```ts
export interface VisualRun {
    text: string;
    x: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontFamily: string;
}
export interface VisualLine { y: number; runs: VisualRun[]; }
export type PageItem = VisualLine | {type: '__page_break__'};
export interface TranscriptResult {
    pageWidthPx: number;
    pageHeightPx: number;
    marginLeftPx: number;
    marginTopPx: number;
    items: PageItem[];
}
```

`index.ts`: re-export all of the above.

- [ ] **Step 3: Write a smoke test for defaults**

```ts
import {describe, it, expect} from "vite-plus/test";
import {BASIC_DEFAULTS} from "./config";

describe("BASIC_DEFAULTS", () => {
    it("starts with no filter and no forced breaks", () => {
        expect(BASIC_DEFAULTS.characterFilter.mode).toBe('all');
        expect(BASIC_DEFAULTS.pageBreaks.sceneOnOddPage).toBe(false);
        expect(BASIC_DEFAULTS.blankPages.betweenTitleAndScript.count).toBe(0);
    });
});
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/export exec tsc --noEmit` then `pnpm --filter @stagistic/export test run config`
Expected: tsc clean; test PASS.

### Task 3: Scene grouping + character-mention helpers

**Files:**
- Create: `packages/export/src/scenes.ts`
- Test: `packages/export/src/scenes.test.ts`

**Interfaces:**
- Consumes: `ScriptDocument`, `ScriptNode`, `isScriptBlockNode`, `getScriptBlockNodeType`, `getScriptBlockId` from `@stagistic/script`; `extractCharacterKeys`, `normalizeCharacterKey` from `@stagistic/script`; `CHARACTER_TAG_KEY_ATTR`, `CHARACTER_TAG_ID_ATTR` from `@stagistic/script`.
- Produces:
  - `interface SceneGroup {actBlockId: string | null; sceneBlockId: string | null; blocks: ScriptNode[]}`
  - `groupScenes(doc: ScriptDocument): SceneGroup[]` — splits top-level content into groups; a `scene` block starts a new group, an `act` block starts a group with `sceneBlockId = null` and updates the current act.
  - `sceneMentionsCharacter(group: SceneGroup, character: {id: string; key: string}): boolean` — true if any block in the group is a character block or stage direction whose text (via `extractCharacterKeys`) contains the character key, OR carries a `characterTag` mark with matching id/key.

- [ ] **Step 1: Confirm the block node types**

Run: `sed -n '1,80p' packages/script/src/syntax/*.ts | grep -iE "scene|act|character|stageDirection|dialog"`
Expected: the exact `ScriptBlockNodeType` string literals (`'act'`, `'scene'`, `'character'`, `'stageDirection'`, dialogue, …). Use the real literals below.

- [ ] **Step 2: Write failing tests**

```ts
import {describe, it, expect} from "vite-plus/test";
import {groupScenes, sceneMentionsCharacter} from "./scenes";
// build a minimal ScriptDocument with: act, scene A (dialogue mentioning @ALICE), scene B (stage direction mentioning @BOB)

describe("groupScenes", () => {
    it("splits content into act/scene groups", () => {
        const groups = groupScenes(doc);
        expect(groups.map(g => g.sceneBlockId)).toEqual([null, 'sceneA', 'sceneB']); // act group + two scenes
    });
});
describe("sceneMentionsCharacter", () => {
    it("matches a character named in a stage direction", () => {
        const groups = groupScenes(doc);
        expect(sceneMentionsCharacter(groups[2], {id: 'b', key: 'bob'})).toBe(true);
        expect(sceneMentionsCharacter(groups[1], {id: 'b', key: 'bob'})).toBe(false);
    });
});
```

- [ ] **Step 3: Implement `scenes.ts`**

Walk `doc.content`; maintain `currentAct`. On an `act` block push `{actBlockId, sceneBlockId: null, blocks: [block]}` and set `currentAct`. On a `scene` block push a new group. Otherwise append the block to the last group (create an implicit leading group if none). `sceneMentionsCharacter` recurses each block's text (`getNodeTextContent`-style walk) collecting `extractCharacterKeys`, and scans marks for `characterTag` attrs. (Reuse the text-walk pattern from `packages/script/src/characters/characterRefsInScriptDocument.ts`.)

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/export test run scenes`
Expected: PASS.

### Task 4: `filterScriptByCharacter`

**Files:**
- Create: `packages/export/src/filterByCharacter.ts`
- Test: `packages/export/src/filterByCharacter.test.ts`

**Interfaces:**
- Consumes: `groupScenes`, `sceneMentionsCharacter` (Task 3); `CharacterFilterValue`, `ExportCharacter` (Task 2).
- Produces: `filterScriptByCharacter(doc: ScriptDocument, filter: CharacterFilterValue, characters: ExportCharacter[]): ScriptDocument` — when `mode==='all'` returns the doc unchanged (same reference); when `'only'`, keeps scene groups mentioning **any** selected character; keeps an act group only if it retains ≥1 scene after it.

- [ ] **Step 1: Write failing tests**

```ts
import {describe, it, expect} from "vite-plus/test";
import {filterScriptByCharacter} from "./filterByCharacter";

describe("filterScriptByCharacter", () => {
    it("mode 'all' returns the same doc reference", () => {
        expect(filterScriptByCharacter(doc, {mode: 'all', characterIds: []}, chars)).toBe(doc);
    });
    it("keeps only scenes mentioning a selected character", () => {
        const out = filterScriptByCharacter(doc, {mode: 'only', characterIds: ['b']}, chars);
        const ids = out.content.map(n => n.attrs?.id);
        expect(ids).toContain('sceneB');
        expect(ids).not.toContain('sceneA');
    });
    it("drops an act heading whose scenes were all removed", () => {
        const out = filterScriptByCharacter(doc, {mode: 'only', characterIds: ['nobody']}, chars);
        expect(out.content).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Implement**

Map selected `characterIds` → `{id, key}` via `characters`. `groupScenes`, keep scene groups where `sceneMentionsCharacter` matches any selected character. Rebuild `content` by flattening kept groups; drop an act group unless a later kept scene group shares its `actBlockId`. Return `{...doc, content}`.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @stagistic/export test run filterByCharacter`
Expected: PASS.

### Task 5: `deriveBasicExportPlan`

**Files:**
- Create: `packages/export/src/deriveBasicExportPlan.ts`
- Test: `packages/export/src/deriveBasicExportPlan.test.ts`

**Interfaces:**
- Consumes: `filterScriptByCharacter` (Task 4); `groupScenes` (Task 3); `BasicExportConfig` (Task 2); `ExportPlan`, `ForcedBreak` (Task 2); `ScriptData` (Task 2).
- Produces: `deriveBasicExportPlan(config: BasicExportConfig, script: ScriptData): ExportPlan`.

- [ ] **Step 1: Write failing tests**

```ts
import {describe, it, expect} from "vite-plus/test";
import {deriveBasicExportPlan} from "./deriveBasicExportPlan";

describe("deriveBasicExportPlan", () => {
    it("adds a new-page break per scene when sceneOnNewPage", () => {
        const plan = deriveBasicExportPlan(
            {...BASIC_DEFAULTS, pageBreaks: {...BASIC_DEFAULTS.pageBreaks, sceneOnNewPage: true}},
            script,
        );
        expect(plan.pagination.forcedBreaks).toEqual([
            {blockId: 'sceneA', kind: 'new-page'},
            {blockId: 'sceneB', kind: 'new-page'},
        ]);
    });
    it("uses odd-page kind when sceneOnOddPage", () => {
        const plan = deriveBasicExportPlan(
            {...BASIC_DEFAULTS, pageBreaks: {actOnNewPage: false, sceneOnNewPage: true, sceneOnOddPage: true}},
            script,
        );
        expect(plan.pagination.forcedBreaks.every(b => b.kind === 'odd-page')).toBe(true);
    });
    it("carries blank-page spec through", () => {
        const plan = deriveBasicExportPlan(
            {...BASIC_DEFAULTS, blankPages: {betweenTitleAndScript: {count: 2, countsInNumbering: true}}},
            script,
        );
        expect(plan.pagination.blankPagesBeforeScript).toEqual({count: 2, countsInNumbering: true});
    });
});
```

- [ ] **Step 2: Implement**

`filterScriptByCharacter` first. `groupScenes` on the filtered doc. For each act group (when `actOnNewPage`) and scene group (when `sceneOnNewPage`/`sceneOnOddPage`) emit a `ForcedBreak` at the group's heading `blockId` with kind `odd-page` when `sceneOnOddPage` else `new-page`. `blankPagesBeforeScript = config.blankPages.betweenTitleAndScript`. `postSteps: []`.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @stagistic/export test run deriveBasicExportPlan` then `pnpm --filter @stagistic/export exec tsc --noEmit`
Expected: PASS; tsc clean.

---

## Milestone M2 — Render pipeline (DOM → PDF Blob → preview)

> These tasks are measurement-dependent. The interfaces and test scaffolds are exact; the intra-line coordinate math is written to the scriptio pattern (walk text ranges, read `getBoundingClientRect`, `PX_TO_PT = 72/96`) and **tuned against real measurements** during implementation. Where a numeric constant can only be confirmed in-browser, the step says so explicitly — that is tuning, not a placeholder.

### Task 6: Clean-mode flag wired into decoration rendering

**Files:**
- Create: `packages/editor/src/editor/export/cleanMode.ts`
- Modify: the character-tag and cue-pill rendering to honor the flag
- Test: `packages/editor/src/editor/export/cleanMode.browser.test.tsx`

**Interfaces:**
- Consumes: TipTap extension storage API.
- Produces: `CLEAN_MODE_ATTR = 'data-export-clean'` on the editor root, and a helper `isCleanMode(view): boolean`. When clean mode is on, `characterTag` renders as a plain `span` (no identity class → no color chip) and `CuePill` renders text-only (no frame). Layout is unchanged (guaranteed by M0), only ornaments vanish.

- [ ] **Step 1: Discover how extensions read a per-editor flag**

Run: `mcp__codegraph__codegraph_context "how editor extensions read a per-instance option or editorProps attribute; useEditorExtensions builder"` — reuse that mechanism (editorProps `attributes` or an extension option), don't invent one.

- [ ] **Step 2: Write the failing test**

Mount an editor in clean mode with a tagged character + a cue; assert the identity class / cue-frame element is absent while the text content and block heights are identical to non-clean.

- [ ] **Step 3: Implement the flag + conditional rendering**

Add `data-export-clean="true"` to the surface root via editorProps; in `CharacterTagMark.renderHTML` and `CuePill`, when the root is clean, drop the ornament class/frame but keep text. (Because ornaments are layout-neutral, dropping them cannot shift layout.)

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/editor test:browser run cleanMode`
Expected: PASS (ornaments absent, text + heights unchanged).

### Task 7: `transcribeSurface` — DOM → `TranscriptResult`

**Files:**
- Create: `packages/editor/src/editor/export/transcribeSurface.ts`
- Test: `packages/editor/src/editor/export/transcribeSurface.browser.test.tsx`

**Interfaces:**
- Consumes: a mounted, paginated editor root element; `VisualLine`, `VisualRun`, `PageItem`, `TranscriptResult` from `@stagistic/export`; the pagination page-break widget class (find it — see Step 1).
- Produces: `transcribeSurface(root: HTMLElement): TranscriptResult`.

- [ ] **Step 1: Find the page-break widget marker + page geometry source**

Run: `grep -rniE "page-break|pagination-page-break|decoration" packages/editor/src/editor/tiptap/extensions/pagination | head`
Expected: the exact class name of the page-break widget (scriptio uses `.pagination-page-break`). Also confirm where page width/height/margins live at runtime (the `PaginationStorage.state`). Use these real values.

- [ ] **Step 2: Write the failing test**

```tsx
import {describe, it, expect} from "vite-plus/test";
import {transcribeSurface} from "./transcribeSurface";

describe("transcribeSurface", () => {
    it("emits page-break sentinels at the editor's page breaks", async () => {
        const {root} = await mountPaginatedEditor(/* content long enough to span 2 pages */);
        const result = transcribeSurface(root);
        const breaks = result.items.filter(i => (i as {type?: string}).type === '__page_break__');
        expect(breaks).toHaveLength(1); // one break between two pages
    });
    it("emits runs with monotonically increasing y within a page", async () => {
        const {root} = await mountPaginatedEditor(/* a few lines */);
        const {items} = transcribeSurface(root);
        const ys = items.filter((i): i is {y: number; runs: unknown[]} => 'y' in i).map(i => i.y);
        expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    });
});
```

- [ ] **Step 3: Implement per the scriptio pattern**

Walk text nodes under `root` with a TreeWalker; for each text node use `Range` + `getClientRects()` to split into visual lines; group characters into `VisualRun`s of constant computed style (`getComputedStyle` for weight/style/decoration/font-family); record `x`/`y` relative to the page content box. Detect the page-break widget class from Step 1 and emit a `{type:'__page_break__'}` sentinel where it appears (splitting a block across pages if the widget sits mid-block, as scriptio does with `compareDocumentPosition`). Read page geometry from the pagination storage/state. **Tuning:** confirm the coordinate origin (page content box vs. root) in-browser so `x`/`y` match what the PDF page expects.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/editor test:browser run transcribeSurface`
Expected: PASS.

### Task 8: `drawPdf` + fonts (jsPDF, pure)

**Files:**
- Create: `packages/export/src/pdf/drawPdf.ts`, `packages/export/src/pdf/fonts.ts`
- Test: `packages/export/src/pdf/drawPdf.test.ts`

**Interfaces:**
- Consumes: `TranscriptResult`, `PageItem`, `VisualLine` (Task 2); `jspdf`.
- Produces: `drawPdf(transcript: TranscriptResult, opts: {blankPagesBeforeScript: number}): Blob` and `registerFonts(doc: jsPDF): void`.

- [ ] **Step 1: Identify the editor's font faces**

Run: `grep -rniE "font-family|@font-face|\.ttf|\.woff" packages/editor/src apps/web/src | grep -iv node_modules | head`
Expected: the script font family + files. Package those TTFs as base64 in `fonts.ts` (or import the existing font assets). List each `{family, style, base64}` used by `registerFonts`.

- [ ] **Step 2: Write the failing test**

```ts
import {describe, it, expect} from "vite-plus/test";
import {drawPdf} from "./drawPdf";

describe("drawPdf", () => {
    it("returns a non-empty PDF blob", () => {
        const blob = drawPdf(sampleTranscript, {blankPagesBeforeScript: 0});
        expect(blob.type).toBe('application/pdf');
        expect(blob.size).toBeGreaterThan(0);
    });
    it("adds a page per __page_break__ plus leading blank pages", () => {
        // spy on jsPDF addPage via a small wrapper, or assert page count through pdf bytes helper
        const blob = drawPdf(twoPageTranscript, {blankPagesBeforeScript: 2});
        expect(pdfPageCount(blob)).toBe(4); // 2 blank + 2 content
    });
});
```

- [ ] **Step 3: Implement**

`new jsPDF` sized from `transcript.pageWidthPx/heightPx * PX_TO_PT`. `registerFonts`. Emit `blankPagesBeforeScript` empty pages first. Iterate `items`: on `__page_break__` call `addPage()`; on a `VisualLine`, for each run `doc.setFont(family, styleFrom(run))` and `doc.text(run.text, run.x * PX_TO_PT, run.y * PX_TO_PT, {baseline: 'top'})`. Underline via a drawn line under the run's measured width. Return `doc.output('blob')`. **Tuning:** baseline handling (`'top'` vs. ascent offset) confirmed against a visual diff with the editor.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/export test run drawPdf`
Expected: PASS.

### Task 9: Worker + main-thread client

**Files:**
- Create: `packages/export/src/pdf/pdf.worker.ts`, `packages/export/src/pdf/renderPdfInWorker.ts`
- Test: `packages/export/src/pdf/renderPdfInWorker.browser.test.ts`

**Interfaces:**
- Consumes: `drawPdf` (Task 8); `TranscriptResult` (Task 2).
- Produces:
  - Worker message contract: `{type:'START', transcript: TranscriptResult, blankPagesBeforeScript: number}` → `{type:'DONE', blob: Blob}` | `{type:'ERROR', message: string}`.
  - `renderPdfInWorker(transcript: TranscriptResult, opts: {blankPagesBeforeScript: number}, signal?: AbortSignal): Promise<Blob>` — spins up (or reuses) the worker, resolves the Blob, rejects on `signal` abort or worker error.

- [ ] **Step 1: Write the worker**

```ts
import {drawPdf} from "./drawPdf";
self.onmessage = (e: MessageEvent) => {
    if (e.data?.type !== 'START') return;
    try {
        const blob = drawPdf(e.data.transcript, {blankPagesBeforeScript: e.data.blankPagesBeforeScript});
        (self as unknown as Worker).postMessage({type: 'DONE', blob});
    } catch (err) {
        (self as unknown as Worker).postMessage({type: 'ERROR', message: String(err)});
    }
};
```

- [ ] **Step 2: Write the client + failing test**

Client uses Vite worker import: `new Worker(new URL('./pdf.worker.ts', import.meta.url), {type: 'module'})`. Wire `signal` to terminate/reject.

```ts
import {describe, it, expect} from "vite-plus/test";
import {renderPdfInWorker} from "./renderPdfInWorker";

describe("renderPdfInWorker", () => {
    it("resolves a pdf blob", async () => {
        const blob = await renderPdfInWorker(sampleTranscript, {blankPagesBeforeScript: 0});
        expect(blob.type).toBe('application/pdf');
    });
    it("rejects when aborted", async () => {
        const ctrl = new AbortController();
        const p = renderPdfInWorker(sampleTranscript, {blankPagesBeforeScript: 0}, ctrl.signal);
        ctrl.abort();
        await expect(p).rejects.toThrow();
    });
});
```

- [ ] **Step 3: Implement the client to pass**

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/export test:browser run renderPdfInWorker`
Expected: PASS.

### Task 10: `ExportMeasureSurface` — offscreen clean paginated surface

**Files:**
- Create: `packages/editor/src/editor/export/ExportMeasureSurface.tsx`
- Modify: `packages/editor/src/index.ts` (export it + `transcribeSurface`)
- Test: `packages/editor/src/editor/export/ExportMeasureSurface.browser.test.tsx`

**Interfaces:**
- Consumes: `ExportPlan` (`@stagistic/export`); the editor extensions builder + `EditorSurfaceCache` pattern (`useScriptEditorInstance`); `transcribeSurface` (Task 7); clean-mode flag (Task 6).
- Produces: `<ExportMeasureSurface plan={ExportPlan} settings={ResolvedScriptSettings} onTranscript={(t: TranscriptResult) => void} />` — mounts an offscreen (`position:absolute; visibility:hidden`, but **laid out** with correct width), clean-mode, read-only paginated editor of `plan.doc` with `plan.pagination` forced breaks applied; after pagination settles it calls `transcribeSurface` and reports the result.

- [ ] **Step 1: Find how forced page breaks are injected into pagination**

Run: `mcp__codegraph__codegraph_context "pagination forced break, manual page break decoration, how a block forces a new page in the pagination extension"`
Expected: whether the pagination extension already supports a per-block "break before" or needs a small extension. If absent, add a minimal `forcedBreaks` option to the pagination plugin that inserts a break decoration before the given block ids (and, for `odd-page`, an extra blank-page spacer when the block would land on an even page). Cover this with a unit test in the pagination suite.

- [ ] **Step 2: Write the failing test**

Mount `ExportMeasureSurface` with a 2-scene plan + `sceneOnNewPage`; assert `onTranscript` fires and the transcript has a page-break sentinel before the second scene's first line.

- [ ] **Step 3: Implement**

Reuse `useScriptEditorInstance` (its own cache, keyed by `plan.doc` + overrides signature) with the read-only + clean-mode + forced-breaks extensions; render offscreen; on pagination-settled (reuse the editor's settle signal used by the surface-cache work) run `transcribeSurface(root)` and call `onTranscript`.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stagistic/editor test:browser run ExportMeasureSurface`
Expected: PASS.

---

## Milestone M3 — Shell, modules, template, route

### Task 11: `ExportPanel` presentational chrome

**Files:**
- Create: `packages/ui/src/export/ExportPanel.tsx`, `packages/ui/src/export/ExportPanel.module.css`
- Modify: `packages/ui/src/index.ts` (export)
- Test: `packages/ui/src/export/ExportPanel.browser.test.tsx`

**Interfaces:**
- Produces: `ExportPanel` with compound `ExportPanel.Input` and `ExportPanel.Options` — each renders a titled `<section>` (heading + slot). Pure layout; no state.

- [ ] **Step 1: Write the failing test** — render `<ExportPanel><ExportPanel.Input><div id="a"/></ExportPanel.Input><ExportPanel.Options><div id="b"/></ExportPanel.Options></ExportPanel>`; assert both children present under headed sections "Input" / "Options".
- [ ] **Step 2: Implement** the compound component (match existing settings-panel section styling from `packages/app-routes/.../settings/shared.module.css`).
- [ ] **Step 3: Verify** — `pnpm --filter @stagistic/ui test:browser run ExportPanel` → PASS.

### Task 12: The three controlled modules

**Files:**
- Create: `.../export/modules/CharacterFilterModule.tsx`, `PageBreakModule.tsx`, `BlankPagesModule.tsx`
- Test: one `.../export/modules/modules.browser.test.tsx`

**Interfaces:**
- Produces (all controlled, `value` + `onChange`, no internal persistence):
  - `CharacterFilterModule({value: CharacterFilterValue; onChange; characters: ExportCharacter[]})`
  - `PageBreakModule({value: PageBreakValue; onChange})` — `sceneOnOddPage` toggling on also forces `sceneOnNewPage` true and disables its checkbox.
  - `BlankPagesModule({value: BlankPagesValue; onChange})` — count stepper + "counts toward numbering" toggle.

- [ ] **Step 1: Write failing tests** — for each module, render with a value, fire a control change, assert `onChange` called with the exact next value (e.g. toggling odd-page yields `{actOnNewPage:false, sceneOnNewPage:true, sceneOnOddPage:true}`).
- [ ] **Step 2: Implement** the three modules using existing UI controls (reuse the settings panel's checkbox/select components; find them under `packages/ui/src` or the settings folder).
- [ ] **Step 3: Verify** — `pnpm --filter @stagistic/app-routes test:browser run modules` → PASS.

### Task 13: `ExportProvider` + `useExportPreview`

**Files:**
- Create: `.../export/ExportProvider.tsx`, `.../export/useExportPreview.ts`
- Test: `.../export/useExportPreview.browser.test.tsx`

**Interfaces:**
- Consumes: `ExportMeasureSurface`/`transcribeSurface` (editor); `renderPdfInWorker` (export); `ScriptData`.
- Produces:
  - `ExportProvider` context value: `{script: ScriptData; artifact: Blob | null; status: 'idle'|'regenerating'|'error'; setArtifact; setStatus; requestMeasure(plan): Promise<TranscriptResult>}` — owns the measure-surface handle and artifact/status state; does not run the cycle itself.
  - `useExportPreview({config, derive, onArtifact})` — on `config` change: debounce (300ms), `derive(config, script)`, `requestMeasure(plan)`, `renderPdfInWorker(transcript, {blankPagesBeforeScript: plan.pagination.blankPagesBeforeScript.count})`, set status/artifact; each run aborts the previous via `AbortController`.

- [ ] **Step 1: Write failing tests** — changing config twice quickly yields exactly one artifact for the latest config (debounce + cancel); an error in derive/render sets status `'error'` without clearing the previous artifact.
- [ ] **Step 2: Implement** the provider (holds machinery + state) and the hook (drives the debounced, cancellable cycle).
- [ ] **Step 3: Verify** — `pnpm --filter @stagistic/app-routes test:browser run useExportPreview` → PASS.

### Task 14: Registry + `BasicExportTemplate` + `TemplatePicker`

**Files:**
- Create: `.../export/registry.ts`, `.../export/templates/BasicExportTemplate.tsx`, `.../export/TemplatePicker.tsx`
- Test: `.../export/registry.test.ts`, `.../export/BasicExportTemplate.browser.test.tsx`

**Interfaces:**
- Consumes: modules (Task 12); `useExportPreview` (Task 13); `deriveBasicExportPlan`, `BasicExportConfig`, `BASIC_DEFAULTS` (export pkg).
- Produces:
  - `type ExportTemplateComponent = () => JSX.Element` (reads `ExportProvider` context for `script`; owns its own config `useState`).
  - `EXPORT_TEMPLATES: Record<string, {label: string; description: string; Component: ExportTemplateComponent; defaults: unknown}>` with one entry `basic`.
  - `TemplatePicker({value, onChange})`.

- [ ] **Step 1: Write failing tests** — registry has `basic` with a `Component` and `defaults`; rendering `BasicExportTemplate` shows the character-filter, page-break, and blank-pages modules under Input/Options.
- [ ] **Step 2: Implement** `BasicExportTemplate` exactly as in the spec (owns `useState<BasicExportConfig>`, calls `useExportPreview`, composes modules into `ExportPanel.Input/.Options`); registry; picker.
- [ ] **Step 3: Verify** — `pnpm --filter @stagistic/app-routes test run registry` + `test:browser run BasicExportTemplate` → PASS.

### Task 15: `ExportPreview` (pdf.js) + `ExportDownloadButton`

**Files:**
- Create: `.../export/ExportPreview.tsx`, `.../export/ExportDownloadButton.tsx`
- Modify: add `pdfjs-dist` to `packages/app-routes/package.json`
- Test: `.../export/ExportPreview.browser.test.tsx`

**Interfaces:**
- Consumes: `ExportProvider` context (`artifact`, `status`).
- Produces: `ExportPreview` renders the `artifact` Blob with pdf.js into scrollable page canvases + page-nav/zoom; shows a non-blanking overlay while `status==='regenerating'`, an empty state when there are no pages, and an inline error when `status==='error'`. `ExportDownloadButton` downloads the current `artifact` (reuse the anchor-download pattern from `downloadStagistic.ts`) as `<title>.pdf`, disabled when `artifact` is null.

- [ ] **Step 1: Write failing tests** — given an `artifact` Blob, `ExportPreview` renders ≥1 page canvas; with `status==='regenerating'` the overlay is present but the previous canvas remains; download button disabled when artifact null.
- [ ] **Step 2: Implement** using `pdfjs-dist` (`getDocument(await blob.arrayBuffer())`, render each page to a `<canvas>`); configure the pdf.js worker via Vite (`?url` worker asset).
- [ ] **Step 3: Verify** — `pnpm --filter @stagistic/app-routes test:browser run ExportPreview` → PASS.

### Task 16: `useExportScriptData` + wire `ScriptExportRoute`

**Files:**
- Create: `.../export/useExportScriptData.ts`, `.../export/ExportControlPanel.tsx`
- Modify: `.../script/ScriptExportRoute.tsx`
- Test: `.../script/ScriptExportRoute.browser.test.tsx` (extend the existing file)

**Interfaces:**
- Consumes: `useScriptWorkspace` (current script, doc, characters, settings, title, title page); `ExportProvider`, `ExportControlPanel`, `ExportPreview`, `EXPORT_TEMPLATES`.
- Produces: `useExportScriptData(): ScriptData` (assembles doc + `ExportCharacter[]` + title + title page from the workspace); `ExportControlPanel` (picker + active `Component` + `ExportDownloadButton`); the wired route.

- [ ] **Step 1: Write the failing route test** — mounting `ScriptExportRoute` for a script renders the control panel (template picker showing "Basic") and a preview region; switching template resets config.
- [ ] **Step 2: Implement** `useExportScriptData` (map confirmed character records → `ExportCharacter`), assemble the shell exactly as the spec's component tree (`ExportProvider` → `AppLayout` header `activeView="export"` → `ExportControlPanel` + `ExportPreview` + `ExportMeasureSurface`), replacing the placeholder body.
- [ ] **Step 3: Verify** — `pnpm --filter @stagistic/app-routes test:browser run ScriptExportRoute` → PASS.

### Task 17: End-to-end fidelity guard

**Files:**
- Test: `.../export/exportFidelity.browser.test.tsx` (create)

**Interfaces:**
- Consumes: the full pipeline (route/provider or `ExportMeasureSurface` + `transcribeSurface` + `renderPdfInWorker`).

- [ ] **Step 1: Write the guard test** — render a known multi-page script through the export pipeline; assert (a) the number of `__page_break__` sentinels from `transcribeSurface` equals `pdfPageCount(blob) - blankPagesBeforeScript - 1`, and (b) enabling `sceneOnNewPage` increases the sentinel count by (#scenes − first-on-page). This locks the editor == export invariant.
- [ ] **Step 2: Run and fix** until PASS.
- [ ] **Step 3: Full verification**

Run: `pnpm --filter @stagistic/export test run && pnpm --filter @stagistic/export test:browser run && pnpm --filter @stagistic/editor test:browser run export && pnpm --filter @stagistic/app-routes test:browser run export` then `tsc --noEmit` in each touched package.
Expected: all green; tsc clean on touched files.

---

## Self-Review

**Spec coverage:**
- Editor-pagination source of truth → M0 + Task 7 + Task 10 + Task 17. ✅
- Clean render mode (decorations excluded, layout-neutral) → M0 (Task 1) + Task 6. ✅
- DOM-transcription → jsPDF worker → pdf.js preview → Tasks 7, 8, 9, 15. ✅
- A+B modularity (modules composed by a template component) → Tasks 11, 12, 14. ✅
- Options as upstream doc-transform + pagination overrides (filter, new/odd page, blank pages) → Tasks 3, 4, 5, 10. ✅
- Ephemeral config, template switch resets defaults → Tasks 13, 14. ✅
- Layout (single panel + dominant preview + offscreen measure surface) → Tasks 11, 15, 16. ✅
- Debounced, cancellable regen + preview states → Tasks 13, 15. ✅
- Registry, new template = one file → Task 14. ✅
- Score/`pdf-lib` explicitly out of scope → no task (correct). ✅

**Type consistency:** `ExportPlan.pagination.blankPagesBeforeScript` is a single `BlankPageSentinel` (used identically in Tasks 5, 8, 9, 13). `ForcedBreak.kind` is `'new-page' | 'odd-page'` throughout (Tasks 2, 5, 10). `CharacterFilterValue.mode` is `'all' | 'only'` (Tasks 2, 4, 12). `TranscriptResult` fields identical across Tasks 7, 8, 9.

**Open tuning (not placeholders — resolved in-browser during the named steps):** transcription coordinate origin (Task 7 Step 3), jsPDF baseline handling (Task 8 Step 3), font asset packaging (Task 8 Step 1), whether pagination already supports forced breaks (Task 10 Step 1). Each is a concrete investigation inside its task, not deferred work.
