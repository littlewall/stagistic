# Export Initial Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an extensible Characters and Places initial page, Roman front-matter numbering, manual blanks, and automatic physical-page balancing so every script begins on an odd PDF page.

**Architecture:** `deriveBasicExportPlan` emits semantic typed initial-page plans. Dedicated renderers turn each plan into one or more physical `VisualPage` objects using resolved export settings; a shared leading-page composer applies manual blanks, lowercase Roman footers, parity balancing, and then appends independently numbered script pages.

**Tech Stack:** TypeScript, React 19, `@stagistic/export`, `@stagistic/app-core`, React Aria UI atoms, jsPDF worker output, `vite-plus/test`.

## Global Constraints

- The approved design is `docs/superpowers/specs/2026-07-27-export-initial-pages-design.md`.
- No database schema or migration changes.
- Do not change `SCRIPT_DOCUMENT_SCHEMA_VERSION`.
- Export configuration remains ephemeral component state.
- Title page is physical page 1; the script must start on an odd physical page.
- Title, initial, and blank pages never affect script page numbers.
- Only confirmed catalog characters appear on the Characters page.
- Do not commit. The user reviews and performs the final commit.
- Preserve existing unrelated worktree changes.
- Test imports use `import {describe, it, expect} from "vite-plus/test"`.
- Canonical verification is package tests/typechecks, `npx tsc -b`, and `pnpm lint`.

---

## File Structure

**`packages/export` — semantic types, pure derivation, and PDF layout**

- Modify `packages/export/src/config.ts` — initial-page and manual-blank config.
- Modify `packages/export/src/config.test.ts` — default assertions.
- Modify `packages/export/src/scriptData.ts` — confirmed character/place metadata.
- Modify `packages/export/src/plan.ts` — typed leading-page plan.
- Modify `packages/export/src/deriveBasicExportPlan.ts` — sorted semantic plan.
- Modify `packages/export/src/deriveBasicExportPlan.test.ts` — derivation cases.
- Create `packages/export/src/initialPages/romanNumerals.ts` — lowercase Roman conversion.
- Create `packages/export/src/initialPages/romanNumerals.test.ts` — converter tests.
- Create `packages/export/src/initialPages/buildCharactersAndPlacesPages.ts` — page layout and overflow.
- Create `packages/export/src/initialPages/buildCharactersAndPlacesPages.test.ts` — visual-line tests.
- Create `packages/export/src/initialPages/buildInitialPagePages.ts` — type dispatch.
- Create `packages/export/src/initialPages/composeLeadingPages.ts` — blanks, parity, Roman footer.
- Create `packages/export/src/initialPages/composeLeadingPages.test.ts` — physical-page policy tests.
- Modify `packages/export/src/transcribeExportPlan.ts` — page-array composition.
- Modify `packages/export/src/transcribeExportPlan.test.ts` — end-to-end transcript order.
- Modify `packages/export/src/index.ts` — public type/function exports.

**`packages/app-routes` — live metadata collection and sidebar**

- Create `packages/app-routes/src/routes/script/export/collectInitialPageData.ts` — pure confirmed-character/place mapping.
- Create `packages/app-routes/src/routes/script/export/collectInitialPageData.test.ts` — mapping and ordering tests.
- Modify `packages/app-routes/src/routes/script/export/useExportScriptData.ts` — consume character catalog and place store.
- Create `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx` — initial-page controls.
- Create `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.browser.test.tsx` — interaction tests.
- Modify `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.tsx` — enabled state and minimum count.
- Create `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.browser.test.tsx` — minimum-count tests.
- Modify `packages/app-routes/src/routes/script/export/modules/modules.module.css` — nested controls.
- Modify `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx` — defaults clone and module wiring.

---

### Task 1: Add semantic configuration and plan types

**Files:**

