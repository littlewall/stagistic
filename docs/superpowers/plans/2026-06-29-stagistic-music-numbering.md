# Music Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every music an automatic, scene-derived number (shown on the music/out pills and persisted), and show each scene's number in the Structure sidebar.

**Architecture:** Numbering is computed in `@stagistic/script` (`deriveMusic` gains structured per-scene fields; a pure formatter renders the default text). The editor shows numbers via a ProseMirror plugin that decorates each music atom with its label; the pill NodeViews read the label from `props.decorations`. The relational projection (`script_scenes` / `script_music`) stores the structured numbering. The sidebar prefixes each scene title with its ordinal.

**Tech Stack:** TypeScript monorepo (pnpm), Tiptap/ProseMirror, Drizzle ORM + PGlite, `vite-plus/test` (browser tests via Playwright/chromium).

## Global Constraints

- Tests import from `vite-plus/test` — never `vitest`. Browser tests: `import {page, userEvent} from 'vite-plus/test/browser'`, filename `*.browser.test.tsx`, run via `test:browser`.
- After any change to `packages/db/src/` schema or `drizzle/*.sql`, run `pnpm --filter @stagistic/db db:compile-migrations` (it bundles every `drizzle/*.sql` into `src/migrations.compiled.ts`; no journal/meta edits needed).
- Editor UI copy is **English** (`music`, `out`, scene titles).
- Numbering is **data**; the default text format lives only in the formatter (Task 2). Don't bake format strings anywhere else.
- Scene number = 1-based position among `blockType === 'scene'` blocks in document order, **global** across acts.
- DRY, YAGNI, TDD, one logical change per commit.

---

### Task 1: `deriveMusic` — structured per-scene numbering

Add `sceneNumber` / `indexInScene` / `sceneMusicCount` to each derived music. Keep the legacy global `number` for now (removed in Task 7) so dependent packages stay green.

**Files:**
- Modify: `packages/script/src/music/types.ts`
- Modify: `packages/script/src/music/deriveMusic.ts`
- Test: `packages/script/src/music/deriveMusic.test.ts`

**Interfaces:**
- Produces: `DerivedMusic` with `number: number`, `sceneNumber: number`, `indexInScene: number` (0-based), `sceneMusicCount: number`, plus existing `musicId, mode, title, kind, startBlockId, endBlockId`.

- [ ] **Step 1: Extend the type**

In `packages/script/src/music/types.ts`, replace the `DerivedMusic` interface with:

```ts
export interface DerivedMusic {
    musicId: string,
    /** Legacy global ordinal — removed once all consumers move to the scene-based fields. */
    number: number,
    /** 1-based scene ordinal (global across acts); 0 before the first scene. */
    sceneNumber: number,
    /** 0-based position among music starts within the scene. */
    indexInScene: number,
    /** Total music starts in the scene. */
    sceneMusicCount: number,
    mode: MusicMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

- [ ] **Step 2: Update the failing tests**

In `packages/script/src/music/deriveMusic.test.ts`, update the two `toEqual` blocks to include the new fields and add numbering cases. Replace the `'pairs an explicit out to its open start'` expectation and the `'treats a hit...'` expectation, and append three new `it` blocks before the closing `});`:

```ts
    it('pairs an explicit out to its open start', () => {
        const music = deriveMusic([
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]), sd('b2', [{role: 'out'}]),
        ]);

        expect(music).toEqual([
            {
                musicId: 'c1', number: 1, sceneNumber: 0, indexInScene: 0, sceneMusicCount: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b2',
            },
        ]);
    });
```

```ts
    it('numbers music per scene: one start gets index 0 / count 1', () => {
        const music = deriveMusic([
            scene('s1'),
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
        ]);

        expect(music[0]).toMatchObject({sceneNumber: 1, indexInScene: 0, sceneMusicCount: 1});
    });

    it('numbers two music in the same scene as 0/1 with count 2', () => {
        const music = deriveMusic([
            scene('s1'),
            sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null}]),
            sd('b2', [{role: 'out'}]),
            sd('b3', [{role: 'start', musicId: 'c2', mode: 'open', title: 'B', kind: null}]),
        ]);

        expect(music.map(c => [c.sceneNumber, c.indexInScene, c.sceneMusicCount]))
            .toEqual([[1, 0, 2], [1, 1, 2]]);
    });

    it('increments the scene number across scenes and counts a hit', () => {
        const music = deriveMusic([
            scene('s1'),
            sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null}]),
            scene('s2'),
            sd('b2', [{role: 'start', musicId: 'h1', mode: 'hit', title: 'Sting', kind: null}]),
        ]);

        expect(music.map(c => [c.musicId, c.sceneNumber, c.indexInScene, c.sceneMusicCount]))
            .toEqual([['c1', 1, 0, 1], ['h1', 2, 0, 1]]);
    });
