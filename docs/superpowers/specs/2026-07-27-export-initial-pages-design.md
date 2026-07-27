# Export Initial Pages Design

## Goal

Add an extensible initial-pages section between the always-present title page
and the script. The first implemented page type is Characters and Places.
Initial pages, optional manual blanks, and an automatically inserted balancing
blank must never change script page numbering, and the script must always start
on an odd physical PDF page.

The visual reference is the CAST / PLACE page in the
[NMI Format Guidelines 2024](https://nmi.org/wp-content/uploads/2024/01/Format-Guidelines-2024.pdf).
Stagistic keeps the centered theatrical layout, but uses quieter headings that
are closer to the script body size.

## Terminology

- **Physical page:** the real PDF page index, starting with the title page as 1.
- **Initial page:** a content page between the title page and any manual blank
  pages. Characters and Places is the first type; Contents and Vocal Ranges are
  planned extension types.
- **Manual blank:** a blank page explicitly enabled by the user.
- **Balancing blank:** an automatically inserted blank that makes the script
  start on an odd physical page.
- **Type-separator blank:** an automatically inserted blank between two
  initial-page types so the next type starts on an odd physical page.
- **Roman sequence:** lowercase Roman numbers shown on initial pages and, when
  initial pages exist, on all following manual and balancing blanks.

## Fixed Behaviour

The final physical order is:

1. title page;
2. when the odd-page policy is enabled and at least one initial-page type
   exists, one unnumbered blank;
3. enabled initial-page types, including their contiguous overflow pages and
   any required type-separator blanks;
4. configured manual blank pages;
5. an automatic balancing blank when required;
6. script.

`Start each initial page on an odd page` applies to initial-page types, not
each physical overflow page. With the default policy enabled, the first type
starts on physical page 3. Before every later type, a type-separator blank is
inserted only when the type would otherwise start on an even physical page.
Overflow within one type stays contiguous, so a two-page type naturally leaves
the next type starting on an odd page without a separator blank.

The title page is physical page 1 and has no page number. Let `leadingCount` be
the number of physical initial, manual blank, and balancing blank pages between
the title and script. The script begins on physical page `2 + leadingCount`.
Therefore `leadingCount` must be odd. Before the script is appended:

```ts
if (leadingPages.length % 2 === 0) {
    leadingPages.push(createBlankPage());
}
```

This includes zero: with no initial or manual blank pages, one unnumbered blank
is inserted and the script begins on physical page 3.

Script header/footer numbering continues to start at script page 1. It never
includes the title page, initial pages, or blanks.

## Configuration

Export configuration remains ephemeral and belongs to the selected export
template. Nothing is persisted to the database.

```ts
export type CharacterInitialPageOrder = 'name' | 'first-appearance';

export interface CharactersAndPlacesValue {
    enabled: boolean;
    showPlaces: boolean;
    showCharacterOutlines: boolean;
    characterOrder: CharacterInitialPageOrder;
}

export interface InitialPagesValue {
    startEachInitialPageOnOddPage: boolean;
    showPageNumbers: boolean;
    charactersAndPlaces: CharactersAndPlacesValue;
}

export interface BlankPageSpec {
    enabled: boolean;
    count: number;
}
```

Basic defaults:

```ts
initialPages: {
    startEachInitialPageOnOddPage: true,
    showPageNumbers: true,
    charactersAndPlaces: {
        enabled: true,
        showPlaces: true,
        showCharacterOutlines: false,
        characterOrder: 'name',
    },
},
blankPages: {
    betweenInitialPagesAndScript: {
        enabled: false,
        count: 1,
    },
},
```

When manual blanks are enabled, the count is clamped to `1..10`. Disabling the
control means zero configured blanks; the stored count stays at 1 so enabling
it again starts from the minimum.

`Start each initial page on an odd page` defaults on and controls physical
placement at initial-page type boundaries. `Show page numbers` is global to the
initial-pages section and also defaults on. It controls only whether Roman
labels are drawn, never page insertion or physical parity.

## Data Model

`ScriptData.characters` remains the existing cue-derived collection used by the
character-filter module. Characters and Places uses separate metadata so the
new confirmed-only rule does not silently change character-filter behaviour.

```ts
export interface ExportInitialCharacter {
    id: string;
    displayName: string;
    outline: string | null;
    firstAppearanceOrder: number | null;
}

export interface ExportInitialPlace {
    id: string;
    name: string;
    firstAppearanceOrder: number;
}

export interface ScriptData {
    // existing fields...
    initialCharacters: ExportInitialCharacter[];
    initialPlaces: ExportInitialPlace[];
}
```

### Confirmed characters

Only records from `useScriptCharacterCatalog(...).characters` are included.
Unconfirmed cue references are never added to the Characters page.

First appearance is the lowest ordered block-index position containing a
matching confirmed character ID. A normalized-key match is the fallback for
older references without an ID. Confirmed characters that do not occur in the
current document remain present and sort after occurring characters, with name
as the deterministic tie-breaker.

The existing export display-name convention is retained: normalized character
keys are converted to title case for output.

The export character filter does not change the Characters page. The confirmed
catalog is the source of truth for this front-matter page, while the filter
continues to control which script scenes are exported.

### Places

Places come from `useScriptPlaces`. Only catalogued places assigned to at least
one scene are included. They are deduplicated by place ID and ordered by the
first scene that references them, using the scene heading's block-index order.
Places first used in the same scene use name as a stable tie-breaker because the
scene-to-place relation has no authored ordering.

## Export Plan Boundary

`deriveBasicExportPlan` stays the reusable Basic-template baseline. It produces
a semantic plan: content and policy, not pixel coordinates.

```ts
export interface CharactersAndPlacesInitialPagePlan {
    kind: 'characters-and-places';
    characters: Array<{
        id: string;
        displayName: string;
        outline: string | null;
    }>;
    places: Array<{
        id: string;
        name: string;
    }>;
    showCharacterOutlines: boolean;
}

export type InitialPagePlan =
    | CharactersAndPlacesInitialPagePlan;

export interface LeadingPagesPlan {
    initialPages: InitialPagePlan[];
    manualBlankCount: number;
    showRomanPageNumbers: boolean;
    startEachInitialPageOnOddPage: boolean;
}
```

`ExportPlan` gains `leadingPages: LeadingPagesPlan`.
`pagination.blankPagesBeforeScript` is removed; blank pages before the script
are front-matter composition, not script pagination.

Future templates can call `deriveBasicExportPlan`, preserve its leading-page
items, and append or replace typed `InitialPagePlan` entries. Adding Contents or
Vocal Ranges requires a new union member and renderer, not a new export
pipeline.

Pre-rendered `VisualLine` objects do not enter the plan. This keeps derivation
independent of page dimensions and typography and lets every renderer use the
same resolved export settings.

## Rendering

The renderer works in physical pages:

```ts
type VisualPage = VisualLine[];

buildInitialPagePages(
    plan: InitialPagePlan,
    settings: EditorSettings,
): VisualPage[];
```

Each initial-page type may produce one or more `VisualPage` objects. The
transcriber then:

1. builds title-page items;
2. renders every initial-page plan as one physical-page group;
3. when odd-page placement is enabled, prepends one unnumbered blank and
   inserts a blank between groups only when the next group would start even;
4. appends configured manual blank pages;
5. appends a balancing blank when the intermediate count is even;
6. applies Roman footers when at least one initial page exists;
7. appends independently numbered script pages;
8. flattens the pages with `__page_break__` items.

Roman numbers are lowercase (`i`, `ii`, `iii`, …), centered in the bottom
footer area. If no initial page exists, all manual and balancing blanks are
unnumbered. If at least one initial page exists, the Roman sequence covers every
initial page, type-separator blank, manual blank, and balancing blank page. The
single blank between the title page and first initial-page type is excluded
from the sequence. Turning numbering off hides the labels but keeps the same
logical sequence and physical pages.

## Characters and Places Layout

- Courier Prime, inherited from the export.
- Body size follows `settings.typography.fontSizePx`.
- Section headings use `1.1 ×` body size, bold and horizontally centered.
- `CHARACTERS` begins near the top of the content area.
- Character names are centered.
- Character-name rows advance by `1.35 ×` the normal body line height so names
  do not visually crowd each other.
- With outlines on, the outline is centered and italic directly below the name,
  followed by one empty body line before the next character.
- A missing or whitespace-only outline renders no italic line, but the
  character still receives the same one-line separation used by outlined
  entries.
- Text wraps to the page's configured content width. Wrapped outlines use the
  minimum possible line count and balance word lengths between those lines,
  similar to CSS `text-wrap: balance`. Lines stay centered and italic.
- Overflow automatically creates another initial page. Each continuation page
  repeats `CHARACTERS`.
- `PLACES` is rendered only after the final character. If the heading plus its
  first place does not fit, the whole section begins on a new page.
- Characters and Places are separated by two body-line heights.
- `PLACES` is omitted when hidden or when there are no assigned places.
- Place names are centered, one per line.
- The Roman footer area is reserved from content, preventing overlap.

## Sidebar

Add an Initial pages module before Blank pages:

- `Start each initial page on an odd page` is a global switch directly below
  the module heading and defaults on.
- `Show page numbers` is a global switch directly below it and defaults on.
- A divider separates global options from the enabled initial-page list.
- `Characters and places` is a bold page-level switch, default on.
- When enabled:
  - a `Characters` subsection contains `Show character outlines`, default off,
    and a bordered Script Settings-style select with `Name` /
    `First appearance`; `Order characters by` is its inline prefix rather than
    a label above the field;
  - a separate `Places` subsection contains `Show places`, default on.
- Subsection controls have a larger vertical offset from the `Characters` and
  `Places` headings than the spacing between controls inside a subsection.

Characters cannot be disabled independently from Places: disabling the master
switch removes the entire page, while turning `Show places` off leaves
Characters visible.

The export preview defaults to 120% zoom.

Blank pages changes from a `0..10` count-only input to:

- `Blank pages` switch;
- count input shown immediately beside its `Count` label while enabled, clamped
  to `1..10`;
- a muted, dashed-underlined `+1` immediately after the count input when the
  rendered initial pages plus manual blanks require one automatic balancing
  page. Hover or keyboard focus shows a tooltip: “An additional blank page is
  added so the script starts on an odd page.”

The automatic balancing blank is not added to the configured count shown in the
sidebar. The indicator uses the actual rendered initial-page count, including
Characters and Places overflow, rather than estimating from enabled page types.

## Failure and Loading Behaviour

The export route already waits for workspace data. Places add one live-query
source. While it is loading, preview derivation uses an empty places list and
automatically refreshes when data arrives. A place-loading error follows the
existing export/workspace error handling and does not create fabricated places.

Missing character outlines, missing scene assignments, and confirmed characters
without appearances are valid input, not errors.

## Testing

Pure tests cover:

- defaults and blank-count clamping;
- confirmed-only character data and first-appearance ordering;
- used-place collection, deduplication, and first-scene ordering;
- semantic plan derivation for all Characters and Places options;
- lowercase Roman conversion;
- Characters and Places alignment, outline styling/spacing, wrapping, overflow,
  repeated headings, and Places placement;
- physical page order and odd-page balancing;
- Roman numbering on initial and blank pages;
- unnumbered blanks when no initial page exists;
- hidden Roman labels without changing page count;
- script numbering still starting at 1.

A final real-PDF check renders a fixture with enough characters to overflow,
manual blanks enabled, and outlines visible. Rendered PNG pages are inspected
for alignment, footer placement, sequence, overflow, and the odd physical start
of the script.

## Out of Scope

- Contents initial page.
- Vocal Ranges initial page.
- Time section.
- Persisting export options.
- Authored ordering for multiple places inside one scene.
- Changing script-internal scene/act page-break rules.
- Changing `SCRIPT_DOCUMENT_SCHEMA_VERSION`; this is export layout and metadata
  consumption only.