- Modify: `packages/export/src/config.ts`
- Modify: `packages/export/src/config.test.ts`
- Modify: `packages/export/src/scriptData.ts`
- Modify: `packages/export/src/plan.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Produces `CharacterInitialPageOrder`, `CharactersAndPlacesValue`, `InitialPagesValue`.
- Changes `BlankPageSpec` to `{enabled: boolean; count: number}` and
  `BlankPagesValue` to `{betweenInitialPagesAndScript: BlankPageSpec}`.
- Adds `initialPages: InitialPagesValue` to `BasicExportConfig`.
- Adds `ExportInitialCharacter` and `ExportInitialPlace` to `ScriptData`.
- Adds `InitialPagePlan` and `LeadingPagesPlan` to `ExportPlan`.

- [ ] **Step 1: Write failing default tests**

Add assertions to `config.test.ts`:

```ts
expect(BASIC_DEFAULTS.initialPages).toEqual({
    startEachInitialPageOnOddPage: true,
    showPageNumbers: true,
    charactersAndPlaces: {
        enabled: true,
        showPlaces: true,
        showCharacterOutlines: false,
        characterOrder: 'name',
    },
});
expect(BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript).toEqual({
    enabled: false,
    count: 1,
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
pnpm test packages/export/src/config.test.ts
```

Expected: FAIL because `initialPages` and
`betweenInitialPagesAndScript` do not exist.

- [ ] **Step 3: Add config and data types**

Use these exact public types in `config.ts`:

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

export interface BlankPagesValue {
    betweenInitialPagesAndScript: BlankPageSpec;
}
```

Add `initialPages` to `BasicExportConfig` and apply the defaults asserted in
Step 1.

Add to `scriptData.ts`:

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
```

Add `initialCharacters` and `initialPlaces` arrays to `ScriptData`; retain the
existing `characters` array unchanged for character filtering.

- [ ] **Step 4: Add semantic plan types**

In `plan.ts`, define:

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

export type InitialPagePlan = CharactersAndPlacesInitialPagePlan;

export interface LeadingPagesPlan {
    initialPages: InitialPagePlan[];
    manualBlankCount: number;
    showRomanPageNumbers: boolean;
    startEachInitialPageOnOddPage: boolean;
}
```

Add `leadingPages: LeadingPagesPlan` to `ExportPlan`. Remove
`blankPagesBeforeScript` from `PaginationOverrides` and remove
`BlankPageSentinel`. Re-export the new public types from `index.ts`.

- [ ] **Step 5: Make the default test pass**

Run:

```bash
pnpm test packages/export/src/config.test.ts
```

Expected: config test PASS. Task 3 performs the package typecheck after all
`ExportPlan` and `ScriptData` construction sites in this package are migrated.

### Task 2: Collect confirmed character and used-place metadata

**Files:**

- Create: `packages/app-routes/src/routes/script/export/collectInitialPageData.ts`
- Create: `packages/app-routes/src/routes/script/export/collectInitialPageData.test.ts`
- Modify: `packages/app-routes/src/routes/script/export/useExportScriptData.ts`

**Interfaces:**

- Consumes `ScriptBlockIndexSnapshot`, `ScriptCharacterRecord`,
  `ScriptLocation[]`, and `scenePlaceIds`.
- Produces:

```ts
export const collectInitialPageData = (
    snapshot: ScriptBlockIndexSnapshot,
    confirmedCharacters: ScriptCharacterRecord[],
    places: Array<{id: string; name: string}>,
    scenePlaceIds: Record<string, string[]>,
): {
    initialCharacters: ExportInitialCharacter[];
    initialPlaces: ExportInitialPlace[];
};
```

- [ ] **Step 1: Write failing pure-data tests**

Cover these fixtures in `collectInitialPageData.test.ts`:

```ts
const snapshot = {
    blocks: [
        {
            blockId: 'scene-1',
            orderNo: 0,
            blockType: 'scene',
            textContent: 'First',
            actBlockId: null,
            sceneBlockId: 'scene-1',
            characterRefs: null,
        },
        {
            blockId: 'cue-b',
            orderNo: 1,
            blockType: 'character',
            textContent: 'BOB',
            actBlockId: null,
            sceneBlockId: 'scene-1',
            characterRefs: [{key: 'BOB', characterId: 'char-b'}],
        },
        {
            blockId: 'scene-2',
            orderNo: 2,
            blockType: 'scene',
            textContent: 'Second',
            actBlockId: null,
            sceneBlockId: 'scene-2',
            characterRefs: null,
        },
        {
            blockId: 'cue-a',
            orderNo: 3,
            blockType: 'character',
            textContent: 'ANNA',
            actBlockId: null,
            sceneBlockId: 'scene-2',
            characterRefs: [{key: 'ANNA', characterId: 'char-a'}],
        },
    ],
    music: [],
    orphanMusicOutBlockIds: [],
};
```

Assert:

- only supplied confirmed character records are returned;
- outlines are retained and trimmed-to-null only when blank;
- Bob's first appearance is 1 and Anna's is 3;
- a confirmed unused character has `firstAppearanceOrder: null`;
- `place-2` assigned in scene 1 precedes `place-1` assigned in scene 2;
- a place assigned in both scenes appears once;
- an unassigned catalogue place is omitted;
- two places first used in one scene are ordered by name.

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
pnpm test packages/app-routes/src/routes/script/export/collectInitialPageData.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure collector**

Build `firstCharacterOrderById` and `firstCharacterOrderByKey` maps by walking
`snapshot.blocks` in ascending `orderNo`. Prefer ID matches, then normalized-key
matches. Map every confirmed catalog record to the existing title-cased export
display name and its optional outline.

Build `sceneOrderById` from scene-heading blocks. For each
`scenePlaceIds[sceneId]`, retain the lowest scene order per place ID. Join to the
place catalogue, omit unassigned places, then sort by first scene order and
name.

- [ ] **Step 4: Wire live data into `useExportScriptData`**

Import `useScriptPlaces` and `useScriptRepository` from `@stagistic/app-core`.
Read `currentScriptId` and `characterCatalog` from `useScriptWorkspace`, then:

```ts
const repository = useScriptRepository();
const placeState = useScriptPlaces(currentScriptId, repository);
```

Pass the current block-index snapshot,
`characterCatalog.characters`, `placeState.places`, and
`placeState.scenePlaceIds` to `collectInitialPageData`. Add the returned arrays
to `ScriptData`. Keep the existing cue-derived `characters` collection intact.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm test packages/app-routes/src/routes/script/export/collectInitialPageData.test.ts
```

Expected: collector tests PASS. Task 7 performs the app-routes typecheck after
the sidebar's configuration construction sites are migrated.

### Task 3: Derive the typed Basic leading-pages plan

**Files:**

- Modify: `packages/export/src/deriveBasicExportPlan.ts`
- Modify: `packages/export/src/deriveBasicExportPlan.test.ts`
- Modify: `packages/export/src/testUtils.ts` if a shared `ScriptData` fixture is
  already defined there

**Interfaces:**

- Consumes the Task 1 `BasicExportConfig` and extended `ScriptData`.
- Produces `ExportPlan.leadingPages`.

- [ ] **Step 1: Extend the test fixture**

Add `initialCharacters` and `initialPlaces`:

```ts
initialCharacters: [
    {
        id: 'char-b',
        displayName: 'Bob',
        outline: 'Baritone',
        firstAppearanceOrder: 1,
    },
    {
        id: 'char-a',
        displayName: 'Anna',
        outline: 'Lead',
        firstAppearanceOrder: 8,
    },
    {
        id: 'char-z',
        displayName: 'Zora',
        outline: null,
        firstAppearanceOrder: null,
    },
],
initialPlaces: [
    {id: 'place-stage', name: 'Stage', firstAppearanceOrder: 2},
    {id: 'place-home', name: 'Home', firstAppearanceOrder: 10},
],
```

Update `withConfig` so it copies `initialPages` and the renamed blank-page
field.

- [ ] **Step 2: Write failing derivation tests**

Assert:

- Basic defaults emit one `characters-and-places` item;
- default name order is `Anna`, `Bob`, `Zora`;
- first-appearance order is `Bob`, `Anna`, `Zora`;
- `showPlaces: false` emits an empty places array;
- `showCharacterOutlines` is copied;
- disabled Characters and Places emits no initial-page items;
- disabled blanks produce `manualBlankCount: 0`;
- enabled blanks clamp counts to `1..10`;
- `showPageNumbers` is copied to `showRomanPageNumbers`.

- [ ] **Step 3: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/deriveBasicExportPlan.test.ts
```

Expected: FAIL because `leadingPages` is absent and the old blank-page
sentinel is still returned.

- [ ] **Step 4: Implement minimal semantic derivation**

Sort a copy of `script.initialCharacters`; never mutate hook-owned arrays.
For first appearance, compare numeric orders first, put `null` last, then use
`displayName.localeCompare`. For name order, compare display names directly.

Create the Characters and Places plan only when enabled. Remove places when
`showPlaces` is false. Calculate:

```ts
const manualBlankCount = blankSpec.enabled
    ? Math.max(1, Math.min(10, Math.floor(blankSpec.count)))
    : 0;
```

Keep existing document filtering and scene-break derivation unchanged.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm test packages/export/src/config.test.ts packages/export/src/deriveBasicExportPlan.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: focused tests and export typecheck PASS.

### Task 4: Build Characters and Places physical pages

**Files:**

- Create: `packages/export/src/initialPages/buildCharactersAndPlacesPages.ts`
- Create: `packages/export/src/initialPages/buildCharactersAndPlacesPages.test.ts`
- Create: `packages/export/src/initialPages/buildInitialPagePages.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Produces:

```ts
export type VisualPage = VisualLine[];

export const buildCharactersAndPlacesPages = (
    plan: CharactersAndPlacesInitialPagePlan,
    settings: EditorSettings,
): VisualPage[];

export const buildInitialPagePages = (
    plan: InitialPagePlan,
    settings: EditorSettings,
): VisualPage[];
```

- [ ] **Step 1: Write failing single-page layout tests**

With `DEFAULT_EDITOR_SETTINGS`, assert:

- the first line text is `CHARACTERS`;
- its run is bold and horizontally centered;
- heading size equals `bodyFontSize * 1.1`;
- character names are centered;
- outline runs are italic;
- the next character starts two body line-heights after the final outline line;
- places follow `PLACES`, are centered, and retain plan order;
- `PLACES` is absent for an empty places array.

Use a mono-width helper in the test:

```ts
const centeredX = (text: string, fontSizePx: number, pageWidthPx: number) =>
    (pageWidthPx - text.length * fontSizePx * 0.6) / 2;
```

- [ ] **Step 2: Write failing overflow tests**

Use reduced page height settings and enough characters to force two pages.
Assert:

- two `VisualPage` arrays are returned;
- both begin with `CHARACTERS`;
- every character occurs exactly once;
- `PLACES` occurs after the last character;
- a Places heading that cannot fit with its first place starts the next page;
- all content lines stay above the reserved footer boundary.

- [ ] **Step 3: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/initialPages/buildCharactersAndPlacesPages.test.ts
```

Expected: FAIL because the builder does not exist.

- [ ] **Step 4: Implement a small page cursor**

Inside the builder, keep:

```ts
interface PageCursor {
    pages: VisualPage[];
    current: VisualPage;
    y: number;
    contentBottom: number;
}
```

Reserve one body line in the bottom margin for Roman footers. Add centered-line
helpers using Courier Prime and the existing mono ratio `0.6`. Wrap outlines
by words to:

```ts
const maxChars = Math.max(
    1,
    Math.floor(contentWidthPx / (fontSizePx * 0.6)),
);
```

Before each logical group, calculate its required height. Start a continuation
page and repeat `CHARACTERS` when the group does not fit. A character with an
outline is name + wrapped outline lines + one empty line. A character without
an outline is name + one empty line when outline mode is enabled.

Start Places only after all characters. Require room for its heading and first
place before placing the section.

- [ ] **Step 5: Add typed dispatch**

Implement `buildInitialPagePages` with an exhaustive `switch` on
`plan.kind`. The only current case calls
`buildCharactersAndPlacesPages`. Include an exhaustive `never` assertion so
future union members require a renderer.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm test packages/export/src/initialPages/buildCharactersAndPlacesPages.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: layout tests and export typecheck PASS.

### Task 5: Compose Roman numbering, blanks, and odd physical parity

**Files:**

- Create: `packages/export/src/initialPages/romanNumerals.ts`
- Create: `packages/export/src/initialPages/romanNumerals.test.ts`
- Create: `packages/export/src/initialPages/composeLeadingPages.ts`
- Create: `packages/export/src/initialPages/composeLeadingPages.test.ts`
- Modify: `packages/export/src/index.ts`

**Interfaces:**

- Produces:

```ts
export const toLowerRoman = (value: number): string;

export const composeLeadingPages = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
): VisualPage[];
```

- [ ] **Step 1: Write failing Roman conversion tests**

Assert:

```ts
expect([1, 2, 3, 4, 5, 9, 10, 14, 40, 49].map(toLowerRoman))
    .toEqual(['i', 'ii', 'iii', 'iv', 'v', 'ix', 'x', 'xiv', 'xl', 'xlix']);
expect(() => toLowerRoman(0)).toThrow();
```

- [ ] **Step 2: Implement the converter**

Use a descending token table:

```ts
const TOKENS = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
    [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
] as const;
```

Reject non-integers and values below 1.

- [ ] **Step 3: Write failing composition tests**

Stub the initial-page builder with identifiable page lines or expose an
internal page-composition helper to test these exact matrices:

| Initial physical pages | Manual blanks | Result before script | Number labels |
| ---: | ---: | ---: | --- |
| 0 | 0 | 1 balancing blank | none |
| 0 | 1 | 1 manual blank | none |
| 0 | 2 | 3 pages | none |
| 1 | 0 | 1 initial page | `i` |
| 1 | 1 | 3 pages | `i`, `ii`, `iii` |
| 2 | 0 | 3 pages | `i`, `ii`, `iii` |
| 2 | 1 | 3 pages | `i`, `ii`, `iii` |

Repeat a numbered case with `showRomanPageNumbers: false` and assert identical
page count with no Roman footer lines.

With `startEachInitialPageOnOddPage: true`, also assert:

- a blank before the first initial-page group is unnumbered;
- two one-page groups have a Roman-numbered separator blank;
- a two-page overflow group is followed directly by the next group, because
  that group already starts on an odd physical page;
- all pages after the first unnumbered blank continue one Roman sequence.

- [ ] **Step 4: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/initialPages/romanNumerals.test.ts packages/export/src/initialPages/composeLeadingPages.test.ts
```

Expected: converter/composer modules are missing or composition assertions fail.

- [ ] **Step 5: Implement leading-page composition**

Render each `InitialPagePlan` through `buildInitialPagePages` and preserve the
result as a group. When `startEachInitialPageOnOddPage` is enabled, prepend one
unnumbered blank and insert a separator blank before a later group only when
that group would otherwise start on an even physical page. Never split or pad
overflow pages inside one group.

Append `manualBlankCount` empty arrays, then append one empty array when the
resulting length is even.

Only when at least one rendered initial page exists and
`showRomanPageNumbers` is true, append a centered footer `VisualLine` to every
result page except the pre-first blank. Use a 1-based Roman index beginning on
the first initial content page; separator, manual, and final balancing blanks
continue that sequence. Place the footer at the same bottom-center Y used by
the script footer, with body font size and Courier Prime.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm test packages/export/src/initialPages/romanNumerals.test.ts packages/export/src/initialPages/composeLeadingPages.test.ts
pnpm --filter @stagistic/export typecheck
```

Expected: all new pure tests PASS.

### Task 6: Integrate physical pages into the transcript

**Files:**

- Modify: `packages/export/src/transcribeExportPlan.ts`
- Modify: `packages/export/src/transcribeExportPlan.test.ts`

**Interfaces:**

- Consumes `composeLeadingPages(plan.leadingPages, settings)`.
- Keeps `withHeaderFooter` as the independent script-page numbering boundary.

- [ ] **Step 1: Update the local plan fixture**

Replace `pagination.blankPagesBeforeScript` with:

```ts
leadingPages: {
    initialPages: [],
    manualBlankCount: 0,
    showRomanPageNumbers: true,
},
pagination: {
    forcedBreaks: [],
},
```

- [ ] **Step 2: Write failing transcript integration tests**

Assert:

- no configured leading content yields title → unnumbered blank → script;
- the script begins on physical page 3 in that case;
- one Characters page yields title → Characters → script;
- two Characters overflow pages yield title → page i → page ii → balancing
  page iii → script;
- manual and balancing blanks continue Roman numbering when an initial page
  exists;
- manual and balancing blanks have no Roman lines without an initial page;
- hiding Roman numbers does not change physical page count;
- script header/footer page number remains `1.` on its first page.

Identify physical pages by splitting on `__page_break__`.

- [ ] **Step 3: Run and confirm failure**

Run:

```bash
pnpm test packages/export/src/transcribeExportPlan.test.ts
```

Expected: FAIL because the old title/blank concatenation does not use semantic
leading pages or balancing.

- [ ] **Step 4: Refactor final transcript assembly**

Keep script pagination and `withHeaderFooter` unchanged. Replace the old
`breaksAfterTitle` calculation with explicit physical arrays:

```ts
const physicalPages: VisualPage[] = [
    buildTitlePageItems(plan.titlePage, plan.scriptTitle, settings),
    ...composeLeadingPages(plan.leadingPages, settings),
    ...scriptPagesWithHeaderFooter,
];
```

If `withHeaderFooter` currently returns a flat item stream, extract a focused
helper that returns `VisualPage[]`, then flatten once:

```ts
const items = physicalPages.flatMap((page, index) =>
    index === physicalPages.length - 1
        ? page
        : [...page, PAGE_BREAK_ITEM],
);
```

Do not count title or leading pages inside `withHeaderFooter`.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm test packages/export/src
pnpm --filter @stagistic/export typecheck
```

Expected: all export tests and typecheck PASS.

### Task 7: Add sidebar controls and minimum-one blank behaviour

**Files:**

- Create: `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx`
- Create: `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.tsx`
- Create: `packages/app-routes/src/routes/script/export/modules/BlankPagesModule.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/export/modules/modules.module.css`
- Modify: `packages/app-routes/src/routes/script/export/templates/BasicExportTemplate.tsx`

**Interfaces:**

- `InitialPagesModule` consumes `InitialPagesValue`.
- `BlankPagesModule` consumes the revised `BlankPagesValue`.
- Both remain controlled components.

- [ ] **Step 1: Write failing Initial Pages interaction tests**

Render the controlled module in a stateful harness and assert:

- Characters and Places starts enabled;
- Show places starts on and Show character outlines starts off;
- Name starts selected;
- selecting First appearance emits
  `characterOrder: 'first-appearance'`;
- disabling Characters and Places hides or disables its nested controls;
- Show page numbers starts enabled and remains independently controllable.
- Start each initial page on an odd page starts enabled, appears above Show page
  numbers, and remains independently controllable.

- [ ] **Step 2: Write failing Blank Pages interaction tests**

Assert:

- disabled state starts with no count input;
- enabling shows a count of 1;
- entering 0 emits 1;
- entering 11 emits 10;
- disabling retains count 1 but emits `enabled: false`.

- [ ] **Step 3: Run and confirm failure**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser InitialPagesModule BlankPagesModule
```

Expected: FAIL because the new module and revised blank behaviour do not exist.

- [ ] **Step 4: Implement `InitialPagesModule`**

Place the global `Start each initial page on an odd page` switch below the
Initial pages heading, followed by `Show page numbers`. Separate the page list
with a divider. Render `Characters and places` as a bold page-level switch.
Inside it, render separate `Characters` and `Places` subsections.

Use the existing bordered `FormSelect` component for:

```ts
const CHARACTER_ORDER_OPTIONS = [
    {value: 'name', label: 'Name'},
    {value: 'first-appearance', label: 'First appearance'},
] satisfies FormSelectOption[];
```

Render nested controls only when Characters and Places is enabled. Use labels
exactly:

- `Start each initial page on an odd page`
- `Show page numbers`
- `Characters and places`
- `Show places`
- `Show character outlines`
- `Order characters by`

Render `Order characters by` as an inline prefix to the select, using the same
two-column pattern as the block-shortcut prefix. Give each subsection more
space between its heading and controls than between controls themselves.

- [ ] **Step 5: Revise `BlankPagesModule`**

Use a `Switch` labelled `Blank pages`. Show the numeric input only when enabled.
Place the input directly beside its `Count` label. Immediately after it, show a
small muted `+1` with a dashed underline only when the actual rendered
leading-page count requires the automatic blank; include overflow pages in that
calculation. Put the explanation in the existing accessible `Tooltip`, shown on
hover or focus.
Clamp with:

```ts
const clampCount = (value: number) =>
    Math.max(1, Math.min(10, Math.floor(value)));
```

Remove `countsInNumbering`; numbering is derived from initial-page presence.

- [ ] **Step 6: Wire Basic template state**

Extend `cloneDefaults` with deep copies of `initialPages` and the revised blank
spec. Render `InitialPagesModule` before `BlankPagesModule`. Keep
`deriveBasicExportPlan` as the template's derive function.

- [ ] **Step 7: Verify**

Run:

```bash
pnpm --filter @stagistic/app-routes test:browser InitialPagesModule BlankPagesModule
pnpm --filter @stagistic/app-routes typecheck
```

Expected: focused browser tests and app-routes typecheck PASS.

### Task 8: Full verification and real-PDF visual review

**Files:**

- Modify only files implicated by failures introduced by Tasks 1–7.
- Do not alter unrelated snapshots or relax assertions.

- [ ] **Step 1: Run package tests**

Run:

```bash
pnpm test packages/export/src
pnpm test packages/app-routes/src
pnpm --filter @stagistic/app-routes test:browser InitialPagesModule BlankPagesModule
```

Expected: all relevant tests PASS. For any unrelated baseline failure, record
the exact test and leave it unchanged.

- [ ] **Step 2: Run canonical typecheck and lint**

Run:

```bash
npx tsc -b
pnpm lint
```

Expected: no new typecheck or lint errors.

- [ ] **Step 3: Update the code graph**

Run:

```bash
graphify update .
```

Expected: `graphify-out` reflects the new config, plan, renderer, and UI
relationships.

- [ ] **Step 4: Render a representative PDF**

Use an existing local script fixture or the export route to produce a PDF with:

- Characters and Places enabled;
- enough confirmed characters to overflow;
- outlines enabled;
- at least two assigned places;
- one manual blank page;
- Roman numbers enabled.

Save the temporary artifact under `tmp/pdfs/`, render every relevant page with
`pdftoppm -png`, and inspect the PNGs.

- [ ] **Step 5: Verify the rendered pages**

Confirm:

- title page is physical page 1;
- Characters heading repeats on continuation pages;
- outlines are italic and separated from the next character;
- Places follows the final character and remains centered;
- Roman labels are lowercase, centered, sequential, and include numbered blanks;
- the script starts on an odd physical page;
- the first script page still displays script page number 1;
- no content overlaps the Roman footer.

- [ ] **Step 6: Clean temporary artifacts and hand off**

Remove only the PDFs/PNGs created in Step 4. Show:

```bash
git status --short
git diff --stat
```

Report changed files, verification results, any pre-existing failures, and a
suggested commit message. Do not commit.