```

Also update the hit expectation in `'treats a hit as a zero-duration point...'` to add `sceneNumber: 0, indexInScene: 0, sceneMusicCount: 1` to the `c1` object and `sceneNumber: 0, indexInScene: 1, sceneMusicCount: 2` to the `h1` object (both before any scene → sceneNumber 0; two starts in the implicit pre-scene group → count 2).

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @stagistic/script test -- deriveMusic`
Expected: FAIL (missing `sceneNumber` etc.).

- [ ] **Step 4: Implement the numbering**

Replace the body of `packages/script/src/music/deriveMusic.ts` with:

```ts
import type {MusicBlockInput, DerivedMusic} from './types';

/**
 * Pairs music atoms into music (spec §3.1) and numbers them per scene. Musical
 * structural music do not overlap as intervals: at most one open music is in
 * progress; a new open start or a scene boundary implicitly closes the
 * previous open music; an out closes the open music or is dropped (orphan). A hit
 * is a zero-duration point (endBlockId = startBlockId) that does not touch the
 * open music. Each music start carries its scene ordinal and its position among
 * the starts in that scene.
 */
export const deriveMusic = (blocks: MusicBlockInput[]): DerivedMusic[] => {
    const music: DerivedMusic[] = [];
    const musicByScene = new Map<number, DerivedMusic[]>();
    let openMusic: DerivedMusic | null = null;
    let musicNumber = 0;
    let sceneNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            sceneNumber += 1;
            openMusic = null;
        }

        block.musicAtoms.forEach(atom => {
            if (atom.role === 'start') {
                musicNumber += 1;

                const sceneMusic = musicByScene.get(sceneNumber) ?? [];
                const music: DerivedMusic = {
                    musicId: atom.musicId,
                    number: musicNumber,
                    sceneNumber,
                    indexInScene: sceneMusic.length,
                    sceneMusicCount: 0,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                };

                sceneMusic.push(music);
                musicByScene.set(sceneNumber, sceneMusic);
                music.push(music);

                if (atom.mode === 'open') {
                    openMusic = music;
                }

                return;
            }

            if (openMusic) {
                openMusic.endBlockId = block.blockId;
                openMusic = null;
            }
        });
    });

    musicByScene.forEach(sceneMusic => {
        sceneMusic.forEach(music => {
            music.sceneMusicCount = sceneMusic.length;
        });
    });

    return music;
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @stagistic/script test -- deriveMusic`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/script/src/music/types.ts packages/script/src/music/deriveMusic.ts packages/script/src/music/deriveMusic.test.ts
git commit -m "feat(script): number music per scene in deriveMusic"
```

---

### Task 2: Music number formatter

The single home of the default text format.

**Files:**
- Create: `packages/script/src/music/format.ts`
- Create: `packages/script/src/music/format.test.ts`
- Modify: `packages/script/src/music/index.ts`

**Interfaces:**
- Consumes: `DerivedMusic` (Task 1).
- Produces:
  - `musicLetter(index: number): string` — `0→'A' … 25→'Z', 26→'AA' …`.
  - `formatMusicNumber(music: Pick<DerivedMusic, 'sceneNumber' | 'indexInScene' | 'sceneMusicCount'>): string`.
  - `formatMusicOutLabel(music: Pick<DerivedMusic, 'sceneNumber' | 'indexInScene' | 'sceneMusicCount' | 'title'>): string`.

- [ ] **Step 1: Write the failing test**

Create `packages/script/src/music/format.test.ts`:

```ts
import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    musicLetter, formatMusicNumber, formatMusicOutLabel,
} from './format';

