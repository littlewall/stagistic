# Export Contents Initial Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Contents` initial page to the export that lists scenes, musical numbers, or both nested, with the script page — and, in the Integrated score template, the integrated score page — where each item starts.

**Architecture:** `deriveBasicExportPlan` produces a semantic `ContentsInitialPagePlan` from the character-filtered document. `transcribeExportPlan` already paginates the script before composing leading pages, so it hands the renderer a `blockId → script page` map; no second pass and no circular dependency. The score-insertion logic inside `drawPdf` is extracted into a pure `planIntegratedAssembly`, which both the PDF writer and the Contents renderer call, so the numbers printed in the contents and the numbers stamped on the pages come from one place.

**Tech Stack:** TypeScript, pnpm workspaces, `vite-plus/test` (Node + browser), jsPDF and pdf-lib for PDF output, React with `@stagistic/ui` for the sidebar.

**Spec:** `docs/superpowers/specs/2026-09-14-export-contents-initial-page-design.md`

## Global Constraints

- **Never commit or push.** AGENTS.md line 5 is absolute. Each task ends by staging files and reporting a proposed commit message; Milan commits.
- Canonical checks: `npx tsc -b`, `pnpm lint` (= `eslint . && stylelint`), `pnpm test`, and `pnpm --filter @stagistic/<pkg> test:browser`. Do **not** use `vp lint` / `vp fmt`. `eslint --fix` is the formatter.
- Never edit or commit `vite.config.js` — it is a gitignored compiled artifact.
- Test imports come from `vite-plus/test`; browser tests live in `*.browser.test.tsx`.
- `SCRIPT_DOCUMENT_SCHEMA_VERSION` must not change. This is export layout and metadata consumption only.
- The editor package has known pre-existing browser-test failures (overlay viewport-fit, cueCaret off-by-one). Do not chase them; do not mutate snapshots or loosen assertions to turn a red green.
- Layout constants, copied verbatim from the spec: heading scale `1.1 ×` body, small text scale `0.85 ×` body, character grid `0.6 em`, column minimum `4` characters, column gutter `3` characters, singer indent `2` body characters, nested-music indent `5` body characters.
- Column headers are the literal strings `script` and `score`. Page headings are the literal strings `SCENES`, `MUSICAL NUMBERS`, `SCENES AND MUSICAL NUMBERS`.
- After the final task, run `graphify update .` to refresh the knowledge graph.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `packages/export/src/initialPages/contents/contentsPageNumbers.ts` | The `ContentsPageNumbers` interface shared by the transcriber and the renderer. Types only. |
| `packages/export/src/initialPages/contents/collectMusicSingers.ts` | Derives the credited singers of one music from lyrics blocks, including group deduplication and ordering. |
| `packages/export/src/initialPages/contents/deriveContentsPlan.ts` | Walks the filtered document and produces the semantic `ContentsInitialPagePlan`. |
| `packages/export/src/initialPages/contents/contentsGeometry.ts` | Page and column geometry for the Contents renderer. |
| `packages/export/src/initialPages/contents/buildContentsPages.ts` | Renders a `ContentsInitialPagePlan` into `VisualPage[]`. |
| `packages/export/src/pdf/planIntegratedAssembly.ts` | Pure planner for score insertion and integrated page numbering. |
| `packages/export/src/pdf/readPdfPageCounts.ts` | Reads page counts from score PDF buffers, keeping pdf-lib inside the export package. |

**Modified:**

| Path | Change |
|---|---|
| `packages/export/src/config.ts` | `ContentsVariant`, `ContentsValue`, defaults. |
| `packages/export/src/plan.ts` | `ContentsInitialPagePlan` and the widened `InitialPagePlan` union. |
| `packages/export/src/deriveBasicExportPlan.ts` | Append the Contents plan, derived from `filteredDoc`. |
| `packages/export/src/deriveIntegratedScoreExportPlan.ts` | Flip `showScoreColumn` to `true`. |
| `packages/export/src/initialPages/buildInitialPagePages.ts` | Register the `contents` builder; thread optional page numbers. |
| `packages/export/src/initialPages/composeLeadingPages.ts` | Thread optional page numbers. |
| `packages/export/src/transcribeExportPlan.ts` | Build the page-number maps; accept `TranscribeOptions`. |
| `packages/export/src/pdf/drawPdf.ts` | Replay `planIntegratedAssembly` steps instead of recomputing inline. |
| `packages/export/src/index.ts` | Export the new modules. |
| `packages/app-routes/src/routes/script/export/useExportPreview.ts` | Load score PDFs and their page counts before transcription. |
| `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx` | Add the Contents switch and variant select. |

---

## Task 1: Config and plan types

**Files:**
- Modify: `packages/export/src/config.ts`
- Modify: `packages/export/src/plan.ts`
- Test: `packages/export/src/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ContentsVariant`, `ContentsValue`, `InitialPagesValue.contents`, `ContentsMusicEntry`, `ContentsSceneEntry`, `ContentsActGroup`, `ContentsInitialPagePlan`, and the widened `InitialPagePlan` union. Every later task depends on these exact names.

- [ ] **Step 1: Write the failing test**

In `packages/export/src/config.test.ts`, extend the existing `BASIC_DEFAULTS` assertion — the current `toEqual` on `initialPages` will fail once the new key exists, so it must be updated in the same edit:

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
            contents: {
                enabled: true,
                variant: 'scenes-and-musical-numbers',
            },
        });
