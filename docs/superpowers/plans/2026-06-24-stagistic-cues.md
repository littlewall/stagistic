# Stagistic Cues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a writer enter, edit, and delete musical structural cues
(`@@cue` / `@@out`, plus a zero-duration `hit`) inside stage-direction
blocks, and project them to a relational `script_cues` table — readying the
editor for import/export.

**Architecture:** Cues are inline **atom nodes** (`cueStart`, `cueOut`)
that always sit at the end of a `stageDirection` block. A single pure
helper `deriveCues` in `@stagistic/script` pairs starts↔outs positionally
(no overlap of open cues; a hit is a zero-duration point) and is reused by
all three derivation sites: the two live index snapshots (`@stagistic/script`
JSON, `@stagistic/editor` PM doc) and the DB extractor (`@stagistic/db`).
Entry is via an `@@` inline compose and a generic right-click block context
menu; per-cue actions (edit title, switch open/hit, delete) live in a pill
context menu. Deletion is never a one-click or keystroke action.

**Tech Stack:** TypeScript (ESM, strict), Tiptap/ProseMirror, React,
Drizzle ORM (Postgres), Vitest (run via `vite-plus`/`vp`), pnpm workspaces.

## Global Constraints

- **Spec is authoritative:** `docs/superpowers/specs/2026-06-14-stagistic-syntax-design.md` (§10), `docs/superpowers/specs/2026-06-14-stagistic-data-model-design.md` (§8), and `docs/superpowers/specs/2026-06-24-stagistic-cues-editor-design.md` (the cue spec). Re-read the cue spec before each task.
- **UI labels are English** (the editor UI is English): `Add cue`, `Add out`, `Edit title`, `Switch to hit`, `Switch to open`, `Delete cue`, `Delete end`.
- **No browser/preview tooling.** Verify logic with Vitest; verify editor code with `pnpm lint` (eslint + stylelint, type-aware). UI appearance/interaction is verified visually **by the user** — each editor task ends at a user checkpoint, not an automated UI test. (This matches the repo: tests cover logic/data, not React.)
- **Test runner:** `pnpm --filter <pkg> test <fileSubstring>` runs that package's Vitest (e.g. `pnpm --filter @stagistic/script test deriveCues`). `pnpm test` runs all.
- **DB migrations are generated, never hand-written:** after editing `packages/db/src/schema.ts`, run `pnpm db:generate` (creates + compiles the SQL migration) and `pnpm db:check`.
- **IDs:** `createNodeId()` from `@stagistic/script` generates a `cueId`.
- **DRY / YAGNI / TDD / frequent commits.** Reserved-but-unused now: cue `kind` (set by nothing); production (light/sound/vfx) cues (separate future nodes).
- **Commit style:** conventional (`feat:`, `test:`, `refactor:`); end the body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Phase 1 — Cue domain (`@stagistic/script`): constants + pairing (pure, TDD)

### Task 1: Cue constants and shared types

**Files:**
- Create: `packages/script/src/cues/constants.ts`
- Create: `packages/script/src/cues/types.ts`
- Modify: `packages/script/src/index.ts` (add `export * from './cues';`)
- Create: `packages/script/src/cues/index.ts`

**Interfaces:**
- Produces:
  - `CUE_START_NODE_NAME = 'cueStart'`, `CUE_OUT_NODE_NAME = 'cueOut'`
  - `CUE_ID_ATTR = 'cueId'`, `CUE_MODE_ATTR = 'mode'`, `CUE_TITLE_ATTR = 'title'`, `CUE_KIND_ATTR = 'kind'`
  - `type CueMode = 'open' | 'hit'`
  - `type CueAtom = { role: 'start', cueId: string, mode: CueMode, title: string, kind: string | null } | { role: 'out' }`
  - `interface CueBlockInput { blockId: string, blockType: string, cueAtoms: CueAtom[] }`
  - `interface DerivedCue { cueId: string, number: number, mode: CueMode, title: string, kind: string | null, startBlockId: string, endBlockId: string | null }`

- [ ] **Step 1: Write constants**

```typescript
// packages/script/src/cues/constants.ts
export const CUE_START_NODE_NAME = 'cueStart';
export const CUE_OUT_NODE_NAME = 'cueOut';

export const CUE_ID_ATTR = 'cueId';
export const CUE_MODE_ATTR = 'mode';
export const CUE_TITLE_ATTR = 'title';
export const CUE_KIND_ATTR = 'kind';

export const CUE_MODES = ['open', 'hit'] as const;
```

- [ ] **Step 2: Write types**

```typescript
// packages/script/src/cues/types.ts
import type {CUE_MODES} from './constants';

export type CueMode = (typeof CUE_MODES)[number];

export type CueAtom =
    | {role: 'start', cueId: string, mode: CueMode, title: string, kind: string | null}
    | {role: 'out'};

export interface CueBlockInput {
    blockId: string,
    blockType: string,
    cueAtoms: CueAtom[],
}

export interface DerivedCue {
    cueId: string,
    number: number,
    mode: CueMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

- [ ] **Step 3: Barrel export**

```typescript
// packages/script/src/cues/index.ts
export * from './constants';
export * from './types';
export * from './collectCueAtoms';
export * from './deriveCues';
```

Add `export * from './cues';` to `packages/script/src/index.ts` (next to the existing `characters` / `indexing` exports).

- [ ] **Step 4: Verify it compiles**

Run: `pnpm --filter @stagistic/script lint`
Expected: PASS (no unresolved imports; `collectCueAtoms`/`deriveCues` are added in Tasks 2–3 — if lint runs before them, complete Task 2/3 first then re-run).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/cues packages/script/src/index.ts
git commit -m "feat(script): add cue node constants and shared cue types"
```

### Task 2: `collectCueAtoms` — read cue atoms from a block node

**Files:**
- Create: `packages/script/src/cues/collectCueAtoms.ts`
- Test: `packages/script/src/cues/collectCueAtoms.test.ts`

**Interfaces:**
- Consumes: `ScriptNode` (from `../document`), constants/types (Task 1).
- Produces: `collectCueAtoms(blockNode: ScriptNode): CueAtom[]` — cue atoms in document order; non-cue children ignored.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/script/src/cues/collectCueAtoms.test.ts
import {describe, expect, it} from 'vitest';

import {collectCueAtoms} from './collectCueAtoms';

