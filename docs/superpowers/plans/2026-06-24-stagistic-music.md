# Stagistic Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a writer enter, edit, and delete musical structural music
(`@@music` / `@@out`, plus a zero-duration `hit`) inside stage-direction
blocks, and project them to a relational `script_music` table — readying the
editor for import/export.

**Architecture:** Music markers are inline **atom nodes** (`musicStart`, `musicOut`)
that always sit at the end of a `stageDirection` block. A single pure
helper `deriveMusic` in `@stagistic/script` pairs starts↔outs positionally
(no overlap of open music; a hit is a zero-duration point) and is reused by
all three derivation sites: the two live index snapshots (`@stagistic/script`
JSON, `@stagistic/editor` PM doc) and the DB extractor (`@stagistic/db`).
Entry is via an `@@` inline compose and a generic right-click block context
menu; per-music actions (edit title, switch open/hit, delete) live in a pill
context menu. Deletion is never a one-click or keystroke action.

**Tech Stack:** TypeScript (ESM, strict), Tiptap/ProseMirror, React,
Drizzle ORM (Postgres), Vitest (run via `vite-plus`/`vp`), pnpm workspaces.

## Global Constraints

- **Spec is authoritative:** `docs/superpowers/specs/2026-06-14-stagistic-syntax-design.md` (§10), `docs/superpowers/specs/2026-06-14-stagistic-data-model-design.md` (§8), and `docs/superpowers/specs/2026-06-24-stagistic-music-editor-design.md` (the music spec). Re-read the music spec before each task.
- **UI labels are English** (the editor UI is English): `Add music`, `Add out`, `Edit title`, `Switch to hit`, `Switch to open`, `Delete music`, `Delete end`.
- **No browser/preview tooling.** Verify logic with Vitest; verify editor code with `pnpm lint` (eslint + stylelint, type-aware). UI appearance/interaction is verified visually **by the user** — each editor task ends at a user checkpoint, not an automated UI test. (This matches the repo: tests cover logic/data, not React.)
- **Test runner:** `pnpm --filter <pkg> test <fileSubstring>` runs that package's Vitest (e.g. `pnpm --filter @stagistic/script test deriveMusic`). `pnpm test` runs all.
- **DB migrations are generated, never hand-written:** after editing `packages/db/src/schema.ts`, run `pnpm db:generate` (creates + compiles the SQL migration) and `pnpm db:check`.
- **IDs:** `createNodeId()` from `@stagistic/script` generates a `musicId`.
- **DRY / YAGNI / TDD / frequent commits.** Reserved-but-unused now: music `kind` (set by nothing); production light/sound/vfx cues use separate future nodes.
- **Commit style:** conventional (`feat:`, `test:`, `refactor:`); end the body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Phase 1 — Music domain (`@stagistic/script`): constants + pairing (pure, TDD)

### Task 1: Music constants and shared types

**Files:**
- Create: `packages/script/src/music/constants.ts`
- Create: `packages/script/src/music/types.ts`
- Modify: `packages/script/src/index.ts` (add `export * from './music';`)
- Create: `packages/script/src/music/index.ts`

**Interfaces:**
- Produces:
  - `MUSIC_START_NODE_NAME = 'musicStart'`, `MUSIC_OUT_NODE_NAME = 'musicOut'`
  - `MUSIC_ID_ATTR = 'musicId'`, `MUSIC_MODE_ATTR = 'mode'`, `MUSIC_TITLE_ATTR = 'title'`, `MUSIC_KIND_ATTR = 'kind'`
  - `type MusicMode = 'open' | 'hit'`
  - `type MusicAtom = { role: 'start', musicId: string, mode: MusicMode, title: string, kind: string | null } | { role: 'out' }`
  - `interface MusicBlockInput { blockId: string, blockType: string, musicAtoms: MusicAtom[] }`
  - `interface DerivedMusic { musicId: string, number: number, mode: MusicMode, title: string, kind: string | null, startBlockId: string, endBlockId: string | null }`

- [ ] **Step 1: Write constants**

```typescript
// packages/script/src/music/constants.ts
export const MUSIC_START_NODE_NAME = 'musicStart';
export const MUSIC_OUT_NODE_NAME = 'musicOut';

export const MUSIC_ID_ATTR = 'musicId';
export const MUSIC_MODE_ATTR = 'mode';
export const MUSIC_TITLE_ATTR = 'title';
export const MUSIC_KIND_ATTR = 'kind';

export const MUSIC_MODES = ['open', 'hit'] as const;
```

- [ ] **Step 2: Write types**

```typescript
// packages/script/src/music/types.ts
import type {MUSIC_MODES} from './constants';

export type MusicMode = (typeof MUSIC_MODES)[number];

export type MusicAtom =
    | {role: 'start', musicId: string, mode: MusicMode, title: string, kind: string | null}
    | {role: 'out'};

export interface MusicBlockInput {
    blockId: string,
    blockType: string,
    musicAtoms: MusicAtom[],
}

export interface DerivedMusic {
    musicId: string,
    number: number,
    mode: MusicMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

- [ ] **Step 3: Barrel export**

```typescript
// packages/script/src/music/index.ts
export * from './constants';
export * from './types';
export * from './collectMusicAtoms';
export * from './deriveMusic';
```

Add `export * from './music';` to `packages/script/src/index.ts` (next to the existing `characters` / `indexing` exports).

- [ ] **Step 4: Verify it compiles**

Run: `pnpm --filter @stagistic/script lint`
Expected: PASS (no unresolved imports; `collectMusicAtoms`/`deriveMusic` are added in Tasks 2–3 — if lint runs before them, complete Task 2/3 first then re-run).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/music packages/script/src/index.ts
git commit -m "feat(script): add music node constants and shared music types"
```

### Task 2: `collectMusicAtoms` — read music atoms from a block node

**Files:**
- Create: `packages/script/src/music/collectMusicAtoms.ts`
- Test: `packages/script/src/music/collectMusicAtoms.test.ts`

**Interfaces:**
- Consumes: `ScriptNode` (from `../document`), constants/types (Task 1).
- Produces: `collectMusicAtoms(blockNode: ScriptNode): MusicAtom[]` — music atoms in document order; non-music children ignored.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/script/src/music/collectMusicAtoms.test.ts
import {describe, expect, it} from 'vitest';

import {collectMusicAtoms} from './collectMusicAtoms';