```

And add a new case asserting the Integrated score defaults are a distinct object, not a shared reference:

```ts
describe('INTEGRATED_SCORE_DEFAULTS contents', () => {
    it('clones the contents value instead of sharing it with Basic', () => {
        expect(INTEGRATED_SCORE_DEFAULTS.initialPages.contents).toEqual({
            enabled: true,
            variant: 'scenes-and-musical-numbers',
        });
        expect(INTEGRATED_SCORE_DEFAULTS.initialPages.contents)
            .not.toBe(BASIC_DEFAULTS.initialPages.contents);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test run src/config.test.ts`
Expected: FAIL — `toEqual` mismatch on the missing `contents` key.

- [ ] **Step 3: Add the config types and defaults**

In `packages/export/src/config.ts`, after `CharactersAndPlacesValue`:

```ts
export type ContentsVariant =
    | 'scenes'
    | 'musical-numbers'
    | 'scenes-and-musical-numbers';

export interface ContentsValue {
    enabled: boolean,
    variant: ContentsVariant,
}
```

Add `contents: ContentsValue,` to `InitialPagesValue`. Add to `BASIC_DEFAULTS.initialPages`:

```ts
        contents: {
            enabled: true,
            variant: 'scenes-and-musical-numbers',
        },
```

And in `INTEGRATED_SCORE_DEFAULTS.initialPages`, alongside the existing `charactersAndPlaces` clone:

```ts
        contents: {...BASIC_DEFAULTS.initialPages.contents},
```

- [ ] **Step 4: Add the plan types**

In `packages/export/src/plan.ts`, import the variant type and add the new interfaces above the `InitialPagePlan` union:

```ts
import type {ContentsVariant} from './config';

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
```

Replace the union:

```ts
export type InitialPagePlan =
    | CharactersAndPlacesInitialPagePlan
    | ContentsInitialPagePlan;
```

The page heading is derived from `variant` at render time, never stored, so the two cannot drift.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @stagistic/export test run src/config.test.ts && npx tsc -b`
Expected: config test PASSES. `tsc` reports an error in `buildInitialPagePages.ts` — the `BUILDERS` map no longer covers every union member. That is expected and is fixed in Task 6; leave it.

- [ ] **Step 6: Stage and report**

```bash
git add packages/export/src/config.ts packages/export/src/plan.ts packages/export/src/config.test.ts
```

Proposed message: `feat(export): add contents initial page config and plan types`

Report to Milan that `tsc -b` is intentionally red on `buildInitialPagePages.ts` until Task 6.

---

## Task 2: Singer derivation

**Files:**
- Create: `packages/export/src/initialPages/contents/collectMusicSingers.ts`
- Test: `packages/export/src/initialPages/contents/collectMusicSingers.test.ts`

**Interfaces:**
- Consumes: `ExportCharacter` and `ExportCharacterGroup` from `../../scriptData`; `DerivedMusic` and `IndexedScriptBlock` from `@stagistic/script`.
- Produces: `collectMusicSingers(music: DerivedMusic, input: MusicSingerInput): string[]` and `interface MusicSingerInput {blocks: IndexedScriptBlock[], characters: ExportCharacter[], groups: ExportCharacterGroup[]}`. Task 3 calls this.

Background the implementer needs: `IndexedScriptBlock` comes from `buildScriptBlockIndex` and carries `blockId`, `orderNo`, `blockType`, `textContent`, `actBlockId`, `sceneBlockId`, and `characterRefs`. A `character` block's `characterRefs` already splits multi-name cues such as `KYLIE AND SHANE` into separate keys. `ExportCharacter.key` is normalized and `displayName` is already title-cased by the app layer. `ExportCharacterGroup.memberIds` holds catalog character ids.

- [ ] **Step 1: Write the failing test**

```ts
import type {
    DerivedMusic,
    IndexedScriptBlock,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {collectMusicSingers} from './collectMusicSingers';

const block = (
    blockId: string,
    blockType: string,
    keys: string[] = [],
): IndexedScriptBlock => ({
    blockId,
    orderNo: 0,
    blockType,
    textContent: '',
    actBlockId: null,
    sceneBlockId: null,
    characterRefs: keys.length > 0
        ? keys.map(key => ({key, characterId: null}))
        : null,
});

const music = (
    startBlockId: string,
    effectiveEndBlockId: string,
    kind: string | null = 'song',
): DerivedMusic => ({
    musicId: 'm1',
    sceneNumber: 1,
    indexInScene: 0,
    sceneMusicCount: 1,
    mode: 'open',
    title: 'Song',
    kind,
    startBlockId,
    endBlockId: effectiveEndBlockId,
    effectiveEndBlockId,
    endKind: 'explicit',
});

const characters = [
    {id: 'c-kylie', key: 'KYLIE', displayName: 'Kylie'},
    {id: 'c-shane', key: 'SHANE', displayName: 'Shane'},
    {id: 'c-whit', key: 'WHIT', displayName: 'Whit'},
];

describe('collectMusicSingers', () => {
    it('orders singers by lyrics-block count, descending', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['SHANE']),
            block('l1', 'lyrics'),
            block('cue2', 'character', ['KYLIE']),
            block('l2', 'lyrics'),
            block('l3', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Kylie', 'Shane']);
    });

    it('credits every name in a multi-name cue', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE', 'SHANE']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Kylie', 'Shane']);
    });

    it('stops a cue from carrying across a scene boundary', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('scene1', 'scene'),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual([]);
    });

    it('includes singers that are not in the confirmed catalog', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['JEROD']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Jerod']);
    });

    it('drops a group whose every member already sings individually', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('l1', 'lyrics'),
            block('cue2', 'character', ['SHANE']),
            block('l2', 'lyrics'),
            block('cue3', 'character', ['EVERYONE']),
            block('l3', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks,
            characters,
            groups: [{id: 'g1', key: 'EVERYONE', memberIds: ['c-kylie', 'c-shane']}],
        })).toEqual(['Kylie', 'Shane']);
    });

    it('keeps a group when only some members sing individually', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('l1', 'lyrics'),
            block('cue2', 'character', ['EVERYONE']),
            block('l2', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks,
            characters,
            groups: [{id: 'g1', key: 'EVERYONE', memberIds: ['c-kylie', 'c-whit']}],
        })).toEqual(['Kylie', 'Everyone']);
    });

    it('keeps a group that has no members', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['EVERYONE']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks,
            characters,
            groups: [{id: 'g1', key: 'EVERYONE', memberIds: []}],
        })).toEqual(['Everyone']);
    });

    it('ignores lyrics outside the music range', () => {
        const blocks = [
            block('before', 'character', ['WHIT']),
            block('beforeLyrics', 'lyrics'),
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
            block('after', 'lyrics'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Kylie']);
    });

    it('returns nothing when the range cannot be resolved', () => {
        expect(collectMusicSingers(music('missing', 'end'), {
            blocks: [block('end', 'stageDirection')], characters, groups: [],
        })).toEqual([]);
    });
});
```

Note on the `keeps a group when only some members sing individually` case: both
singers have one lyrics block, so the count ties and the tie breaks on first
appearance. `KYLIE` sings at `l1` and `EVERYONE` at `l2`, hence
`['Kylie', 'Everyone']`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/collectMusicSingers.test.ts`
Expected: FAIL — cannot resolve `./collectMusicSingers`.

- [ ] **Step 3: Implement**

```ts
import {
    type DerivedMusic,
    type IndexedScriptBlock,
    normalizeCharacterKey,
} from '@stagistic/script';

import type {
    ExportCharacter,
    ExportCharacterGroup,
} from '../../scriptData';

export interface MusicSingerInput {
    blocks: IndexedScriptBlock[],
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
}

interface SingerAccumulator {
    id: string,
    displayName: string,
    memberIds: string[] | null,
    count: number,
    firstOrder: number,
}

const toDisplayName = (key: string) => key
    .toLowerCase()
    .replace(/(^|\s)\S/gu, match => match.toUpperCase());

/**
 * Cue keys in effect at each block position: the nearest preceding character
 * block, cleared at every act and scene boundary so a cue never leaks into the
 * next scene.
 */
const buildCueKeysByPosition = (blocks: IndexedScriptBlock[]): string[][] => {
    let current: string[] = [];

    return blocks.map(block => {
        if (block.blockType === 'act' || block.blockType === 'scene') {
            current = [];
        } else if (block.blockType === 'character') {
            current = (block.characterRefs ?? [])
                .map(ref => normalizeCharacterKey(ref.key))
                .filter(key => key.length > 0);
        }

        return current;
    });
};

export const collectMusicSingers = (
    music: DerivedMusic,
    {
        blocks,
        characters,
        groups,
    }: MusicSingerInput,
): string[] => {
    const startIndex = blocks.findIndex(block => block.blockId === music.startBlockId);
    const endIndex = blocks.findIndex(block => block.blockId === music.effectiveEndBlockId);

    if (startIndex < 0 || endIndex < startIndex) {
        return [];
    }

    const cueKeys = buildCueKeysByPosition(blocks);
    const groupByKey = new Map(groups.map(group => [normalizeCharacterKey(group.key), group]));
    const characterByKey = new Map(characters.map(character => [
        normalizeCharacterKey(character.key),
        character,
    ]));
    const singers = new Map<string, SingerAccumulator>();

    for (let index = startIndex; index <= endIndex; index += 1) {
        if (blocks[index].blockType !== 'lyrics') {
            continue;
        }

        cueKeys[index].forEach(key => {
            const existing = singers.get(key);

            if (existing) {
                existing.count += 1;

                return;
            }

            const group = groupByKey.get(key);
            const character = characterByKey.get(key);

            singers.set(key, {
                id: group?.id ?? character?.id ?? `unconfirmed:${key}`,
                displayName: character?.displayName ?? toDisplayName(key),
                memberIds: group ? group.memberIds : null,
                count: 1,
                firstOrder: index,
            });
        });
    }

    const individualIds = new Set(
        [...singers.values()]
            .filter(singer => singer.memberIds === null)
            .map(singer => singer.id),
    );

    return [...singers.values()]
        .filter(singer => !(
            singer.memberIds !== null
            && singer.memberIds.length > 0
            && singer.memberIds.every(id => individualIds.has(id))
        ))
        .sort((left, right) => right.count - left.count
            || left.firstOrder - right.firstOrder
            || left.displayName.localeCompare(right.displayName))
        .map(singer => singer.displayName);
};
```

The `memberIds.length > 0` guard matters: `[].every(...)` is `true`, so a group with no members would otherwise always vanish.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/collectMusicSingers.test.ts`
Expected: PASS, 9 cases.

- [ ] **Step 5: Lint**

Run: `npx eslint packages/export/src/initialPages/contents --fix && npx eslint packages/export/src/initialPages/contents`
Expected: no errors.

- [ ] **Step 6: Stage and report**

```bash
git add packages/export/src/initialPages/contents/collectMusicSingers.ts packages/export/src/initialPages/contents/collectMusicSingers.test.ts
```

Proposed message: `feat(export): derive music singers from lyrics blocks`

---

## Task 3: Contents plan derivation

**Files:**
- Create: `packages/export/src/initialPages/contents/deriveContentsPlan.ts`
- Test: `packages/export/src/initialPages/contents/deriveContentsPlan.test.ts`

**Interfaces:**
- Consumes: `collectMusicSingers` and `MusicSingerInput` from Task 2; `ContentsValue` and the plan types from Task 1.
- Produces: `deriveContentsPlan(value: ContentsValue, doc: ScriptDocument, characters: ExportCharacter[], groups: ExportCharacterGroup[]): ContentsInitialPagePlan | null`. Task 4 calls this.

Background: `buildScriptBlockIndex(doc).snapshot` yields both `blocks` (ordered, with `actBlockId`/`sceneBlockId`) and `music` (a `DerivedMusic[]` from `deriveMusicTimeline`). Act names use `normalizeActName(text) || getDefaultActName(n)`, matching `buildScriptStructureOutline`. Music must be attached to the act and scene its start block physically sits in — **not** via `DerivedMusic.sceneNumber`, which is a global counter that only advances on scene blocks and would file an overture under a scene in the previous act.

- [ ] **Step 1: Write the failing test**

```ts
import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    block,
    text,
} from '../../testUtils';
import {deriveContentsPlan} from './deriveContentsPlan';

const MUSIC_ID_ATTR = 'musicId';

const musicStart = (
    blockId: string,
    musicId: string,
    title: string,
    kind: string | null = 'song',
    mode = 'open',
) => ({
    type: 'stageDirection',
    attrs: {id: blockId, blockType: 'stageDirection'},
    content: [
        {
            type: 'musicStart',
            attrs: {
                [MUSIC_ID_ATTR]: musicId, mode, title, kind,
            },
        },
    ],
});

const cue = (blockId: string, key: string) => ({
    type: 'character',
    attrs: {id: blockId, blockType: 'character', characterRefs: {[key]: null}},
    content: [text(key)],
});

const doc = (content: ScriptDocument['content']): ScriptDocument => ({type: 'doc', content});

const enabled = {enabled: true, variant: 'scenes-and-musical-numbers'} as const;

describe('deriveContentsPlan', () => {
    it('returns null when disabled', () => {
        expect(deriveContentsPlan(
            {enabled: false, variant: 'scenes'},
            doc([block('scene', 's1', 'The Diner')]),
            [],
            [],
        )).toBeNull();
    });

    it('numbers scenes continuously across acts', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'The Diner'),
            block('scene', 's2', 'The Rooftop'),
            block('act', 'a2', 'ACT TWO'),
            block('scene', 's3', 'The Alley'),
        ]), [], []);

        expect(plan?.acts.map(act => act.name)).toEqual(['ACT ONE', 'ACT TWO']);
        expect(plan?.acts[0].scenes.map(scene => scene.sceneNumber)).toEqual([1, 2]);
        expect(plan?.acts[1].scenes.map(scene => scene.sceneNumber)).toEqual([3]);
    });

    it('files music before an act first scene as preSceneMusic of that act', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'The Diner'),
            block('act', 'a2', 'ACT TWO'),
            musicStart('m1', 'music-1', 'Entracte', 'instrumental'),
            block('scene', 's2', 'The Alley'),
        ]), [], []);

        expect(plan?.acts[1].preSceneMusic.map(entry => entry.title)).toEqual(['Entracte']);
        expect(plan?.acts[1].scenes[0].music).toEqual([]);
    });

    it('keeps only open music', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
            musicStart('m1', 'music-1', 'A Song'),
            musicStart('m2', 'music-2', 'A Sting', 'song', 'hit'),
        ]), [], []);

        expect(plan?.acts[0].scenes[0].music.map(entry => entry.title)).toEqual(['A Song']);
    });

    it('marks music instrumental by kind and by absent lyrics', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
            musicStart('m1', 'music-1', 'Underscore', 'instrumental'),
            block('stageDirection', 'sd1', 'Music out.'),
            musicStart('m2', 'music-2', 'Silent Song'),
            block('stageDirection', 'sd2', 'Music out.'),
        ]), [], []);
        const [first, second] = plan!.acts[0].scenes[0].music;

        expect(first.isInstrumental).toBe(true);
        expect(second.isInstrumental).toBe(true);
        expect(second.singers).toEqual([]);
    });

    it('credits singers and uses the script music number', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
            musicStart('m1', 'music-1', 'A Song'),
            cue('c1', 'KYLIE'),
            block('lyrics', 'l1', 'La la'),
            block('stageDirection', 'sd1', 'Music out.'),
        ]), [{id: 'c-kylie', key: 'KYLIE', displayName: 'Kylie'}], []);
        const [entry] = plan!.acts[0].scenes[0].music;

        expect(entry.singers).toEqual(['Kylie']);
        expect(entry.isInstrumental).toBe(false);
        expect(entry.number).toBe('1)');
    });

    it('uses a nameless act group when the script has no acts', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
        ]), [], []);

        expect(plan?.acts).toHaveLength(1);
        expect(plan?.acts[0].name).toBeNull();
    });

    it('falls back to placeholder titles', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('act', 'a1', ''),
            block('scene', 's1', ''),
        ]), [], []);

        expect(plan?.acts[0].name).toBe('ACT 1');
        expect(plan?.acts[0].scenes[0].title).toBe('Untitled scene');
    });

    it('returns null when the variant has nothing to list', () => {
        const scenesOnly = doc([block('scene', 's1', 'The Diner')]);

        expect(deriveContentsPlan(
            {enabled: true, variant: 'musical-numbers'},
            scenesOnly,
            [],
            [],
        )).toBeNull();
        expect(deriveContentsPlan(
            {enabled: true, variant: 'scenes'},
            scenesOnly,
            [],
            [],
        )).not.toBeNull();
    });

    it('defaults showScoreColumn to false', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
        ]), [], []);

        expect(plan?.showScoreColumn).toBe(false);
        expect(plan?.variant).toBe('scenes-and-musical-numbers');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/deriveContentsPlan.test.ts`
Expected: FAIL — cannot resolve `./deriveContentsPlan`.

- [ ] **Step 3: Implement**

```ts
import {
    buildScriptBlockIndex,
    type DerivedMusic,
    formatMusicNumber,
    getDefaultActName,
    type IndexedScriptBlock,
    normalizeActName,
    type ScriptDocument,
} from '@stagistic/script';

import type {ContentsValue} from '../../config';
import type {
    ContentsActGroup,
    ContentsInitialPagePlan,
    ContentsMusicEntry,
    ContentsSceneEntry,
} from '../../plan';
import type {
    ExportCharacter,
    ExportCharacterGroup,
} from '../../scriptData';
import {collectMusicSingers} from './collectMusicSingers';

const UNTITLED_SCENE = 'Untitled scene';
const UNTITLED_MUSIC = 'Untitled music';

const groupOpenMusicByStartBlock = (music: DerivedMusic[]) => {
    const byBlockId = new Map<string, DerivedMusic[]>();

    music
        .filter(item => item.mode === 'open')
        .forEach(item => {
            const existing = byBlockId.get(item.startBlockId) ?? [];

            existing.push(item);
            byBlockId.set(item.startBlockId, existing);
        });

    return byBlockId;
};

const toMusicEntry = (
    music: DerivedMusic,
    blocks: IndexedScriptBlock[],
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
): ContentsMusicEntry => {
    const singers = collectMusicSingers(music, {
        blocks, characters, groups,
    });
    const isInstrumental = music.kind === 'instrumental' || singers.length === 0;

    return {
        musicId: music.musicId,
        number: formatMusicNumber(music),
        title: music.title || UNTITLED_MUSIC,
        singers: isInstrumental ? [] : singers,
        isInstrumental,
        startBlockId: music.startBlockId,
    };
};

export const deriveContentsPlan = (
    value: ContentsValue,
    doc: ScriptDocument,
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
): ContentsInitialPagePlan | null => {
    if (!value.enabled) {
        return null;
    }

    const {snapshot} = buildScriptBlockIndex(doc);
    const {blocks} = snapshot;
    const openMusicByStartBlock = groupOpenMusicByStartBlock(snapshot.music);
    const acts: ContentsActGroup[] = [];
    let currentAct: ContentsActGroup | null = null;
    let currentScene: ContentsSceneEntry | null = null;
    let actCounter = 0;
    let sceneNumber = 0;

    const ensureAct = (): ContentsActGroup => {
        if (!currentAct) {
            currentAct = {
                name: null, preSceneMusic: [], scenes: [],
            };
            acts.push(currentAct);
        }

        return currentAct;
    };

    blocks.forEach(block => {
        if (block.blockType === 'act') {
            actCounter += 1;
            currentAct = {
                name: normalizeActName(block.textContent) || getDefaultActName(actCounter),
                preSceneMusic: [],
                scenes: [],
            };
            acts.push(currentAct);
            currentScene = null;
        } else if (block.blockType === 'scene') {
            sceneNumber += 1;
            currentScene = {
                sceneNumber,
                title: block.textContent || UNTITLED_SCENE,
                startBlockId: block.blockId,
                music: [],
            };
            ensureAct().scenes.push(currentScene);
        }

        (openMusicByStartBlock.get(block.blockId) ?? []).forEach(music => {
            const entry = toMusicEntry(music, blocks, characters, groups);

            if (currentScene) {
                currentScene.music.push(entry);

                return;
            }

            ensureAct().preSceneMusic.push(entry);
        });
    });

    const populated = acts.filter(act => act.scenes.length > 0 || act.preSceneMusic.length > 0);
    const hasScenes = populated.some(act => act.scenes.length > 0);
    const hasMusic = populated.some(act => act.preSceneMusic.length > 0
        || act.scenes.some(scene => scene.music.length > 0));
    const hasContent = value.variant === 'scenes'
        ? hasScenes
        : value.variant === 'musical-numbers' ? hasMusic : hasScenes || hasMusic;

    if (!hasContent) {
        return null;
    }

    return {
        kind: 'contents',
        variant: value.variant,
        acts: populated,
        showScoreColumn: false,
    };
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/`
Expected: PASS.

- [ ] **Step 5: Lint and stage**

Run: `npx eslint packages/export/src/initialPages/contents --fix && npx eslint packages/export/src/initialPages/contents`

```bash
git add packages/export/src/initialPages/contents/deriveContentsPlan.ts packages/export/src/initialPages/contents/deriveContentsPlan.test.ts
```

Proposed message: `feat(export): derive the contents initial page plan`

---

## Task 4: Wire the plan into both templates

**Files:**
- Modify: `packages/export/src/deriveBasicExportPlan.ts`
- Modify: `packages/export/src/deriveIntegratedScoreExportPlan.ts`
- Test: `packages/export/src/deriveBasicExportPlan.test.ts`
- Test: `packages/export/src/deriveIntegratedScoreExportPlan.test.ts`

**Interfaces:**
- Consumes: `deriveContentsPlan` from Task 3.
- Produces: `plan.leadingPages.initialPages` now contains a `contents` entry after the `characters-and-places` entry, with `showScoreColumn: true` only from `deriveIntegratedScoreExportPlan`.

The existing fixtures in both test files set `initialCharacters: []` and will need `contents` added to whatever config they pass; they build config from `BASIC_DEFAULTS`, so no fixture change is needed beyond the new assertions.

- [ ] **Step 1: Write the failing tests**

In `deriveBasicExportPlan.test.ts`:

```ts
    it('appends a contents page after characters and places', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...baseScript(),
            doc: {
                type: 'doc',
                content: [
                    block('act', 'a1', 'ACT ONE'),
                    block('scene', 's1', 'The Diner'),
                ],
            },
        });

        expect(plan.leadingPages.initialPages.map(page => page.kind))
            .toEqual(['characters-and-places', 'contents']);
        expect(plan.leadingPages.initialPages[1]).toMatchObject({
            kind: 'contents',
            variant: 'scenes-and-musical-numbers',
            showScoreColumn: false,
        });
    });

    it('derives contents from the character-filtered document', () => {
        const plan = deriveBasicExportPlan({
            ...BASIC_DEFAULTS,
            characterFilter: {
                mode: 'only',
                characterIds: ['c-alice'],
                preserveFullScriptPagination: true,
            },
        }, {
            ...baseScript(),
            characters: [{id: 'c-alice', key: 'ALICE', displayName: 'Alice'}],
            doc: {
                type: 'doc',
                content: [
                    block('scene', 's1', 'Alice Scene'),
                    block('stageDirection', 'sd1', '@ALICE waits.'),
                    block('scene', 's2', 'Bob Scene'),
                    block('stageDirection', 'sd2', '@BOB waits.'),
                ],
            },
        });
        const contents = plan.leadingPages.initialPages
            .find(page => page.kind === 'contents');

        expect(contents?.kind).toBe('contents');
        expect(contents?.kind === 'contents'
            ? contents.acts[0].scenes.map(scene => scene.title)
            : []).toEqual(['Alice Scene']);
    });
```

Reuse the file's existing `block` helper import from `./testUtils` and its existing script fixture factory; if the file inlines its fixture rather than exposing `baseScript()`, extract it into a local `baseScript()` factory as part of this step.

In `deriveIntegratedScoreExportPlan.test.ts`:

```ts
    it('turns on the contents score column', () => {
        const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, {
            ...baseScript(),
            doc: {
                type: 'doc',
                content: [block('scene', 's1', 'The Diner')],
            },
        });
        const contents = plan.leadingPages.initialPages
            .find(page => page.kind === 'contents');

        expect(contents?.kind === 'contents' ? contents.showScoreColumn : null).toBe(true);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @stagistic/export test run src/deriveBasicExportPlan.test.ts src/deriveIntegratedScoreExportPlan.test.ts`
Expected: FAIL — `initialPages` contains only `characters-and-places`.

- [ ] **Step 3: Implement in deriveBasicExportPlan**

Add the import:

```ts
import {deriveContentsPlan} from './initialPages/contents/deriveContentsPlan';
```

After the existing `const charactersAndPlaces = buildCharactersAndPlacesPlan(config, script);` line, add:

```ts
    const contents = deriveContentsPlan(
        config.initialPages.contents,
        filteredDoc,
        script.characters,
        script.groups,
    );
```

`filteredDoc` is already in scope. Using it — rather than `doc` — is what makes the character filter apply once, at derivation, including in the `preserveFullScriptPagination: true` case where `doc` is the full document.

Replace the `initialPages` value in the returned object:

```ts
            initialPages: [
                ...charactersAndPlaces ? [charactersAndPlaces] : [],
                ...contents ? [contents] : [],
            ],
```

- [ ] **Step 4: Implement in deriveIntegratedScoreExportPlan**

Replace the final `return {...plan, postSteps};` with:

```ts
    return {
        ...plan,
        leadingPages: {
            ...plan.leadingPages,
            initialPages: plan.leadingPages.initialPages.map(page => page.kind === 'contents'
                ? {...page, showScoreColumn: true}
                : page),
        },
        postSteps,
    };
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @stagistic/export test run`
Expected: the two new cases PASS. `buildInitialPagePages` still fails to typecheck; that is Task 6.

- [ ] **Step 6: Lint and stage**

```bash
git add packages/export/src/deriveBasicExportPlan.ts packages/export/src/deriveIntegratedScoreExportPlan.ts packages/export/src/deriveBasicExportPlan.test.ts packages/export/src/deriveIntegratedScoreExportPlan.test.ts
```

Proposed message: `feat(export): add the contents page to both export templates`

---

## Task 5: Integrated assembly planner

**Files:**
- Create: `packages/export/src/pdf/planIntegratedAssembly.ts`
- Test: `packages/export/src/pdf/planIntegratedAssembly.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `planIntegratedAssembly`, `IntegratedAssemblyScore`, `IntegratedAssemblyStep`, `IntegratedAssemblyPlan`. Tasks 7 and 8 call this.

This is a faithful extraction of the logic currently inlined in `drawPdf.ts:167-256`. Preserve two asymmetries from that code exactly, or the existing PDF output changes:

1. `requireOddBookPage` is set from **every** score's `afterBlockId` page, whether or not the score has a PDF.
2. Score pages are only inserted for scores that actually have pages.

The planner takes **no** leading page count. `composeLeadingPages` guarantees an odd number of leading pages, so title plus leading pages is always even and the parity the planner reasons about is unaffected by front matter. Integrated numbers are likewise invariant, because `drawPdf` numbers with `index - leadingPages + 1` and every script-side page shifts by exactly `leadingPages`.

- [ ] **Step 1: Write the failing test**

```ts
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {planIntegratedAssembly} from './planIntegratedAssembly';

const kinds = (steps: ReturnType<typeof planIntegratedAssembly>['steps']) => steps.map(step => step.kind);

describe('planIntegratedAssembly', () => {
    it('passes script pages straight through when there are no scores', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['b1'], ['b2'], ['b3']],
            scores: [],
        });

        expect(kinds(plan.steps)).toEqual(['script', 'script', 'script']);
        expect(plan.scoreStartPageByMusicId.size).toBe(0);
    });

    it('inserts a score on an odd book page and reports its number', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['start'], ['end']],
            scores: [{
                musicId: 'm1', startBlockId: 'start', afterBlockId: 'end', pageCount: 2,
            }],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'score',
            'score',
        ]);
        expect(plan.scoreStartPageByMusicId.get('m1')).toBe(4);
    });

    it('forces an odd book page after the music start page', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['intro'], ['start'], ['mid'], ['end']],
            scores: [{
                musicId: 'm1', startBlockId: 'start', afterBlockId: 'end', pageCount: 1,
            }],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'script',
            'script',
            'blank',
            'score',
        ]);
        expect(plan.scoreStartPageByMusicId.get('m1')).toBe(7);
    });

    it('uses the last page a music ends on', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['end'], ['end', 'other']],
            scores: [{
                musicId: 'm1', startBlockId: 'end', afterBlockId: 'end', pageCount: 1,
            }],
        });

        expect(kinds(plan.steps)).toEqual(['script', 'script', 'blank', 'score']);
    });

    it('reserves the odd book page for a score with no pages but inserts nothing', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['start'], ['end'], ['after']],
            scores: [{
                musicId: 'm1', startBlockId: 'start', afterBlockId: 'end', pageCount: 0,
            }],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'script',
        ]);
        expect(plan.scoreStartPageByMusicId.has('m1')).toBe(false);
    });

    it('ignores scores whose blocks are not on any page', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['b1']],
            scores: [{
                musicId: 'm1', startBlockId: 'gone', afterBlockId: 'gone', pageCount: 3,
            }],
        });

        expect(kinds(plan.steps)).toEqual(['script']);
        expect(plan.scoreStartPageByMusicId.size).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test run src/pdf/planIntegratedAssembly.test.ts`
Expected: FAIL — cannot resolve `./planIntegratedAssembly`.

- [ ] **Step 3: Implement**

```ts
export interface IntegratedAssemblyScore {
    musicId: string,
    startBlockId: string,
    afterBlockId: string,
    pageCount: number,
}

