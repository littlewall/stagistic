# Export Contents Initial Page Design

## Goal

Add `Contents` as the second initial-page type, after Characters and Places. It
lists the script's structure with the page where each item starts, in one of
three variants: scenes, musical numbers, or both nested together.

The visual reference is the Musical Numbers page of the
[NMI Format Guidelines 2024](https://nmi.org/wp-content/uploads/2024/01/Format-Guidelines-2024.pdf).
Stagistic keeps the centered act headings and the right-hand number columns but
drops the dot leaders, moves the singers onto their own smaller line below the
title, and attaches scene and music numbers directly to their titles the way the
editor does.

This is export layout and metadata consumption only. `SCRIPT_DOCUMENT_SCHEMA_VERSION`
does not change.

## Terminology

- **Contents page:** an initial page of type `contents`. One logical page that
  may overflow onto further physical pages.
- **Variant:** which of the three listings the page renders.
- **Script page number:** the number `transcribeExportPlan` assigns to a
  generated script page, the same value `{{page_number}}` resolves to in the
  footer. It never counts the title page, initial pages, or blanks.
- **Integrated page number:** the number `drawPdf` stamps on a page of the
  Integrated score PDF, counting generated script pages and inserted score pages
  but not front matter.
- **Singer:** a character or character group credited under a music title,
  derived from the lyrics blocks inside that music.

## Decisions

These were settled during brainstorming and are not open in implementation:

1. Music numbers come from `formatMusicNumber` — the same scene-scoped label the
   editor shows (`2)`, `2.A)`). When a global numbering setting is added later,
   the Contents page inherits it for free.
2. Only `mode === 'open'` music is listed. Hits are point cues with no duration
   and no score attachment.
3. A music is labelled `Instrumental` when `kind === 'instrumental'`, or when it
   contains no lyrics block.
4. The `score` column exists only in the Integrated score template. The Basic
   template never simulates integrated pagination.
5. Scenes are numbered continuously across acts, matching
   `SceneNumberingExtension` in the editor and `buildStructureMarks` in the
   export.
6. Page headings follow the variant: `SCENES`, `MUSICAL NUMBERS`,
   `SCENES AND MUSICAL NUMBERS`.
7. Contents renders after Characters and Places.
8. Singers are ordered by lyrics-block count, descending.
9. Characters that sing but are not confirmed in the catalog are included.
10. The column header is `script` in every variant and both templates. The
    Integrated score template adds a second column headed `score`.
11. Scene and music numbers are attached to their titles, not held in a separate
    left column.
12. When the page has nothing to list, it is omitted entirely.

## Configuration

```ts
export type ContentsVariant =
    | 'scenes'
    | 'musical-numbers'
    | 'scenes-and-musical-numbers';

export interface ContentsValue {
    enabled: boolean,
    variant: ContentsVariant,
}

export interface InitialPagesValue {
    startEachInitialPageOnOddPage: boolean,
    showPageNumbers: boolean,
    charactersAndPlaces: CharactersAndPlacesValue,
    contents: ContentsValue,
}
```

Added to `BASIC_DEFAULTS.initialPages`, and cloned in `INTEGRATED_SCORE_DEFAULTS`
alongside the existing nested objects:

```ts
contents: {
    enabled: true,
    variant: 'scenes-and-musical-numbers',
},
```

Export configuration stays ephemeral; nothing is persisted.

## Plan Types

`ContentsInitialPagePlan` joins the `InitialPagePlan` union in
`packages/export/src/plan.ts`. It is semantic only: structure, titles, singers,
and the block ids page numbers will later be resolved from. No page numbers, no
coordinates.

```ts
export interface ContentsMusicEntry {
    musicId: string,
    /** Script-facing label from formatMusicNumber, e.g. "2)" or "2.A)". */
    number: string,
    title: string,
    /** Display names, group duplicates already removed. Empty when instrumental. */
    singers: string[],
    isInstrumental: boolean,
    startBlockId: string,
}

export interface ContentsSceneEntry {
    sceneNumber: number,
    title: string,
    startBlockId: string,
    music: ContentsMusicEntry[],
}

export interface ContentsActGroup {
    /** Null when the script has no act blocks. */
    name: string | null,
    /** Music placed inside the act but before its first scene, e.g. an overture. */
    preSceneMusic: ContentsMusicEntry[],
    scenes: ContentsSceneEntry[],
}

export interface ContentsInitialPagePlan {
    kind: 'contents',
    variant: ContentsVariant,
    acts: ContentsActGroup[],
    showScoreColumn: boolean,
}

export type InitialPagePlan =
    | CharactersAndPlacesInitialPagePlan
    | ContentsInitialPagePlan;
```

The page heading is derived from `variant` at render time rather than stored, so
the two cannot drift apart.

One structure serves all three variants. The `musical-numbers` renderer flattens
each act's `preSceneMusic` and its scenes' `music` into a single list; the
`scenes` renderer ignores `music` entirely.

`deriveBasicExportPlan` builds the plan with `showScoreColumn: false` and appends
it after the Characters and Places entry.
`deriveIntegratedScoreExportPlan` replaces that entry with a copy whose
`showScoreColumn` is `true`.

## Derivation

All input comes from `ScriptData` as it exists today — `doc`, `characters`,
`groups`. No new `ScriptData` fields, no new live queries. The document walked is
`filteredDoc`, so the character filter is applied once, at derivation, and never
again downstream.

### Act and scene grouping

Walk `plan.doc.content` once, tracking the current act block and current scene
block, exactly as `buildScriptBlockIndex` does. Act names use
`normalizeActName(actBlock.text) || getDefaultActName(n)`, matching
`buildScriptStructureOutline`. Scene titles use the scene block's text, or
`Untitled scene` when it is empty. Scene numbers increment globally and never
reset per act.

A script with no act blocks produces one `ContentsActGroup` with `name: null`,
and the renderer draws no act heading.

Music is attached to the act and scene its start block physically sits in, taken
from the same walk — **not** from `DerivedMusic.sceneNumber`. `sceneNumber` is a
global counter that only advances on scene blocks, so music placed between an
act block and that act's first scene would otherwise be filed under a scene in
the previous act. Such music goes into `preSceneMusic` of its own act.

The music label itself still comes from `formatMusicNumber(derivedMusic)`, so it
matches what the script prints, including the previous scene's ordinal in that
pre-scene case.

### Singers

Precompute, for every block index, the cue keys in effect: the
`characterRefs` of the nearest preceding `character` block, reset to empty at
every `act` and `scene` block. This handles the normal
`character → aside → lyrics` shape and multi-name cues such as `KYLIE AND SHANE`,
which `extractCharacterKeys` already splits.

For each open music, walk the block range from `startBlockId` to
`effectiveEndBlockId` inclusive and, for every `lyrics` block, increment a count
for each cue key in effect.

Resolve each key to an entity, in this order:

1. a confirmed group in `script.groups` whose normalized key matches — a group
   singer carrying `memberIds`;
2. a confirmed character in `script.characters` whose normalized key matches;
3. otherwise an unconfirmed singer, displayed as `toDisplayName(key)`.

Then:

- **Group deduplication.** Drop a group singer when its `memberIds` is non-empty
  and every member id is also present as an individual singer of the same music.
  The non-empty guard matters: `[].every(...)` is `true`, so a group with no
  members would otherwise always vanish.
- **Order.** Lyrics-block count descending, then first-lyrics-block order
  ascending, then display name. The two tie-breakers keep output stable when
  counts are equal.
- **Instrumental.** `isInstrumental` is `kind === 'instrumental' || singers.length === 0`.
  An explicit `instrumental` kind wins even when lyrics exist; that combination is
  contradictory authoring and the authored label is the stronger signal. When
  `isInstrumental` is true the renderer prints `Instrumental` and ignores
  `singers`.

Unconfirmed singers are included because the Contents page describes what the
text says, unlike the Characters page, which is deliberately confirmed-only.

## Page Numbers

### Script page numbers

No new pass is needed. In `transcribeExportPlan`, script pagination already
completes before `composeLeadingPages` runs, and script numbering starts at 1
independently of how much front matter precedes it. So the transcriber builds

```ts
scriptPageNumberByBlockId: Map<string, number>
```

from the final `scriptPages` array, using `page.referencePageNumber ?? index + 1`
— the same expression `withHeaderFooter` uses, so the Contents page and the
printed footer can never disagree. When a block spans pages, the first page wins.

The map is threaded `composeLeadingPages` → `buildInitialPagePages` →
`buildContentsPages`. An entry whose `startBlockId` is missing from the map
renders with an empty number cell; it is a defensive fallback, not the filtering
mechanism.

Filtering happens earlier instead. `deriveBasicExportPlan` already computes
`filteredDoc`, so the Contents plan is derived from `filteredDoc` in both filter
modes — including `preserveFullScriptPagination: true`, where the full document
is laid out but only `visibleBlockIds` are drawn. The plan therefore contains
exactly the entries the export will show.

That keeps the map purely about numbers, which is what lets it be an **optional**
parameter at every hop. `willAddAutomaticBalancingBlank` renders initial pages
from the plan alone, with no transcript in hand, so it passes nothing. Combined
with fixed column widths, the Contents page occupies the same number of pages
with or without the map, so the sidebar's `+1` indicator stays exact.

### Integrated page numbers

Today `drawPdf` computes score insertion and integrated numbering inline, with a
nested scan over `scriptPageSourceBlockIds` per page. That logic moves into a
pure planner in `packages/export/src/pdf/planIntegratedAssembly.ts`:

```ts
export interface IntegratedAssemblyScore {
    musicId: string,
    startBlockId: string,
    afterBlockId: string,
    pageCount: number,
}

export interface IntegratedAssemblyStep {
    kind: 'blank' | 'script' | 'score',
    /** Generated script page index for 'script'. */
    scriptPageIndex?: number,
    /** Music id and 0-based page offset for 'score'. */
    musicId?: string,
    scorePageIndex?: number,
}

export interface IntegratedAssemblyPlan {
    steps: IntegratedAssemblyStep[],
    /** 1-based integrated page number of each music's first score page. */
    scoreStartPageByMusicId: Map<string, number>,
}

export const planIntegratedAssembly: (input: {
    scriptPageSourceBlockIds: string[][],
    scores: IntegratedAssemblyScore[],
}) => IntegratedAssemblyPlan;
```

The planner reproduces the current rules: force an odd book page after a music
start page, force an odd book page after the page a music ends on, and force an
odd book page before each inserted score.

**The planner does not take a leading page count.** `composeLeadingPages`
guarantees an odd number of leading pages, so title plus leading pages is always
even, and the parity the planner reasons about is unaffected by front matter.
Integrated numbers are likewise invariant, because `drawPdf` numbers with
`index - leadingPages + 1` and every script-side page shifts by exactly
`leadingPages`. This is what breaks the apparent circularity: the Contents page
can print integrated numbers even though the Contents page itself changes how
many leading pages there are. The invariant gets its own test.

`drawPdf` replays `steps` instead of recomputing, so the numbers on the Contents
page and the numbers stamped in the PDF come from one source.

### Pipeline order

The planner needs each score's page count, so score PDFs must be loaded before
transcription. `useExportPreview` currently transcribes first. The new order is:

1. `derive(config, script)` — `plan.postSteps` already lists the scores.
2. Load each attachment blob and read `PDFDocument.load(buffer).getPageCount()`.
3. `transcribeExportPlan(plan, settings, {scorePageCounts})`.
4. `renderPdfInWorker(transcript)`.

`transcribeExportPlan`'s third argument is optional, so existing callers and
tests keep compiling. Without it, `showScoreColumn` entries render an empty
`score` cell.

`worker.postMessage` does not use a transfer list, so buffers are structured-cloned
and reading page counts on the main thread does not detach them.

## Rendering

`buildContentsPages(plan, settings, pageNumbers)` returns `VisualPage[]` and is
registered in `buildInitialPagePages`' `BUILDERS` map. It follows the geometry
helpers already used by `buildCharactersAndPlacesPages`: Courier Prime, body size
from `settings.typography.fontSizePx`, a 0.6em character grid, content area
inset by the page margins with the Roman footer area reserved.

### Column widths

Number columns have **fixed** widths, derived from the header text rather than
from the values:

- `script` column: `max('script'.length, 4)` characters;
- `score` column: `max('score'.length, 4)` characters, rendered only when
  `showScoreColumn`;
- a 3-character gutter between them.

Fixed widths keep the title column — and therefore wrapping and the resulting
page count — independent of the actual page numbers. That is what lets
`willAddAutomaticBalancingBlank` stay correct in `BasicExportTemplate`, which
computes the sidebar's `+1` indicator from the plan alone, with no transcript and
no page numbers available.

### Vertical structure

- Page heading: `1.1 ×` body, bold, centered, at the top of the content area.
- Act heading: body size, bold, centered, two blank body lines above and one
  below. Omitted when `name` is null.
- Column header row: `0.85 ×` body, underlined, each header right-aligned over
  its column. Rendered once per physical page, directly under the first act
  heading on that page, followed by one blank body line.
- Entry titles: bold, body size, starting at the content left edge.
- Numbers attach to titles. A scene reads `3. The Diner`; a music reads
  `2.A) Bacon Cheese and Beef`. One space separates the number from the title,
  mirroring `scene.module.css`, where the number is an inline `::before` with a
  small right margin.
- Singers: `0.85 ×` body, italic, on the next line, indented two body characters
  past the title's own start.
- Page numbers: body size, right-aligned in their columns, on the title's line.
  A scene in the combined variant fills only the `script` column; its `score`
  cell stays blank because a scene has no attachment.
- Long titles and long singer lines wrap with a hanging indent to their own start
  column. Nothing is truncated.

### Per-variant spacing

- `scenes`: one line per scene, no blank line between scenes. Scene lists are
  long and airy spacing would half-empty the page.
- `musical-numbers`: two lines per music, one blank body line between entries.
- `scenes-and-musical-numbers`: scene line, blank line, then its music entries
  indented five body characters; one blank line before the next scene. A scene
  with no music is just its own line.

### Overflow

Overflow starts a new physical page inside the same initial-page group, as
Characters and Places already does. Continuation pages repeat the page heading,
the current act heading, and the column header row. A music entry never splits
between its title and its singers, an act heading is never the last line on a
page, and in the combined variant a scene line never separates from its first
music entry.

## Sidebar

`InitialPagesModule` gains a second page-level block below the existing Places
block, reusing the `styles.initialPage` / `initialPageTitle` /
`initialPageOptions` pattern:

- `Contents` — bold page-level `Switch`, default on.
- When enabled, a bordered `FormSelect` in the Script Settings style with the
  inline prefix `Show`, offering `scenes`, `musical numbers`, and
  `scenes and musical numbers`.

No other sidebar control changes. The `+1` balancing-blank indicator in
`BlankPagesModule` already reflects rendered initial pages and picks the Contents
page up automatically.

## Empty and Failure Behaviour

- No scenes and no open music, or a variant with nothing to show — for example
  `musical-numbers` on a straight play — produces zero pages. The initial-page
  group disappears, leaving the leading page count and its parity untouched.
- A music without an attachment renders a blank `score` cell. Missing
  attachments are already surfaced by `IntegratedScoreWarning`.
- A score PDF that fails to load contributes no page count; its `score` cell is
  blank and the assembly planner treats it as absent, exactly as `drawPdf` does
  today.
- Empty scene titles, unconfirmed singers, and music with no lyrics are valid
  input, not errors.

## A Note on the Two Columns

In the Integrated score PDF the printed footer shows integrated numbers, so the
`script` column refers to numbering that appears only in the Basic export. That
is intentional and matches the NMI convention: one contents page serves both
editions of the same show.

## Testing

Pure tests:

- config defaults and the Integrated score clone;
- act and scene grouping, including a script with no acts and music placed
  between an act block and its first scene;
- scene numbering continuous across acts;
- music filtered to `mode === 'open'`;
- singer derivation: multi-name cues, cue reset at scene boundaries, unconfirmed
  singers included;
- singer ordering by lyrics-block count with both tie-breakers;
- group deduplication, including the empty-`memberIds` guard and the
  partial-overlap case where the group stays;
- `Instrumental` from `kind`, and from an absent lyrics block;
- plan derivation per variant, and `showScoreColumn` only in Integrated score;
- `planIntegratedAssembly` blank insertion and `scoreStartPageByMusicId`;
- the leading-page-count-is-even invariant of `composeLeadingPages`;
- integrated numbers unchanged when a Contents page is added;
- page-number resolution using `referencePageNumber` when the character filter
  preserves full pagination;
- entries absent from the plan when the character filter removes their scene, in
  both `preserveFullScriptPagination` modes;
- the same Contents page count with and without the page-number map, so
  `willAddAutomaticBalancingBlank` matches the real render;
- layout: heading, act headings, column headers and their underlines, attached
  numbers, singer size and indent, right-aligned columns, blank `score` cell for
  scenes, per-variant spacing;
- wrapping with hanging indent for long titles and long singer lines;
- overflow: repeated headings, entry kept whole, act heading not stranded;
- page omitted when there is nothing to list.

A final real-PDF check renders a fixture with two acts, an overture before the
first scene, a multi-page score, an instrumental, a group singer that dedupes
away, and enough entries to overflow. Rendered PNG pages are inspected for column
alignment, the singer line, act headings, and agreement between the numbers on
the Contents page and the numbers printed on the referenced pages.

## Out of Scope

- The continuous-versus-scene-scoped music numbering setting. Contents reads
  whatever `formatMusicNumber` returns.
- Reordering initial pages in the sidebar.
- Showing an integrated `score` column in the Basic template.
- Including music hits.
- A Vocal Ranges initial page.
- Persisting export options.
- Changing `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