describe('collectCueAtoms', () => {
    it('returns start and out atoms in order, ignoring text', () => {
        const block = {
            type: 'stageDirection',
            content: [
                {type: 'text', text: 'Lights fade.'},
                {type: 'cueStart', attrs: {cueId: 'c1', mode: 'open', title: 'Night', kind: null}},
                {type: 'cueOut'},
            ],
        };

        expect(collectCueAtoms(block as never)).toEqual([
            {role: 'start', cueId: 'c1', mode: 'open', title: 'Night', kind: null},
            {role: 'out'},
        ]);
    });

    it('defaults a malformed start to open with empty strings', () => {
        const block = {type: 'stageDirection', content: [{type: 'cueStart', attrs: {}}]};

        expect(collectCueAtoms(block as never)).toEqual([
            {role: 'start', cueId: '', mode: 'open', title: '', kind: null},
        ]);
    });

    it('returns [] when the block has no content', () => {
        expect(collectCueAtoms({type: 'stageDirection'} as never)).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test collectCueAtoms`
Expected: FAIL ("Failed to resolve import './collectCueAtoms'").

- [ ] **Step 3: Implement**

```typescript
// packages/script/src/cues/collectCueAtoms.ts
import type {ScriptNode} from '../document';
import {
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from './constants';
import type {CueAtom, CueMode} from './types';

const readMode = (value: unknown): CueMode => (value === 'hit' ? 'hit' : 'open');
const readString = (value: unknown): string => (typeof value === 'string' ? value : '');
const readKind = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

export const collectCueAtoms = (blockNode: ScriptNode): CueAtom[] => {
    if (!Array.isArray(blockNode.content)) {
        return [];
    }

    const atoms: CueAtom[] = [];

    blockNode.content.forEach(child => {
        if (!child || typeof child !== 'object') {
            return;
        }

        if (child.type === CUE_START_NODE_NAME) {
            const attrs = (child.attrs && typeof child.attrs === 'object' ? child.attrs : {}) as Record<string, unknown>;

            atoms.push({
                role: 'start',
                cueId: readString(attrs[CUE_ID_ATTR]),
                mode: readMode(attrs[CUE_MODE_ATTR]),
                title: readString(attrs[CUE_TITLE_ATTR]),
                kind: readKind(attrs[CUE_KIND_ATTR]),
            });
        } else if (child.type === CUE_OUT_NODE_NAME) {
            atoms.push({role: 'out'});
        }
    });

    return atoms;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test collectCueAtoms`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/cues/collectCueAtoms.ts packages/script/src/cues/collectCueAtoms.test.ts
git commit -m "feat(script): collectCueAtoms reads cue atoms from a block node"
```

### Task 3: `deriveCues` — positional pairing (the §3.1 algorithm)

**Files:**
- Create: `packages/script/src/cues/deriveCues.ts`
- Test: `packages/script/src/cues/deriveCues.test.ts`

**Interfaces:**
- Consumes: `CueBlockInput`, `DerivedCue` (Task 1).
- Produces: `deriveCues(blocks: CueBlockInput[]): DerivedCue[]`.

Algorithm (spec §3.1): walk blocks in order; a `scene` block clears the open
cue (implicit end at scene boundary); an open start closes any open cue
implicitly and becomes the open cue; a **hit** start emits a point
(`endBlockId = startBlockId`) and does **not** touch the open cue; an out
closes the open cue or is dropped (orphan). `number` increments on every
start.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/script/src/cues/deriveCues.test.ts
import {describe, expect, it} from 'vitest';

import type {CueBlockInput} from './types';
import {deriveCues} from './deriveCues';

const sd = (blockId: string, cueAtoms: CueBlockInput['cueAtoms']): CueBlockInput => ({blockId, blockType: 'stageDirection', cueAtoms});
const scene = (blockId: string): CueBlockInput => ({blockId, blockType: 'scene', cueAtoms: []});

describe('deriveCues', () => {
    it('pairs an explicit out to its open start', () => {
        const cues = deriveCues([
            sd('b1', [{role: 'start', cueId: 'c1', mode: 'open', title: 'Song', kind: null}]),
            sd('b2', [{role: 'out'}]),
        ]);

        expect(cues).toEqual([
            {cueId: 'c1', number: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
        ]);
    });

    it('leaves an open cue with null endBlockId when no out follows', () => {
        const cues = deriveCues([sd('b1', [{role: 'start', cueId: 'c1', mode: 'open', title: 'Song', kind: null}])]);

        expect(cues[0].endBlockId).toBeNull();
    });

    it('implicitly closes a prior open cue when a new open start appears', () => {
        const cues = deriveCues([
            sd('b1', [{role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null}]),
            sd('b2', [{role: 'start', cueId: 'c2', mode: 'open', title: 'B', kind: null}]),
        ]);

        expect(cues.map(c => [c.cueId, c.endBlockId])).toEqual([['c1', null], ['c2', null]]);
    });

    it('clears the open cue at a scene boundary (orphans a later out)', () => {
        const cues = deriveCues([
            sd('b1', [{role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null}]),
            scene('s2'),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(cues).toHaveLength(1);
        expect(cues[0].endBlockId).toBeNull();
    });

    it('treats a hit as a zero-duration point that does not touch the open cue', () => {
        const cues = deriveCues([
            sd('b1', [{role: 'start', cueId: 'c1', mode: 'open', title: 'Song', kind: null}]),
            sd('b2', [{role: 'start', cueId: 'h1', mode: 'hit', title: 'Sting', kind: null}]),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(cues).toEqual([
            {cueId: 'c1', number: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b3'},
            {cueId: 'h1', number: 2, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b2', endBlockId: 'b2'},
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test deriveCues`
Expected: FAIL ("Failed to resolve import './deriveCues'").

- [ ] **Step 3: Implement**

```typescript
// packages/script/src/cues/deriveCues.ts
import type {CueBlockInput, DerivedCue} from './types';

export const deriveCues = (blocks: CueBlockInput[]): DerivedCue[] => {
    const cues: DerivedCue[] = [];
    let openCue: DerivedCue | null = null;
    let cueNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            openCue = null;
        }

        block.cueAtoms.forEach(atom => {
            if (atom.role === 'start') {
                cueNumber += 1;

                const cue: DerivedCue = {
                    cueId: atom.cueId,
                    number: cueNumber,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                };

                cues.push(cue);

                if (atom.mode === 'open') {
                    openCue = cue;
                }

                return;
            }

            // role === 'out'
            if (openCue) {
                openCue.endBlockId = block.blockId;
                openCue = null;
            }
            // else: orphan out — dropped
        });
    });

    return cues;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test deriveCues`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/cues/deriveCues.ts packages/script/src/cues/deriveCues.test.ts
git commit -m "feat(script): deriveCues positional pairing for open/hit cues"
```

---

## Phase 2 — Live index snapshots carry cues

### Task 4: Add `cues` to `buildScriptBlockIndex` (JSON)

**Files:**
- Modify: `packages/script/src/indexing/scriptBlockIndex.ts`
- Test: `packages/script/src/indexing/scriptBlockIndex.test.ts`

**Interfaces:**
- Consumes: `collectCueAtoms`, `deriveCues`, `DerivedCue` (Phase 1).
- Produces: `ScriptBlockIndexSnapshot.cues: DerivedCue[]`.

- [ ] **Step 1: Add the failing test**

Append to `scriptBlockIndex.test.ts`:

```typescript
import {deriveCues} from '../cues'; // ensure import exists at top with others

it('projects cues from stage-direction cue atoms', () => {
    const doc = {
        type: 'doc',
        content: [
            {type: 'stageDirection', attrs: {id: 'b1'}, content: [
                {type: 'text', text: 'Lights fade.'},
                {type: 'cueStart', attrs: {cueId: 'c1', mode: 'open', title: 'Night', kind: null}},
            ]},
            {type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}]},
        ],
    };

    const {snapshot} = buildScriptBlockIndex(doc as never);

    expect(snapshot.cues).toEqual([
        {cueId: 'c1', number: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
    ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/script test scriptBlockIndex`
Expected: FAIL (`snapshot.cues` is `undefined`).

- [ ] **Step 3: Implement**

In `scriptBlockIndex.ts`:

1. Add imports: `import {collectCueAtoms, deriveCues, type CueBlockInput, type DerivedCue} from '../cues';`
2. Add `cues: DerivedCue[]` to the `ScriptBlockIndexSnapshot` interface.
3. In `buildScriptBlockIndex`, accumulate `const cueBlockInputs: CueBlockInput[] = [];`. Inside `walkNodes`, for each block pushed, also push `{blockId, blockType, cueAtoms: collectCueAtoms(node)}`.
4. Build the snapshot with `cues: deriveCues(cueBlockInputs)` (and `cues: []` in the empty-document early return).

Concrete additions — empty return and final return become:

```typescript
return {snapshot: {blocks: [], cues: []}, blockCount: 0};
```
```typescript
return {snapshot: {blocks, cues: deriveCues(cueBlockInputs)}, blockCount: blocks.length};
```

And inside the per-block push in `walkNodes`:

```typescript
cueBlockInputs.push({blockId, blockType, cueAtoms: collectCueAtoms(node)});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/script test scriptBlockIndex`
Expected: PASS (existing + new test).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/indexing/scriptBlockIndex.ts packages/script/src/indexing/scriptBlockIndex.test.ts
git commit -m "feat(script): project cues in buildScriptBlockIndex snapshot"
```

### Task 5: Add `cues` to `buildIndexSnapshotFromPmDoc` (PM doc)

**Files:**
- Modify: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts`
- Test: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.cues.test.ts`

**Interfaces:**
- Consumes: `collectCueAtoms`, `deriveCues`, `CueBlockInput` (`@stagistic/script`); a PM `Node`.
- Produces: same `ScriptBlockIndexSnapshot.cues` shape as Task 4 (the snapshot type is shared).

This mirrors how the file already does tags: convert each block node to JSON
and reuse the JSON helper. Build a `CueBlockInput` per block and call
`deriveCues` once.

- [ ] **Step 1: Write the failing test** (build a schema from the editor's node list, then a PM doc)

```typescript
// buildIndexSnapshotFromPmDoc.cues.test.ts
import {getSchema} from '@tiptap/core';
import {Node} from '@tiptap/pm/model';
import {describe, expect, it} from 'vitest';

import {ScriptBlockNodes} from '../tiptap/nodes';
import {CueStartNode, CueOutNode} from '../tiptap/nodes'; // added in Task 11
import {buildIndexSnapshotFromPmDoc} from './buildIndexSnapshotFromPmDoc';

describe('buildIndexSnapshotFromPmDoc cues', () => {
    it('projects cues from cue atom nodes', () => {
        const schema = getSchema([...ScriptBlockNodes, CueStartNode, CueOutNode]);
        const doc = Node.fromJSON(schema, {
            type: 'doc',
            content: [
                {type: 'stageDirection', attrs: {id: 'b1'}, content: [
                    {type: 'cueStart', attrs: {cueId: 'c1', mode: 'open', title: 'Night', kind: null}},
                ]},
                {type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}]},
            ],
        });

        expect(buildIndexSnapshotFromPmDoc(doc).cues).toEqual([
            {cueId: 'c1', number: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
        ]);
    });
});
```

> Ordering note: this test depends on the cue nodes from Task 11. If you implement Phase 2 before Phase 4, mark this test `.skip` with a `// TODO(Task 11): enable once cue nodes exist` and enable it in Task 11's verification. (The `deriveCues` logic itself is already proven in Task 3.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/editor test buildIndexSnapshotFromPmDoc`
Expected: FAIL (`.cues` is `undefined`).

- [ ] **Step 3: Implement**

In `buildIndexSnapshotFromPmDoc.ts`:

1. Add imports: `import {collectCueAtoms, deriveCues, type CueBlockInput} from '@stagistic/script';`
2. Add `const cueBlockInputs: CueBlockInput[] = [];`.
3. In `visitNode`, where a block is pushed, also push:

```typescript
cueBlockInputs.push({
    blockId,
    blockType,
    cueAtoms: collectCueAtoms(node.toJSON() as never),
});
```

4. Return `{blocks, cues: deriveCues(cueBlockInputs)}` in both the success and `catch` returns (`cues: []` in the catch).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/editor test buildIndexSnapshotFromPmDoc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.cues.test.ts
git commit -m "feat(editor): project cues in buildIndexSnapshotFromPmDoc"
```

---

## Phase 3 — DB: schema, queries, extraction, persistence (TDD)

### Task 6: `script_cues` schema + migration

**Files:**
- Modify: `packages/db/src/schema.ts`
- Generated: `packages/db/drizzle/*.sql` (+ compiled output) via `db:generate`

**Interfaces:**
- Produces: `scriptCues` table + `dbSchema.scriptCues`.

- [ ] **Step 1: Add the table**

In `schema.ts`, after `scriptBlockCharacterRefs`:

```typescript
export const scriptCues = pgTable(
    'script_cues',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        cueNumber: integer('cue_number').notNull(),
        mode: text('mode').notNull().default('open'),
        title: text('title').notNull().default(''),
        kind: text('kind'),
        startBlockId: text('start_block_id').notNull(),
        endBlockId: text('end_block_id'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_cues_script_id_idx').on(table.scriptId),
    }),
);
```

Add `scriptCues,` to the `dbSchema` object.

- [ ] **Step 2: Generate + check the migration**

Run: `pnpm db:generate`
Expected: a new `packages/db/drizzle/00NN_*.sql` containing `CREATE TABLE "script_cues"`, compiled without error.

Run: `pnpm db:check`
Expected: PASS (no schema drift).

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema.ts packages/db/drizzle
git commit -m "feat(db): add script_cues table and migration"
```

### Task 7: Cue queries + repository wiring

**Files:**
- Create: `packages/db/src/queries/scripts/cues.ts`
- Modify: `packages/db/src/queries/scripts/index.ts` (re-export) and/or `packages/db/src/queries/index.ts` (follow how `scenes.ts` is re-exported)
- Modify: `packages/db/src/scriptRepository.ts` (add `ScriptCuesRepository` + `cues` field)
- Test: `packages/db/src/queries/scripts/cues.test.ts`

**Interfaces:**
- Produces:
  - `interface ScriptCueUpsertRow { id: string, scriptId: string, cueNumber: number, mode: string, title: string, kind: string | null, startBlockId: string, endBlockId: string | null, createdAt: number, updatedAt: number }`
  - `bulkUpsertScriptCues(tx: DbClient, rows: ScriptCueUpsertRow[]): Promise<void>`
  - `bulkDeleteScriptCues(tx: DbClient, ids: string[]): Promise<void>`
  - `listScriptCues(db: DbClient, scriptId: string): Promise<ScriptCue[]>`
  - `ScriptCuesRepository { list(scriptId: string): Promise<ScriptCue[]> }` added to `ScriptDataRepository` as `cues`.

Model imports and the `DbClient` type on the existing `packages/db/src/queries/scripts/scenes.ts` (same package, same patterns).

- [ ] **Step 1: Write the failing test** (mirror `blocks.twoPhase.test.ts` / `scenes` test setup for an in-memory or test DB client)

```typescript
// packages/db/src/queries/scripts/cues.test.ts
import {describe, expect, it} from 'vitest';

import {createTestDb} from '../../testing/createTestDb'; // use the same helper scenes/blocks tests use
import {bulkUpsertScriptCues, bulkDeleteScriptCues, listScriptCues} from './cues';

describe('script cues queries', () => {
    it('upserts then lists cues for a script', async () => {
        const {db, scriptId} = await createTestDb();

        await db.transaction(async tx => {
            await bulkUpsertScriptCues(tx, [{
                id: 'c1', scriptId, cueNumber: 1, mode: 'open', title: 'Night', kind: null,
                startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            }]);
        });

        expect(await listScriptCues(db, scriptId)).toHaveLength(1);
    });

    it('deletes cues by id', async () => {
        const {db, scriptId} = await createTestDb();

        await db.transaction(async tx => {
            await bulkUpsertScriptCues(tx, [{
                id: 'c1', scriptId, cueNumber: 1, mode: 'open', title: 'N', kind: null,
                startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            }]);
            await bulkDeleteScriptCues(tx, ['c1']);
        });

        expect(await listScriptCues(db, scriptId)).toHaveLength(0);
    });
});
```

> Adapt `createTestDb` to the actual helper used by `blocks.twoPhase.test.ts` (read that test's imports first; reuse its exact setup).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test cues`
Expected: FAIL ("Failed to resolve import './cues'").

- [ ] **Step 3: Implement the queries**

```typescript
// packages/db/src/queries/scripts/cues.ts
import {eq, inArray, sql} from 'drizzle-orm';

import {scriptCues} from '../../schema';
import type {DbClient} from '../client'; // match scenes.ts's DbClient import path

export interface ScriptCueUpsertRow {
    id: string,
    scriptId: string,
    cueNumber: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
    createdAt: number,
    updatedAt: number,
}

export const bulkUpsertScriptCues = async (tx: DbClient, rows: ScriptCueUpsertRow[]): Promise<void> => {
    if (rows.length === 0) {
        return;
    }

    await tx.insert(scriptCues).values(rows).onConflictDoUpdate({
        target: scriptCues.id,
        set: {
            cueNumber: sql`excluded."cue_number"`,
            mode: sql`excluded."mode"`,
            title: sql`excluded."title"`,
            kind: sql`excluded."kind"`,
            startBlockId: sql`excluded."start_block_id"`,
            endBlockId: sql`excluded."end_block_id"`,
            updatedAt: sql`excluded."updated_at"`,
        },
    });
};

export const bulkDeleteScriptCues = async (tx: DbClient, ids: string[]): Promise<void> => {
    if (ids.length === 0) {
        return;
    }

    await tx.delete(scriptCues).where(inArray(scriptCues.id, ids));
};

export const listScriptCues = async (db: DbClient, scriptId: string) => {
    return db.select().from(scriptCues).where(eq(scriptCues.scriptId, scriptId));
};
```

Re-export from the queries barrel exactly as `scenes.ts` is re-exported. Add the repository type + `ScriptCue` row type (export `type ScriptCue = InferSelectModel<typeof scriptCues>` in `packages/db/src/types/script.ts`, mirroring `ScriptScene`). Add `ScriptCuesRepository` to `scriptRepository.ts` and a `cues` field on `ScriptDataRepository`; implement `cues.list` in the drizzle repository implementation (follow `scenes.list`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test cues`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/queries packages/db/src/scriptRepository.ts packages/db/src/types/script.ts packages/db/src/repo
git commit -m "feat(db): script_cues queries and repository read"
```

### Task 8: Extract cues in `extractScriptBlocks`

**Files:**
- Modify: `packages/db/src/blocks/types.ts` (add `ExtractedCueRow`, `cues` on `ExtractScriptBlocksResult`)
- Modify: `packages/db/src/blocks/extract.ts`
- Test: `packages/db/src/blocks/extract.cues.test.ts`

**Interfaces:**
- Consumes: `collectCueAtoms`, `deriveCues`, `CueBlockInput` (`@stagistic/script`).
- Produces: `interface ExtractedCueRow { id: string, cueNumber: number, mode: string, title: string, kind: string | null, startBlockId: string, endBlockId: string | null }`; `ExtractScriptBlocksResult.cues: ExtractedCueRow[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/db/src/blocks/extract.cues.test.ts
import {describe, expect, it} from 'vitest';

import {extractScriptBlocks} from './extract';

describe('extractScriptBlocks cues', () => {
    it('extracts a paired cue', () => {
        const doc = {
            type: 'doc',
            content: [
                {type: 'stageDirection', attrs: {id: 'b1'}, content: [
                    {type: 'cueStart', attrs: {cueId: 'c1', mode: 'open', title: 'Night', kind: null}},
                ]},
                {type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}]},
            ],
        };

        const {cues} = extractScriptBlocks('s1', doc as never);

        expect(cues).toEqual([
            {id: 'c1', cueNumber: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2'},
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test extract.cues`
Expected: FAIL (`cues` is `undefined`).

- [ ] **Step 3: Implement**

In `types.ts` add:

```typescript
export interface ExtractedCueRow {
    id: string,
    cueNumber: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

Add `cues: ExtractedCueRow[],` to `ExtractScriptBlocksResult`.

In `extract.ts`:

1. Import: `import {collectCueAtoms, deriveCues, type CueBlockInput} from '@stagistic/script';` and `import type {ExtractedCueRow} from './types';`
2. Add `const cueBlockInputs: CueBlockInput[] = [];` near the other accumulators.
3. In `walk`, right after pushing a block, push `cueBlockInputs.push({blockId, blockType, cueAtoms: collectCueAtoms(node)});`
4. Map derived cues to rows and return them. After `walk(...)`:

```typescript
const cues: ExtractedCueRow[] = deriveCues(cueBlockInputs).map(cue => ({
    id: cue.cueId,
    cueNumber: cue.number,
    mode: cue.mode,
    title: cue.title,
    kind: cue.kind,
    startBlockId: cue.startBlockId,
    endBlockId: cue.endBlockId,
}));
```

5. Add `cues,` to the success return and `cues: [],` to the no-content early return.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test extract.cues`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/blocks/types.ts packages/db/src/blocks/extract.ts packages/db/src/blocks/extract.cues.test.ts
git commit -m "feat(db): extract cues in extractScriptBlocks"
```

### Task 9: Reconcile `script_cues` in `createDocumentPersister`

**Files:**
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.ts`
- Test: `packages/db/src/repo/persist/persistDocumentDelta.cues.test.ts`

**Interfaces:**
- Consumes: `bulkUpsertScriptCues`, `bulkDeleteScriptCues` (Task 7); `extracted.cues` (Task 8).

Cues can change on a **content-only** edit (typing a cue into an existing
block), so reconciliation must run on every save whose extracted cue set
changed — not only on structural saves. Gate it with a cheap signature so
unchanged cue sets cost nothing.

- [ ] **Step 1: Write the failing test** (use the same persister/test-db harness as existing persist tests)

```typescript
// persistDocumentDelta.cues.test.ts
import {describe, expect, it} from 'vitest';

import {createTestDb} from '../../testing/createTestDb'; // match existing persist tests
import {listScriptCues} from '../../queries';
import {createDocumentPersister} from './persistDocumentDelta';

const docWithCue = (cueId: string) => ({
    type: 'doc',
    content: [
        {type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}]},
        {type: 'stageDirection', attrs: {id: 'b1'}, content: [
            {type: 'cueStart', attrs: {cueId, mode: 'open', title: 'Night', kind: null}},
        ]},
    ],
});

describe('persist cues', () => {
    it('writes cues on content save and removes them when gone', async () => {
        const {db, scriptId} = await createTestDb();
        const persister = createDocumentPersister(scriptId);

        await persister.persist(db, docWithCue('c1') as never);
        expect(await listScriptCues(db, scriptId)).toHaveLength(1);

        await persister.persist(db, {type: 'doc', content: [
            {type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}]},
            {type: 'stageDirection', attrs: {id: 'b1'}, content: [{type: 'text', text: 'No cue'}]},
        ]} as never);
        expect(await listScriptCues(db, scriptId)).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test persistDocumentDelta.cues`
Expected: FAIL (cues never written).

- [ ] **Step 3: Implement**

In `persistDocumentDelta.ts`:

1. Import `bulkUpsertScriptCues`, `bulkDeleteScriptCues` from `'../../queries'` and `scriptCues` from `'../../schema'`.
2. Add persister-scoped baseline: `let lastSavedCueSignature = '';` and reset it in `setBaseline` to `''`.
3. Add a signature + reconcile helper inside `persistImpl` (after `extracted` is computed):

```typescript
const cueSignature = extracted.cues
    .map(cue => `${cue.id}:${cue.cueNumber}:${cue.mode}:${cue.title}:${cue.kind ?? ''}:${cue.startBlockId}:${cue.endBlockId ?? ''}`)
    .join('|');

const reconcileCues = async (tx: DbClient) => {
    if (cueSignature === lastSavedCueSignature) {
        return;
    }

    const existing = await tx.select({id: scriptCues.id}).from(scriptCues).where(eq(scriptCues.scriptId, scriptId));
    const nextIds = new Set(extracted.cues.map(cue => cue.id));

    await bulkUpsertScriptCues(tx, extracted.cues.map(cue => ({
        id: cue.id,
        scriptId,
        cueNumber: cue.cueNumber,
        mode: cue.mode,
        title: cue.title,
        kind: cue.kind,
        startBlockId: cue.startBlockId,
        endBlockId: cue.endBlockId,
        createdAt: now,
        updatedAt: now,
    })));
    await bulkDeleteScriptCues(tx, existing.filter(row => !nextIds.has(row.id)).map(row => row.id));
};
```

4. The top-of-function early return (when block diff is empty) must still reconcile cues — a cue title/mode toggle changes a block's `contentJson`, so block diff is non-empty in practice, but a cue removed together with no other change could still leave an empty block diff in edge cases. Make the empty-diff branch reconcile too:

```typescript
if (diff.inserted.length === 0 && diff.updated.length === 0 && diff.deletedIds.length === 0) {
    if (afterPersist || cueSignature !== lastSavedCueSignature) {
        await db.transaction(async tx => {
            await reconcileCues(tx);
            if (afterPersist) {
                await afterPersist(tx);
            }
        });
    }
    lastSavedCueSignature = cueSignature;
    return;
}
```

5. In the main transaction, call `await reconcileCues(tx);` inside `writeDelta` (or right after it in the `db.transaction` block, before `afterPersist`). Set `lastSavedCueSignature = cueSignature;` next to `setBaseline(...)` at the end.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test persistDocumentDelta`
Expected: PASS (existing persist tests + new cue test).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repo/persist/persistDocumentDelta.ts packages/db/src/repo/persist/persistDocumentDelta.cues.test.ts
git commit -m "feat(db): reconcile script_cues in document persister"
```

---

## Phase 4 — Editor cue nodes (atom inline) + pill rendering

> From here, tasks are **build-and-verify**: gate with `pnpm lint` and a
> successful editor build; the user verifies appearance/interaction
> visually at the checkpoint. (No React unit tests — matches the repo.)

### Task 10: Cue pill components + CSS

**Files:**
- Create: `packages/editor/src/editor/tiptap/nodes/CuePill.tsx`
- Create: `packages/editor/src/editor/tiptap/nodes/CuePill.module.css`

**Interfaces:**
- Produces: `CueStartPill` and `CueOutPill` React components for use as Tiptap NodeViews (Task 11). Props: the standard Tiptap `NodeViewProps` (`node`, `getPos`, `editor`).

This is the **first NodeView in the codebase** — use `@tiptap/react`'s
`NodeViewWrapper`. The pill reads its live number / open-closed state from
the cue model selector (Task 16); until that exists, render number/state as
placeholders fed only by node attrs and wire the live selector in Task 16.

- [ ] **Step 1: Implement the pills (concrete starting code)**

```tsx
// CuePill.tsx
import {NodeViewWrapper, type NodeViewProps} from '@tiptap/react';

import styles from './CuePill.module.css';

export const CueStartPill = ({node}: NodeViewProps) => {
    const mode = node.attrs.mode === 'hit' ? 'hit' : 'open';
    const title = typeof node.attrs.title === 'string' ? node.attrs.title : '';

    return (
        <NodeViewWrapper as="span" className={`${styles.pill} ${styles[mode]}`} data-cue-pill="start" contentEditable={false}>
            <span className={styles.title}>{title || 'cue'}</span>
        </NodeViewWrapper>
    );
};

export const CueOutPill = (_props: NodeViewProps) => {
    return (
        <NodeViewWrapper as="span" className={`${styles.pill} ${styles.out}`} data-cue-pill="out" contentEditable={false}>
            <span className={styles.title}>out</span>
        </NodeViewWrapper>
    );
};
```

```css
/* CuePill.module.css — minimal; visual polish deferred (spec §2). Follow CharacterTagDecorations.module.css for tokens. */
.pill { display: inline-flex; align-items: center; padding: 0 0.4em; border-radius: 0.4em; font-size: 0.85em; cursor: pointer; user-select: none; }
.open { background: var(--cue-open-bg, rgba(120 140 255 / 18%)); }
.hit { background: var(--cue-hit-bg, rgba(255 180 90 / 22%)); }
.out { background: var(--cue-out-bg, rgba(120 140 255 / 10%)); }
.title { line-height: 1.4; }
```

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes/CuePill.tsx packages/editor/src/editor/tiptap/nodes/CuePill.module.css
git commit -m "feat(editor): cue pill components and styles"
```

### Task 11: `CueStartNode` / `CueOutNode` and schema registration

**Files:**
- Create: `packages/editor/src/editor/tiptap/nodes/CueStartNode.ts`
- Create: `packages/editor/src/editor/tiptap/nodes/CueOutNode.ts`
- Modify: `packages/editor/src/editor/tiptap/nodes/index.ts` (export the nodes)
- Modify: `packages/editor/src/editor/useEditorExtensions.ts` (register the nodes)
- Modify: the `stageDirection` node definition (ensure its `content` admits inline atoms)

**Interfaces:**
- Consumes: cue constants (`@stagistic/script`), `CueStartPill`/`CueOutPill` (Task 10).
- Produces: `CueStartNode`, `CueOutNode` (Tiptap `Node`s, `group: 'inline'`, `inline: true`, `atom: true`).

- [ ] **Step 1: Implement the nodes**

```typescript
// CueStartNode.ts
import {CUE_ID_ATTR, CUE_KIND_ATTR, CUE_MODE_ATTR, CUE_START_NODE_NAME, CUE_TITLE_ATTR} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';

import {CueStartPill} from './CuePill';

export const CueStartNode = Node.create({
    name: CUE_START_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            [CUE_ID_ATTR]: {default: '', parseHTML: el => el.getAttribute('data-cue-id') ?? '', renderHTML: attrs => ({'data-cue-id': attrs[CUE_ID_ATTR]})},
            [CUE_MODE_ATTR]: {default: 'open', parseHTML: el => (el.getAttribute('data-cue-mode') === 'hit' ? 'hit' : 'open'), renderHTML: attrs => ({'data-cue-mode': attrs[CUE_MODE_ATTR]})},
            [CUE_TITLE_ATTR]: {default: '', parseHTML: el => el.getAttribute('data-cue-title') ?? '', renderHTML: attrs => ({'data-cue-title': attrs[CUE_TITLE_ATTR]})},
            [CUE_KIND_ATTR]: {default: null, parseHTML: el => el.getAttribute('data-cue-kind'), renderHTML: attrs => (attrs[CUE_KIND_ATTR] ? {'data-cue-kind': attrs[CUE_KIND_ATTR]} : {})},
        };
    },

    parseHTML() {
        return [{tag: 'span[data-cue-pill="start"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-cue-pill': 'start'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CueStartPill);
    },
});
```

```typescript
// CueOutNode.ts
import {CUE_OUT_NODE_NAME} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';

import {CueOutPill} from './CuePill';

export const CueOutNode = Node.create({
    name: CUE_OUT_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    parseHTML() {
        return [{tag: 'span[data-cue-pill="out"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-cue-pill': 'out'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CueOutPill);
    },
});
```

- [ ] **Step 2: Register + allow in `stageDirection`**

- Export `CueStartNode`, `CueOutNode` from `tiptap/nodes/index.ts`.
- In `useEditorExtensions.ts`, add `CueStartNode, CueOutNode` to the `extensions` array (right after `...ScriptBlockNodes`).
- Open the `stageDirection` node definition (in `tiptap/nodes/`). If its `content` is `text*`, widen to `inline*` so `group: 'inline'` atoms are admitted. If it is already `inline*`, no change. Do **not** widen other block types.

- [ ] **Step 3: Enable the Task 5 PM test**

Remove the `.skip` added in Task 5 and run:

Run: `pnpm --filter @stagistic/editor test buildIndexSnapshotFromPmDoc`
Expected: PASS (cue nodes now exist in the schema).

- [ ] **Step 4: Verify build + user visual checkpoint**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** load a script, paste/seed a `stageDirection` containing a `cueStart` (via the test doc or a temporary insert) — confirm a pill renders inline and does not break editing around it.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): cueStart and cueOut atom nodes with pill node views"
```

---

## Phase 5 — Insertion commands + end-of-block invariant

### Task 12: Cue commands (`CueCommandsExtension`)

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/cue/cueCommands.ts`
- Create: `packages/editor/src/editor/tiptap/extensions/cue/CueCommandsExtension.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/index.ts` + `useEditorExtensions.ts`

**Interfaces:**
- Consumes: cue constants, `createNodeId` (`@stagistic/script`); the live cue model (Task 16, for `insertCueOut` targeting — until then, target the open cue by re-running `deriveCues` over `editor.getJSON()`).
- Produces Tiptap commands:
  - `insertCueStart(blockPos: number, title: string, mode?: CueMode): boolean`
  - `insertCueOut(blockPos: number): boolean`
  - `setCueMode(cueId: string, mode: CueMode): boolean`
  - `deleteCue(cueId: string): boolean`
  - `deleteCueEnd(outPos: number): boolean`

All insertions append at the **end of the target `stageDirection` block**,
keeping cue atoms contiguous and ordering out-before-start (spec §4.1, §5.3).

- [ ] **Step 1: Implement the command transactions**

Provide a pure helper module `cueCommands.ts` exporting functions that take
`(state, dispatch, args)` and build transactions. Key helper:

```typescript
// cueCommands.ts (excerpt — full file implements all five commands)
import {CUE_ID_ATTR, CUE_KIND_ATTR, CUE_MODE_ATTR, CUE_OUT_NODE_NAME, CUE_START_NODE_NAME, CUE_TITLE_ATTR, createNodeId, type CueMode} from '@stagistic/script';
import type {Node as PMNode} from '@tiptap/pm/model';
import type {EditorState, Transaction} from '@tiptap/pm/state';

// Returns the position just before the first trailing cue atom in the block,
// i.e. the insert point that keeps prose before cues. blockStart is the
// position of the block node; blockNode is that node.
const trailingCueInsertPos = (blockStart: number, blockNode: PMNode): number => {
    const contentStart = blockStart + 1;
    let firstCueOffset = blockNode.content.size;

    blockNode.forEach((child, offset) => {
        if ((child.type.name === CUE_START_NODE_NAME || child.type.name === CUE_OUT_NODE_NAME) && offset < firstCueOffset) {
            firstCueOffset = offset;
        }
    });

    return contentStart + firstCueOffset;
};

export const buildInsertCueStart = (
    state: EditorState,
    blockStart: number,
    blockNode: PMNode,
    title: string,
    mode: CueMode,
): Transaction => {
    const node = state.schema.nodes[CUE_START_NODE_NAME].create({
        [CUE_ID_ATTR]: createNodeId(),
        [CUE_MODE_ATTR]: mode,
        [CUE_TITLE_ATTR]: title,
        [CUE_KIND_ATTR]: null,
    });
    // out-before-start: a new start goes at the very end (after any trailing out)
    const insertAt = blockStart + 1 + blockNode.content.size;

    return state.tr.insert(insertAt, node);
};
```

The full file also implements: `buildInsertCueOut` (insert a `cueOut` at
`trailingCueInsertPos` so it precedes a later start), `buildSetCueMode`
(find the `cueStart` by `cueId`, `setNodeMarkup` to the new mode; when
switching to `hit`, also delete the cue's paired explicit out — locate it
via `deriveCues` over the doc), `buildDeleteCue` (delete the `cueStart` and
its paired explicit `cueOut`), and `buildDeleteCueEnd` (delete a single
`cueOut` at a given pos). Each returns a `Transaction | null`.

- [ ] **Step 2: Wrap in an extension**

```typescript
// CueCommandsExtension.ts
import {Extension} from '@tiptap/core';
import {buildDeleteCue, buildDeleteCueEnd, buildInsertCueOut, buildInsertCueStart, buildSetCueMode} from './cueCommands';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        cue: {
            insertCueStart: (blockPos: number, title: string, mode?: 'open' | 'hit') => ReturnType,
            insertCueOut: (blockPos: number) => ReturnType,
            setCueMode: (cueId: string, mode: 'open' | 'hit') => ReturnType,
            deleteCue: (cueId: string) => ReturnType,
            deleteCueEnd: (outPos: number) => ReturnType,
        },
    }
}

export const CueCommandsExtension = Extension.create({
    name: 'cueCommands',
    addCommands() {
        return {
            insertCueStart: (blockPos, title, mode = 'open') => ({state, dispatch}) => {
                const blockNode = state.doc.nodeAt(blockPos);
                if (!blockNode) {
                    return false;
                }
                const tr = buildInsertCueStart(state, blockPos, blockNode, title, mode);
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

Register `CueCommandsExtension` in `useEditorExtensions.ts`.

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** temporarily bind a dev button to `editor.commands.insertCueStart(blockPos, 'Test')` and confirm a pill appends at the block end regardless of caret position.

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/cue packages/editor/src/editor/tiptap/extensions/index.ts packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): cue insert/mode/delete commands"
```

### Task 13: End-of-block invariant — keep prose before cue atoms

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/cue/cueInvariantPlugin.ts`
- Modify: `CueCommandsExtension.ts` (add `addProseMirrorPlugins`)

**Interfaces:**
- Produces: a ProseMirror plugin whose `appendTransaction` moves any prose that landed after a trailing cue atom back to before the first cue atom in that block, and collapses cue/prose ordering to `prose … cueOut* cueStart?` per §4.1.

- [ ] **Step 1: Implement the plugin**

Provide `createCueInvariantPlugin()` returning a `Plugin` with
`appendTransaction(transactions, oldState, newState)` that, for each
`stageDirection` block touched by the transactions, checks whether any
non-cue inline content sits after a cue atom; if so, returns a transaction
moving that content before the first cue atom. Skip when nothing violates
(return `null`) to avoid transaction loops. Guard against re-entrancy with a
transaction meta key `cue-invariant`.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** with a cue pill at a block end, type text with the caret before the pill and after the pill — confirm text always ends up before the pill and the pill stays last.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/cue/cueInvariantPlugin.ts packages/editor/src/editor/tiptap/extensions/cue/CueCommandsExtension.ts
git commit -m "feat(editor): enforce cue atoms stay at end of stage direction"
```

---

## Phase 6 — `@@` inline compose + cue overlay

### Task 14: `@@` compose detection + CueInputExtension

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/cueInput/` (`constants.ts`, `composeState.ts`, `plugin.ts`, `types.ts`)
- Create: `packages/editor/src/editor/tiptap/extensions/CueInputExtension.ts`
- Modify: `useEditorExtensions.ts`

**Interfaces:**
- Consumes: the character-tag compose state (`getCharacterTagComposeFromState`, `characterTagComposeKey`) to detect/abandon it; `STAGE_DIRECTION_BLOCK_TYPE`.
- Produces: `cueComposeKey` plugin + `getCueComposeFromState(state): {blockPos: number} | null`; commands `openCueCompose(blockPos)`, `commitCueStart(title)`, `commitCueOut()`, `closeCueCompose()`.

Behavior (spec §5.1, §10): inside a `stageDirection`, when the user types a
second `@` while the character-tag compose is freshly open with an empty
query, abandon that compose (delete its placeholder) and open the cue
compose anchored to the block. The cue compose does not write into the
prose; commit calls the Task 12 commands (which append at block end).

- [ ] **Step 1: Implement detection + abandonment**

In `plugin.ts`, a `handleTextInput`/`appendTransaction` that, on input `@`
when `getCharacterTagComposeFromState(state)` is non-null with empty
`query`, builds a transaction that runs the character-tag abandon
transaction (reuse the exported abandon path) and sets `cueComposeKey` meta
to `{blockPos}`. `CueInputExtension` must have **higher priority** than
`CharacterTagInputExtension` (priority `1000`) so its input handler runs
first — set `priority: 1100`.

- [ ] **Step 2: Wire commands + register**

`CueInputExtension` exposes `openCueCompose`, `commitCueStart` (→
`insertCueStart` then `closeCueCompose`), `commitCueOut` (→ `insertCueOut`
then close), `closeCueCompose`. Register in `useEditorExtensions.ts` (before
`characterTagInputExtension` so priority ordering is explicit).

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** in a stage direction, type `@` (tag compose opens) then `@` again — confirm the tag compose disappears and no stray `@@` remains in the text (the overlay is added in Task 15).

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/cueInput packages/editor/src/editor/tiptap/extensions/CueInputExtension.ts packages/editor/src/editor/tiptap/extensions/index.ts packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): @@ cue compose detection and commands"
```

### Task 15: Cue compose overlay UI

**Files:**
- Create: `packages/editor/src/editor/components/cueCompose/CueComposeOverlay.tsx` (+ `.module.css`)
- Modify: where `characterSuggestions` overlay is mounted (mirror that mount point)

**Interfaces:**
- Consumes: `getCueComposeFromState`, the live cue model (Task 16) for the open cue at the block, and the cue commands.
- Produces: an overlay with a title input (Enter → `commitCueStart`) and, when an open cue exists at the block end, a `Close cue N` action (→ `commitCueOut`).

- [ ] **Step 1: Implement the overlay** modeled on `components/characterSuggestions` (same positioning hook + state subscription pattern). Labels in English: title placeholder `Cue title`, button `Close cue {N}`.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** `@@` opens the overlay; typing a title + Enter inserts a `cueStart` pill at block end; when a cue is open, the `Close cue N` action inserts a `cueOut`.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/components/cueCompose
git commit -m "feat(editor): cue compose overlay"
```

---

## Phase 7 — Live cue model selector, context menu, deletion

### Task 16: Live cue model selector for the editor

**Files:**
- Create: `packages/editor/src/editor/live/useCueModel.ts` (or extend the existing sidebar-projection hook that consumes `buildIndexSnapshotFromPmDoc`)
- Modify: `CuePill.tsx` to read live `number` + state

**Interfaces:**
- Produces: a selector returning, for the current doc, `Map<cueId, {number, mode, hasExplicitEnd}>` and `openCueAtBlock(blockId): {cueId, number} | null`, derived from the snapshot `cues` (Task 5).

- [ ] **Step 1: Implement** the selector over `buildIndexSnapshotFromPmDoc(editor.state.doc).cues`; memoize per doc version. Update `CueStartPill` to show the live `number` and switch styling on hit / open-with-end / open-implicit; `CueOutPill` to show the live `N` it closes.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** numbers renumber correctly as cues are added/removed; an open cue without an out shows the implicit-end state + tooltip `ends at end of scene / next cue`.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/live packages/editor/src/editor/tiptap/nodes/CuePill.tsx
git commit -m "feat(editor): live cue model selector and pill states"
```

### Task 17: Generic `BlockContextMenu` (block-anchored)

**Files:**
- Create: `packages/editor/src/editor/components/blockContextMenu/BlockContextMenu.tsx` (+ `.module.css`)
- Create: `packages/editor/src/editor/components/blockContextMenu/itemsRegistry.ts`
- Modify: editor canvas component to mount it and handle `contextmenu`

**Interfaces:**
- Produces: `getBlockContextMenuItems(blockType, ctx): MenuItem[]` where `ctx` exposes `blockId`, `blockPos`, `openCue` (from Task 16) and the editor; only `stageDirection` returns items today (others → `[]` → native menu is allowed).

- [ ] **Step 1: Implement registry + menu** — on right-click, resolve the block under the event; if `getBlockContextMenuItems` is non-empty, `preventDefault` and render the menu; else let the native menu show. Stage-direction items: `Add cue` → `openCueCompose(blockPos)` (create mode); `Add out (closes cue {N})` shown only when `ctx.openCue` is set → `insertCueOut(blockPos)`.

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** right-click a stage direction → `Add cue`; with an open cue, `Add out (closes cue N)` appears and closes it; right-click other blocks → native menu.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/components/blockContextMenu
git commit -m "feat(editor): generic block context menu with cue actions"
```

### Task 18: Pill context menu + deletion safeguards

**Files:**
- Modify: `CuePill.tsx` (open the menu on pill click)
- Modify: `blockContextMenu/itemsRegistry.ts` (pill item sets)
- Create: `packages/editor/src/editor/tiptap/extensions/cue/cueKeyguardPlugin.ts` (backspace/delete guard)
- Modify: `CueCommandsExtension.ts` (register the keyguard plugin)

**Interfaces:**
- Consumes: cue commands (Task 12), live model (Task 16).
- Produces: pill menus — `cueStart`: `Edit title`, `Switch to hit`/`Switch to open`, `Delete cue`; `cueOut`: `Delete end`. Backspace/Delete adjacent to a cue atom is intercepted (no deletion).

- [ ] **Step 1: Implement the keyguard plugin** — a `keydown` handler (or `handleKeyDown` prop) that returns `true` (swallow) when Backspace/Delete would remove a `cueStart`/`cueOut` (caret immediately before/after, or the atom node-selected). Whole-block deletion still works because that removes the block node, not a single atom adjacent to the caret.

- [ ] **Step 2: Wire pill menus** — pill click anchors the `BlockContextMenu` to the pill with the pill item set. `Edit title` → open cue compose pre-filled (or inline title field); `Switch to hit`/`Switch to open` → `setCueMode`; `Delete cue` → `deleteCue(cueId)`; `Delete end` → `deleteCueEnd(outPos)`. No inline confirm — the menu step is the safeguard (spec §6.3).

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: PASS.

**User checkpoint:** Backspace/Delete next to a pill does nothing; clicking a pill opens its menu; `Delete cue` removes the start and its explicit out; `Switch to hit` removes the explicit out and renders the hit state; `Delete end` reverts to implicit end.

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/nodes/CuePill.tsx packages/editor/src/editor/components/blockContextMenu packages/editor/src/editor/tiptap/extensions/cue
git commit -m "feat(editor): pill context menu, mode toggle, guarded deletion"
```

---

## Phase 8 — Full-stack verification

### Task 19: End-to-end save→project check + cleanup

**Files:**
- Test: `packages/db/src/repo/persist/persistDocumentDelta.cues.test.ts` (extend with a hit + scene-boundary case)
- Modify: remove any temporary dev buttons added during Phase 4–7 checkpoints

- [ ] **Step 1: Extend the persist test** with a document containing an open cue closed by an explicit out, a hit during it, and a second scene — assert `script_cues` rows match `deriveCues` expectations (numbers, modes, start/end block ids, hit `endBlockId == startBlockId`).

- [ ] **Step 2: Run the full suites**

Run: `pnpm --filter @stagistic/script test && pnpm --filter @stagistic/editor test && pnpm --filter @stagistic/db test`
Expected: PASS.

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: User acceptance checkpoint** — in the running app: create an open cue via `@@`, close it via the overlay and via the context menu, add a hit, switch open↔hit, edit a title, delete a cue and an end, and confirm pills/numbers behave per spec. Reload and confirm cues round-trip from storage.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(db): end-to-end cue projection cases; remove dev scaffolding"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** §3 pairing → Task 3; §3.2 forward-compat (nodes are position-capable; only insertion policy snaps to end) → Tasks 11–13; §4 nodes/invariant → Tasks 10–13; §4.2 pill states → Tasks 10/16; §5 entry → Tasks 14–15, 17; §6 editing/deletion → Tasks 16, 18; §7 relational/derivation → Tasks 4–9; §8 serialization contract → not code here (next spec), but `deriveCues` + node attrs are its source of truth.
- **Type consistency:** `DerivedCue` (Task 1) flows unchanged into `ScriptBlockIndexSnapshot.cues` (Tasks 4–5) and maps to `ScriptCueUpsertRow` (Task 7) / `ExtractedCueRow` (Task 8) by renaming `number`→`cueNumber` only.
- **Known reads before coding:** `tiptap/nodes` `stageDirection` content expression (Task 11), `queries/scripts/scenes.ts` `DbClient` import + barrel re-export pattern (Task 7), the persist/queries test harness `createTestDb` equivalent (Tasks 7/9), and the `characterSuggestions` mount point (Task 15).