export interface IntegratedAssemblyStep {
    kind: 'blank' | 'script' | 'score',
    /** Generated script page index, for 'script' steps. */
    scriptPageIndex?: number,
    /** Owning music, for 'score' steps. */
    musicId?: string,
    /** 0-based page offset inside the score PDF, for 'score' steps. */
    scorePageIndex?: number,
}

export interface IntegratedAssemblyPlan {
    steps: IntegratedAssemblyStep[],
    /** 1-based integrated page number of each music's first score page. */
    scoreStartPageByMusicId: Map<string, number>,
}

/**
 * Plans the Integrated score page order without touching pdf-lib, so the
 * Contents page and the PDF writer derive their numbers from one place.
 *
 * Front matter is deliberately absent: composeLeadingPages keeps the leading
 * page count odd, so with the title page it is always even, leaving both the
 * odd/even parity and the integrated numbering unaffected by it.
 */
export const planIntegratedAssembly = ({
    scriptPageSourceBlockIds,
    scores,
}: {
    scriptPageSourceBlockIds: string[][],
    scores: IntegratedAssemblyScore[],
}): IntegratedAssemblyPlan => {
    const firstPageIndexOf = (blockId: string) => scriptPageSourceBlockIds
        .findIndex(sourceIds => sourceIds.includes(blockId));
    const lastPageIndexOf = (blockId: string) => scriptPageSourceBlockIds
        .reduce((last, sourceIds, index) => sourceIds.includes(blockId) ? index : last, -1);

    const musicStartPageIndexes = new Set<number>();
    const afterPageIndexes = new Set<number>();
    const scoresAfterPage = new Map<number, IntegratedAssemblyScore[]>();

    scores.forEach(score => {
        const startPageIndex = firstPageIndexOf(score.startBlockId);

        if (startPageIndex >= 0) {
            musicStartPageIndexes.add(startPageIndex + 1);
        }

        const afterPageIndex = lastPageIndexOf(score.afterBlockId);

        if (afterPageIndex < 0) {
            return;
        }

        afterPageIndexes.add(afterPageIndex);

        if (score.pageCount <= 0) {
            return;
        }

        const existing = scoresAfterPage.get(afterPageIndex) ?? [];

        existing.push(score);
        scoresAfterPage.set(afterPageIndex, existing);
    });

    const steps: IntegratedAssemblyStep[] = [];
    const scoreStartPageByMusicId = new Map<string, number>();
    const nextWouldBeEven = () => (steps.length + 1) % 2 === 0;
    let requireOddBookPage = false;

    for (let pageIndex = 0; pageIndex < scriptPageSourceBlockIds.length; pageIndex += 1) {
        if (musicStartPageIndexes.has(pageIndex) && nextWouldBeEven()) {
            steps.push({kind: 'blank'});
        }

        if (requireOddBookPage && nextWouldBeEven()) {
            steps.push({kind: 'blank'});
        }

        requireOddBookPage = false;
        steps.push({kind: 'script', scriptPageIndex: pageIndex});

        if (afterPageIndexes.has(pageIndex)) {
            requireOddBookPage = true;
        }

        (scoresAfterPage.get(pageIndex) ?? []).forEach(score => {
            if (nextWouldBeEven()) {
                steps.push({kind: 'blank'});
            }

            scoreStartPageByMusicId.set(score.musicId, steps.length + 1);

            for (let offset = 0; offset < score.pageCount; offset += 1) {
                steps.push({
                    kind: 'score', musicId: score.musicId, scorePageIndex: offset,
                });
            }
        });
    }

    return {steps, scoreStartPageByMusicId};
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @stagistic/export test run src/pdf/planIntegratedAssembly.test.ts`
Expected: PASS, 6 cases.

- [ ] **Step 5: Lint and stage**

```bash
git add packages/export/src/pdf/planIntegratedAssembly.ts packages/export/src/pdf/planIntegratedAssembly.test.ts
```

Proposed message: `refactor(export): extract a pure integrated assembly planner`

---

## Task 6: Contents renderer — geometry, headings, and the scenes variant

**Files:**
- Create: `packages/export/src/initialPages/contents/contentsPageNumbers.ts`
- Create: `packages/export/src/initialPages/contents/contentsGeometry.ts`
- Create: `packages/export/src/initialPages/contents/buildContentsPages.ts`
- Modify: `packages/export/src/initialPages/buildInitialPagePages.ts`
- Modify: `packages/export/src/initialPages/composeLeadingPages.ts`
- Test: `packages/export/src/initialPages/contents/buildContentsPages.test.ts`

**Interfaces:**
- Consumes: plan types from Task 1.
- Produces:
  - `interface ContentsPageNumbers {scriptPageNumberByBlockId: Map<string, number>, scoreStartPageByMusicId: Map<string, number>}`
  - `createContentsGeometry(settings: EditorSettings, showScoreColumn: boolean): ContentsGeometry`
  - `buildContentsPages(plan: ContentsInitialPagePlan, settings: EditorSettings, pageNumbers?: ContentsPageNumbers): VisualPage[]`
  - `buildInitialPagePages(plan, settings, pageNumbers?)` and `composeLeadingPages(plan, settings, pageNumbers?)` — both gain an optional third parameter.

This task also closes the `tsc` error opened in Task 1.

The page-number argument is optional at every hop because `willAddAutomaticBalancingBlank` renders initial pages from the plan alone, with no transcript in hand. Combined with fixed column widths, the Contents page occupies the same number of pages either way, so the sidebar's `+1` indicator stays exact.

- [ ] **Step 1: Write the failing test**

```ts
import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ContentsInitialPagePlan} from '../../plan';
import type {VisualLine} from '../../visualLine';
import {buildContentsPages} from './buildContentsPages';