describe('collectMusicAtoms', () => {
    it('returns start and out atoms in order, ignoring text', () => {
        const block = {
            type: 'stageDirection',
            content: [
                {type: 'text', text: 'Lights fade.'},
                {type: 'musicStart', attrs: {musicId: 'c1', mode: 'open', title: 'Night', kind: null}},
                {type: 'musicOut'},
            ],
        };

        expect(collectMusicAtoms(block as never)).toEqual([
            {role: 'start', musicId: 'c1', mode: 'open', title: 'Night', kind: null},
            {role: 'out'},
        ]);
    });

    it('defaults a malformed start to open with empty strings', () => {
        const block = {type: 'stageDirection', content: [{type: 'musicStart', attrs: {}}]};

        expect(collectMusicAtoms(block as never)).toEqual([
            {role: 'start', musicId: '', mode: 'open', title: '', kind: null},
        ]);
    });

    it('returns [] when the block has no content', () => {
        expect(collectMusicAtoms({type: 'stageDirection'} as never)).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test collectMusicAtoms`
Expected: FAIL ("Failed to resolve import './collectMusicAtoms'").

- [ ] **Step 3: Implement**

```typescript
// packages/script/src/music/collectMusicAtoms.ts
import type {ScriptNode} from '../document';
import {
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from './constants';
import type {MusicAtom, MusicMode} from './types';

const readMode = (value: unknown): MusicMode => (value === 'hit' ? 'hit' : 'open');
const readString = (value: unknown): string => (typeof value === 'string' ? value : '');
const readKind = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

export const collectMusicAtoms = (blockNode: ScriptNode): MusicAtom[] => {
    if (!Array.isArray(blockNode.content)) {
        return [];
    }

    const atoms: MusicAtom[] = [];

    blockNode.content.forEach(child => {
        if (!child || typeof child !== 'object') {
            return;
        }

        if (child.type === MUSIC_START_NODE_NAME) {
            const attrs = (child.attrs && typeof child.attrs === 'object' ? child.attrs : {}) as Record<string, unknown>;

            atoms.push({
                role: 'start',
                musicId: readString(attrs[MUSIC_ID_ATTR]),
                mode: readMode(attrs[MUSIC_MODE_ATTR]),
                title: readString(attrs[MUSIC_TITLE_ATTR]),
                kind: readKind(attrs[MUSIC_KIND_ATTR]),
            });
        } else if (child.type === MUSIC_OUT_NODE_NAME) {
            atoms.push({role: 'out'});
        }
    });

    return atoms;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test collectMusicAtoms`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/music/collectMusicAtoms.ts packages/script/src/music/collectMusicAtoms.test.ts
git commit -m "feat(script): collectMusicAtoms reads music atoms from a block node"
```

### Task 3: `deriveMusic` — positional pairing (the §3.1 algorithm)

**Files:**
- Create: `packages/script/src/music/deriveMusic.ts`
- Test: `packages/script/src/music/deriveMusic.test.ts`

**Interfaces:**
- Consumes: `MusicBlockInput`, `DerivedMusic` (Task 1).
- Produces: `deriveMusic(blocks: MusicBlockInput[]): DerivedMusic[]`.

Algorithm (spec §3.1): walk blocks in order; a `scene` block clears the open
music (implicit end at scene boundary); an open start closes any open music
implicitly and becomes the open music; a **hit** start emits a point
(`endBlockId = startBlockId`) and does **not** touch the open music; an out
closes the open music or is dropped (orphan). `number` increments on every
start.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/script/src/music/deriveMusic.test.ts
import {describe, expect, it} from 'vitest';

import type {MusicBlockInput} from './types';
import {deriveMusic} from './deriveMusic';

const sd = (blockId: string, musicAtoms: MusicBlockInput['musicAtoms']): MusicBlockInput => ({blockId, blockType: 'stageDirection', musicAtoms});
const scene = (blockId: string): MusicBlockInput => ({blockId, blockType: 'scene', musicAtoms: []});

describe('deriveMusic', () => {
    it('pairs an explicit out to its open start', () => {
        const music = deriveMusic([
            sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null}]),
            sd('b2', [{role: 'out'}]),
        ]);

        expect(music).toEqual([
            {musicId: 'c1', number: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
        ]);
    });

    it('leaves an open music with null endBlockId when no out follows', () => {
        const music = deriveMusic([sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null}])]);

        expect(music[0].endBlockId).toBeNull();
    });

    it('implicitly closes a prior open music when a new open start appears', () => {
        const music = deriveMusic([
            sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null}]),
            sd('b2', [{role: 'start', musicId: 'c2', mode: 'open', title: 'B', kind: null}]),
        ]);

        expect(music.map(c => [c.musicId, c.endBlockId])).toEqual([['c1', null], ['c2', null]]);
    });

    it('clears the open music at a scene boundary (orphans a later out)', () => {
        const music = deriveMusic([
            sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null}]),
            scene('s2'),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(music).toHaveLength(1);
        expect(music[0].endBlockId).toBeNull();
    });

    it('treats a hit as a zero-duration point that does not touch the open music', () => {
        const music = deriveMusic([
            sd('b1', [{role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null}]),
            sd('b2', [{role: 'start', musicId: 'h1', mode: 'hit', title: 'Sting', kind: null}]),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(music).toEqual([
            {musicId: 'c1', number: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b3'},
            {musicId: 'h1', number: 2, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b2', endBlockId: 'b2'},
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test deriveMusic`
Expected: FAIL ("Failed to resolve import './deriveMusic'").

- [ ] **Step 3: Implement**

```typescript
// packages/script/src/music/deriveMusic.ts
import type {MusicBlockInput, DerivedMusic} from './types';

export const deriveMusic = (blocks: MusicBlockInput[]): DerivedMusic[] => {
    const music: DerivedMusic[] = [];
    let openMusic: DerivedMusic | null = null;
    let musicNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            openMusic = null;
        }

        block.musicAtoms.forEach(atom => {
            if (atom.role === 'start') {
                musicNumber += 1;

                const music: DerivedMusic = {
                    musicId: atom.musicId,
                    number: musicNumber,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                };

                music.push(music);

                if (atom.mode === 'open') {
                    openMusic = music;
                }

                return;
            }

            // role === 'out'
            if (openMusic) {
                openMusic.endBlockId = block.blockId;
                openMusic = null;
            }
            // else: orphan out — dropped
        });
    });

    return music;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test deriveMusic`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/music/deriveMusic.ts packages/script/src/music/deriveMusic.test.ts
git commit -m "feat(script): deriveMusic positional pairing for open/hit music"
```

---

## Phase 2 — Live index snapshots carry music

### Task 4: Add `music` to `buildScriptBlockIndex` (JSON)

**Files:**
- Modify: `packages/script/src/indexing/scriptBlockIndex.ts`
- Test: `packages/script/src/indexing/scriptBlockIndex.test.ts`

**Interfaces:**
- Consumes: `collectMusicAtoms`, `deriveMusic`, `DerivedMusic` (Phase 1).
- Produces: `ScriptBlockIndexSnapshot.music: DerivedMusic[]`.

- [ ] **Step 1: Add the failing test**

Append to `scriptBlockIndex.test.ts`:

```typescript
import {deriveMusic} from '../music'; // ensure import exists at top with others

it('projects music from stage-direction music atoms', () => {
    const doc = {
        type: 'doc',
        content: [
            {type: 'stageDirection', attrs: {id: 'b1'}, content: [
                {type: 'text', text: 'Lights fade.'},
                {type: 'musicStart', attrs: {musicId: 'c1', mode: 'open', title: 'Night', kind: null}},
            ]},
            {type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'musicOut'}]},
        ],
    };

    const {snapshot} = buildScriptBlockIndex(doc as never);

    expect(snapshot.music).toEqual([
        {musicId: 'c1', number: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
    ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test scriptBlockIndex`
Expected: FAIL (`snapshot.music` is `undefined`).

- [ ] **Step 3: Implement**

In `scriptBlockIndex.ts`:

1. Add imports: `import {collectMusicAtoms, deriveMusic, type MusicBlockInput, type DerivedMusic} from '../music';`
2. Add `music: DerivedMusic[]` to the `ScriptBlockIndexSnapshot` interface.
3. In `buildScriptBlockIndex`, accumulate `const musicBlockInputs: MusicBlockInput[] = [];`. Inside `walkNodes`, for each block pushed, also push `{blockId, blockType, musicAtoms: collectMusicAtoms(node)}`.
4. Build the snapshot with `music: deriveMusic(musicBlockInputs)` (and `music: []` in the empty-document early return).

Concrete additions — empty return and final return become:

```typescript
return {snapshot: {blocks: [], music: []}, blockCount: 0};
```
```typescript
return {snapshot: {blocks, music: deriveMusic(musicBlockInputs)}, blockCount: blocks.length};
```

And inside the per-block push in `walkNodes`:

```typescript
musicBlockInputs.push({blockId, blockType, musicAtoms: collectMusicAtoms(node)});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test scriptBlockIndex`
Expected: PASS (existing + new test).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/indexing/scriptBlockIndex.ts packages/script/src/indexing/scriptBlockIndex.test.ts
git commit -m "feat(script): project music in buildScriptBlockIndex snapshot"
```

### Task 5: Add `music` to `buildIndexSnapshotFromPmDoc` (PM doc)

**Files:**
- Modify: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts`
- Test: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.music.test.ts`

**Interfaces:**
- Consumes: `collectMusicAtoms`, `deriveMusic`, `MusicBlockInput` (`@stagistic/script`); a PM `Node`.
- Produces: same `ScriptBlockIndexSnapshot.music` shape as Task 4 (the snapshot type is shared).

This mirrors how the file already does tags: convert each block node to JSON
and reuse the JSON helper. Build a `MusicBlockInput` per block and call
`deriveMusic` once.

- [ ] **Step 1: Write the failing test** (build a schema from the editor's node list, then a PM doc)

```typescript
// buildIndexSnapshotFromPmDoc.music.test.ts
import {getSchema} from '@tiptap/core';
import {Node} from '@tiptap/pm/model';
import {describe, expect, it} from 'vitest';

import {ScriptBlockNodes} from '../tiptap/nodes';
import {MusicStartNode, MusicOutNode} from '../tiptap/nodes'; // added in Task 11
import {buildIndexSnapshotFromPmDoc} from './buildIndexSnapshotFromPmDoc';

describe('buildIndexSnapshotFromPmDoc music', () => {
    it('projects music from music atom nodes', () => {
        const schema = getSchema([...ScriptBlockNodes, MusicStartNode, MusicOutNode]);
        const doc = Node.fromJSON(schema, {
            type: 'doc',
            content: [
                {type: 'stageDirection', attrs: {id: 'b1'}, content: [
                    {type: 'musicStart', attrs: {musicId: 'c1', mode: 'open', title: 'Night', kind: null}},
                ]},
                {type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'musicOut'}]},
            ],
        });

        expect(buildIndexSnapshotFromPmDoc(doc).music).toEqual([
            {musicId: 'c1', number: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
        ]);
    });
});
```

> Ordering note: this test depends on the music nodes from Task 11. If you implement Phase 2 before Phase 4, mark this test `.skip` with a `// TODO(Task 11): enable once music nodes exist` and enable it in Task 11's verification. (The `deriveMusic` logic itself is already proven in Task 3.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/editor test buildIndexSnapshotFromPmDoc`
Expected: FAIL (`.music` is `undefined`).

- [ ] **Step 3: Implement**

In `buildIndexSnapshotFromPmDoc.ts`:

1. Add imports: `import {collectMusicAtoms, deriveMusic, type MusicBlockInput} from '@stagistic/script';`
2. Add `const musicBlockInputs: MusicBlockInput[] = [];`.
3. In `visitNode`, where a block is pushed, also push:

```typescript
musicBlockInputs.push({
    blockId,
    blockType,
    musicAtoms: collectMusicAtoms(node.toJSON() as never),
});
```

4. Return `{blocks, music: deriveMusic(musicBlockInputs)}` in both the success and `catch` returns (`music: []` in the catch).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/editor test buildIndexSnapshotFromPmDoc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.music.test.ts
git commit -m "feat(editor): project music in buildIndexSnapshotFromPmDoc"
```

---

## Phase 3 — DB: schema, queries, extraction, persistence (TDD)

### Task 6: `script_music` schema + migration

**Files:**
- Modify: `packages/db/src/schema.ts`
- Generated: `packages/db/drizzle/*.sql` (+ compiled output) via `db:generate`

**Interfaces:**
- Produces: `scriptMusic` table + `dbSchema.scriptMusic`.

- [ ] **Step 1: Add the table**

In `schema.ts`, after `scriptBlockCharacterRefs`:

```typescript
export const scriptMusic = pgTable(
    'script_music',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        musicNumber: integer('music_number').notNull(),
        mode: text('mode').notNull().default('open'),
        title: text('title').notNull().default(''),
        kind: text('kind'),
        startBlockId: text('start_block_id').notNull(),
        endBlockId: text('end_block_id'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_music_script_id_idx').on(table.scriptId),
    }),
);
```

Add `scriptMusic,` to the `dbSchema` object.

- [ ] **Step 2: Generate + check the migration**

Run: `pnpm db:generate`
Expected: a new `packages/db/drizzle/00NN_*.sql` containing `CREATE TABLE "script_music"`, compiled without error.

Run: `pnpm db:check`
Expected: PASS (no schema drift).

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema.ts packages/db/drizzle
git commit -m "feat(db): add script_music table and migration"
```

### Task 7: Music queries + repository wiring

**Files:**
- Create: `packages/db/src/queries/scripts/music.ts`
- Modify: `packages/db/src/queries/scripts/index.ts` (re-export) and/or `packages/db/src/queries/index.ts` (follow how `scenes.ts` is re-exported)
- Modify: `packages/db/src/scriptRepository.ts` (add `ScriptMusicRepository` + `music` field)
- Test: `packages/db/src/queries/scripts/music.test.ts`

**Interfaces:**
- Produces:
  - `interface ScriptMusicUpsertRow { id: string, scriptId: string, musicNumber: number, mode: string, title: string, kind: string | null, startBlockId: string, endBlockId: string | null, createdAt: number, updatedAt: number }`
  - `bulkUpsertScriptMusic(tx: DbClient, rows: ScriptMusicUpsertRow[]): Promise<void>`
  - `bulkDeleteScriptMusic(tx: DbClient, ids: string[]): Promise<void>`
  - `listScriptMusic(db: DbClient, scriptId: string): Promise<ScriptMusic[]>`
  - `ScriptMusicRepository { list(scriptId: string): Promise<ScriptMusic[]> }` added to `ScriptDataRepository` as `music`.

Model imports and the `DbClient` type on the existing `packages/db/src/queries/scripts/scenes.ts` (same package, same patterns).

- [ ] **Step 1: Write the failing test** (mirror `blocks.twoPhase.test.ts` / `scenes` test setup for an in-memory or test DB client)

```typescript
// packages/db/src/queries/scripts/music.test.ts
import {describe, expect, it} from 'vitest';

import {createTestDb} from '../../testing/createTestDb'; // use the same helper scenes/blocks tests use
import {bulkUpsertScriptMusic, bulkDeleteScriptMusic, listScriptMusic} from './music';

describe('script music queries', () => {
    it('upserts then lists music for a script', async () => {
        const {db, scriptId} = await createTestDb();

        await db.transaction(async tx => {
            await bulkUpsertScriptMusic(tx, [{
                id: 'c1', scriptId, musicNumber: 1, mode: 'open', title: 'Night', kind: null,
                startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            }]);
        });

        expect(await listScriptMusic(db, scriptId)).toHaveLength(1);
    });

    it('deletes music by id', async () => {
        const {db, scriptId} = await createTestDb();

        await db.transaction(async tx => {
            await bulkUpsertScriptMusic(tx, [{
                id: 'c1', scriptId, musicNumber: 1, mode: 'open', title: 'N', kind: null,
                startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            }]);
            await bulkDeleteScriptMusic(tx, ['c1']);
        });

        expect(await listScriptMusic(db, scriptId)).toHaveLength(0);
    });
});
```

> Adapt `createTestDb` to the actual helper used by `blocks.twoPhase.test.ts` (read that test's imports first; reuse its exact setup).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test music`
Expected: FAIL ("Failed to resolve import './music'").

- [ ] **Step 3: Implement the queries**

```typescript
// packages/db/src/queries/scripts/music.ts
import {eq, inArray, sql} from 'drizzle-orm';

import {scriptMusic} from '../../schema';
import type {DbClient} from '../client'; // match scenes.ts's DbClient import path

export interface ScriptMusicUpsertRow {
    id: string,
    scriptId: string,
    musicNumber: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
    createdAt: number,
    updatedAt: number,
}

export const bulkUpsertScriptMusic = async (tx: DbClient, rows: ScriptMusicUpsertRow[]): Promise<void> => {
    if (rows.length === 0) {
        return;
    }

    await tx.insert(scriptMusic).values(rows).onConflictDoUpdate({
        target: scriptMusic.id,
        set: {
            musicNumber: sql`excluded."music_number"`,
            mode: sql`excluded."mode"`,
            title: sql`excluded."title"`,
            kind: sql`excluded."kind"`,
            startBlockId: sql`excluded."start_block_id"`,
            endBlockId: sql`excluded."end_block_id"`,
            updatedAt: sql`excluded."updated_at"`,
        },
    });
};

export const bulkDeleteScriptMusic = async (tx: DbClient, ids: string[]): Promise<void> => {
    if (ids.length === 0) {
        return;
    }

    await tx.delete(scriptMusic).where(inArray(scriptMusic.id, ids));
};

export const listScriptMusic = async (db: DbClient, scriptId: string) => {
    return db.select().from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId));
};
```

Re-export from the queries barrel exactly as `scenes.ts` is re-exported. Add the repository type + `ScriptMusic` row type (export `type ScriptMusic = InferSelectModel<typeof scriptMusic>` in `packages/db/src/types/script.ts`, mirroring `ScriptScene`). Add `ScriptMusicRepository` to `scriptRepository.ts` and a `music` field on `ScriptDataRepository`; implement `music.list` in the drizzle repository implementation (follow `scenes.list`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test music`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/queries packages/db/src/scriptRepository.ts packages/db/src/types/script.ts packages/db/src/repo
git commit -m "feat(db): script_music queries and repository read"
```

### Task 8: Extract music in `extractScriptBlocks`

**Files:**
- Modify: `packages/db/src/blocks/types.ts` (add `ExtractedMusicRow`, `music` on `ExtractScriptBlocksResult`)
- Modify: `packages/db/src/blocks/extract.ts`
- Test: `packages/db/src/blocks/extract.music.test.ts`

**Interfaces:**
- Consumes: `collectMusicAtoms`, `deriveMusic`, `MusicBlockInput` (`@stagistic/script`).
- Produces: `interface ExtractedMusicRow { id: string, musicNumber: number, mode: string, title: string, kind: string | null, startBlockId: string, endBlockId: string | null }`; `ExtractScriptBlocksResult.music: ExtractedMusicRow[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/db/src/blocks/extract.music.test.ts
import {describe, expect, it} from 'vitest';

import {extractScriptBlocks} from './extract';

describe('extractScriptBlocks music', () => {
    it('extracts a paired music', () => {
        const doc = {
            type: 'doc',
            content: [
                {type: 'stageDirection', attrs: {id: 'b1'}, content: [
                    {type: 'musicStart', attrs: {musicId: 'c1', mode: 'open', title: 'Night', kind: null}},
                ]},
                {type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'musicOut'}]},
            ],
        };

        const {music} = extractScriptBlocks('s1', doc as never);

        expect(music).toEqual([
            {id: 'c1', musicNumber: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test extract.music`
Expected: FAIL (`music` is `undefined`).

- [ ] **Step 3: Implement**

In `types.ts` add:

```typescript
export interface ExtractedMusicRow {
    id: string,
    musicNumber: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

Add `music: ExtractedMusicRow[],` to `ExtractScriptBlocksResult`.

In `extract.ts`:

1. Import: `import {collectMusicAtoms, deriveMusic, type MusicBlockInput} from '@stagistic/script';` and `import type {ExtractedMusicRow} from './types';`
2. Add `const musicBlockInputs: MusicBlockInput[] = [];` near the other accumulators.
3. In `walk`, right after pushing a block, push `musicBlockInputs.push({blockId, blockType, musicAtoms: collectMusicAtoms(node)});`
4. Map derived music to rows and return them. After `walk(...)`:

```typescript
const music: ExtractedMusicRow[] = deriveMusic(musicBlockInputs).map(music => ({
    id: music.musicId,
    musicNumber: music.number,
    mode: music.mode,
    title: music.title,
    kind: music.kind,
    startBlockId: music.startBlockId,
    endBlockId: music.endBlockId,
}));
```

5. Add `music,` to the success return and `music: [],` to the no-content early return.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test extract.music`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/blocks/types.ts packages/db/src/blocks/extract.ts packages/db/src/blocks/extract.music.test.ts
git commit -m "feat(db): extract music in extractScriptBlocks"
```

### Task 9: Reconcile `script_music` in `createDocumentPersister`

**Files:**
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.ts`
- Test: `packages/db/src/repo/persist/persistDocumentDelta.music.test.ts`

**Interfaces:**
- Consumes: `bulkUpsertScriptMusic`, `bulkDeleteScriptMusic` (Task 7); `extracted.music` (Task 8).

Music can change on a **content-only** edit (typing a music into an existing
block), so reconciliation must run on every save whose extracted music set
changed — not only on structural saves. Gate it with a cheap signature so
unchanged music sets cost nothing.

- [ ] **Step 1: Write the failing test** (use the same persister/test-db harness as existing persist tests)

```typescript
// persistDocumentDelta.music.test.ts
import {describe, expect, it} from 'vitest';

import {createTestDb} from '../../testing/createTestDb'; // match existing persist tests
import {listScriptMusic} from '../../queries';
import {createDocumentPersister} from './persistDocumentDelta';

const docWithMusic = (musicId: string) => ({
    type: 'doc',
    content: [
        {type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}]},
        {type: 'stageDirection', attrs: {id: 'b1'}, content: [
            {type: 'musicStart', attrs: {musicId, mode: 'open', title: 'Night', kind: null}},
        ]},
    ],
});

describe('persist music', () => {
    it('writes music on content save and removes them when gone', async () => {
        const {db, scriptId} = await createTestDb();
        const persister = createDocumentPersister(scriptId);

        await persister.persist(db, docWithMusic('c1') as never);
        expect(await listScriptMusic(db, scriptId)).toHaveLength(1);

        await persister.persist(db, {type: 'doc', content: [
            {type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}]},
            {type: 'stageDirection', attrs: {id: 'b1'}, content: [{type: 'text', text: 'No music'}]},
        ]} as never);
        expect(await listScriptMusic(db, scriptId)).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test persistDocumentDelta.music`
Expected: FAIL (music never written).

- [ ] **Step 3: Implement**

In `persistDocumentDelta.ts`:

1. Import `bulkUpsertScriptMusic`, `bulkDeleteScriptMusic` from `'../../queries'` and `scriptMusic` from `'../../schema'`.
2. Add persister-scoped baseline: `let lastSavedMusicSignature = '';` and reset it in `setBaseline` to `''`.
3. Add a signature + reconcile helper inside `persistImpl` (after `extracted` is computed):

```typescript
const musicSignature = extracted.music
    .map(music => `${music.id}:${music.musicNumber}:${music.mode}:${music.title}:${music.kind ?? ''}:${music.startBlockId}:${music.endBlockId ?? ''}`)
    .join('|');

const reconcileMusic = async (tx: DbClient) => {
    if (musicSignature === lastSavedMusicSignature) {
        return;
    }

    const existing = await tx.select({id: scriptMusic.id}).from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId));
    const nextIds = new Set(extracted.music.map(music => music.id));

    await bulkUpsertScriptMusic(tx, extracted.music.map(music => ({
        id: music.id,
        scriptId,
        musicNumber: music.musicNumber,
        mode: music.mode,
        title: music.title,
        kind: music.kind,
        startBlockId: music.startBlockId,
        endBlockId: music.endBlockId,
        createdAt: now,
        updatedAt: now,
    })));
    await bulkDeleteScriptMusic(tx, existing.filter(row => !nextIds.has(row.id)).map(row => row.id));
};
```

4. The top-of-function early return (when block diff is empty) must still reconcile music — a music title/mode toggle changes a block's `contentJson`, so block diff is non-empty in practice, but a music removed together with no other change could still leave an empty block diff in edge cases. Make the empty-diff branch reconcile too:

```typescript
if (diff.inserted.length === 0 && diff.updated.length === 0 && diff.deletedIds.length === 0) {
    if (afterPersist || musicSignature !== lastSavedMusicSignature) {
        await db.transaction(async tx => {
            await reconcileMusic(tx);
            if (afterPersist) {
                await afterPersist(tx);
            }
        });
    }
    lastSavedMusicSignature = musicSignature;
    return;
}
```

5. In the main transaction, call `await reconcileMusic(tx);` inside `writeDelta` (or right after it in the `db.transaction` block, before `afterPersist`). Set `lastSavedMusicSignature = musicSignature;` next to `setBaseline(...)` at the end.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test persistDocumentDelta`
Expected: PASS (existing persist tests + new music test).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repo/persist/persistDocumentDelta.ts packages/db/src/repo/persist/persistDocumentDelta.music.test.ts
git commit -m "feat(db): reconcile script_music in document persister"
```

---

## Phase 4 — Editor music nodes (atom inline) + pill rendering

> From here, tasks are **build-and-verify**: gate with `pnpm lint` and a
> successful editor build; the user verifies appearance/interaction
> visually at the checkpoint. (No React unit tests — matches the repo.)

### Task 10: Music pill components + CSS

**Files:**
- Create: `packages/editor/src/editor/tiptap/nodes/MusicPill.tsx`
- Create: `packages/editor/src/editor/tiptap/nodes/MusicPill.module.css`

**Interfaces:**
- Produces: `MusicStartPill` and `MusicOutPill` React components for use as Tiptap NodeViews (Task 11). Props: the standard Tiptap `NodeViewProps` (`node`, `getPos`, `editor`).

This is the **first NodeView in the codebase** — use `@tiptap/react`'s
`NodeViewWrapper`. The pill reads its live number / open-closed state from
the music model selector (Task 16); until that exists, render number/state as
placeholders fed only by node attrs and wire the live selector in Task 16.

- [ ] **Step 1: Implement the pills (concrete starting code)**

```tsx
// MusicPill.tsx
import {NodeViewWrapper, type NodeViewProps} from '@tiptap/react';

import styles from './MusicPill.module.css';

export const MusicStartPill = ({node}: NodeViewProps) => {
    const mode = node.attrs.mode === 'hit' ? 'hit' : 'open';
    const title = typeof node.attrs.title === 'string' ? node.attrs.title : '';

    return (
        <NodeViewWrapper as="span" className={`${styles.pill} ${styles[mode]}`} data-music-pill="start" contentEditable={false}>
            <span className={styles.title}>{title || 'music'}</span>
        </NodeViewWrapper>
    );
};

export const MusicOutPill = (_props: NodeViewProps) => {
    return (
        <NodeViewWrapper as="span" className={`${styles.pill} ${styles.out}`} data-music-pill="out" contentEditable={false}>
            <span className={styles.title}>out</span>
        </NodeViewWrapper>
    );
};
```

```css
/* MusicPill.module.css — minimal; visual polish deferred (spec §2). Follow CharacterTagDecorations.module.css for tokens. */
.pill { display: inline-flex; align-items: center; padding: 0 0.4em; border-radius: 0.4em; font-size: 0.85em; cursor: pointer; user-select: none; }
.open { background: var(--music-open-bg, rgba(120 140 255 / 18%)); }
.hit { background: var(--music-hit-bg, rgba(255 180 90 / 22%)); }
.out { background: var(--music-out-bg, rgba(120 140 255 / 10%)); }
.title { line-height: 1.4; }
```

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes/MusicPill.tsx packages/editor/src/editor/tiptap/nodes/MusicPill.module.css
git commit -m "feat(editor): music pill components and styles"
```

### Task 11: `MusicStartNode` / `MusicOutNode` and schema registration

**Files:**
- Create: `packages/editor/src/editor/tiptap/nodes/MusicStartNode.ts`
- Create: `packages/editor/src/editor/tiptap/nodes/MusicOutNode.ts`
- Modify: `packages/editor/src/editor/tiptap/nodes/index.ts` (export the nodes)
- Modify: `packages/editor/src/editor/useEditorExtensions.ts` (register the nodes)
- Modify: the `stageDirection` node definition (ensure its `content` admits inline atoms)

**Interfaces:**
- Consumes: music constants (`@stagistic/script`), `MusicStartPill`/`MusicOutPill` (Task 10).
- Produces: `MusicStartNode`, `MusicOutNode` (Tiptap `Node`s, `group: 'inline'`, `inline: true`, `atom: true`).

- [ ] **Step 1: Implement the nodes**

```typescript
// MusicStartNode.ts
import {MUSIC_ID_ATTR, MUSIC_KIND_ATTR, MUSIC_MODE_ATTR, MUSIC_START_NODE_NAME, MUSIC_TITLE_ATTR} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';

import {MusicStartPill} from './MusicPill';

export const MusicStartNode = Node.create({
    name: MUSIC_START_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            [MUSIC_ID_ATTR]: {default: '', parseHTML: el => el.getAttribute('data-music-id') ?? '', renderHTML: attrs => ({'data-music-id': attrs[MUSIC_ID_ATTR]})},
            [MUSIC_MODE_ATTR]: {default: 'open', parseHTML: el => (el.getAttribute('data-music-mode') === 'hit' ? 'hit' : 'open'), renderHTML: attrs => ({'data-music-mode': attrs[MUSIC_MODE_ATTR]})},
            [MUSIC_TITLE_ATTR]: {default: '', parseHTML: el => el.getAttribute('data-music-title') ?? '', renderHTML: attrs => ({'data-music-title': attrs[MUSIC_TITLE_ATTR]})},
            [MUSIC_KIND_ATTR]: {default: null, parseHTML: el => el.getAttribute('data-music-kind'), renderHTML: attrs => (attrs[MUSIC_KIND_ATTR] ? {'data-music-kind': attrs[MUSIC_KIND_ATTR]} : {})},
        };
    },

    parseHTML() {
        return [{tag: 'span[data-music-pill="start"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-music-pill': 'start'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MusicStartPill);
    },
});
```

```typescript
// MusicOutNode.ts
import {MUSIC_OUT_NODE_NAME} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';

import {MusicOutPill} from './MusicPill';

export const MusicOutNode = Node.create({
    name: MUSIC_OUT_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    parseHTML() {
        return [{tag: 'span[data-music-pill="out"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-music-pill': 'out'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MusicOutPill);
    },
});
```

- [ ] **Step 2: Register + allow in `stageDirection`**

- Export `MusicStartNode`, `MusicOutNode` from `tiptap/nodes/index.ts`.
- In `useEditorExtensions.ts`, add `MusicStartNode, MusicOutNode` to the `extensions` array (right after `...ScriptBlockNodes`).
- Open the `stageDirection` node definition (in `tiptap/nodes/`). If its `content` is `text*`, widen to `inline*` so `group: 'inline'` atoms are admitted. If it is already `inline*`, no change. Do **not** widen other block types.

- [ ] **Step 3: Enable the Task 5 PM test**

Remove the `.skip` added in Task 5 and run:

Run: `pnpm --filter @stagistic/editor test buildIndexSnapshotFromPmDoc`
Expected: PASS (music nodes now exist in the schema).

- [ ] **Step 4: Verify build + user visual checkpoint**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** load a script, paste/seed a `stageDirection` containing a `musicStart` (via the test doc or a temporary insert) — confirm a pill renders inline and does not break editing around it.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): musicStart and musicOut atom nodes with pill node views"
```

---

## Phase 5 — Insertion commands + end-of-block invariant

### Task 12: Music commands (`MusicCommandsExtension`)

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/music/musicCommands.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/music/MusicCommandsExtension.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/index.ts` + `useEditorExtensions.ts`

**Interfaces:**
- Consumes: music constants, `createNodeId` (`@stagistic/script`); the live music model (Task 16, for `insertMusicOut` targeting — until then, target the open music by re-running `deriveMusic` over `editor.getJSON()`).
- Produces Tiptap commands:
  - `insertMusicStart(blockPos: number, title: string, mode?: MusicMode): boolean`
  - `insertMusicOut(blockPos: number): boolean`
  - `setMusicMode(musicId: string, mode: MusicMode): boolean`
  - `deleteMusic(musicId: string): boolean`
  - `deleteMusicEnd(outPos: number): boolean`

All insertions append at the **end of the target `stageDirection` block**,
keeping music atoms contiguous and ordering out-before-start (spec §4.1, §5.3).

- [ ] **Step 1: Implement the command transactions**

Provide a pure helper module `musicCommands.ts` exporting functions that take
`(state, dispatch, args)` and build transactions. Key helper:

```typescript
// musicCommands.ts (excerpt — full file implements all five commands)
import {MUSIC_ID_ATTR, MUSIC_KIND_ATTR, MUSIC_MODE_ATTR, MUSIC_OUT_NODE_NAME, MUSIC_START_NODE_NAME, MUSIC_TITLE_ATTR, createNodeId, type MusicMode} from '@stagistic/script';
import type {Node as PMNode} from '@tiptap/pm/model';
import type {EditorState, Transaction} from '@tiptap/pm/state';

// Returns the position just before the first trailing music atom in the block,
// i.e. the insert point that keeps prose before music. blockStart is the
// position of the block node; blockNode is that node.
const trailingMusicInsertPos = (blockStart: number, blockNode: PMNode): number => {
    const contentStart = blockStart + 1;
    let firstMusicOffset = blockNode.content.size;

    blockNode.forEach((child, offset) => {
        if ((child.type.name === MUSIC_START_NODE_NAME || child.type.name === MUSIC_OUT_NODE_NAME) && offset < firstMusicOffset) {
            firstMusicOffset = offset;
        }
    });

    return contentStart + firstMusicOffset;
};

export const buildInsertMusicStart = (
    state: EditorState,
    blockStart: number,
    blockNode: PMNode,
    title: string,
    mode: MusicMode,
): Transaction => {
    const node = state.schema.nodes[MUSIC_START_NODE_NAME].create({
        [MUSIC_ID_ATTR]: createNodeId(),
        [MUSIC_MODE_ATTR]: mode,
        [MUSIC_TITLE_ATTR]: title,
        [MUSIC_KIND_ATTR]: null,
    });
    // out-before-start: a new start goes at the very end (after any trailing out)
    const insertAt = blockStart + 1 + blockNode.content.size;

    return state.tr.insert(insertAt, node);
};
```

The full file also implements: `buildInsertMusicOut` (insert a `musicOut` at
`trailingMusicInsertPos` so it precedes a later start), `buildSetMusicMode`
(find the `musicStart` by `musicId`, `setNodeMarkup` to the new mode; when
switching to `hit`, also delete the music's paired explicit out — locate it
via `deriveMusic` over the doc), `buildDeleteMusic` (delete the `musicStart` and
its paired explicit `musicOut`), and `buildDeleteMusicEnd` (delete a single
`musicOut` at a given pos). Each returns a `Transaction | null`.

- [ ] **Step 2: Wrap in an extension**

```typescript
// MusicCommandsExtension.ts
import {Extension} from '@tiptap/core';
import {buildDeleteMusic, buildDeleteMusicEnd, buildInsertMusicOut, buildInsertMusicStart, buildSetMusicMode} from './musicCommands';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        music: {
            insertMusicStart: (blockPos: number, title: string, mode?: 'open' | 'hit') => ReturnType,
            insertMusicOut: (blockPos: number) => ReturnType,
            setMusicMode: (musicId: string, mode: 'open' | 'hit') => ReturnType,
            deleteMusic: (musicId: string) => ReturnType,
            deleteMusicEnd: (outPos: number) => ReturnType,
        },
    }
}

export const MusicCommandsExtension = Extension.create({
    name: 'musicCommands',
    addCommands() {
        return {
            insertMusicStart: (blockPos, title, mode = 'open') => ({state, dispatch}) => {
                const blockNode = state.doc.nodeAt(blockPos);
                if (!blockNode) {
                    return false;
                }
                const tr = buildInsertMusicStart(state, blockPos, blockNode, title, mode);
                if (dispatch) {
                    dispatch(tr);
                }
                return true;
            },
            // …wire the remaining four to their build* helpers, returning false on null.
        };
    },
});
```

Register `MusicCommandsExtension` in `useEditorExtensions.ts`.

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** temporarily bind a dev button to `editor.commands.insertMusicStart(blockPos, 'Test')` and confirm a pill appends at the block end regardless of caret position.

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/music packages/editor/src/editor/tiptap/extensions/index.ts packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): music insert/mode/delete commands"
```

### Task 13: End-of-block invariant — keep prose before music atoms

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/music/musicInvariantPlugin.ts`
- Modify: `MusicCommandsExtension.ts` (add `addProseMirrorPlugins`)

**Interfaces:**
- Produces: a ProseMirror plugin whose `appendTransaction` moves any prose that landed after a trailing music atom back to before the first music atom in that block, and collapses music/prose ordering to `prose … musicOut* musicStart?` per §4.1.

- [ ] **Step 1: Implement the plugin**

Provide `createMusicInvariantPlugin()` returning a `Plugin` with
`appendTransaction(transactions, oldState, newState)` that, for each
`stageDirection` block touched by the transactions, checks whether any
non-music inline content sits after a music atom; if so, returns a transaction
moving that content before the first music atom. Skip when nothing violates
(return `null`) to avoid transaction loops. Guard against re-entrancy with a
transaction meta key `music-invariant`.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** with a music pill at a block end, type text with the caret before the pill and after the pill — confirm text always ends up before the pill and the pill stays last.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/music/musicInvariantPlugin.ts packages/editor/src/editor/tiptap/extensions/music/MusicCommandsExtension.ts
git commit -m "feat(editor): enforce music atoms stay at end of stage direction"
```

---

## Phase 6 — `@@` inline compose + music overlay

### Task 14: `@@` compose detection + MusicInputExtension

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/musicInput/` (`constants.ts`, `composeState.ts`, `plugin.ts`, `types.ts`)
- Create: `packages/editor/src/editor/tiptap/extensions/MusicInputExtension.ts`
- Modify: `useEditorExtensions.ts`

**Interfaces:**
- Consumes: the character-tag compose state (`getCharacterTagComposeFromState`, `characterTagComposeKey`) to detect/abandon it; `STAGE_DIRECTION_BLOCK_TYPE`.
- Produces: `musicComposeKey` plugin + `getMusicComposeFromState(state): {blockPos: number} | null`; commands `openMusicCompose(blockPos)`, `commitMusicStart(title)`, `commitMusicOut()`, `closeMusicCompose()`.

Behavior (spec §5.1, §10): inside a `stageDirection`, when the user types a
second `@` while the character-tag compose is freshly open with an empty
query, abandon that compose (delete its placeholder) and open the music
compose anchored to the block. The music compose does not write into the
prose; commit calls the Task 12 commands (which append at block end).

- [ ] **Step 1: Implement detection + abandonment**

In `plugin.ts`, a `handleTextInput`/`appendTransaction` that, on input `@`
when `getCharacterTagComposeFromState(state)` is non-null with empty
`query`, builds a transaction that runs the character-tag abandon
transaction (reuse the exported abandon path) and sets `musicComposeKey` meta
to `{blockPos}`. `MusicInputExtension` must have **higher priority** than
`CharacterTagInputExtension` (priority `1000`) so its input handler runs
first — set `priority: 1100`.

- [ ] **Step 2: Wire commands + register**

`MusicInputExtension` exposes `openMusicCompose`, `commitMusicStart` (→
`insertMusicStart` then `closeMusicCompose`), `commitMusicOut` (→ `insertMusicOut`
then close), `closeMusicCompose`. Register in `useEditorExtensions.ts` (before
`characterTagInputExtension` so priority ordering is explicit).

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** in a stage direction, type `@` (tag compose opens) then `@` again — confirm the tag compose disappears and no stray `@@` remains in the text (the overlay is added in Task 15).

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/musicInput packages/editor/src/editor/tiptap/extensions/MusicInputExtension.ts packages/editor/src/editor/tiptap/extensions/index.ts packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): @@ music compose detection and commands"
```

### Task 15: Music compose overlay UI

**Files:**
- Create: `packages/editor/src/editor/components/musicCompose/MusicComposeOverlay.tsx` (+ `.module.css`)
- Modify: where `characterSuggestions` overlay is mounted (mirror that mount point)

**Interfaces:**
- Consumes: `getMusicComposeFromState`, the live music model (Task 16) for the open music at the block, and the music commands.
- Produces: an overlay with a title input (Enter → `commitMusicStart`) and, when an open music exists at the block end, a `Close music N` action (→ `commitMusicOut`).

- [ ] **Step 1: Implement the overlay** modeled on `components/characterSuggestions` (same positioning hook + state subscription pattern). Labels in English: title placeholder `Music title`, button `Close music {N}`.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** `@@` opens the overlay; typing a title + Enter inserts a `musicStart` pill at block end; when a music is open, the `Close music N` action inserts a `musicOut`.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/components/musicCompose
git commit -m "feat(editor): music compose overlay"
```

---

## Phase 7 — Live music model selector, context menu, deletion

### Task 16: Live music model selector for the editor

**Files:**
- Create: `packages/editor/src/editor/live/useMusicModel.ts` (or extend the existing sidebar-projection hook that consumes `buildIndexSnapshotFromPmDoc`)
- Modify: `MusicPill.tsx` to read live `number` + state

**Interfaces:**
- Produces: a selector returning, for the current doc, `Map<musicId, {number, mode, hasExplicitEnd}>` and `openMusicAtBlock(blockId): {musicId, number} | null`, derived from the snapshot `music` (Task 5).

- [ ] **Step 1: Implement** the selector over `buildIndexSnapshotFromPmDoc(editor.state.doc).music`; memoize per doc version. Update `MusicStartPill` to show the live `number` and switch styling on hit / open-with-end / open-implicit; `MusicOutPill` to show the live `N` it closes.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** numbers renumber correctly as music are added/removed; an open music without an out shows the implicit-end state + tooltip `ends at end of scene / next music`.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/live packages/editor/src/editor/tiptap/nodes/MusicPill.tsx
git commit -m "feat(editor): live music model selector and pill states"
```

### Task 17: Generic `BlockContextMenu` (block-anchored)

**Files:**
- Create: `packages/editor/src/editor/components/blockContextMenu/BlockContextMenu.tsx` (+ `.module.css`)
- Create: `packages/editor/src/editor/components/blockContextMenu/itemsRegistry.ts`
- Modify: editor canvas component to mount it and handle `contextmenu`

**Interfaces:**
- Produces: `getBlockContextMenuItems(blockType, ctx): MenuItem[]` where `ctx` exposes `blockId`, `blockPos`, `openMusic` (from Task 16) and the editor; only `stageDirection` returns items today (others → `[]` → native menu is allowed).

- [ ] **Step 1: Implement registry + menu** — on right-click, resolve the block under the event; if `getBlockContextMenuItems` is non-empty, `preventDefault` and render the menu; else let the native menu show. Stage-direction items: `Add music` → `openMusicCompose(blockPos)` (create mode); `Add out (closes music {N})` shown only when `ctx.openMusic` is set → `insertMusicOut(blockPos)`.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** right-click a stage direction → `Add music`; with an open music, `Add out (closes music N)` appears and closes it; right-click other blocks → native menu.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/components/blockContextMenu
git commit -m "feat(editor): generic block context menu with music actions"
```

### Task 18: Pill context menu + deletion safeguards

**Files:**
- Modify: `MusicPill.tsx` (open the menu on pill click)
- Modify: `blockContextMenu/itemsRegistry.ts` (pill item sets)
- Create: `packages/editor/src/editor/tiptap/extensions/music/musicKeyguardPlugin.ts` (backspace/delete guard)
- Modify: `MusicCommandsExtension.ts` (register the keyguard plugin)

**Interfaces:**
- Consumes: music commands (Task 12), live model (Task 16).
- Produces: pill menus — `musicStart`: `Edit title`, `Switch to hit`/`Switch to open`, `Delete music`; `musicOut`: `Delete end`. Backspace/Delete adjacent to a music atom is intercepted (no deletion).

- [ ] **Step 1: Implement the keyguard plugin** — a `keydown` handler (or `handleKeyDown` prop) that returns `true` (swallow) when Backspace/Delete would remove a `musicStart`/`musicOut` (caret immediately before/after, or the atom node-selected). Whole-block deletion still works because that removes the block node, not a single atom adjacent to the caret.

- [ ] **Step 2: Wire pill menus** — pill click anchors the `BlockContextMenu` to the pill with the pill item set. `Edit title` → open music compose pre-filled (or inline title field); `Switch to hit`/`Switch to open` → `setMusicMode`; `Delete music` → `deleteMusic(musicId)`; `Delete end` → `deleteMusicEnd(outPos)`. No inline confirm — the menu step is the safeguard (spec §6.3).

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** Backspace/Delete next to a pill does nothing; clicking a pill opens its menu; `Delete music` removes the start and its explicit out; `Switch to hit` removes the explicit out and renders the hit state; `Delete end` reverts to implicit end.

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes/MusicPill.tsx packages/editor/src/editor/components/blockContextMenu packages/editor/src/editor/tiptap/extensions/music
git commit -m "feat(editor): pill context menu, mode toggle, guarded deletion"
```

---

## Phase 8 — Full-stack verification

### Task 19: End-to-end save→project check + cleanup

**Files:**
- Test: `packages/db/src/repo/persist/persistDocumentDelta.music.test.ts` (extend with a hit + scene-boundary case)
- Modify: remove any temporary dev buttons added during Phase 4–7 checkpoints

- [ ] **Step 1: Extend the persist test** with a document containing an open music closed by an explicit out, a hit during it, and a second scene — assert `script_music` rows match `deriveMusic` expectations (numbers, modes, start/end block ids, hit `endBlockId == startBlockId`).

- [ ] **Step 2: Run the full suites**

Run: `pnpm --filter @stagistic/script test && pnpm --filter @stagistic/editor test && pnpm --filter @stagistic/db test`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: User acceptance checkpoint** — in the running app: create an open music via `@@`, close it via the overlay and via the context menu, add a hit, switch open↔hit, edit a title, delete a music and an end, and confirm pills/numbers behave per spec. Reload and confirm music round-trip from storage.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(db): end-to-end music projection cases; remove dev scaffolding"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** §3 pairing → Task 3; §3.2 forward-compat (nodes are position-capable; only insertion policy snaps to end) → Tasks 11–13; §4 nodes/invariant → Tasks 10–13; §4.2 pill states → Tasks 10/16; §5 entry → Tasks 14–15, 17; §6 editing/deletion → Tasks 16, 18; §7 relational/derivation → Tasks 4–9; §8 serialization contract → not code here (next spec), but `deriveMusic` + node attrs are its source of truth.
- **Type consistency:** `DerivedMusic` (Task 1) flows unchanged into `ScriptBlockIndexSnapshot.music` (Tasks 4–5) and maps to `ScriptMusicUpsertRow` (Task 7) / `ExtractedMusicRow` (Task 8) by renaming `number`→`musicNumber` only.
- **Known reads before coding:** `tiptap/nodes` `stageDirection` content expression (Task 11), `queries/scripts/scenes.ts` `DbClient` import + barrel re-export pattern (Task 7), the persist/queries test harness `createTestDb` equivalent (Tasks 7/9), and the `characterSuggestions` mount point (Task 15).