describe('music formatters', () => {
    it('formats a lone music in a scene as the scene number', () => {
        expect(formatMusicNumber({sceneNumber: 3, indexInScene: 0, sceneMusicCount: 1})).toBe('3');
    });

    it('appends a letter when a scene holds more than one music', () => {
        expect(formatMusicNumber({sceneNumber: 3, indexInScene: 0, sceneMusicCount: 2})).toBe('3.A');
        expect(formatMusicNumber({sceneNumber: 3, indexInScene: 1, sceneMusicCount: 2})).toBe('3.B');
    });

    it('continues letters past Z', () => {
        expect(musicLetter(25)).toBe('Z');
        expect(musicLetter(26)).toBe('AA');
    });

    it('formats an out as "<number> out (title)", dropping empty parens', () => {
        expect(formatMusicOutLabel({sceneNumber: 3, indexInScene: 0, sceneMusicCount: 2, title: 'Night'})).toBe('3.A out (Night)');
        expect(formatMusicOutLabel({sceneNumber: 3, indexInScene: 0, sceneMusicCount: 1, title: ''})).toBe('3 out');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test -- format`
Expected: FAIL ("cannot find module './format'").

- [ ] **Step 3: Implement the formatter**

Create `packages/script/src/music/format.ts`:

```ts
import type {DerivedMusic} from './types';

type MusicNumberInput = Pick<DerivedMusic, 'sceneNumber' | 'indexInScene' | 'sceneMusicCount'>;
type OutLabelInput = MusicNumberInput & Pick<DerivedMusic, 'title'>;

/** Spreadsheet-style letters: 0→A … 25→Z, 26→AA, 27→AB, … */
export const musicLetter = (index: number): string => {
    let result = '';
    let n = index;

    do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return result;
};

export const formatMusicNumber = (music: MusicNumberInput): string => {
    if (music.sceneMusicCount <= 1) {
        return String(music.sceneNumber);
    }

    return `${music.sceneNumber}.${musicLetter(music.indexInScene)}`;
};

export const formatMusicOutLabel = (music: OutLabelInput): string => {
    const number = formatMusicNumber(music);
    const title = music.title.trim();

    return title.length > 0 ? `${number} out (${title})` : `${number} out`;
};
```

- [ ] **Step 4: Export from the package barrel**

In `packages/script/src/music/index.ts`, add `export * from './format';` (keep alphabetical-ish ordering — place after `'./deriveMusic'`).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test -- format`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/script/src/music/format.ts packages/script/src/music/format.test.ts packages/script/src/music/index.ts
git commit -m "feat(script): add default music number formatter"
```

---

### Task 3: Persist scene/music numbering in the relational projection

Replace `script_music.music_number` with `scene_number` + `index_in_scene`, fill `script_scenes.scene_number` with the computed ordinal, and thread both through extract → queries → persist.

**Files:**
- Modify: `packages/db/src/schema.ts:259`
- Create: `packages/db/drizzle/0008_music_scene_numbering.sql`
- Modify: `packages/db/src/blocks/types.ts:62-86`
- Modify: `packages/db/src/blocks/extract.ts:181-226`
- Modify: `packages/db/src/queries/scripts/music.ts`
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.ts:95-120,285-299`
- Test: `packages/db/src/blocks/extract.music.test.ts`
- Test: `packages/db/src/queries/scripts/music.test.ts`

**Interfaces:**
- Consumes: `deriveMusic` (Task 1).
- Produces:
  - `ExtractedSceneRow` gains `sceneNumber: string`.
  - `ExtractedMusicRow` replaces `musicNumber: number` with `sceneNumber: number` + `indexInScene: number`.
  - `ScriptMusicUpsertRow` replaces `musicNumber` with `sceneNumber` + `indexInScene`.

- [ ] **Step 1: Edit the schema**

In `packages/db/src/schema.ts`, inside `scriptMusic`, replace the line
`musicNumber: integer('music_number').notNull(),`
with:

```ts
        sceneNumber: integer('scene_number').notNull().default(0),
        indexInScene: integer('index_in_scene').notNull().default(0),
```

- [ ] **Step 2: Write the migration**

Create `packages/db/drizzle/0008_music_scene_numbering.sql`:

```sql
ALTER TABLE "script_music" DROP COLUMN "music_number";--> statement-breakpoint
ALTER TABLE "script_music" ADD COLUMN "scene_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "script_music" ADD COLUMN "index_in_scene" integer DEFAULT 0 NOT NULL;
```

- [ ] **Step 3: Compile migrations**

Run: `pnpm --filter @stagistic/db db:compile-migrations`
Expected: `Compiled 9 migrations -> .../src/migrations.compiled.ts`.

- [ ] **Step 4: Update extract + query types and the failing tests**

In `packages/db/src/blocks/types.ts`, change `ExtractedSceneRow` to:

```ts
export interface ExtractedSceneRow {
    id: string,
    headingBlockId: string,
    sceneNumber: string,
}
```

and `ExtractedMusicRow` to:

```ts
export interface ExtractedMusicRow {
    id: string,
    sceneNumber: number,
    indexInScene: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

In `packages/db/src/blocks/extract.music.test.ts`, update the two music expectations (lines ~33 and ~63) to drop `musicNumber` and add the new fields:

```ts
                id: 'c1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2',
```

```ts
                id: 'h1', sceneNumber: 1, indexInScene: 0, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b1', endBlockId: 'b1',
```

(Adjust `sceneNumber` to match each fixture's scene; if the fixture has no scene heading, use `sceneNumber: 0`. Read the fixtures at the top of the file and set the expected scene ordinal accordingly.)

- [ ] **Step 5: Run the extract test to verify it fails**

Run: `pnpm --filter @stagistic/db test -- extract.music`
Expected: FAIL (type/shape mismatch).

- [ ] **Step 6: Implement the extract changes**

In `packages/db/src/blocks/extract.ts`, give each scene row its ordinal. Change the scene-row creation block (around line 185) to:

```ts
                if (!sceneByHeadingBlockId.has(blockId)) {
                    const sceneRow: ExtractedSceneRow = {
                        id: makeSceneId(scriptId, blockId),
                        headingBlockId: blockId,
                        sceneNumber: String(scenes.length + 1),
                    };

                    sceneByHeadingBlockId.set(blockId, sceneRow);
                    scenes.push(sceneRow);
                }
```

Change the music mapping (around line 218) to:

```ts
    const music: ExtractedMusicRow[] = deriveMusic(musicBlockInputs).map(music => ({
        id: music.musicId,
        sceneNumber: music.sceneNumber,
        indexInScene: music.indexInScene,
        mode: music.mode,
        title: music.title,
        kind: music.kind,
        startBlockId: music.startBlockId,
        endBlockId: music.endBlockId,
    }));
```

- [ ] **Step 7: Run the extract test to verify it passes**

Run: `pnpm --filter @stagistic/db test -- extract.music`
Expected: PASS.

- [ ] **Step 8: Update the music query + its test**

In `packages/db/src/queries/scripts/music.ts`: replace `musicNumber: number,` in `ScriptMusicUpsertRow` with `sceneNumber: number,` and `indexInScene: number,`; in `listScriptMusic` change `.orderBy(asc(scriptMusic.musicNumber))` to `.orderBy(asc(scriptMusic.sceneNumber), asc(scriptMusic.indexInScene))`; in `bulkUpsertScriptMusic` replace the `musicNumber` line in the `set` object with:

```ts
                sceneNumber: sql`excluded."scene_number"`,
                indexInScene: sql`excluded."index_in_scene"`,
```

In `packages/db/src/queries/scripts/music.test.ts`, replace every `musicNumber: N` in the upsert rows with `sceneNumber: N, indexInScene: 0` (and in the multi-music ordering test, set distinct `sceneNumber`/`indexInScene` so the `orderBy` is exercised, e.g. music `c1` → `sceneNumber: 1, indexInScene: 0`, music `c2` → `sceneNumber: 1, indexInScene: 1`); update the `select`-shape expectation (line ~29) from `musicNumber: 1` to `sceneNumber: 1, indexInScene: 0`.

- [ ] **Step 9: Update the persister**

In `packages/db/src/repo/persist/persistDocumentDelta.ts`:

Change the music signature (line ~96) to:

```ts
            .map(music => `${music.id}:${music.sceneNumber}:${music.indexInScene}:${music.mode}:${music.title}:${music.kind ?? ''}:${music.startBlockId}:${music.endBlockId ?? ''}`)
```

In the `bulkUpsertScriptMusic` mapping (line ~109), replace `musicNumber: music.musicNumber,` with:

```ts
                sceneNumber: music.sceneNumber,
                indexInScene: music.indexInScene,
```

In the scene upsert mapping (line ~292), replace `sceneNumber: prev?.sceneNumber ?? null,` with:

```ts
                    sceneNumber: scene.sceneNumber,
```

- [ ] **Step 10: Run the db package tests**

Run: `pnpm --filter @stagistic/db test`
Expected: PASS (extract, music query, and any persist tests).

- [ ] **Step 11: Commit**

```bash
git add packages/db/src/schema.ts packages/db/drizzle/0008_music_scene_numbering.sql packages/db/src/migrations.compiled.ts packages/db/src/blocks/types.ts packages/db/src/blocks/extract.ts packages/db/src/blocks/extract.music.test.ts packages/db/src/queries/scripts/music.ts packages/db/src/queries/scripts/music.test.ts packages/db/src/repo/persist/persistDocumentDelta.ts
git commit -m "feat(db): persist scene-based music/scene numbering"
```

---

### Task 4: Music-numbering decoration plugin

A plugin that decorates each music atom with its label, recomputing only when the scene/music structure or a music title changes.

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/musicNumbering/musicLabels.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/musicNumbering/musicLabels.test.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/musicNumbering/plugin.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/MusicNumberingExtension.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/index.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts:25-31,151-154`

**Interfaces:**
- Consumes: `deriveMusic`, `formatMusicNumber`, `formatMusicOutLabel`, `collectMusicAtoms` (script); `MUSIC_START_NODE_NAME`, `MUSIC_OUT_NODE_NAME`, `MUSIC_ID_ATTR`.
- Produces:
  - `buildMusicLabelMap(music: DerivedMusic[]): {byMusicId: Map<string, string>, outByEndBlockId: Map<string, string>}`.
  - `MusicNumberingExtension` (Tiptap `Extension`) adding the plugin.
  - Node decorations carrying `spec.musicNumber` (on `musicStart`) and `spec.outLabel` (on `musicOut`).

- [ ] **Step 1: Write the failing label-map test**

Create `packages/editor/src/editor/tiptap/extensions/musicNumbering/musicLabels.test.ts`:

```ts
import type {DerivedMusic} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {buildMusicLabelMap} from './musicLabels';

const music = (over: Partial<DerivedMusic>): DerivedMusic => ({
    musicId: 'c1', number: 1, sceneNumber: 1, indexInScene: 0, sceneMusicCount: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: null, ...over,
});

describe('buildMusicLabelMap', () => {
    it('maps a music start id to its formatted number', () => {
        const {byMusicId} = buildMusicLabelMap([music({sceneNumber: 3, sceneMusicCount: 2, indexInScene: 1})]);

        expect(byMusicId.get('c1')).toBe('3.B');
    });

    it('maps an explicit out (by its block) to the out label', () => {
        const {outByEndBlockId} = buildMusicLabelMap([music({title: 'Night', endBlockId: 'b2', sceneNumber: 3})]);

        expect(outByEndBlockId.get('b2')).toBe('3 out (Night)');
    });

    it('does not map a hit as an out', () => {
        const {outByEndBlockId} = buildMusicLabelMap([music({mode: 'hit', endBlockId: 'b1'})]);

        expect(outByEndBlockId.size).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/editor test -- musicLabels`
Expected: FAIL ("cannot find module './musicLabels'").

- [ ] **Step 3: Implement the label map**

Create `packages/editor/src/editor/tiptap/extensions/musicNumbering/musicLabels.ts`:

```ts
import {
    type DerivedMusic, formatMusicNumber, formatMusicOutLabel,
} from '@stagistic/script';

export interface MusicLabelMap {
    byMusicId: Map<string, string>,
    outByEndBlockId: Map<string, string>,
}

/**
 * Music start → its formatted number. Explicit out → the closed music's label,
 * keyed by the out's block id (which equals the music's endBlockId). Hits and
 * implicitly-closed music contribute no out entry.
 */
export const buildMusicLabelMap = (music: DerivedMusic[]): MusicLabelMap => {
    const byMusicId = new Map<string, string>();
    const outByEndBlockId = new Map<string, string>();

    music.forEach(music => {
        byMusicId.set(music.musicId, formatMusicNumber(music));

        if (music.mode === 'open' && music.endBlockId) {
            outByEndBlockId.set(music.endBlockId, formatMusicOutLabel(music));
        }
    });

    return {byMusicId, outByEndBlockId};
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/editor test -- musicLabels`
Expected: PASS.

- [ ] **Step 5: Implement the plugin**

Create `packages/editor/src/editor/tiptap/extensions/musicNumbering/plugin.ts`:

```ts
import {
    collectMusicAtoms,
    MUSIC_ID_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type MusicBlockInput,
    deriveMusic,
    type ScriptNode,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin, PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration, DecorationSet,
} from '@tiptap/pm/view';

import {
    isScriptBlockNodeName, normalizeBlockNodeType, resolveScriptBlockNodeType,
} from '../../scriptCore';
import {buildMusicLabelMap} from './musicLabels';

export const musicNumberingPluginKey = new PluginKey<MusicNumberingState>('musicNumbering');

interface MusicNumberingState {
    signature: string,
    decorations: DecorationSet,
}

const readBlockId = (node: ProseMirrorNode): string => {
    const id = node.attrs.id;

    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : '';
};

const resolveBlockType = (node: ProseMirrorNode): string => {
    const attrs = node.attrs as Record<string, unknown>;

    return normalizeBlockNodeType(resolveScriptBlockNodeType(node.type.name) ?? attrs.blockType ?? 'stageDirection');
};

/**
 * A light walk capturing everything labels depend on, in document order:
 * scene boundaries, music start ids/titles/modes, and out markers. An unchanged
 * signature means labels are unchanged, so we skip the rebuild.
 */
const computeSignature = (doc: ProseMirrorNode): string => {
    const parts: string[] = [];

    doc.descendants(node => {
        const name = node.type.name;

        if (isScriptBlockNodeName(name) && resolveBlockType(node) === 'scene') {
            parts.push('S');
        } else if (name === MUSIC_START_NODE_NAME) {
            parts.push(`s:${String(node.attrs[MUSIC_ID_ATTR] ?? '')}:${String(node.attrs[MUSIC_TITLE_ATTR] ?? '')}:${String(node.attrs[MUSIC_MODE_ATTR] ?? '')}`);
        } else if (name === MUSIC_OUT_NODE_NAME) {
            parts.push('o');
        }

        return true;
    });

    return parts.join('|');
};

const buildDecorations = (doc: ProseMirrorNode): DecorationSet => {
    const musicBlockInputs: MusicBlockInput[] = [];
    const atomSites: {pos: number, size: number, name: string, musicId: string, blockId: string}[] = [];
    let currentBlockId = '';

    doc.descendants((node, pos) => {
        if (isScriptBlockNodeName(node.type.name)) {
            currentBlockId = readBlockId(node);
            musicBlockInputs.push({
                blockId: currentBlockId,
                blockType: resolveBlockType(node),
                musicAtoms: collectMusicAtoms(node.toJSON() as ScriptNode),
            });
        }

        if (node.type.name === MUSIC_START_NODE_NAME || node.type.name === MUSIC_OUT_NODE_NAME) {
            atomSites.push({
                pos,
                size: node.nodeSize,
                name: node.type.name,
                musicId: String(node.attrs[MUSIC_ID_ATTR] ?? ''),
                blockId: currentBlockId,
            });
        }

        return true;
    });

    const labels = buildMusicLabelMap(deriveMusic(musicBlockInputs));
    const decorations = atomSites.map(site => {
        if (site.name === MUSIC_START_NODE_NAME) {
            return Decoration.node(site.pos, site.pos + site.size, {}, {musicNumber: labels.byMusicId.get(site.musicId) ?? ''});
        }

        return Decoration.node(site.pos, site.pos + site.size, {}, {outLabel: labels.outByEndBlockId.get(site.blockId) ?? 'out'});
    });

    return DecorationSet.create(doc, decorations);
};

export const musicNumberingPlugin = () => new Plugin<MusicNumberingState>({
    key: musicNumberingPluginKey,
    state: {
        init: (_config, state) => ({
            signature: computeSignature(state.doc),
            decorations: buildDecorations(state.doc),
        }),
        apply: (tr, prev) => {
            if (!tr.docChanged) {
                return prev;
            }

            const signature = computeSignature(tr.doc);

            if (signature === prev.signature) {
                return {signature, decorations: prev.decorations.map(tr.mapping, tr.doc)};
            }

            return {signature, decorations: buildDecorations(tr.doc)};
        },
    },
    props: {
        decorations: state => musicNumberingPluginKey.getState(state)?.decorations,
    },
});
```

- [ ] **Step 6: Wrap it in an extension and register it**

Create `packages/editor/src/editor/tiptap/extensions/MusicNumberingExtension.ts`:

```ts
import {Extension} from '@tiptap/core';

import {musicNumberingPlugin} from './musicNumbering/plugin';

export const MusicNumberingExtension = Extension.create({
    name: 'musicNumbering',

    addProseMirrorPlugins() {
        return [musicNumberingPlugin()];
    },
});
```

In `packages/editor/src/editor/tiptap/extensions/index.ts`, add `export * from './MusicNumberingExtension';` next to the other music exports.

In `packages/editor/src/editor/useEditorExtensions.ts`: add `MusicNumberingExtension,` to the import list from `'./tiptap/extensions'` (with the other `Music*` entries), and add `MusicNumberingExtension,` to the `extensions` array right after `MusicInputExtension,`.

- [ ] **Step 7: Run the editor type/test check**

Run: `pnpm --filter @stagistic/editor test -- musicLabels`
Expected: PASS (plugin wiring is exercised end-to-end in Task 5; this confirms the package still compiles).

- [ ] **Step 8: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/musicNumbering packages/editor/src/editor/tiptap/extensions/MusicNumberingExtension.ts packages/editor/src/editor/tiptap/extensions/index.ts packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): decorate music atoms with computed numbers"
```

---

### Task 5: Show the number on the pills

Read the decoration label and render it.

**Files:**
- Modify: `packages/editor/src/editor/tiptap/nodes/MusicPill.tsx`
- Modify: `packages/editor/src/editor/tiptap/nodes/MusicPill.module.css`
- Test: `packages/editor/src/editor/tiptap/extensions/musicInput/musicCompose.browser.test.tsx`

**Interfaces:**
- Consumes: `NodeViewProps.decorations` carrying `spec.musicNumber` / `spec.outLabel` (Task 4).

- [ ] **Step 1: Write the failing browser assertions**

In `packages/editor/src/editor/tiptap/extensions/musicInput/musicCompose.browser.test.tsx`, extend the `'turns # + title + Enter...'` test: after the `expect(input?.value).toBe('Night');` line, add:

```ts
        const number = pill.querySelector<HTMLElement>('[data-music-number]');

        expect(number?.textContent).toBe('0');
```

(No scene heading in the fixture → `sceneNumber 0`.)

Add a new test at the end of the `describe` block:

```ts
    it('renders the closed music number and title on the out pill', async () => {
        renderEditor(createTwoBlockDocument());

        await getEditor();
        const first = page.elementLocator(await poll(() => document.querySelector('[data-id="sd-1"]'), 'first block'));

        await first.click();
        await userEvent.type(first, '#Night');
        await userEvent.keyboard('{Enter}');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        const second = page.elementLocator(await poll(() => document.querySelector('[data-id="sd-2"]'), 'second block'));

        await second.click();
        await userEvent.type(second, '#out');
        await userEvent.keyboard('{Enter}');

        const outPill = await poll(() => document.querySelector('[data-music-pill="out"]'), 'music out pill');

        await poll(() => (outPill.textContent ?? '').includes('out (Night)') ? true : null, 'out label');

        expect(outPill.textContent).toContain('0 out (Night)');
    });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @stagistic/editor test:browser -- musicCompose`
Expected: FAIL (no `[data-music-number]`; out pill shows bare `out`).

- [ ] **Step 3: Read the label in the pills**

In `packages/editor/src/editor/tiptap/nodes/MusicPill.tsx`, add this helper above `MusicStartPill`:

```ts
const readDecorationLabel = (decorations: NodeViewProps['decorations'], key: string): string => {
    for (const decoration of decorations) {
        const value = (decoration.spec as Record<string, unknown> | undefined)?.[key];

        if (typeof value === 'string') {
            return value;
        }
    }

    return '';
};
```

In `MusicStartPill`, add `decorations` to the destructured props, compute `const musicNumber = readDecorationLabel(decorations, 'musicNumber');`, and render it before the `<input>` inside `styles.tagBody`:

```tsx
                <span className={styles.number} data-music-number aria-hidden>{musicNumber}</span>
```

In `MusicOutPill`, add `decorations` to the destructured props, compute `const outLabel = readDecorationLabel(decorations, 'outLabel') || 'out';`, and replace the bare `out` text node (the literal `out` between `>` and `{active ? (`) with `{outLabel}`.

- [ ] **Step 4: Style the number**

In `packages/editor/src/editor/tiptap/nodes/MusicPill.module.css`, add a `.number` rule (a subdued numeric prefix with a small right margin), e.g.:

```css
.number {
    margin-inline-end: 0.35em;
    color: color-mix(in oklch, currentColor 60%, transparent);
    font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @stagistic/editor test:browser -- musicCompose`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes/MusicPill.tsx packages/editor/src/editor/tiptap/nodes/MusicPill.module.css packages/editor/src/editor/tiptap/extensions/musicInput/musicCompose.browser.test.tsx
git commit -m "feat(editor): render music numbers and out labels on pills"
```

---

### Task 6: Scene numbers in the Structure sidebar

Prefix each scene title with its global ordinal.

**Files:**
- Modify: `packages/app-routes/src/routes/script/editor/structure/structureRows.ts:11-14,43-85`
- Modify: `packages/app-routes/src/routes/script/editor/structure/types.ts:6-13`
- Modify: `packages/app-routes/src/routes/script/editor/structure/StructureRowScene.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.tsx:258-268`
- Test: `packages/app-routes/src/routes/script/editor/structure/structureRows.test.ts` (create if absent)

**Interfaces:**
- Produces: `SceneItem` gains `sceneNumber: number`; `StructureRowSceneProps` gains `sceneNumber: number`.

- [ ] **Step 1: Write the failing test**

Create (or extend) `packages/app-routes/src/routes/script/editor/structure/structureRows.test.ts`:

```ts
import {
    describe, expect, it,
} from 'vite-plus/test';

import {deriveStructureStateFromIndex} from './structureRows';

describe('scene numbering', () => {
    it('numbers scenes globally across acts', () => {
        const state = deriveStructureStateFromIndex({
            blocks: [
                {blockId: 'a1', blockType: 'act', textContent: 'ACT I', orderNo: 0, actBlockId: 'a1', sceneBlockId: null, characterRefs: null},
                {blockId: 's1', blockType: 'scene', textContent: 'Dawn', orderNo: 1, actBlockId: 'a1', sceneBlockId: 's1', characterRefs: null},
                {blockId: 'a2', blockType: 'act', textContent: 'ACT II', orderNo: 2, actBlockId: 'a2', sceneBlockId: null, characterRefs: null},
                {blockId: 's2', blockType: 'scene', textContent: 'Dusk', orderNo: 3, actBlockId: 'a2', sceneBlockId: 's2', characterRefs: null},
            ],
            music: [],
        });

        const scenes = state.groups.flatMap(g => g.scenes);

        expect(scenes.map(s => [s.sceneNumber, s.title])).toEqual([[1, 'Dawn'], [2, 'Dusk']]);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @stagistic/app-routes test -- structureRows`
Expected: FAIL (`sceneNumber` missing).

- [ ] **Step 3: Carry the ordinal through `buildState`**

In `packages/app-routes/src/routes/script/editor/structure/structureRows.ts`:

Add `sceneNumber: number,` to `SceneItem`:

```ts
export interface SceneItem {
    blockId: string,
    title: string,
    sceneNumber: number,
}
```

In `buildState`, add a counter and set it on each pushed scene. Before the `for` loop add `let sceneNumber = 0;`, and replace the scene push (inside `if (block.blockType === SCENE_BLOCK_TYPE)`) with:

```ts
        if (block.blockType === SCENE_BLOCK_TYPE) {
            sceneNumber += 1;
            groups[groups.length - 1].scenes.push({
                blockId: block.blockId,
                title: block.text || 'Untitled scene',
                sceneNumber,
            });
            currentSceneBlockId = block.blockId;
            sceneAncestorByBlockId.set(block.blockId, block.blockId);
            continue;
        }
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @stagistic/app-routes test -- structureRows`
Expected: PASS.

- [ ] **Step 5: Render the prefix**

In `packages/app-routes/src/routes/script/editor/structure/types.ts`, add `sceneNumber: number,` to `StructureRowSceneProps`.

In `packages/app-routes/src/routes/script/editor/structure/StructureRowScene.tsx`, add `sceneNumber` to the destructured props and render it before the title:

```tsx
                <span className={clsx(styles.itemLabel, styles.sceneTitle)}>{`${sceneNumber}. ${title}`}</span>
```

In `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.tsx`, pass the prop in the `group.scenes.map(...)` block:

```tsx
                                            sceneNumber={scene.sceneNumber}
```

- [ ] **Step 6: Run the package test suite**

Run: `pnpm --filter @stagistic/app-routes test -- structure`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/app-routes/src/routes/script/editor/structure
git commit -m "feat(editor): show scene numbers in the Structure sidebar"
```

---

### Task 7: Remove the legacy global `number`

Now that every consumer uses the structured fields, drop `DerivedMusic.number`.

**Files:**
- Modify: `packages/script/src/music/types.ts`
- Modify: `packages/script/src/music/deriveMusic.ts`
- Modify: `packages/script/src/music/deriveMusic.test.ts`
- Modify: `packages/script/src/indexing/scriptBlockIndex.test.ts:150-154`
- Modify: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.music.test.ts:46-49`

**Interfaces:**
- Produces: `DerivedMusic` without `number`.

- [ ] **Step 1: Verify no runtime consumer remains**

Run: `grep -rn "\.number\b" packages/db/src packages/editor/src packages/script/src | grep -i music`
Expected: only matches inside `deriveMusic.ts`/`types.ts`/test files (no production reader in db/editor). If a runtime reader appears, stop and migrate it to `sceneNumber`/`indexInScene` first.

- [ ] **Step 2: Remove the field**

In `packages/script/src/music/types.ts`, delete the `number: number,` line and its comment from `DerivedMusic`.

In `packages/script/src/music/deriveMusic.ts`, delete `let musicNumber = 0;`, the `musicNumber += 1;` line, and the `number: musicNumber,` property.

- [ ] **Step 3: Drop `number` from the snapshot tests**

In `packages/script/src/music/deriveMusic.test.ts`, remove `number: 1,` (and `number: 2,`) from the remaining `toEqual` object literals.

In `packages/script/src/indexing/scriptBlockIndex.test.ts` (line ~152), remove `number: 1,` from the music expectation and add `sceneNumber: 0, indexInScene: 0, sceneMusicCount: 1,` (match the fixture's scene — read it; if no scene heading, sceneNumber is 0).

In `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.music.test.ts` (line ~48), make the same swap on the music expectation.

- [ ] **Step 4: Run the affected suites**

Run: `pnpm --filter @stagistic/script test && pnpm --filter @stagistic/editor test -- buildIndexSnapshotFromPmDoc.music`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/music/types.ts packages/script/src/music/deriveMusic.ts packages/script/src/music/deriveMusic.test.ts packages/script/src/indexing/scriptBlockIndex.test.ts packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.music.test.ts
git commit -m "refactor(script): drop legacy global music number"
```

---

## Final verification

- [ ] Run the full test suites touched: `pnpm --filter @stagistic/script test && pnpm --filter @stagistic/db test && pnpm --filter @stagistic/editor test && pnpm --filter @stagistic/app-routes test`
- [ ] Run the music browser tests: `pnpm --filter @stagistic/editor test:browser -- musicCompose`
- [ ] Typecheck/lint per repo convention (e.g. `pnpm -w lint` / `pnpm -w typecheck` if present).