const SETTINGS = DEFAULT_EDITOR_SETTINGS;
const BODY = SETTINGS.typography.fontSizePx;
const CHAR = BODY * 0.6;
const CONTENT_RIGHT = SETTINGS.page.widthPx - SETTINGS.page.marginRightPx;
const CONTENT_LEFT = SETTINGS.page.marginLeftPx;

const textOf = (line: VisualLine) => line.runs.map(run => run.text).join('');
const findLine = (page: VisualLine[], value: string) => {
    const line = page.find(item => textOf(item) === value);

    expect(line).toBeDefined();

    return line!;
};
const runWithText = (page: VisualLine[], value: string) => {
    const run = page.flatMap(line => line.runs).find(item => item.text === value);

    expect(run).toBeDefined();

    return run!;
};

const scenesPlan = (
    patch: Partial<ContentsInitialPagePlan> = {},
): ContentsInitialPagePlan => ({
    kind: 'contents',
    variant: 'scenes',
    showScoreColumn: false,
    acts: [
        {
            name: 'ACT ONE',
            preSceneMusic: [],
            scenes: [
                {
                    sceneNumber: 1, title: "Kylie's Bedroom", startBlockId: 's1', music: [],
                }, {
                    sceneNumber: 2, title: 'The Diner', startBlockId: 's2', music: [],
                },
            ],
        },
    ],
    ...patch,
});

const pageNumbers = (scriptPages: Record<string, number>) => ({
    scriptPageNumberByBlockId: new Map(Object.entries(scriptPages)),
    scoreStartPageByMusicId: new Map<string, number>(),
});

describe('buildContentsPages scenes variant', () => {
    it('centers the variant heading in bold at heading scale', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);
        const heading = findLine(page, 'SCENES');

        expect(heading.runs[0]).toMatchObject({
            bold: true,
            fontSizePx: BODY * 1.1,
            x: (SETTINGS.page.widthPx - 'SCENES'.length * BODY * 1.1 * 0.6) / 2,
        });
    });

    it('centers the act heading at body size in bold', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);

        expect(findLine(page, 'ACT ONE').runs[0]).toMatchObject({
            bold: true,
            fontSizePx: BODY,
        });
    });

    it('omits the act heading when the act has no name', () => {
        const [page] = buildContentsPages(scenesPlan({
            acts: [{...scenesPlan().acts[0], name: null}],
        }), SETTINGS);

        expect(page.some(line => textOf(line) === 'ACT ONE')).toBe(false);
        expect(page.some(line => textOf(line).includes('The Diner'))).toBe(true);
    });

    it('draws an underlined script column header at small scale, right aligned', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);
        const header = runWithText(page, 'script');
        const smallChar = BODY * 0.85 * 0.6;

        expect(header).toMatchObject({
            underline: true,
            fontSizePx: BODY * 0.85,
        });
        expect(header.x).toBeCloseTo(CONTENT_RIGHT - 'script'.length * smallChar, 5);
    });

    it('attaches the scene number to the title and right aligns the page number', () => {
        const [page] = buildContentsPages(
            scenesPlan(),
            SETTINGS,
            pageNumbers({s1: 1, s2: 4}),
        );
        const entry = findLine(page, "1. Kylie's Bedroom");

        expect(entry.runs[0]).toMatchObject({
            text: "1. Kylie's Bedroom", bold: true, x: CONTENT_LEFT,
        });

        const number = page
            .flatMap(line => line.runs)
            .find(run => run.text === '1' && run.x > CONTENT_LEFT);

        expect(number?.x).toBeCloseTo(CONTENT_RIGHT - CHAR, 5);
    });

    it('renders an empty number cell when no page numbers are supplied', () => {
        const withNumbers = buildContentsPages(
            scenesPlan(),
            SETTINGS,
            pageNumbers({s1: 1, s2: 4}),
        );
        const without = buildContentsPages(scenesPlan(), SETTINGS);

        expect(without).toHaveLength(withNumbers.length);
        expect(without[0].some(line => textOf(line).trim() === '4')).toBe(false);
    });

    it('single-spaces scenes', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);
        const lineHeight = BODY * SETTINGS.typography.lineHeight;
        const first = findLine(page, "1. Kylie's Bedroom");
        const second = findLine(page, '2. The Diner');

        expect(second.y - first.y).toBeCloseTo(lineHeight, 5);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/buildContentsPages.test.ts`
Expected: FAIL — cannot resolve `./buildContentsPages`.

- [ ] **Step 3: Create the shared page-number type**

`packages/export/src/initialPages/contents/contentsPageNumbers.ts`:

```ts
/**
 * Page numbers resolved after script pagination. Optional everywhere, because
 * willAddAutomaticBalancingBlank renders initial pages from the plan alone.
 */
export interface ContentsPageNumbers {
    scriptPageNumberByBlockId: Map<string, number>,
    scoreStartPageByMusicId: Map<string, number>,
}
```

- [ ] **Step 4: Create the geometry module**

`packages/export/src/initialPages/contents/contentsGeometry.ts`:

```ts
import type {EditorSettings} from '@stagistic/script';

export const MONO_FONT_FAMILY = 'Courier Prime';
export const CHAR_WIDTH_EM = 0.6;
export const HEADING_FONT_SCALE = 1.1;
export const SMALL_FONT_SCALE = 0.85;
export const SCRIPT_COLUMN_HEADER = 'script';
export const SCORE_COLUMN_HEADER = 'score';

const COLUMN_MIN_CHARS = 4;
const COLUMN_GUTTER_CHARS = 3;

export interface ContentsGeometry {
    pageWidthPx: number,
    contentLeftPx: number,
    contentRightPx: number,
    contentTopPx: number,
    contentBottomPx: number,
    bodyFontSizePx: number,
    bodyLineHeightPx: number,
    bodyCharWidthPx: number,
    smallFontSizePx: number,
    smallCharWidthPx: number,
    headingFontSizePx: number,
    headingLineHeightPx: number,
    /** Right edge of the script page-number column. */
    scriptRightPx: number,
    /** Right edge of the score column, or null when it is hidden. */
    scoreRightPx: number | null,
    /** Right edge available to entry titles. */
    titleRightPx: number,
}

