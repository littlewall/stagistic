# Integrated Score Export Design

## Goal

Add an `Integrated score` export template that produces a rehearsal PDF in
removable physical units:

1. book;
2. music text;
3. the music's uploaded score PDF;
4. the following book section.

Every unit begins on an odd physical page. Automatic parity blanks make it
possible to remove a music-text or score unit from a double-sided print without
changing the placement of later units.

At the same time, make character-filtered exports preserve the complete
script's pagination by default in both Basic and Integrated score templates.
A page reference must identify the same content in the complete PDF and in a
single-character PDF.

The behaviour follows the integrated script/score rules in the
[NMI Format Guidelines 2024](https://nmi.org/wp-content/uploads/2024/01/Format-Guidelines-2024.pdf),
especially the physical-unit and running-number examples around pages 72 and
80.

## Terminology

- **Book:** script content outside an open music interval.
- **Music text:** script blocks inside an open music interval. This commonly
  contains lyrics and related dialogue or stage directions.
- **Score:** the uploaded Integrated score PDF attached to a music record.
- **Open music:** music with mode `open`. Mode `hit` is outside this feature.
- **Music start boundary:** the trailing boundary of the block containing a
  music-start atom. The following block begins music text.
- **Music out boundary:** the trailing boundary of the music's effective end
  block. The effective end may be explicit or implicit.
- **Physical page:** a page in the generated PDF.
- **Reference export:** the complete, unfiltered artifact used to assign stable
  layout and page numbers.
- **Page mark:** the existing script page value shown in the top-right header.
  It counts book and music-text pages only.
- **Integrated page number:** the running value shown in the bottom-center
  footer. It counts all post-front-matter pages in the complete export.
- **Parity blank:** an automatically inserted blank page that makes the next
  required unit begin on an odd physical page.
- **Preserved filtering:** character filtering applied after reference
  pagination, without reflowing retained content.
- **Compact filtering:** the current behaviour: filter first, then repaginate
  and renumber the retained content.

## Fixed Product Decisions

- The template ID is `integrated-score` and its label is
  `Integrated score`.
- Integrated score's music separation and score insertion are fixed template
  behaviour. They have no switches.
- A user who does not want score PDFs uses the Basic template.
- Only `open` music participates. `hit` is ignored completely.
- Explicit and implicit music ends behave identically.
- A missing, unavailable, encrypted, or unreadable score PDF never blocks the
  export. The score is skipped and the user is warned.
- Score PDFs are copied without scaling, cropping, or page-size conversion.
  The user is responsible for matching the script page size and reserving the
  integrated-footer area.
- The integrated footer uses the same position and visual treatment on
  generated script pages, parity blanks, and uploaded score pages.
- Character filtering includes or excludes whole scenes. Music text and score
  PDFs follow their owning scene.
- Preserved filtering is the default in Basic and Integrated score.
- Export configuration remains ephemeral. It is shared while the export route
  is mounted but is not persisted to the database.
- No database schema change and no `SCRIPT_DOCUMENT_SCHEMA_VERSION` bump are
  required.

## Physical Composition

### Integrated score order

The post-front-matter body is composed as repeating units:

```text
book -> music text -> score -> book -> ...
```

The first physical page of each of the following begins odd:

- each music-text unit;
- each uploaded score unit;
- each book continuation after music or score.

The music-start block belongs to the preceding book unit. The first block after
it belongs to music text. The effective music-out block belongs to music text.
The score is inserted after that block's page.

An implicit end from `deriveMusicTimeline` is authoritative:

- `next-music`;
- `scene-end`;
- `document-end`.

For a `next-music` end, the block containing the next start closes the prior
music. The prior score is inserted after that block, and the following block
begins the next music-text unit.

If no block exists between a music start and its effective end, no empty
music-text page is fabricated. The score, when available, is inserted directly
at the end boundary and starts odd.

If no score PDF is available, the score unit is absent. Music text and the
following book unit still receive their normal odd-page boundaries.

### Applying parity

Pagination creates content pages and unit boundaries first. Physical parity is
resolved only after score pages have been interleaved. This prevents a
script-only parity decision from becoming wrong when a score PDF is inserted.

At every odd-page boundary:

```ts
if (nextPhysicalPageNumber % 2 === 0) {
    insertParityBlank();
}
```

A parity blank after the script begins contains only its integrated page
number. It never contains a page mark or other header/footer content. This is a
general rule shared by Basic and Integrated score.

Front matter remains separate:

- title page and initial pages precede the script;
- their current Roman-number and balancing rules remain unchanged;
- they do not enter integrated numbering.

### Basic template

Basic does not create music/score units. It still uses the shared physical-page
model and final numbering pass. Scene new-page and odd-page options continue to
work. A scene odd-page blank contains only the integrated footer.

`sceneOnNewPage` creates a page boundary but no blank by itself.
`sceneOnOddPage` may add one parity blank.

## Numbering

### Complete export

The page mark:

- is assigned only to generated book and music-text pages;
- ignores parity blanks;
- ignores uploaded score pages;
- is never drawn on a score page.

The integrated page number:

- begins at 1 on the first script page;
- counts book, music text, score pages, and post-script parity blanks;
- is centered in the same footer position on every counted page;
- is absent from title and initial pages.

Uploaded PDFs keep their original content, including any score page numbers.
Stagistic adds only the integrated page number to them.

The existing resolved footer-center style is the source of truth for the
integrated number's font variant, size, underline state, horizontal centering,
and vertical position. The final PDF compositor embeds the same Courier Prime
font files used by generated export pages.

### Preserved character-filter export

Both the page mark and integrated number remain the values assigned by the
complete reference export. Number ranges may therefore be absent:

```text
1, 2, 7, 8
```

This is intentional. Page 7 identifies the same content in the full and
filtered PDFs. The target result is equivalent to printing the complete PDF
and physically removing every page that contains only filtered-out scene
content: every retained page still shows the same top-right page mark and the
same bottom-center integrated page number as the complete PDF.

If filtering changes physical parity before a retained odd-page boundary, the
filtered artifact may retain or introduce one parity blank. Its integrated
number is taken from the unused reference-number gap immediately before the
next retained reference page. Later retained pages keep their reference
numbers.

When preserved filtering is disabled, the filtered artifact receives new,
sequential page marks and integrated numbers from its compact layout.

## Reference-First Filtering

### Why filter after pagination

Filtering the document before pagination causes later content to reflow. Merely
copying the old numbers onto a compact layout is insufficient because a given
number can then contain different lines.

The reference-first pipeline is:

1. derive and paginate the complete unfiltered script;
2. interleave every available score PDF;
3. apply all complete-export parity blanks;
4. assign reference page marks and integrated page numbers;
5. calculate the block IDs retained by the character filter;
6. remove non-retained generated lines and excluded score pages;
7. drop pages with no retained content;
8. resolve only the parity blanks still required by the filtered physical
   sequence;
9. render the final filtered artifact with stored reference numbers.

### Line ownership and mixed-scene pages

Every transcribed content line carries a non-rendered `sourceBlockId`.
`filterScriptByCharacter` remains the authority for which block IDs survive.
This preserves its existing act-heading rule: an act heading survives when at
least one retained scene belongs to that act.

On a page containing both excluded and retained blocks:

- excluded lines are removed;
- retained lines keep their original `x` and `y` coordinates;
- holes remain;
- the page keeps its original header and both reference numbers;
- content never moves upward or onto an earlier page.

A generated page is removed only when no retained script line remains.
Score pages are kept only when their music's owning scene is retained.
Automatic blanks are then recomputed from the remaining unit boundaries rather
than retained unconditionally.

### Empty filter

If no scenes survive:

- title and configured initial pages remain;
- no script, music-text, score, or post-script parity pages are emitted;
- the existing empty-filter preview state is used;
- the missing-score warning count is zero because no music will be exported.

## Physical Page Model

The transcript becomes page-oriented before PDF drawing. Exact implementation
uses the following boundary:

```ts
type ExportPhysicalPageKind =
    | 'title'
    | 'initial'
    | 'script'
    | 'score'
    | 'parity-blank';

interface OwnedVisualLine extends VisualLine {
    sourceBlockId: string | null;
}

interface ExportPhysicalPage {
    kind: ExportPhysicalPageKind;
    items: OwnedVisualLine[];
    sourceBlockIds: string[];
    musicId: string | null;
    scorePageIndex: number | null;
    unitStart: 'none' | 'music' | 'score' | 'book';
    startsOnOddPage: boolean;
    scoreInsertionAfterMusicIds: string[];
    referencePageMark: string | null;
    referenceScriptPageNumber: number | null;
    referenceIntegratedPageNumber: number | null;
}
```

The model distinguishes semantic page identity from physical position in a
particular filtered artifact. This is required because preserved page numbers
can have gaps.

Page headers and footers are rendered from stored reference values after
filtering. The first block removed from a mixed page therefore cannot
accidentally change that page's reference mark.

## Export Pipeline and PDF Composition

The shared pipeline becomes:

```text
shared config
  -> semantic reference plan
  -> full page-oriented transcription
  -> Integrated score interleaving (when selected)
  -> reference numbering
  -> optional preserved filtering
  -> final parity resolution
  -> generated-page PDF drawing
  -> vector score-page merge
  -> integrated footer overlay
  -> preview/download Blob
```

The current `postSteps` boundary becomes a typed score-merge operation rather
than a placeholder `kind: string`.

`pdf-lib` is the final compositor:

- copy generated jsPDF pages;
- copy uploaded score pages as vector PDF pages;
- preserve their page boxes and content;
- insert parity blanks;
- embed Courier Prime through `@pdf-lib/fontkit`;
- draw the integrated footer on every counted final page.

The integrated number must no longer be baked into generated script pages
before final composition. Otherwise score insertion would make later values
stale. Other configured header/footer content remains part of generated pages.

Score metadata enters the semantic plan by `musicId` and `storageKey`. Blobs are
resolved only for Integrated score, immediately before worker rendering. With
preserved filtering enabled, every full-reference open music PDF is resolved,
including music in scenes that will later be removed, because its page count
affects later reference numbers. Hidden music never appears in the warning.
With compact filtering, only score PDFs belonging to retained scenes are
resolved. The worker receives cloneable binary data, not repository APIs.

The existing debounce, abort signal, stale-run guard, and previous-preview
retention remain in effect. Attachment binary data is cached by
`storageKey` for the lifetime of the export route so ordinary option changes do
not reread unchanged IndexedDB blobs.

## Configuration and Shared State

`CharacterFilterValue` gains:

```ts
interface CharacterFilterValue {
    mode: 'all' | 'only';
    characterIds: string[];
    preserveFullScriptPagination: boolean;
}
```

The default is:

```ts
characterFilter: {
    mode: 'all',
    characterIds: [],
    preserveFullScriptPagination: true,
}
```

Basic and Integrated score share one `BasicExportConfig` instance owned above
the active template component. Both templates expose the same Basic modules.
Switching templates does not remount or reset this config.

Integrated score adds no template-specific user configuration. Its fixed
behaviour is selected solely by the template ID.

Leaving or reloading the export route resets the ephemeral config to defaults,
matching the existing persistence boundary.

## Sidebar UI

### Character filter

Under the character selection controls, show:

```text
Preserve full-script pagination  ?
```

The switch defaults on in both templates. The `?` is an inline tooltip trigger
whose text is:

```text
Keep page numbers and content positions aligned with the complete script.
```

The tooltip trigger is visually adjacent to, but not nested inside, the switch.
This avoids nested interactive elements and allows independent keyboard focus.

### Reusable inline tooltip

Add a shared `InlineTooltip` atom to `@stagistic/ui`:

```ts
interface InlineTooltipProps {
    className?: string;
    label: ReactNode;
    tooltip: ReactNode;
}
```

It wraps the existing `Tooltip` primitive and renders a focusable inline button
with:

- muted text;
- transparent background and no box border;
- a dashed underline;
- `cursor: help`;
- the standard focus ring.

Refactor the current Blank pages `+1` balancing indicator to:

```tsx
<InlineTooltip
    label="+1"
    tooltip="An additional blank page is added so the script starts on an odd page."
/>
```

### Missing-score warning

Only Integrated score shows the warning, immediately below the template
picker. It is absent when every exported open music has an available readable
score.

Example:

```text
3 music numbers are missing an Integrated score PDF
Review missing music
```

The warning count includes only open music whose owning scene survives the
current character filter. This is true in preserved and compact filtering
modes.

`Review missing music` expands an inline list in the sidebar. The collapsed
warning stays compact regardless of count. Each list row shows the formatted
music number and title. Activating a row opens Attribute manager directly on
that music.

An attachment discovered to be locally unavailable or unreadable joins the
same review list for the current export run. In that case the headline changes
to `3 music numbers could not include an Integrated score PDF`, so an uploaded
but unreadable file is not described as missing. The export continues without
that score.

## Failure Behaviour

- Missing score metadata: skip the score and warn.
- Missing local Blob: skip the score and warn.
- Encrypted or malformed PDF: skip the score and warn.
- Score page-size mismatch: copy unchanged; do not scale, crop, or block.
- Failure to paginate or draw generated script content: fail the export and use
  the existing preview error state.
- A new config change or template switch aborts the previous run.
- A stale run may not replace the current preview or warning state.

## Testing

### Pure pagination and filtering tests

- complete reference page marks and integrated numbers;
- preserved filtering with number gaps;
- compact filtering with sequential renumbering;
- a page containing excluded and retained blocks keeps retained coordinates;
- a page containing only excluded blocks is removed;
- retained act headings follow existing filter semantics;
- no-scenes-survive empty state;
- new-page boundaries without blanks;
- odd-page boundaries with at most one parity blank;
- every post-script parity blank has only an integrated number;
- reference-number assignment for a filtered parity blank.

### Music and score composition tests

- music text begins after the music-start block;
- explicit and every implicit end kind produce the same score boundary;
- `hit` music produces no unit or score insertion;
- book -> music text -> score -> book ordering;
- each fixed unit begins odd;
- a missing score still preserves music/book odd starts;
- multiple score PDFs interleave by document music order;
- score pages do not increment script page marks;
- score pages do increment integrated numbers;
- source PDF page content and page boxes are preserved;
- generated, blank, and score pages share the same integrated-footer
  coordinates and font treatment;
- an encrypted, malformed, or missing Blob is skipped without failing the
  artifact.

### UI and state tests

- both templates share the same config object;
- template switching preserves all Basic settings;
- the preserve switch defaults on and can be disabled;
- `InlineTooltip` supports hover and keyboard focus;
- Blank pages uses `InlineTooltip` for `+1`;
- missing-score warning is Integrated-score-only;
- warning count follows the current character-filter result;
- warning remains collapsed initially;
- review list shows every missing/unavailable exported open music;
- selecting a row opens the matching Attribute manager music;
- stale export runs cannot overwrite current warning state.

### Verification

- focused `@stagistic/export`, `@stagistic/ui`, and `@stagistic/app-routes`
  tests;
- relevant app-routes browser tests;
- package typechecks;
- `npx tsc -b`;
- `pnpm lint`;
- render and inspect representative final PDFs with:
  - no music;
  - one music without score;
  - odd- and even-page music text;
  - odd- and even-page score PDFs;
  - explicit and implicit ends;
  - preserved character filtering with mixed-scene pages;
  - compact character filtering.

## Out of Scope

- Persisting export-template configuration.
- Editing, scaling, cropping, or repairing uploaded score PDFs.
- Adding score uploads outside Attribute manager.
- Adding export behaviour for `hit`.
- Removing `hit` from the script model or editor.
- Building the future separate cue editor.
- Changing music attachment storage or database schema.
- Changing title-page or initial-page numbering.