/**
 * Column widths come from the header text, never from the values, so the title
 * column — and therefore wrapping and the page count — stay independent of the
 * actual page numbers.
 */
export const createContentsGeometry = (
    settings: EditorSettings,
    showScoreColumn: boolean,
): ContentsGeometry => {
    const bodyFontSizePx = settings.typography.fontSizePx;
    const bodyCharWidthPx = bodyFontSizePx * CHAR_WIDTH_EM;
    const smallFontSizePx = bodyFontSizePx * SMALL_FONT_SCALE;
    const headingFontSizePx = bodyFontSizePx * HEADING_FONT_SCALE;
    const contentRightPx = settings.page.widthPx - settings.page.marginRightPx;
    const scriptColumnPx = Math.max(COLUMN_MIN_CHARS, SCRIPT_COLUMN_HEADER.length) * bodyCharWidthPx;
    const scoreColumnPx = Math.max(COLUMN_MIN_CHARS, SCORE_COLUMN_HEADER.length) * bodyCharWidthPx;
    const gutterPx = COLUMN_GUTTER_CHARS * bodyCharWidthPx;
    const scoreRightPx = showScoreColumn ? contentRightPx : null;
    const scriptRightPx = showScoreColumn
        ? contentRightPx - scoreColumnPx - gutterPx
        : contentRightPx;

    return {
        pageWidthPx: settings.page.widthPx,
        contentLeftPx: settings.page.marginLeftPx,
        contentRightPx,
        contentTopPx: settings.page.marginTopPx,
        contentBottomPx: settings.page.heightPx - settings.page.marginBottomPx,
        bodyFontSizePx,
        bodyLineHeightPx: bodyFontSizePx * settings.typography.lineHeight,
        bodyCharWidthPx,
        smallFontSizePx,
        smallCharWidthPx: smallFontSizePx * CHAR_WIDTH_EM,
        headingFontSizePx,
        headingLineHeightPx: headingFontSizePx * settings.typography.lineHeight,
        scriptRightPx,
        scoreRightPx,
        titleRightPx: scriptRightPx - scriptColumnPx - gutterPx,
    };
};
```

- [ ] **Step 5: Create the renderer with scenes support**

`packages/export/src/initialPages/contents/buildContentsPages.ts`:

```ts
import type {EditorSettings} from '@stagistic/script';

import type {
    ContentsActGroup,
    ContentsInitialPagePlan,
    ContentsSceneEntry,
} from '../../plan';
import type {
    VisualLine,
    VisualRun,
} from '../../visualLine';
import type {VisualPage} from '../buildCharactersAndPlacesPages';
import {
    type ContentsGeometry,
    createContentsGeometry,
    MONO_FONT_FAMILY,
    SCORE_COLUMN_HEADER,
    SCRIPT_COLUMN_HEADER,
} from './contentsGeometry';
import type {ContentsPageNumbers} from './contentsPageNumbers';

const HEADINGS: Record<ContentsInitialPagePlan['variant'], string> = {
    'scenes': 'SCENES',
    'musical-numbers': 'MUSICAL NUMBERS',
    'scenes-and-musical-numbers': 'SCENES AND MUSICAL NUMBERS',
};

interface Cursor {
    pages: VisualPage[],
    current: VisualPage,
    y: number,
    actName: string | null,
}

const makeRun = (
    text: string,
    x: number,
    fontSizePx: number,
    emphasis: {bold?: boolean, italic?: boolean, underline?: boolean} = {},
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: emphasis.bold ?? false,
    italic: emphasis.italic ?? false,
    underline: emphasis.underline ?? false,
    fontFamily: MONO_FONT_FAMILY,
});

const centeredRun = (
    geometry: ContentsGeometry,
    text: string,
    fontSizePx: number,
    emphasis: {bold?: boolean} = {},
) => makeRun(
    text,
    (geometry.pageWidthPx - text.length * fontSizePx * 0.6) / 2,
    fontSizePx,
    emphasis,
);

const rightAlignedRun = (
    text: string,
    rightPx: number,
    fontSizePx: number,
    charWidthPx: number,
    emphasis: {underline?: boolean} = {},
) => makeRun(text, rightPx - text.length * charWidthPx, fontSizePx, emphasis);

const numberRuns = (
    geometry: ContentsGeometry,
    scriptPage: number | null,
    scorePage: number | null,
): VisualRun[] => {
    const runs: VisualRun[] = [];

    if (scriptPage !== null) {
        runs.push(rightAlignedRun(
            String(scriptPage),
            geometry.scriptRightPx,
            geometry.bodyFontSizePx,
            geometry.bodyCharWidthPx,
        ));
    }

    if (scorePage !== null && geometry.scoreRightPx !== null) {
        runs.push(rightAlignedRun(
            String(scorePage),
            geometry.scoreRightPx,
            geometry.bodyFontSizePx,
            geometry.bodyCharWidthPx,
        ));
    }

    return runs;
};

const columnHeaderLine = (
    geometry: ContentsGeometry,
    y: number,
): VisualLine => {
    const runs = [
        rightAlignedRun(
            SCRIPT_COLUMN_HEADER,
            geometry.scriptRightPx,
            geometry.smallFontSizePx,
            geometry.smallCharWidthPx,
            {underline: true},
        ),
    ];

    if (geometry.scoreRightPx !== null) {
        runs.push(rightAlignedRun(
            SCORE_COLUMN_HEADER,
            geometry.scoreRightPx,
            geometry.smallFontSizePx,
            geometry.smallCharWidthPx,
            {underline: true},
        ));
    }

    return {y, runs};
};

const startPage = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
) => {
    const page: VisualPage = [
        {
            y: geometry.contentTopPx,
            runs: [centeredRun(geometry, heading, geometry.headingFontSizePx, {bold: true})],
        },
    ];

    cursor.pages.push(page);
    cursor.current = page;
    cursor.y = geometry.contentTopPx
        + geometry.headingLineHeightPx
        + geometry.bodyLineHeightPx;
};

const pushActHeading = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    name: string | null,
    isFirstOnPage: boolean,
) => {
    cursor.actName = name;

    if (name === null) {
        return;
    }

    if (!isFirstOnPage) {
        cursor.y += 2 * geometry.bodyLineHeightPx;
    }

    cursor.current.push({
        y: cursor.y,
        runs: [centeredRun(geometry, name, geometry.bodyFontSizePx, {bold: true})],
    });
    cursor.y += 2 * geometry.bodyLineHeightPx;
};

const pushColumnHeader = (cursor: Cursor, geometry: ContentsGeometry) => {
    cursor.current.push(columnHeaderLine(geometry, cursor.y));
    cursor.y += 2 * geometry.bodyLineHeightPx;
};

const pushSceneLine = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    scene: ContentsSceneEntry,
    pageNumbers?: ContentsPageNumbers,
) => {
    const label = `${scene.sceneNumber}. ${scene.title}`;
    const scriptPage = pageNumbers?.scriptPageNumberByBlockId.get(scene.startBlockId) ?? null;

    cursor.current.push({
        y: cursor.y,
        runs: [
            makeRun(label, geometry.contentLeftPx, geometry.bodyFontSizePx, {bold: true}),
            ...numberRuns(geometry, scriptPage, null),
        ],
        sourceBlockId: scene.startBlockId,
    });
    cursor.y += geometry.bodyLineHeightPx;
};

export const buildContentsPages = (
    plan: ContentsInitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): VisualPage[] => {
    const geometry = createContentsGeometry(settings, plan.showScoreColumn);
    const heading = HEADINGS[plan.variant];
    const cursor: Cursor = {
        pages: [], current: [], y: 0, actName: null,
    };

    startPage(cursor, geometry, heading);

    plan.acts.forEach((act: ContentsActGroup, actIndex) => {
        pushActHeading(cursor, geometry, act.name, actIndex === 0);

        if (actIndex === 0) {
            pushColumnHeader(cursor, geometry);
        }

        act.scenes.forEach(scene => {
            pushSceneLine(cursor, geometry, scene, pageNumbers);
        });
    });

    return cursor.pages;
};
```

Overflow is added in Task 8; this task renders one page.

- [ ] **Step 6: Register the builder and thread the optional argument**

In `packages/export/src/initialPages/buildInitialPagePages.ts`, replace the whole file:

```ts
import type {EditorSettings} from '@stagistic/script';

import type {InitialPagePlan} from '../plan';
import {
    buildCharactersAndPlacesPages,
    type VisualPage,
} from './buildCharactersAndPlacesPages';
import {buildContentsPages} from './contents/buildContentsPages';
import type {ContentsPageNumbers} from './contents/contentsPageNumbers';

type InitialPageBuilder = (
    plan: InitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
) => VisualPage[];

const BUILDERS: {[Kind in InitialPagePlan['kind']]: InitialPageBuilder} = {
    'characters-and-places': (plan, settings) => plan.kind === 'characters-and-places'
        ? buildCharactersAndPlacesPages(plan, settings)
        : [],
    'contents': (plan, settings, pageNumbers) => plan.kind === 'contents'
        ? buildContentsPages(plan, settings, pageNumbers)
        : [],
};

export const buildInitialPagePages = (
    plan: InitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): VisualPage[] => BUILDERS[plan.kind](plan, settings, pageNumbers);
```

In `packages/export/src/initialPages/composeLeadingPages.ts`, add the import:

```ts
import type {ContentsPageNumbers} from './contents/contentsPageNumbers';
```

Then add an optional `pageNumbers` parameter to `renderInitialPages`, `willAddAutomaticBalancingBlank`, and `composeLeadingPages`, forwarding it to `buildInitialPagePages`:

```ts
const renderInitialPages = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): RenderedInitialPages => {
    const groups = plan.initialPages
        .map(initialPage => buildInitialPagePages(initialPage, settings, pageNumbers))
        .filter(group => group.length > 0);
```

```ts
export const willAddAutomaticBalancingBlank = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
) => {
    const {pages} = renderInitialPages(plan, settings, pageNumbers);
```

```ts
export const composeLeadingPages = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): VisualPage[] => {
    const {
        pages,
        romanNumberStartIndex,
    } = renderInitialPages(plan, settings, pageNumbers);
```

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm --filter @stagistic/export test run && npx tsc -b`
Expected: all export tests PASS and `tsc -b` is clean — the union error from Task 1 is now resolved.

- [ ] **Step 8: Lint and stage**

```bash
git add packages/export/src/initialPages
```

Proposed message: `feat(export): render the contents scenes variant`

---

## Task 7: Contents renderer — musical numbers and the combined variant

**Files:**
- Modify: `packages/export/src/initialPages/contents/buildContentsPages.ts`
- Test: `packages/export/src/initialPages/contents/buildContentsPages.test.ts`

**Interfaces:**
- Consumes: everything from Task 6.
- Produces: no new exports; `buildContentsPages` now handles all three variants.

Layout rules, copied from the spec: music entries are two lines with one blank body line between them; singers sit at `0.85 ×` body in italic, indented two body characters past the title's own start; nested music under a scene is indented five body characters; a scene in the combined variant fills only the `script` column.

- [ ] **Step 1: Write the failing tests**

Append to `buildContentsPages.test.ts`:

```ts
const musicEntry = (
    patch: Partial<ContentsInitialPagePlan['acts'][number]['scenes'][number]['music'][number]> = {},
) => ({
    musicId: 'm1',
    number: '1)',
    title: 'If Life Were a Musical',
    singers: ['Kylie'],
    isInstrumental: false,
    startBlockId: 'mb1',
    ...patch,
});

const musicPlan = (
    patch: Partial<ContentsInitialPagePlan> = {},
): ContentsInitialPagePlan => ({
    kind: 'contents',
    variant: 'musical-numbers',
    showScoreColumn: true,
    acts: [
        {
            name: 'ACT ONE',
            preSceneMusic: [],
            scenes: [
                {
                    sceneNumber: 1,
                    title: "Kylie's Bedroom",
                    startBlockId: 's1',
                    music: [musicEntry()],
                },
            ],
        },
    ],
    ...patch,
});

describe('buildContentsPages musical numbers variant', () => {
    it('attaches the music number to the title', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS);
        const entry = findLine(page, '1) If Life Were a Musical');

        expect(entry.runs[0]).toMatchObject({bold: true, x: CONTENT_LEFT});
    });

    it('renders singers italic at small scale, indented past the title start', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS);
        const singers = runWithText(page, 'Kylie');

        expect(singers).toMatchObject({italic: true, fontSizePx: BODY * 0.85});
        expect(singers.x).toBeCloseTo(CONTENT_LEFT + '1) '.length * CHAR + 2 * CHAR, 5);
    });

    it('joins multiple singers with commas', () => {
        const [page] = buildContentsPages(musicPlan({
            acts: [{
                ...musicPlan().acts[0],
                scenes: [{
                    ...musicPlan().acts[0].scenes[0],
                    music: [musicEntry({singers: ['Whit', 'Kylie']})],
                }],
            }],
        }), SETTINGS);

        expect(runWithText(page, 'Whit, Kylie')).toBeDefined();
    });

    it('labels instrumentals', () => {
        const [page] = buildContentsPages(musicPlan({
            acts: [{
                ...musicPlan().acts[0],
                scenes: [{
                    ...musicPlan().acts[0].scenes[0],
                    music: [musicEntry({singers: [], isInstrumental: true})],
                }],
            }],
        }), SETTINGS);

        expect(runWithText(page, 'Instrumental')).toBeDefined();
    });

    it('places both page numbers when the score column is shown', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS, {
            scriptPageNumberByBlockId: new Map([['mb1', 2]]),
            scoreStartPageByMusicId: new Map([['m1', 5]]),
        });
        const scoreRun = page.flatMap(line => line.runs).find(run => run.text === '5');

        expect(scoreRun?.x).toBeCloseTo(CONTENT_RIGHT - CHAR, 5);
        expect(page.flatMap(line => line.runs).some(run => run.text === '2')).toBe(true);
    });

    it('does not list scene titles', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS);

        expect(page.some(line => textOf(line).includes("Kylie's Bedroom"))).toBe(false);
    });

    it('lists pre-scene music before the act scenes', () => {
        const [page] = buildContentsPages(musicPlan({
            acts: [{
                name: 'ACT TWO',
                preSceneMusic: [musicEntry({musicId: 'm0', number: '0)', title: 'Entracte'})],
                scenes: musicPlan().acts[0].scenes,
            }],
        }), SETTINGS);
        const entracte = page.findIndex(line => textOf(line).startsWith('0) Entracte'));
        const song = page.findIndex(line => textOf(line).startsWith('1) If Life'));

        expect(entracte).toBeGreaterThanOrEqual(0);
        expect(entracte).toBeLessThan(song);
    });
});

describe('buildContentsPages combined variant', () => {
    const combined = (): ContentsInitialPagePlan => ({
        ...musicPlan(),
        variant: 'scenes-and-musical-numbers',
    });

    it('nests music under its scene with a deeper indent', () => {
        const [page] = buildContentsPages(combined(), SETTINGS);
        const scene = findLine(page, "1. Kylie's Bedroom");
        const music = findLine(page, '1) If Life Were a Musical');

        expect(scene.runs[0].x).toBe(CONTENT_LEFT);
        expect(music.runs[0].x).toBeCloseTo(CONTENT_LEFT + 5 * CHAR, 5);
        expect(music.y).toBeGreaterThan(scene.y);
    });

    it('leaves the score cell empty for a scene', () => {
        const [page] = buildContentsPages(combined(), SETTINGS, {
            scriptPageNumberByBlockId: new Map([['s1', 1], ['mb1', 2]]),
            scoreStartPageByMusicId: new Map([['m1', 5]]),
        });
        const scene = findLine(page, "1. Kylie's Bedroom");

        expect(scene.runs).toHaveLength(2);
        expect(scene.runs[1].text).toBe('1');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/buildContentsPages.test.ts`
Expected: FAIL — no music lines are rendered.

- [ ] **Step 3: Implement**

Add to `buildContentsPages.ts`, above `buildContentsPages`:

```ts
const SINGER_INDENT_CHARS = 2;
const NESTED_MUSIC_INDENT_CHARS = 5;
const INSTRUMENTAL_LABEL = 'Instrumental';

const wrapToWidth = (value: string, maxChars: number): string[] => {
    if (maxChars < 1) {
        return [value];
    }

    const lines: string[] = [];
    let current = '';

    value.split(/\s+/u).filter(word => word.length > 0).forEach(word => {
        const candidate = current.length === 0 ? word : `${current} ${word}`;

        if (candidate.length <= maxChars) {
            current = candidate;

            return;
        }

        if (current.length > 0) {
            lines.push(current);
        }

        current = word;
    });

    if (current.length > 0) {
        lines.push(current);
    }

    return lines.length > 0 ? lines : [''];
};

const pushWrapped = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    {
        value,
        startPx,
        fontSizePx,
        charWidthPx,
        emphasis,
        trailingRuns,
    }: {
        value: string,
        startPx: number,
        fontSizePx: number,
        charWidthPx: number,
        emphasis: {bold?: boolean, italic?: boolean},
        trailingRuns: VisualRun[],
    },
) => {
    const maxChars = Math.max(1, Math.floor((geometry.titleRightPx - startPx) / charWidthPx));

    wrapToWidth(value, maxChars).forEach((line, index) => {
        cursor.current.push({
            y: cursor.y,
            runs: [
                makeRun(line, startPx, fontSizePx, emphasis),
                ...index === 0 ? trailingRuns : [],
            ],
        });
        cursor.y += geometry.bodyLineHeightPx;
    });
};

const pushMusicEntry = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    entry: ContentsMusicEntry,
    indentChars: number,
    pageNumbers?: ContentsPageNumbers,
) => {
    const titleStartPx = geometry.contentLeftPx + indentChars * geometry.bodyCharWidthPx;
    const label = `${entry.number} ${entry.title}`;
    const scriptPage = pageNumbers?.scriptPageNumberByBlockId.get(entry.startBlockId) ?? null;
    const scorePage = pageNumbers?.scoreStartPageByMusicId.get(entry.musicId) ?? null;

    pushWrapped(cursor, geometry, {
        value: label,
        startPx: titleStartPx,
        fontSizePx: geometry.bodyFontSizePx,
        charWidthPx: geometry.bodyCharWidthPx,
        emphasis: {bold: true},
        trailingRuns: numberRuns(geometry, scriptPage, scorePage),
    });

    const singerStartPx = titleStartPx
        + (`${entry.number} `.length + SINGER_INDENT_CHARS) * geometry.bodyCharWidthPx;

    pushWrapped(cursor, geometry, {
        value: entry.isInstrumental ? INSTRUMENTAL_LABEL : entry.singers.join(', '),
        startPx: singerStartPx,
        fontSizePx: geometry.smallFontSizePx,
        charWidthPx: geometry.smallCharWidthPx,
        emphasis: {italic: true},
        trailingRuns: [],
    });

    cursor.y += geometry.bodyLineHeightPx;
};
```

Import `ContentsMusicEntry` from `../../plan`.

Replace the act loop body inside `buildContentsPages`:

```ts
    plan.acts.forEach((act: ContentsActGroup, actIndex) => {
        pushActHeading(cursor, geometry, act.name, actIndex === 0);

        if (actIndex === 0) {
            pushColumnHeader(cursor, geometry);
        }

        if (plan.variant === 'musical-numbers') {
            [...act.preSceneMusic, ...act.scenes.flatMap(scene => scene.music)]
                .forEach(entry => {
                    pushMusicEntry(cursor, geometry, entry, 0, pageNumbers);
                });

            return;
        }

        act.preSceneMusic.forEach(entry => {
            pushMusicEntry(cursor, geometry, entry, NESTED_MUSIC_INDENT_CHARS, pageNumbers);
        });

        act.scenes.forEach(scene => {
            pushSceneLine(cursor, geometry, scene, pageNumbers);

            if (plan.variant === 'scenes' || scene.music.length === 0) {
                return;
            }

            cursor.y += geometry.bodyLineHeightPx;
            scene.music.forEach(entry => {
                pushMusicEntry(cursor, geometry, entry, NESTED_MUSIC_INDENT_CHARS, pageNumbers);
            });
        });
    });
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/buildContentsPages.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and stage**

```bash
git add packages/export/src/initialPages/contents
```

Proposed message: `feat(export): render the musical numbers and combined contents variants`

---

## Task 8: Contents renderer — overflow

**Files:**
- Modify: `packages/export/src/initialPages/contents/buildContentsPages.ts`
- Test: `packages/export/src/initialPages/contents/buildContentsPages.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 6 and 7.
- Produces: no new exports.

Rules: continuation pages repeat the page heading, the current act heading, and the column header row. A music entry never splits between its title and its singers. An act heading is never the last line on a page. In the combined variant a scene line never separates from its first music entry.

- [ ] **Step 1: Write the failing test**

```ts
describe('buildContentsPages overflow', () => {
    const manyScenes = (count: number): ContentsInitialPagePlan => ({
        kind: 'contents',
        variant: 'scenes',
        showScoreColumn: false,
        acts: [{
            name: 'ACT ONE',
            preSceneMusic: [],
            scenes: Array.from({length: count}, (_value, index) => ({
                sceneNumber: index + 1,
                title: `Scene ${index + 1}`,
                startBlockId: `s${index + 1}`,
                music: [],
            })),
        }],
    });

    it('repeats the page heading, act heading, and column header on continuation pages', () => {
        const pages = buildContentsPages(manyScenes(200), SETTINGS);

        expect(pages.length).toBeGreaterThan(1);
        pages.forEach(page => {
            expect(textOf(page[0])).toBe('SCENES');
            expect(page.some(line => textOf(line) === 'ACT ONE')).toBe(true);
            expect(page.flatMap(line => line.runs).some(run => run.text === 'script')).toBe(true);
        });
    });

    it('keeps every scene on some page and in order', () => {
        const pages = buildContentsPages(manyScenes(200), SETTINGS);
        const titles = pages
            .flat()
            .map(textOf)
            .filter(value => /^\d+\. Scene \d+$/u.test(value));

        expect(titles).toHaveLength(200);
        expect(titles[0]).toBe('1. Scene 1');
        expect(titles.at(-1)).toBe('200. Scene 200');
    });

    it('never leaves an entry below the content bottom', () => {
        const pages = buildContentsPages(manyScenes(200), SETTINGS);
        const bottom = SETTINGS.page.heightPx - SETTINGS.page.marginBottomPx;

        pages.flat().forEach(line => {
            expect(line.y).toBeLessThanOrEqual(bottom);
        });
    });

    it('keeps a music title and its singers on the same page', () => {
        const entries = Array.from({length: 80}, (_value, index) => musicEntry({
            musicId: `m${index}`,
            number: `${index + 1})`,
            title: `Song ${index + 1}`,
            startBlockId: `mb${index}`,
        }));
        const pages = buildContentsPages({
            kind: 'contents',
            variant: 'musical-numbers',
            showScoreColumn: false,
            acts: [{
                name: 'ACT ONE',
                preSceneMusic: entries,
                scenes: [],
            }],
        }, SETTINGS);

        pages.forEach(page => {
            const titles = page.filter(line => /^\d+\) Song \d+$/u.test(textOf(line)));
            const singers = page.filter(line => textOf(line) === 'Kylie');

            expect(titles).toHaveLength(singers.length);
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/buildContentsPages.test.ts`
Expected: FAIL — only one page is produced and lines run past the content bottom.

- [ ] **Step 3: Implement**

Change `startPage` so continuation pages also repeat the act heading and column header. Replace it and add a break helper:

```ts
const startPage = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
) => {
    const page: VisualPage = [
        {
            y: geometry.contentTopPx,
            runs: [centeredRun(geometry, heading, geometry.headingFontSizePx, {bold: true})],
        },
    ];

    cursor.pages.push(page);
    cursor.current = page;
    cursor.y = geometry.contentTopPx
        + geometry.headingLineHeightPx
        + geometry.bodyLineHeightPx;

    if (cursor.actName !== null) {
        cursor.current.push({
            y: cursor.y,
            runs: [centeredRun(geometry, cursor.actName, geometry.bodyFontSizePx, {bold: true})],
        });
        cursor.y += 2 * geometry.bodyLineHeightPx;
    }

    cursor.current.push(columnHeaderLine(geometry, cursor.y));
    cursor.y += 2 * geometry.bodyLineHeightPx;
};

/** Starts a new page when `heightPx` of unbreakable content will not fit. */
const ensureSpace = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
    heightPx: number,
) => {
    if (cursor.y + heightPx <= geometry.contentBottomPx) {
        return;
    }

    startPage(cursor, geometry, heading);
};
```

`startPage` is now called once before the act loop with `cursor.actName` still `null`, so the first page draws the heading and column header only; `pushActHeading` then draws the first act heading. Change `pushActHeading` to skip its own column header call and to guard against being stranded:

```ts
const pushActHeading = (
    cursor: Cursor,
    geometry: ContentsGeometry,
    heading: string,
    name: string | null,
    isFirstAct: boolean,
) => {
    cursor.actName = name;

    if (name === null) {
        return;
    }

    if (!isFirstAct) {
        cursor.y += 2 * geometry.bodyLineHeightPx;
    }

    /* Heading plus at least one entry line, so a heading is never stranded. */
    if (cursor.y + 3 * geometry.bodyLineHeightPx > geometry.contentBottomPx) {
        startPage(cursor, geometry, heading);

        return;
    }

    cursor.current.push({
        y: cursor.y,
        runs: [centeredRun(geometry, name, geometry.bodyFontSizePx, {bold: true})],
    });
    cursor.y += 2 * geometry.bodyLineHeightPx;
};
```

Note the early `return` after `startPage`: `startPage` already drew the act heading from `cursor.actName`, which was set on the first line of this function.

Add `ensureSpace` calls. In `pushSceneLine`, before pushing:

```ts
    const requiredPx = geometry.bodyLineHeightPx * (scene.music.length > 0 ? 4 : 1);

    ensureSpace(cursor, geometry, heading, requiredPx);
```

so a scene line never separates from its first music entry. Pass `heading` and `scene.music.length` into `pushSceneLine`; in the `scenes` variant call it with an entry whose `music` is treated as empty by passing `hasNestedMusic: false`.

In `pushMusicEntry`, before the first `pushWrapped`:

```ts
    const titleLines = wrapToWidth(label, Math.max(
        1,
        Math.floor((geometry.titleRightPx - titleStartPx) / geometry.bodyCharWidthPx),
    )).length;
    const singerText = entry.isInstrumental ? INSTRUMENTAL_LABEL : entry.singers.join(', ');
    const singerLines = wrapToWidth(singerText, Math.max(
        1,
        Math.floor((geometry.titleRightPx - singerStartPx) / geometry.smallCharWidthPx),
    )).length;

    ensureSpace(cursor, geometry, heading, (titleLines + singerLines) * geometry.bodyLineHeightPx);
```

Compute `singerStartPx` before this block. Thread `heading` through `pushMusicEntry` and `pushSceneLine` as a parameter.

Finally, in `buildContentsPages`, pass `heading` into `pushActHeading`, `pushSceneLine`, and `pushMusicEntry`, and remove the now-redundant `if (actIndex === 0) pushColumnHeader(...)` call along with the `pushColumnHeader` helper — `startPage` owns it.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @stagistic/export test run src/initialPages/contents/buildContentsPages.test.ts`
Expected: PASS, all cases from Tasks 6, 7, and 8.

- [ ] **Step 5: Lint, typecheck, stage**

Run: `npx eslint packages/export/src --fix && npx eslint packages/export/src && npx tsc -b`

```bash
git add packages/export/src/initialPages/contents
```

Proposed message: `feat(export): paginate the contents initial page`

---

## Task 9: Thread page numbers through the transcriber

**Files:**
- Modify: `packages/export/src/transcribeExportPlan.ts`
- Modify: `packages/export/src/index.ts`
- Test: `packages/export/src/transcribeExportPlan.test.ts`

**Interfaces:**
- Consumes: `planIntegratedAssembly` from Task 5, `ContentsPageNumbers` from Task 6.
- Produces: `interface TranscribeOptions {scorePageCounts?: Record<string, number>}` and the widened signature `transcribeExportPlan(plan: ExportPlan, settings: EditorSettings, options?: TranscribeOptions): TranscriptResult`. Task 10 passes the options.

- [ ] **Step 1: Write the failing test**

```ts
    it('prints script page numbers on the contents page', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...baseScript(),
            doc: {
                type: 'doc',
                content: [
                    block('scene', 's1', 'First Scene'),
                    block('dialogue', 'd1', 'Hello.'),
                    block('scene', 's2', 'Second Scene'),
                    block('dialogue', 'd2', 'Goodbye.'),
                ],
            },
        });
        const transcript = transcribeExportPlan(plan, DEFAULT_EDITOR_SETTINGS);
        const lines = transcript.items.filter((item): item is VisualLine => !('type' in item));
        const firstScene = lines.find(line => line.runs[0]?.text === '1. First Scene');
        const secondScene = lines.find(line => line.runs[0]?.text === '2. Second Scene');

        expect(firstScene?.runs.at(-1)?.text).toBe('1');
        expect(secondScene?.runs.at(-1)?.text).toBe('2');
    });

    it('keeps the leading page count even so integrated numbering is stable', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, baseScript());
        const transcript = transcribeExportPlan(plan, DEFAULT_EDITOR_SETTINGS);

        expect((transcript.leadingPageCount ?? 0) % 2).toBe(0);
    });
```

`BASIC_DEFAULTS.pageBreaks.sceneOnNewPage` is `true`, so the two scenes land on script pages 1 and 2.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @stagistic/export test run src/transcribeExportPlan.test.ts`
Expected: FAIL — the contents lines carry no page-number run.

- [ ] **Step 3: Implement**

Add imports to `transcribeExportPlan.ts`:

```ts
import type {ContentsPageNumbers} from './initialPages/contents/contentsPageNumbers';
import {planIntegratedAssembly} from './pdf/planIntegratedAssembly';
```

Add the options type above the function:

```ts
export interface TranscribeOptions {
    /** Page count of each attached score PDF, keyed by music id. */
    scorePageCounts?: Record<string, number>,
}
```

Change the signature to `(plan: ExportPlan, settings: EditorSettings, options: TranscribeOptions = {})`.

Replace the `const leadingPages = composeLeadingPages(plan.leadingPages, settings);` line with:

```ts
    const scriptPageSourceBlockIds = scriptPages.map(page => [...page.sourceBlockIds]);
    const scriptPageNumberByBlockId = new Map<string, number>();

    scriptPages.forEach((page, index) => {
        const pageNumber = page.referencePageNumber ?? index + 1;

        page.sourceBlockIds.forEach(blockId => {
            if (!scriptPageNumberByBlockId.has(blockId)) {
                scriptPageNumberByBlockId.set(blockId, pageNumber);
            }
        });
    });

    const scoreStartPageByMusicId = options.scorePageCounts
        ? planIntegratedAssembly({
            scriptPageSourceBlockIds,
            scores: plan.postSteps.map(step => ({
                musicId: step.musicId,
                startBlockId: step.startBlockId,
                afterBlockId: step.afterBlockId,
                pageCount: options.scorePageCounts?.[step.musicId] ?? 0,
            })),
        }).scoreStartPageByMusicId
        : new Map<string, number>();
    const pageNumbers: ContentsPageNumbers = {
        scriptPageNumberByBlockId,
        scoreStartPageByMusicId,
    };
    const leadingPages = composeLeadingPages(plan.leadingPages, settings, pageNumbers);
```

`page.referencePageNumber ?? index + 1` is the same expression `withHeaderFooter` uses, so the contents page and the printed footer can never disagree.

Reuse `scriptPageSourceBlockIds` in the returned object in place of the existing inline `scriptPages.map(...)`.

- [ ] **Step 4: Export the new modules**

In `packages/export/src/index.ts`, add:

```ts
export * from './initialPages/contents/buildContentsPages';
export * from './initialPages/contents/collectMusicSingers';
export * from './initialPages/contents/contentsGeometry';
export * from './initialPages/contents/contentsPageNumbers';
export * from './initialPages/contents/deriveContentsPlan';
export * from './pdf/planIntegratedAssembly';
export * from './pdf/readPdfPageCounts';
```

`readPdfPageCounts` is created in Task 10; add its export line there instead if this task must stay green on its own.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @stagistic/export test run && npx tsc -b`
Expected: PASS and clean.

- [ ] **Step 6: Stage**

```bash
git add packages/export/src/transcribeExportPlan.ts packages/export/src/index.ts packages/export/src/transcribeExportPlan.test.ts
```

Proposed message: `feat(export): resolve contents page numbers during transcription`

---

## Task 10: Replay the assembly plan in drawPdf and load page counts

**Files:**
- Create: `packages/export/src/pdf/readPdfPageCounts.ts`
- Modify: `packages/export/src/pdf/drawPdf.ts:160-256`
- Modify: `packages/export/src/index.ts`
- Modify: `packages/app-routes/src/routes/script/export/useExportPreview.ts`
- Test: `packages/export/src/pdf/readPdfPageCounts.test.ts`

**Interfaces:**
- Consumes: `planIntegratedAssembly` from Task 5, `TranscribeOptions` from Task 9.
- Produces: `readPdfPageCounts(scorePdfs: Record<string, ArrayBuffer>): Promise<Record<string, number>>`.

`worker.postMessage` in `renderPdfInWorker` uses no transfer list, so buffers are structured-cloned and reading page counts on the main thread does not detach them.

- [ ] **Step 1: Write the failing test**

```ts
import {PDFDocument} from 'pdf-lib';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {readPdfPageCounts} from './readPdfPageCounts';

const makePdf = async (pageCount: number) => {
    const doc = await PDFDocument.create();

    for (let index = 0; index < pageCount; index += 1) {
        doc.addPage([100, 100]);
    }

    const bytes = await doc.save();

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

describe('readPdfPageCounts', () => {
    it('reads the page count of each score', async () => {
        const counts = await readPdfPageCounts({
            m1: await makePdf(3),
            m2: await makePdf(1),
        });

        expect(counts).toEqual({m1: 3, m2: 1});
    });

    it('omits scores that fail to parse', async () => {
        const counts = await readPdfPageCounts({
            broken: new TextEncoder().encode('not a pdf').buffer as ArrayBuffer,
        });

        expect(counts).toEqual({});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/export test run src/pdf/readPdfPageCounts.test.ts`
Expected: FAIL — cannot resolve `./readPdfPageCounts`.

- [ ] **Step 3: Implement readPdfPageCounts**

```ts
import {PDFDocument} from 'pdf-lib';

/**
 * Page counts for attached score PDFs, needed before transcription so the
 * Contents page can print integrated page numbers. A score that fails to parse
 * is omitted, which the assembly planner treats as absent.
 */
export const readPdfPageCounts = async (
    scorePdfs: Record<string, ArrayBuffer>,
): Promise<Record<string, number>> => {
    const entries = await Promise.all(Object.entries(scorePdfs).map(async ([musicId, buffer]) => {
        try {
            const document = await PDFDocument.load(buffer);

            return [musicId, document.getPageCount()] as const;
        } catch {
            return null;
        }
    }));

    return Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry !== null));
};
```

- [ ] **Step 4: Rewrite the drawPdf assembly section**

Replace everything in `drawPdf.ts` from `const generated = await PDFDocument.load(...)` down to the `for (let pageIndex = ...)` loop's closing brace with:

```ts
    const generated = await PDFDocument.load(doc.output('arraybuffer'));
    const result = await PDFDocument.create();
    const generatedPages = await result.copyPages(generated, generated.getPageIndices());
    const leadingPages = transcript.leadingPageCount ?? 0;
    const scorePagesByMusicId = new Map<string, PDFPage[]>();
    const scorePageCounts = new Map<string, number>();

    for (const score of transcript.integratedScores) {
        const buffer = transcript.scorePdfs?.[score.musicId];

        if (!buffer) {
            continue;
        }

        const scoreDocument = await PDFDocument.load(buffer);
        const pages = await result.copyPages(scoreDocument, scoreDocument.getPageIndices());

        scorePagesByMusicId.set(score.musicId, pages);
        scorePageCounts.set(score.musicId, pages.length);
    }

    const assembly = planIntegratedAssembly({
        scriptPageSourceBlockIds: transcript.scriptPageSourceBlockIds ?? [],
        scores: transcript.integratedScores.map(score => ({
            musicId: score.musicId,
            startBlockId: score.startBlockId,
            afterBlockId: score.afterBlockId,
            pageCount: scorePageCounts.get(score.musicId) ?? 0,
        })),
    });

    for (let index = 0; index < leadingPages; index += 1) {
        result.addPage(generatedPages[index]);
    }

    const {width, height} = generatedPages[0].getSize();

    assembly.steps.forEach(step => {
        if (step.kind === 'blank') {
            result.addPage([width, height]);

            return;
        }

        if (step.kind === 'script') {
            result.addPage(generatedPages[leadingPages + (step.scriptPageIndex ?? 0)]);

            return;
        }

        const pages = scorePagesByMusicId.get(step.musicId ?? '');

        if (pages) {
            result.addPage(pages[step.scorePageIndex ?? 0]);
        }
    });
```

Add the import `import {planIntegratedAssembly} from './planIntegratedAssembly';`. The final numbering loop and `result.save()` stay unchanged. All generated pages share one size, so using the first page's size for blanks is equivalent to the previous `pageIndex - 1` lookup.

- [ ] **Step 5: Reorder useExportPreview**

In `packages/app-routes/src/routes/script/export/useExportPreview.ts`, replace the body of `run` up to `renderPdfInWorker` with:

```ts
                    const plan = derive(config, script);
                    const scoreEntries = await Promise.all(plan.postSteps.map(async step => {
                        const attachment = musicAttachments?.integratedScoresByMusic.get(step.musicId);

                        if (!attachment) {
                            return null;
                        }

                        const blob = await musicAttachments?.getBlob(attachment.storageKey);

                        return blob ? [step.musicId, await blob.arrayBuffer()] as const : null;
                    }));
                    const scorePdfs = Object.fromEntries(
                        scoreEntries.filter((item): item is readonly [string, ArrayBuffer] => item !== null),
                    );
                    const scorePageCounts = await readPdfPageCounts(scorePdfs);
                    const transcript = transcribeExportPlan(plan, settings, {scorePageCounts});

                    transcript.scorePdfs = scorePdfs;
```

Add `readPdfPageCounts` to the existing `@stagistic/export` import.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @stagistic/export test run && npx tsc -b && pnpm lint`
Expected: PASS and clean.

- [ ] **Step 7: Stage**

```bash
git add packages/export/src/pdf packages/export/src/index.ts packages/app-routes/src/routes/script/export/useExportPreview.ts
```

Proposed message: `refactor(export): replay the assembly plan when writing the integrated PDF`

---

## Task 11: Sidebar Contents control

**Files:**
- Modify: `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx`
- Test: `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.browser.test.tsx`

**Interfaces:**
- Consumes: `ContentsVariant` and `InitialPagesValue` from Task 1.
- Produces: no new exports.

Follow the existing pattern in this file exactly: a bold page-level `Switch` wrapping a `<span className={styles.initialPageTitle}>`, then an options block using `styles.initialPageOptions`, `styles.orderField`, and `styles.orderPrefix` for the inline-prefixed `FormSelect`.

- [ ] **Step 1: Write the failing test**

Append to `InitialPagesModule.browser.test.tsx`, reusing the file's existing `waitFor`, `findSwitch`, `checked`, and `mountedRoots` helpers:

```ts
    it('toggles the contents page and switches its variant', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = () => {
            const [value, setValue] = useState<InitialPagesValue>(BASIC_DEFAULTS.initialPages);

            return (
                <InitialPagesModule
                    value={value}
                    blankPages={BASIC_DEFAULTS.blankPages}
                    hasAutomaticBalancingBlank={false}
                    onChange={setValue}
                    onBlankPagesChange={() => undefined}
                />
            );
        };

        document.body.append(host);
        mountedRoots.push(root);
        root.render(<Harness />);

        const contents = await waitFor(() => findSwitch('Contents'));

        expect(checked(contents)).toBe(true);

        const select = await waitFor(() => document.querySelector<HTMLSelectElement>('select[aria-label="Show contents as"]'));

        expect(select.value).toBe('scenes-and-musical-numbers');

        await userEvent.selectOptions(select, 'musical-numbers');
        await waitFor(() => select.value === 'musical-numbers' ? select : null);

        await userEvent.click(contents);
        await waitFor(() => checked(contents) === false ? contents : null);
        expect(document.querySelector('select[aria-label="Show contents as"]')).toBeNull();
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test:browser src/routes/script/export/modules/InitialPagesModule.browser.test.tsx`
Expected: FAIL — no `Contents` switch renders.

- [ ] **Step 3: Implement**

Add the options constant next to `CHARACTER_ORDER_OPTIONS`:

```ts
const CONTENTS_VARIANT_OPTIONS: FormSelectOption[] = [
    {
        label: 'scenes',
        value: 'scenes',
    }, {
        label: 'musical numbers',
        value: 'musical-numbers',
    }, {
        label: 'scenes and musical numbers',
        value: 'scenes-and-musical-numbers',
    },
];

const CONTENTS_VARIANTS = new Set(CONTENTS_VARIANT_OPTIONS.map(option => option.value));
```

Import `type ContentsVariant` from `@stagistic/export`. Add the updater next to `updatePage`:

```ts
    const contents = value.contents;
    const updateContents = (patch: Partial<InitialPagesValue['contents']>) => onChange({
        ...value,
        contents: {
            ...contents,
            ...patch,
        },
    });
```

Add the block immediately after the closing `</div>` of `styles.placesInitialPage`:

```tsx
            <div className={styles.initialPage}>
                <ExportSettingRow>
                    <Switch
                        variant="setting"
                        isSelected={contents.enabled}
                        onChange={enabled => updateContents({enabled})}
                    >
                        <span className={styles.initialPageTitle}>Contents</span>
                    </Switch>
                </ExportSettingRow>
                {contents.enabled ? (
                    <div className={styles.initialPageOptions}>
                        <div className={styles.orderField}>
                            <span className={styles.orderPrefix}>Show</span>
                            <FormSelect
                                ariaLabel="Show contents as"
                                size="md"
                                width="content"
                                options={CONTENTS_VARIANT_OPTIONS}
                                value={contents.variant}
                                onChange={variant => {
                                    if (CONTENTS_VARIANTS.has(variant)) {
                                        updateContents({variant: variant as ContentsVariant});
                                    }
                                }}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
```

- [ ] **Step 4: Run the browser test**

Run: `pnpm --filter @stagistic/app-routes test:browser src/routes/script/export/modules/InitialPagesModule.browser.test.tsx`
Expected: PASS. The pre-existing `editor` package browser reds are a different package and out of scope.

- [ ] **Step 5: Full check**

Run: `npx tsc -b && pnpm lint && pnpm test`
Expected: all clean.

- [ ] **Step 6: Refresh the knowledge graph and stage**

Run: `graphify update .`

```bash
git add packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx packages/app-routes/src/routes/script/export/modules/InitialPagesModule.browser.test.tsx graphify-out
```

Proposed message: `feat(export): add the contents page control to the export sidebar`

---

## Task 12: Real-PDF verification

**Files:**
- Create: `packages/export/src/initialPages/contents/contentsPdf.manual.md`

**Interfaces:**
- Consumes: everything.
- Produces: a written record of the visual check.

The spec calls for a real-PDF check. It is manual because the repo has no PDF-rasterisation test harness and Milan does the final visual pass.

- [ ] **Step 1: Build a fixture script in the app**

Open the export route with a script containing: two acts; an instrumental music before Act Two's first scene; at least one music with a multi-page score attached; a music credited to a group whose members all sing individually; and enough scenes to overflow the Contents page.

- [ ] **Step 2: Check the Basic template**

Confirm: heading matches the variant; one `script` column, underlined, right-aligned; scene and music numbers attached to their titles; singers italic and smaller on their own line; `Instrumental` where expected; the deduplicated group absent; continuation pages repeat heading, act heading, and column header.

- [ ] **Step 3: Check the Integrated score template**

Confirm both columns appear, and that each music's `score` number is the page where its score PDF actually begins in the rendered book.

- [ ] **Step 4: Check pagination invariants**

Confirm the script still begins on an odd physical page, Roman numerals run unbroken across the Contents pages, and the sidebar's `+1` indicator matches the rendered blank.

- [ ] **Step 5: Write findings and stage**

Record what was checked and any defects in `contentsPdf.manual.md`.

```bash
git add packages/export/src/initialPages/contents/contentsPdf.manual.md
```

Proposed message: `docs(export): record the contents page PDF verification`

---

## Self-Review

**Spec coverage.** Config → Task 1. Plan types → Task 1. Derivation, act/scene grouping, pre-scene music → Task 3. Singers, group dedup, ordering, instrumental → Tasks 2 and 3. Filtered-document derivation → Task 4. `showScoreColumn` → Task 4. Script page numbers → Task 9. Integrated page numbers and the planner → Tasks 5, 9, 10. Pipeline reorder → Task 10. Rendering, columns, spacing, wrapping → Tasks 6 and 7. Overflow → Task 8. Sidebar → Task 11. Empty behaviour → Task 3. Real-PDF check → Task 12. The leading-page-count-is-even invariant → Task 9.

**Known gap, deliberately carried:** the spec's test list includes "integrated numbers unchanged when a Contents page is added". That assertion needs a transcript with `postSteps` and score page counts, which Task 9's fixture does not build. Add it in Task 9 Step 1 if the fixture allows; otherwise it is covered indirectly by Task 5's parity tests plus Task 9's even-leading-count test, and Task 12 Step 3 checks it end to end.

**Placeholder scan.** No TBDs. Every code step carries real code. Task 8 describes edits to functions defined verbatim in Tasks 6 and 7 rather than restating whole files; the implementer has those files open from the preceding tasks.

**Type consistency.** `ContentsPageNumbers` has the same two fields everywhere. `buildContentsPages`, `buildInitialPagePages`, `composeLeadingPages`, and `willAddAutomaticBalancingBlank` all take `pageNumbers?: ContentsPageNumbers` as the last parameter. `planIntegratedAssembly` returns `{steps, scoreStartPageByMusicId}` and is consumed under those names in Tasks 9 and 10. `collectMusicSingers` returns `string[]` and feeds `ContentsMusicEntry.singers`.

**Ordering check:** Task 2's `keeps a group when only some members sing individually` case asserts `['Kylie', 'Everyone']` — equal counts break on first appearance, and Kylie sings first.
