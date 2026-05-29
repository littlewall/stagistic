# Save-flow Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make script edits persist across refresh by replacing the dual save path (editor autosave + dead `BlockSyncController`/TanStack-DB collections) with a single diff-based persist layer in `@stagistic/db` that writes only changed block rows and flushes via `syncToFs`.

**Architecture:** TipTap document is the single source of truth; the live snapshot store feeds sidebars (kept). One debounced autosave calls `saveLatest`, which diffs the extracted document against the last-saved blocks and writes only the delta. Block order is a flat global integer (`block_order`); structural changes write order via a collision-safe two-phase update (negate-all then re-assign) to avoid the `(script_id, block_order)` unique-index violation that was aborting reorder saves. The repo/persist implementation lives in `@stagistic/db` (shared web+desktop) and is injected with `getDb`/`syncToFs`.

**Tech Stack:** PGlite (`@electric-sql/pglite`) in a web worker, Drizzle ORM, TipTap/ProseMirror, React, pnpm monorepo, Vitest (introduced for `@stagistic/db` in Task 1).

**Spec:** `docs/superpowers/specs/2026-05-29-save-flow-simplification-design.md`

---

## Phasing & shipping order

- **Phase 0** (Task 0) — manual browser verification of the `syncToFs` persistence primitive. Determines whether the text/type-change non-persistence is a flush bug. Do FIRST.
- **Phase 1** (Tasks 1–3) — Vitest setup + `block_order` rename + collision-safe two-phase order writer. DB-only, node-testable.
- **Phase 2** (Tasks 4–6) — relocate repo/persist layer `apps/web/src/repo` → `@stagistic/db/repo`, injected with `getDb`/`syncToFs`. Behavior-preserving.
- **Phase 3** (Tasks 7–9) — the core fix: `persistDocumentDelta` (diff over extracted rows) replaces migration-on-save. After Task 9, saving works and is granular.
- **Phase 4** (Tasks 10–12) — delete `BlockSyncController` + TanStack-DB collections, reduce `useScriptState`, remove the dual save path in `ScriptEditorRoute`.

After each task: typecheck the touched package(s) and commit. `pnpm -w typecheck` or per-package `tsc --noEmit` (see Task 1 for the exact command this repo uses).

---

## File structure (created / modified)

**`@stagistic/db` (shared):**
- `packages/db/vitest.config.ts` — Create (Task 1).
- `packages/db/src/testing/createTestDb.ts` — Create: in-memory PGlite + migrations helper for tests.
- `packages/db/src/schema.ts` — Modify: `order_no` → `block_order`.
- `packages/db/drizzle/0003_rename_block_order.sql` — Create: rename migration.
- `packages/db/src/migrations.compiled.ts` — Regenerated.
- `packages/db/src/queries/scripts/blocks.ts` — Modify: `blockOrder`, add `writeBlockOrderTwoPhase`.
- `packages/db/src/queries/scripts/blocks.twoPhase.test.ts` — Create.
- `packages/db/src/rewrite/jsonToBlocks.ts` — Modify: `blockOrder`; export `extractScriptBlocks`, `ExtractedBlockRow`, scene/act reconciliation helpers.
- `packages/db/src/repo/**` — Create (moved from `apps/web/src/repo`): `createLocalPgliteRepository.ts`, `content.ts` + character/config/titlePage handlers, outbox, `migration/`, `types.ts`.
- `packages/db/src/repo/persist/persistDocumentDelta.ts` — Create: diff + granular write.
- `packages/db/src/repo/persist/persistDocumentDelta.test.ts` — Create.
- `packages/db/src/repo/persist/diffExtractedBlocks.ts` — Create: pure diff.
- `packages/db/src/repo/persist/diffExtractedBlocks.test.ts` — Create.

**`apps/web` (seam only):**
- `apps/web/src/db/index.ts` — Modify: export `getLocalDb`/`syncToFs` (done) — keep.
- `apps/web/src/repo/index.ts` — Modify: thin `createLocalPgliteRepository({getLocalDb, syncToFs})`.
- Delete `apps/web/src/repo/localPglite/**` and `apps/web/src/repo/localPgliteRepo.ts` after move.

**Other packages:**
- `packages/app-core/src/script-state/snapshot.ts` — Modify in Task 2 (interim), deleted in Task 10.
- `packages/app-core/src/script-state/*` — Delete `controller.ts`, `collections.ts`, `pacer.ts`, `blockDiffEngine.ts`, `snapshot.ts`, `hooks.ts` (Task 10).
- `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx` + `useScriptEditorController.ts` — Modify (Task 11): remove dual path.

---

## Task 0: Verify the `syncToFs` persistence primitive (manual, browser)

**Why:** Reorder failures are explained by the unique-constraint abort (fixed in Phase 1+3). But text/type changes don't change order, so they should already persist after the `syncToFs` wiring done earlier — and they don't. This task determines whether `syncToFs` actually flushes in the worker setup. This is browser/IndexedDB-specific and cannot be unit-tested in node.

**Files:**
- Temporary debug edit: `apps/web/src/repo/localPglite/content.ts` (revert after).

- [ ] **Step 1: Add temporary instrumentation to `saveLatest`**

In `apps/web/src/repo/localPglite/content.ts`, inside `saveLatest`, wrap the existing body with logging (keep the existing `await syncDb()`):

```ts
const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
    const db = await getDb();
    const now = Date.now();

    console.warn('[save-debug] saveLatest start', scriptId, 'blocks=', value.content?.length);

    await persistBlocksFromDocument(db, scriptId, value, LEGACY_TO_BLOCKS_TRIGGERS.saveLatest);

    await db.transaction(async tx => {
        await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
        await recordOutbox({scriptId, opType: 'latest.save', payloadJson: JSON.stringify({scriptId, updatedAt: now})}, tx);
    });

    const afterWrite = await dbQueries.listScriptBlocks(db, scriptId);

    console.warn('[save-debug] after write, in-memory rowcount=', afterWrite.length, 'firstType=', afterWrite[0]?.blockType);

    await syncDb();

    console.warn('[save-debug] syncToFs done');
};
```

- [ ] **Step 2: Run the dev app and exercise a text change**

Run: `pnpm --filter web dev` (or the repo's dev command — check `apps/web/package.json` scripts).
Open a script, type a character, wait ~2s for autosave.
Expected console: `[save-debug] saveLatest start …`, `after write, in-memory rowcount= N`, `syncToFs done`.

**Branch A — no `[save-debug] saveLatest start` log appears:** the save is never called. The bug is in the trigger, not persistence. Skip to Step 4 (trigger diagnosis).

**Branch B — logs appear but after refresh the change is gone:** the write reaches in-memory PG but does not survive reload. The bug is the flush. Continue to Step 3.

- [ ] **Step 3 (Branch B): Diagnose the flush**

Check, in order:
1. **Is `workerInstanceRef.syncToFs` actually a function?** Add `console.warn('[save-debug] syncToFs typeof', typeof workerInstanceRef?.syncToFs)` in `packages/db/src/pglite/bootstrap.ts`'s `syncToFs`. If `undefined`, `PGliteWorker` does not expose `syncToFs` on the proxy — see fix below.
2. **PGliteWorker leader election:** `PGliteWorker` proxies to a leader tab. Confirm only one tab is open. If `syncToFs` is not a proxied method, call it on the underlying via the documented API, or switch the worker to expose an explicit `syncToFs` RPC.
3. **`relaxedDurability`:** if the worker's `PGlite.create` uses `relaxedDurability: true`, IDB writes are deferred. Verify `apps/web/src/db/pglite.worker.ts` does not set it (it currently does not).

**Fix if `syncToFs` is not on the worker proxy:** expose an explicit command. In `apps/web/src/db/pglite.worker.ts`, the `worker({init})` returns the `PGlite` instance; `PGliteWorker` forwards `syncToFs`. If forwarding is missing in this version, add a manual flush by calling `db.query('CHECKPOINT')` is NOT sufficient for IDB — instead upgrade/pin `@electric-sql/pglite` to a version where `PGliteWorker.syncToFs` is forwarded, or replace `PGliteWorker` usage in `getLocalDb` with a direct main-thread `PGlite` (the non-worker bootstrap path already implemented) as a fallback and re-test. Record the finding in the commit message.

- [ ] **Step 4 (Branch A): Diagnose the trigger**

If `saveLatest` is never called, add logging to `apps/web/src/repo/localPglite/.../` is not where the trigger lives — add to `packages/editor/src/editor/hooks/useAutosaveController.ts` inside the `setTimeout` callback in `scheduleAutosave`:
```ts
console.warn('[save-debug] autosave fire, revisionToSave', revisionToSave, 'lastSaved', lastSavedRevisionRef.current);
```
If `revisionToSave <= lastSavedRevisionRef.current`, the revision gating is wrong (the editor `update` handler bumps revision but the save thinks nothing changed). Trace `revisionRef`/`scheduleAutosave({revision})` in `useEditorLifecycle.handleUpdate`.

- [ ] **Step 5: Record the outcome, then revert instrumentation**

Write the diagnosis (which branch, root cause, fix applied) into the commit body. Revert the temporary `console.warn` lines from `content.ts` (and `bootstrap.ts`/`useAutosaveController.ts` if added). If a real fix was needed (e.g., worker `syncToFs` forwarding), keep that fix.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(db): verify+repair PGlite syncToFs flush primitive

Phase 0 of save-flow simplification. <DESCRIBE BRANCH + ROOT CAUSE + FIX HERE>.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 1: Introduce Vitest in `@stagistic/db` + in-memory test DB helper

**Files:**
- Create: `packages/db/vitest.config.ts`
- Create: `packages/db/src/testing/createTestDb.ts`
- Modify: `packages/db/package.json` (add `test` script + `vitest` devDep)

- [ ] **Step 1: Confirm the typecheck command**

This repo has no `typecheck` script; each package has its own `tsconfig.json`. The verified per-package typecheck is:
```
pnpm --filter <package-name> exec tsc --noEmit
```
Throughout this plan, **`<TYPECHECK> for X`** means `pnpm --filter @stagistic/X exec tsc --noEmit` (for the app use `pnpm --filter web exec tsc --noEmit`). Verify now: `pnpm --filter @stagistic/db exec tsc --noEmit` → expected exit 0.

- [ ] **Step 2: Add vitest devDependency**

Run:
```bash
pnpm --filter @stagistic/db add -D vitest
```
Expected: `vitest` added to `packages/db/package.json` devDependencies.

- [ ] **Step 3: Add the `test` script to `packages/db/package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `packages/db/vitest.config.ts`**

```ts
import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        globals: false,
        testTimeout: 20000,
    },
});
```

- [ ] **Step 5: Create the in-memory test DB helper `packages/db/src/testing/createTestDb.ts`**

```ts
import {PGlite} from '@electric-sql/pglite';
import {drizzle, type PgliteDatabase} from 'drizzle-orm/pglite';

import {runPgliteMigrations} from '../pglite/migrations';
import {dbSchema} from '../schema';

export type TestDb = PgliteDatabase<typeof dbSchema>;

/**
 * Ephemeral in-memory PGlite with the full migration set applied.
 * Used by node tests for SQL-level correctness (NOT IndexedDB flush).
 */
export const createTestDb = async (): Promise<{db: TestDb, client: PGlite}> => {
    const client = await PGlite.create();

    await runPgliteMigrations(client);

    const db = drizzle({client, schema: dbSchema});

    return {db, client};
};

export const seedScript = async (db: TestDb, scriptId: string): Promise<void> => {
    const now = Date.now();

    await db.insert(dbSchema.scripts).values({
        id: scriptId,
        title: 'Test',
        createdAt: now,
        updatedAt: now,
        activeBlockId: null,
    });
};
```

- [ ] **Step 6: Write a smoke test `packages/db/src/testing/createTestDb.smoke.test.ts`**

```ts
import {describe, expect, it} from 'vitest';

import {scripts} from '../schema';
import {createTestDb, seedScript} from './createTestDb';

describe('createTestDb', () => {
    it('applies migrations and seeds a script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');

        const rows = await db.select().from(scripts);

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('script-1');
    });
});
```

- [ ] **Step 7: Run the smoke test**

Run: `pnpm --filter @stagistic/db test`
Expected: 1 passing test. If PGlite fails to load wasm in node, it auto-resolves from the installed package — if it errors, check the `@electric-sql/pglite` version supports node (0.3.x does).

- [ ] **Step 8: Commit**

```bash
git add packages/db/vitest.config.ts packages/db/src/testing packages/db/package.json pnpm-lock.yaml
git commit -m "test(db): add vitest + in-memory PGlite test harness

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Rename `order_no` → `block_order` (schema + migration + consumers)

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle/0003_rename_block_order.sql`
- Regenerate: `packages/db/src/migrations.compiled.ts`
- Modify: `packages/db/src/queries/scripts/blocks.ts`
- Modify: `packages/db/src/rewrite/jsonToBlocks.ts`
- Modify (interim, deleted later): `packages/app-core/src/script-state/snapshot.ts`
- Modify: `apps/web/src/repo/localPglite/content.ts`

> **Do NOT rename** `script_title_page_fields.order_no` / `titlePageFields.ts` `orderNo` — that is a different column.

- [ ] **Step 1: Edit `schema.ts`**

In `packages/db/src/schema.ts`, in the `scriptBlocks` table:
```ts
// was: orderNo: integer('order_no').notNull(),
blockOrder: integer('block_order').notNull(),
```
And the unique index (keep the index NAME unchanged to minimize migration churn):
```ts
scriptOrderUniqueIdx: uniqueIndex('script_blocks_script_order_unique_idx')
    .on(table.scriptId, table.blockOrder),
```

- [ ] **Step 2: Hand-write the rename migration `packages/db/drizzle/0003_rename_block_order.sql`**

> Hand-written (not `drizzle-kit generate`) because drizzle-kit treats a column rename as drop+add (data loss) and needs interactive confirmation, which is unavailable here. A Postgres column rename keeps the existing index automatically.

```sql
ALTER TABLE "script_blocks" RENAME COLUMN "order_no" TO "block_order";
```

- [ ] **Step 3: Recompile migrations**

Run: `pnpm --filter @stagistic/db db:compile-migrations`
Expected: `packages/db/src/migrations.compiled.ts` now contains a `0003_rename_block_order` entry.

- [ ] **Step 4: Fix `blocks.ts`**

In `packages/db/src/queries/scripts/blocks.ts` rename every `orderNo` referring to blocks:
- `ScriptBlockUpsertRow.orderNo` → `blockOrder`
- `ScriptBlockOrderMove.orderNo` → `blockOrder`
- `.values({... orderNo: row.orderNo ...})` → `blockOrder: row.blockOrder`
- `.onConflictDoUpdate({set: {... orderNo: row.orderNo ...}})` → `blockOrder: row.blockOrder`
- `reorderScriptBlocks` `.set({orderNo: move.orderNo})` → `.set({blockOrder: move.blockOrder})`
- `.orderBy(asc(scriptBlocks.orderNo))` → `.orderBy(asc(scriptBlocks.blockOrder))`

- [ ] **Step 5: Fix `jsonToBlocks.ts`**

In `packages/db/src/rewrite/jsonToBlocks.ts`:
- `RewriteStoredBlockRow.orderNo` → `blockOrder`
- In `bulkUpsertScriptBlocks(... )` mapping: `orderNo: block.orderNo` → `blockOrder: block.orderNo` (the `block.orderNo` on the right is `ExtractedBlockRow.orderNo`, an in-memory field; keep its name).
- In `toScriptDocumentFromStoredRows`: `[...blockRows].sort((a, b) => a.orderNo - b.orderNo)` → `a.blockOrder - b.blockOrder`.
- `rebuildScriptDocumentFromBlocks` callers pass rows with `orderNo`; update the mapping in `content.ts` (Step 7).

> Keep `ExtractedBlockRow.orderNo` (in-memory extraction field) as-is. Only DB-row-shaped types change to `blockOrder`.

- [ ] **Step 6: Fix `snapshot.ts` (app-core, interim)**

In `packages/app-core/src/script-state/snapshot.ts`, `toScriptBlockRow`:
```ts
// was: orderNo: block.orderNo,
blockOrder: block.orderNo,
```
(Left is the `ScriptBlock` row field, now `blockOrder`; right is `IndexedScriptBlock.orderNo`, unchanged.)

- [ ] **Step 7: Fix `content.ts` (apps/web) load mapping**

In `apps/web/src/repo/localPglite/content.ts`, `loadLatestFromBlocks`, the `storedBlocks.map(...)` builds `RewriteStoredBlockRow`:
```ts
// was: orderNo: row.orderNo,
blockOrder: row.blockOrder,
```

- [ ] **Step 8: Typecheck**

Run: `<TYPECHECK>` (from Task 1 Step 1) for packages `db`, `app-core`, and app `web`.
Expected: no errors. If tsc flags a missed `orderNo` on a block row, fix it (grep: `grep -rn "\.orderNo" packages/db/src apps/web/src | grep -iv title`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(db): rename script_blocks.order_no -> block_order

order is a SQL reserved word; block_order is the agreed name. Column rename
keeps the existing unique index. Title-page order_no is unchanged.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Collision-safe two-phase block-order writer

**Files:**
- Modify: `packages/db/src/queries/scripts/blocks.ts` (add `writeFinalBlockOrders`)
- Create: `packages/db/src/queries/scripts/blocks.twoPhase.test.ts`

**Context:** The `(script_id, block_order)` unique index is checked per-statement. Re-assigning orders directly causes transient collisions. The writer first negates all surviving rows to a collision-free temp range, then sets final orders.

- [ ] **Step 1: Write the failing test `packages/db/src/queries/scripts/blocks.twoPhase.test.ts`**

```ts
import {asc, eq} from 'drizzle-orm';
import {describe, expect, it} from 'vitest';

import {scriptBlocks} from '../../schema';
import {createTestDb, seedScript} from '../../testing/createTestDb';
import {writeFinalBlockOrders} from './blocks';

const insertBlock = async (db: Awaited<ReturnType<typeof createTestDb>>['db'], scriptId: string, id: string, blockOrder: number) => {
    const now = Date.now();

    await db.insert(scriptBlocks).values({
        id, scriptId, blockType: 'fountain_action', blockOrder, textContent: id,
        contentJson: null, sceneId: null, actId: null, columnGroupId: null, columnIndex: null,
        createdAt: now, updatedAt: now,
    });
};

const readOrder = async (db: Awaited<ReturnType<typeof createTestDb>>['db'], scriptId: string) => {
    const rows = await db.select().from(scriptBlocks).where(eq(scriptBlocks.scriptId, scriptId)).orderBy(asc(scriptBlocks.blockOrder));

    return rows.map(r => r.id);
};

describe('writeFinalBlockOrders', () => {
    it('reverses order without unique-constraint violation', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertBlock(db, 's1', 'a', 0);
        await insertBlock(db, 's1', 'b', 1);
        await insertBlock(db, 's1', 'c', 2);

        await db.transaction(async tx => {
            await writeFinalBlockOrders(tx, 's1', [
                {id: 'c', blockOrder: 0},
                {id: 'b', blockOrder: 1},
                {id: 'a', blockOrder: 2},
            ]);
        });

        expect(await readOrder(db, 's1')).toEqual(['c', 'b', 'a']);
    });

    it('handles a single swap of adjacent rows', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertBlock(db, 's1', 'a', 0);
        await insertBlock(db, 's1', 'b', 1);

        await db.transaction(async tx => {
            await writeFinalBlockOrders(tx, 's1', [
                {id: 'b', blockOrder: 0},
                {id: 'a', blockOrder: 1},
            ]);
        });

        expect(await readOrder(db, 's1')).toEqual(['b', 'a']);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @stagistic/db test blocks.twoPhase`
Expected: FAIL — `writeFinalBlockOrders is not a function` / import error.

- [ ] **Step 3: Implement `writeFinalBlockOrders` in `blocks.ts`**

Add to `packages/db/src/queries/scripts/blocks.ts`:
```ts
import {sql} from 'drizzle-orm';

export interface BlockOrderAssignment {
    id: string,
    blockOrder: number,
}

/**
 * Assign final block_order values without violating the (script_id, block_order)
 * unique index. Phase 1: negate all surviving rows of this script into a
 * collision-free temporary range. Phase 2: set the requested final orders
 * (targets are a 0..N permutation, so no final collision). Must run inside a
 * transaction.
 */
export const writeFinalBlockOrders = async (
    db: DbClient,
    scriptId: string,
    assignments: BlockOrderAssignment[],
) => {
    if (assignments.length === 0) {
        return;
    }

    // Phase 1: move every existing row to negative space (preserves uniqueness,
    // cannot collide with the positive final targets).
    await db
        .update(scriptBlocks)
        .set({blockOrder: sql`(-${scriptBlocks.blockOrder} - 1)`})
        .where(eq(scriptBlocks.scriptId, scriptId));

    // Phase 2: set final orders. Unprocessed rows are negative; targets unique.
    const now = Date.now();

    for (const assignment of assignments) {
        await db
            .update(scriptBlocks)
            .set({blockOrder: assignment.blockOrder, updatedAt: now})
            .where(and(eq(scriptBlocks.scriptId, scriptId), eq(scriptBlocks.id, assignment.id)));
    }
};
```

> Note: `and`, `eq`, `sql` must be imported from `drizzle-orm` at the top of the file (`and`, `eq` already are; add `sql`).

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @stagistic/db test blocks.twoPhase`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/queries/scripts/blocks.ts packages/db/src/queries/scripts/blocks.twoPhase.test.ts
git commit -m "feat(db): collision-safe two-phase block-order writer

Negate-all then re-assign avoids the (script_id, block_order) unique-index
violation that aborted reorder saves.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Export the extraction API from `jsonToBlocks.ts`

**Files:**
- Modify: `packages/db/src/rewrite/jsonToBlocks.ts`
- Modify: `packages/db/src/rewrite/index.ts` (or wherever rewrite re-exports)

**Context:** `persistDocumentDelta` (Task 8) needs the authoritative document→rows extraction (with `contentJson`, `sceneId`/`actId` resolution). Today `extractScriptBlocks` and its types are file-private.

- [ ] **Step 1: Export the extraction symbols**

In `packages/db/src/rewrite/jsonToBlocks.ts`, add `export` to:
- `interface ExtractedBlockRow`
- `interface ExtractedActRow`
- `interface ExtractedSceneRow`
- `interface ExtractScriptBlocksResult`
- `const extractScriptBlocks`

Also expose the local document shape used by extraction. The file declares a private `type ScriptDocument = {...}`. Add a public alias next to it (do NOT rename the local one to avoid churn):
```ts
export type RewriteScriptDocument = ScriptDocument;
```

- [ ] **Step 2: Re-export from the rewrite barrel**

Confirm `packages/db/src/rewrite/index.ts` re-exports `* from './jsonToBlocks'` (it already exports `migrateLegacyJsonToBlocksForScript` / `rebuildScriptDocumentFromBlocks`). If it uses an explicit list, add `extractScriptBlocks`, `ExtractedBlockRow`, `ExtractScriptBlocksResult`, `ExtractedActRow`, `ExtractedSceneRow`.

- [ ] **Step 3: Typecheck**

Run: `<TYPECHECK>` for `db`.
Expected: no errors (pure visibility change).

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/rewrite
git commit -m "refactor(db): export extractScriptBlocks + row types for reuse

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Move the repo/persist layer into `@stagistic/db`

**Files:**
- `git mv apps/web/src/repo/localPglite` → `packages/db/src/repo`
- `git mv apps/web/src/repo/localPgliteRepo.ts` → `packages/db/src/repo/createLocalPgliteRepository.ts`
- Modify moved files' imports (`~db`, `@stagistic/db` → relative).
- Modify: `packages/db/src/index.ts` (export the repo factory).
- Modify: `apps/web/src/repo/index.ts` (thin instantiation).

**Context:** Behavior-preserving relocation. The factory becomes injected with `getDb`/`syncToFs` instead of importing `~db`.

- [ ] **Step 1: Move the files with git**

```bash
git mv apps/web/src/repo/localPglite packages/db/src/repo
git mv apps/web/src/repo/localPgliteRepo.ts packages/db/src/repo/createLocalPgliteRepository.ts
```

- [ ] **Step 2: Replace the `~db` import in `createLocalPgliteRepository.ts` with injected deps**

In `packages/db/src/repo/createLocalPgliteRepository.ts`:
- Remove `import {getLocalDb, syncToFs} from '~db';`
- Change the factory signature:
```ts
import type {LocalDb} from '../pglite';

export interface LocalPgliteRepositoryDeps {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
}

export const createLocalPgliteDataRepository = (
    {getLocalDb, syncToFs}: LocalPgliteRepositoryDeps,
): ScriptDataRepository => {
    const dbPromise = getLocalDb();
    const getDb: GetDb = async () => dbPromise;
    // ... unchanged body ...
    const {loadLatest, saveLatest} = createContentHandlers({getDb, recordOutbox, syncDb: syncToFs});
    // ...
};

export const createLocalPgliteRepository = (deps: LocalPgliteRepositoryDeps): ScriptRepository => {
    const repositoryData = createLocalPgliteDataRepository(deps);
    // ... unchanged body ...
};
```
- Replace all `@stagistic/db` imports in the moved files with relative imports. The moved files previously imported from `@stagistic/db` (the barrel); inside the package import from the specific modules: `../queries` (for `dbQueries`, `bulkUpsertScriptBlocks`, `reorderScriptBlocks`, `replaceScriptBlockCharacterRefs`, payload types, `DbClient`), `../rewrite` (for `migrateLegacyJsonToBlocksForScript`, `rebuildScriptDocumentFromBlocks`), `../scriptRepository` (for the `ScriptRepository`/`ScriptDataRepository` interfaces), `../types` (row types).
- In moved `repo/types.ts`, change `import type {LocalDb} from '~db'` → `import type {LocalDb} from '../pglite'`.

- [ ] **Step 2b: Confirm `LocalDb` import path**

After `git mv localPglite → repo`, the moved files sit at `packages/db/src/repo/*.ts` (e.g. `repo/types.ts`, `repo/content.ts`, `repo/createLocalPgliteRepository.ts`). `LocalDb` is re-exported from `packages/db/src/pglite/index.ts`, so from any `repo/*.ts` use `import type {LocalDb} from '../pglite';`. (Files under `repo/migration/` use `../../pglite`.)

- [ ] **Step 3: Export the factory from the db barrel**

In `packages/db/src/index.ts` add:
```ts
export {createLocalPgliteRepository, createLocalPgliteDataRepository} from './repo/createLocalPgliteRepository';
export type {LocalPgliteRepositoryDeps} from './repo/createLocalPgliteRepository';
```

- [ ] **Step 4: Rewrite `apps/web/src/repo/index.ts` to thin instantiation**

```ts
import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';

import {getLocalDb, syncToFs} from '~db';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository({getLocalDb, syncToFs});
export type {ScriptRepository} from '@stagistic/db';
```

- [ ] **Step 5: Check `@stagistic/db` has the deps the moved code needs**

The moved code imports `@stagistic/shared` (`uuidv7`, `trimOrFallback`) and `@stagistic/script`. Confirm/add to `packages/db/package.json` dependencies:
```bash
grep -E '@stagistic/(shared|script)' packages/db/package.json || echo "MISSING — add them"
```
If missing, run `pnpm --filter @stagistic/db add @stagistic/shared@workspace:* @stagistic/script@workspace:*` (script is already a dep).

- [ ] **Step 6: Typecheck both packages**

Run: `<TYPECHECK>` for `db` and `web`.
Expected: no errors. Fix any remaining `~db` or `@stagistic/db` self-imports inside the moved files (grep: `grep -rn "~db\|@stagistic/db" packages/db/src/repo`).

- [ ] **Step 7: Manual smoke — app still loads & saves the same as before**

Run the dev app, open a script, type, refresh. Behavior should match pre-move (still using the old migration-on-save path — the persist rewrite is Task 8). This confirms the relocation is behavior-preserving.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move repo/persist layer into @stagistic/db (web+desktop share)

Pure relocation + dependency injection: createLocalPgliteRepository now takes
{getLocalDb, syncToFs}; apps/web keeps only the bootstrap seam and thin
instantiation. Behavior unchanged.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Point the repo at the new home for any remaining importers

**Files:**
- Modify: any file importing from `apps/web/src/repo/localPglite/*` or `localPgliteRepo`.

- [ ] **Step 1: Find stragglers**

Run: `grep -rn "repo/localPglite\|localPgliteRepo" apps packages --include=*.ts --include=*.tsx | grep -v node_modules`
Expected: only `apps/web/src/repo/index.ts` (already rewritten). Any other importer must switch to `@stagistic/db`.

- [ ] **Step 2: Fix any stragglers** (repeat the import for each, swapping the path to `@stagistic/db`).

- [ ] **Step 3: Typecheck + commit**

Run: `<TYPECHECK>` for all touched packages.
```bash
git add -A
git commit -m "refactor: repoint repo imports to @stagistic/db

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Pure block diff over `ExtractedBlockRow`

**Files:**
- Create: `packages/db/src/repo/persist/diffExtractedBlocks.ts`
- Create: `packages/db/src/repo/persist/diffExtractedBlocks.test.ts`

- [ ] **Step 1: Write the failing test `packages/db/src/repo/persist/diffExtractedBlocks.test.ts`**

```ts
import {describe, expect, it} from 'vitest';

import type {ExtractedBlockRow} from '../../rewrite/jsonToBlocks';
import {diffExtractedBlocks} from './diffExtractedBlocks';

const block = (over: Partial<ExtractedBlockRow> & {blockId: string, orderNo: number}): ExtractedBlockRow => ({
    blockType: 'fountain_action',
    textContent: '',
    contentJson: null,
    sceneHeadingBlockId: null,
    actHeadingBlockId: null,
    columnGroupId: null,
    columnIndex: null,
    characterRefByKey: {},
    ...over,
});

describe('diffExtractedBlocks', () => {
    it('detects a pure text change as a non-structural update', () => {
        const prev = [block({blockId: 'a', orderNo: 0, textContent: 'hi'})];
        const next = [block({blockId: 'a', orderNo: 0, textContent: 'hello'})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(false);
        expect(result.updated.map(b => b.blockId)).toEqual(['a']);
        expect(result.inserted).toEqual([]);
        expect(result.deletedIds).toEqual([]);
    });

    it('flags insert as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0})];
        const next = [block({blockId: 'a', orderNo: 0}), block({blockId: 'b', orderNo: 1})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.inserted.map(b => b.blockId)).toEqual(['b']);
    });

    it('flags delete as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0}), block({blockId: 'b', orderNo: 1})];
        const next = [block({blockId: 'a', orderNo: 0})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.deletedIds).toEqual(['b']);
    });

    it('flags reorder (order change) as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0}), block({blockId: 'b', orderNo: 1})];
        const next = [block({blockId: 'b', orderNo: 0}), block({blockId: 'a', orderNo: 1})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
    });

    it('flags boundary-ness change (action -> scene heading) as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0, blockType: 'fountain_action'})];
        const next = [block({blockId: 'a', orderNo: 0, blockType: 'fountain_scene_heading'})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.updated.map(b => b.blockId)).toEqual(['a']);
    });

    it('flags a text edit of an existing act heading as structural (act-row name must reconcile)', () => {
        const prev = [block({blockId: 'h', orderNo: 0, blockType: 'fountain_act', textContent: 'ACT ONE'})];
        const next = [block({blockId: 'h', orderNo: 0, blockType: 'fountain_act', textContent: 'ACT TWO'})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.updated.map(b => b.blockId)).toEqual(['h']);
    });

    it('returns no changes for identical input', () => {
        const prev = [block({blockId: 'a', orderNo: 0, textContent: 'x'})];
        const next = [block({blockId: 'a', orderNo: 0, textContent: 'x'})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(false);
        expect(result.updated).toEqual([]);
        expect(result.inserted).toEqual([]);
        expect(result.deletedIds).toEqual([]);
    });
});
```

> Fix the first test's awkward assertion before running — use plain `expect(result.inserted).toEqual([])`.

- [ ] **Step 2: Run it to confirm failure**

Run: `pnpm --filter @stagistic/db test diffExtractedBlocks`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `diffExtractedBlocks.ts`**

```ts
import {ELEMENT_ACT, ELEMENT_SCENE_HEADING} from '@stagistic/script';

import type {ExtractedBlockRow} from '../../rewrite/jsonToBlocks';

export interface ExtractedBlocksDiff {
    inserted: ExtractedBlockRow[],
    updated: ExtractedBlockRow[],
    deletedIds: string[],
    /** true when block-id set, order, or any block's boundary-ness changed */
    structural: boolean,
}

const isBoundary = (blockType: string): boolean => {
    return blockType === ELEMENT_SCENE_HEADING || blockType === ELEMENT_ACT;
};

const serializeRefs = (refByKey: Record<string, string>): string => {
    return Object.entries(refByKey)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, id]) => `${key}:${id}`)
        .join('|');
};

const rowsEqual = (a: ExtractedBlockRow, b: ExtractedBlockRow): boolean => {
    return a.blockType === b.blockType
        && a.orderNo === b.orderNo
        && a.textContent === b.textContent
        && a.contentJson === b.contentJson
        && a.sceneHeadingBlockId === b.sceneHeadingBlockId
        && a.actHeadingBlockId === b.actHeadingBlockId
        && a.columnGroupId === b.columnGroupId
        && a.columnIndex === b.columnIndex
        && serializeRefs(a.characterRefByKey) === serializeRefs(b.characterRefByKey);
};

export const diffExtractedBlocks = (
    previous: ExtractedBlockRow[],
    next: ExtractedBlockRow[],
): ExtractedBlocksDiff => {
    const prevById = new Map(previous.map(row => [row.blockId, row] as const));
    const nextById = new Map(next.map(row => [row.blockId, row] as const));

    const inserted: ExtractedBlockRow[] = [];
    const updated: ExtractedBlockRow[] = [];
    const deletedIds: string[] = [];
    let structural = false;

    next.forEach(row => {
        const prev = prevById.get(row.blockId);

        if (!prev) {
            inserted.push(row);
            structural = true;

            return;
        }

        if (rowsEqual(prev, row)) {
            return;
        }

        updated.push(row);

        // Structural when order changed, boundary-ness toggled, OR the block is
        // (or was) a boundary heading — a heading edit must reconcile the
        // scene/act rows (e.g. act rename updates scriptActs.name).
        if (
            prev.orderNo !== row.orderNo
            || isBoundary(prev.blockType)
            || isBoundary(row.blockType)
        ) {
            structural = true;
        }
    });

    previous.forEach(row => {
        if (!nextById.has(row.blockId)) {
            deletedIds.push(row.blockId);
            structural = true;
        }
    });

    return {inserted, updated, deletedIds, structural};
};
```

- [ ] **Step 4: Run the test to confirm pass**

Run: `pnpm --filter @stagistic/db test diffExtractedBlocks`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repo/persist/diffExtractedBlocks.ts packages/db/src/repo/persist/diffExtractedBlocks.test.ts
git commit -m "feat(db): pure ExtractedBlockRow diff (structural vs content-only)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: `persistDocumentDelta` — granular write driven by the diff

**Files:**
- Create: `packages/db/src/repo/persist/persistDocumentDelta.ts`
- Create: `packages/db/src/repo/persist/persistDocumentDelta.test.ts`

**Context:** Reuses `extractScriptBlocks` + scene/act resolution. Case A (non-structural) = plain UPDATEs of changed blocks. Case B (structural) = scene/act reconciliation + delete + negate-all + final upsert via `writeFinalBlockOrders`. Refs rewritten only for inserted/updated blocks.

- [ ] **Step 1: Write the failing test `persistDocumentDelta.test.ts`**

```ts
import {asc, eq} from 'drizzle-orm';
import {describe, expect, it} from 'vitest';

import {rebuildScriptDocumentFromBlocks} from '../../rewrite/jsonToBlocks';
import {scriptBlocks} from '../../schema';
import {createTestDb, seedScript} from '../../testing/createTestDb';
import {createDocumentPersister} from './persistDocumentDelta';

const doc = (blocks: {id: string, type?: string, text: string}[]) => ({
    type: 'doc' as const,
    content: blocks.map(b => ({
        type: 'fountainBlock',
        attrs: {id: b.id, blockType: b.type ?? 'fountain_action'},
        content: b.text ? [{type: 'text', text: b.text}] : [],
    })),
});

const readBlocks = async (db: Awaited<ReturnType<typeof createTestDb>>['db'], scriptId: string) => {
    const rows = await db.select().from(scriptBlocks).where(eq(scriptBlocks.scriptId, scriptId)).orderBy(asc(scriptBlocks.blockOrder));

    return rows.map(r => ({id: r.id, type: r.blockType, text: r.textContent, order: r.blockOrder}));
};

describe('persistDocumentDelta', () => {
    it('persists the first save (all inserts) and round-trips', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {id: 'h1', type: 'fountain_scene_heading', text: 'INT. ROOM'},
            {id: 'a1', text: 'Action one.'},
        ]));

        expect(await readBlocks(db, 's1')).toEqual([
            {id: 'h1', type: 'fountain_scene_heading', text: 'INT. ROOM', order: 0},
            {id: 'a1', type: 'fountain_action', text: 'Action one.', order: 1},
        ]);
    });

    it('text change updates only the changed block', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([{id: 'a1', text: 'hi'}]));
        await persister.persist(db, doc([{id: 'a1', text: 'hello'}]));

        expect(await readBlocks(db, 's1')).toEqual([{id: 'a1', type: 'fountain_action', text: 'hello', order: 0}]);
    });

    it('reorder survives (no unique violation) and round-trips in new order', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {id: 'h1', type: 'fountain_scene_heading', text: 'A'},
            {id: 'x', text: 'x'},
            {id: 'h2', type: 'fountain_scene_heading', text: 'B'},
            {id: 'y', text: 'y'},
        ]));

        // move scene B (h2,y) before scene A (h1,x)
        await persister.persist(db, doc([
            {id: 'h2', type: 'fountain_scene_heading', text: 'B'},
            {id: 'y', text: 'y'},
            {id: 'h1', type: 'fountain_scene_heading', text: 'A'},
            {id: 'x', text: 'x'},
        ]));

        expect((await readBlocks(db, 's1')).map(b => b.id)).toEqual(['h2', 'y', 'h1', 'x']);
    });

    it('block type change persists', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([{id: 'a1', type: 'fountain_action', text: 'X'}]));
        await persister.persist(db, doc([{id: 'a1', type: 'fountain_character', text: 'X'}]));

        expect((await readBlocks(db, 's1'))[0].type).toBe('fountain_character');
    });

    it('delete removes the block and its scene row', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {id: 'h1', type: 'fountain_scene_heading', text: 'A'},
            {id: 'a1', text: 'one'},
        ]));
        await persister.persist(db, doc([
            {id: 'h1', type: 'fountain_scene_heading', text: 'A'},
        ]));

        expect((await readBlocks(db, 's1')).map(b => b.id)).toEqual(['h1']);
    });

    it('reconstructed document matches what was persisted', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');
        const blocks = [
            {id: 'h1', type: 'fountain_scene_heading', text: 'INT. ROOM'},
            {id: 'a1', text: 'Action.'},
        ];

        await persister.persist(db, doc(blocks));

        const storedBlocks = await db.select().from(scriptBlocks).where(eq(scriptBlocks.scriptId, 's1')).orderBy(asc(scriptBlocks.blockOrder));
        const rebuilt = rebuildScriptDocumentFromBlocks('s1', storedBlocks.map(r => ({
            id: r.id, blockType: r.blockType, orderNo: r.blockOrder, textContent: r.textContent,
            contentJson: r.contentJson, columnGroupId: r.columnGroupId, columnIndex: r.columnIndex,
        })), []);

        expect(rebuilt.document.content.map((n: {attrs?: {id?: string}}) => n.attrs?.id)).toEqual(['h1', 'a1']);
    });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `pnpm --filter @stagistic/db test persistDocumentDelta`
Expected: FAIL — `createDocumentPersister` not found.

- [ ] **Step 3: Implement `persistDocumentDelta.ts`**

```ts
import {and, eq} from 'drizzle-orm';

import {
    bulkDeleteScriptBlocks,
    type DbClient,
    deleteScriptAct,
    deleteScriptScene,
    listScriptCharacters,
    replaceScriptBlockCharacterRefs,
    upsertScriptAct,
    upsertScriptScene,
    writeFinalBlockOrders,
} from '../../queries';
import {
    extractScriptBlocks,
    type ExtractedBlockRow,
    type ExtractScriptBlocksResult,
    type RewriteScriptDocument,
} from '../../rewrite/jsonToBlocks';
import {scriptActs, scriptBlocks, scriptScenes} from '../../schema';
import {diffExtractedBlocks} from './diffExtractedBlocks';

const makeActId = (scriptId: string, headingBlockId: string) => `rw-act:${scriptId}:${headingBlockId}`;
const makeSceneId = (scriptId: string, headingBlockId: string) => `rw-scene:${scriptId}:${headingBlockId}`;

const toCharacterRefRows = (
    block: ExtractedBlockRow,
    knownCharacterIds: Set<string>,
) => {
    return Object.entries(block.characterRefByKey)
        .filter(([, characterId]) => knownCharacterIds.has(characterId))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([characterKey, characterId]) => ({characterId, characterKey, isConfirmed: true}));
};

/**
 * Stateful per-script persister. Holds the last-saved extracted blocks as the
 * diff baseline. Created once per loaded script (reset on hydrate via a fresh
 * instance). `persist` writes only the delta and is safe to call repeatedly.
 */
export const createDocumentPersister = (scriptId: string) => {
    let lastSavedBlocks = new Map<string, ExtractedBlockRow>();

    const setBaseline = (blocks: ExtractedBlockRow[]) => {
        lastSavedBlocks = new Map(blocks.map(block => [block.blockId, block]));
    };

    const persist = async (db: DbClient, document: RewriteScriptDocument): Promise<void> => {
        const now = Date.now();
        const extracted: ExtractScriptBlocksResult = extractScriptBlocks(scriptId, document);
        const diff = diffExtractedBlocks(Array.from(lastSavedBlocks.values()), extracted.blocks);

        if (diff.inserted.length === 0 && diff.updated.length === 0 && diff.deletedIds.length === 0) {
            return;
        }

        const characters = await listScriptCharacters(db, scriptId);
        const knownCharacterIds = new Set(characters.map(c => c.id));

        const sceneIdByHeading = new Map(extracted.scenes.map(s => [s.headingBlockId, s.id]));
        const actIdByHeading = new Map(extracted.acts.map(a => [a.headingBlockId, a.id]));

        const toDbBlock = (block: ExtractedBlockRow) => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            blockOrder: block.orderNo,
            textContent: block.textContent,
            contentJson: block.contentJson,
            sceneId: block.sceneHeadingBlockId ? sceneIdByHeading.get(block.sceneHeadingBlockId) ?? null : null,
            actId: block.actHeadingBlockId ? actIdByHeading.get(block.actHeadingBlockId) ?? null : null,
            columnGroupId: block.columnGroupId,
            columnIndex: block.columnIndex,
            createdAt: now,
            updatedAt: now,
        });

        await db.transaction(async tx => {
            if (!diff.structural) {
                // Case A: content-only updates of existing blocks.
                for (const block of [...diff.inserted, ...diff.updated]) {
                    const row = toDbBlock(block);

                    await tx.update(scriptBlocks)
                        .set({
                            blockType: row.blockType,
                            textContent: row.textContent,
                            contentJson: row.contentJson,
                            sceneId: row.sceneId,
                            actId: row.actId,
                            updatedAt: now,
                        })
                        .where(and(eq(scriptBlocks.scriptId, scriptId), eq(scriptBlocks.id, row.id)));

                    await replaceScriptBlockCharacterRefs(tx, block.blockId, toCharacterRefRows(block, knownCharacterIds));
                }

                return;
            }

            // Case B: structural change.
            // 1. Reconcile acts.
            const existingActs = await tx.select({id: scriptActs.id}).from(scriptActs).where(eq(scriptActs.scriptId, scriptId));
            const nextActIds = new Set(extracted.acts.map(a => a.id));

            for (const act of extracted.acts) {
                await upsertScriptAct(tx, {
                    id: act.id, scriptId, headingBlockId: act.headingBlockId, name: act.name,
                    createdAt: now, updatedAt: now,
                });
            }
            for (const act of existingActs) {
                if (!nextActIds.has(act.id)) {
                    await deleteScriptAct(tx, act.id);
                }
            }

            // 2. Reconcile scenes (preserve existing metadata).
            const existingScenes = await tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId));
            const existingSceneByHeading = new Map(existingScenes.filter(s => s.headingBlockId).map(s => [s.headingBlockId as string, s]));
            const nextSceneIds = new Set(extracted.scenes.map(s => s.id));

            for (const scene of extracted.scenes) {
                const prev = existingSceneByHeading.get(scene.headingBlockId) ?? null;

                await upsertScriptScene(tx, {
                    id: scene.id, scriptId, headingBlockId: scene.headingBlockId,
                    sceneNumber: prev?.sceneNumber ?? null,
                    colorHex: prev?.colorHex ?? null,
                    synopsis: prev?.synopsis ?? null,
                    locationId: prev?.locationId ?? null,
                    createdAt: prev?.createdAt ?? now,
                    updatedAt: now,
                });
            }
            for (const scene of existingScenes) {
                if (!nextSceneIds.has(scene.id)) {
                    await deleteScriptScene(tx, scene.id);
                }
            }

            // 3. Delete removed blocks (cascade removes their refs).
            await bulkDeleteScriptBlocks(tx, diff.deletedIds);

            // 4. Insert new blocks + update changed non-order fields, all at TEMP order first
            //    by inserting at the negated final order to avoid collisions with surviving rows.
            //    Simplest robust path: insert new rows at a guaranteed-free negative order,
            //    update existing changed rows' non-order fields, then assign all final orders.
            for (const block of diff.inserted) {
                const row = toDbBlock(block);

                await tx.insert(scriptBlocks).values({...row, blockOrder: -1_000_000 - row.blockOrder});
            }
            for (const block of diff.updated) {
                const row = toDbBlock(block);

                await tx.update(scriptBlocks)
                    .set({
                        blockType: row.blockType,
                        textContent: row.textContent,
                        contentJson: row.contentJson,
                        sceneId: row.sceneId,
                        actId: row.actId,
                        updatedAt: now,
                    })
                    .where(and(eq(scriptBlocks.scriptId, scriptId), eq(scriptBlocks.id, row.id)));
            }

            // 5. Assign final orders for ALL blocks in the new document (collision-safe).
            await writeFinalBlockOrders(tx, scriptId, extracted.blocks.map(b => ({id: b.blockId, blockOrder: b.orderNo})));

            // 6. Refs for inserted + updated blocks.
            for (const block of [...diff.inserted, ...diff.updated]) {
                await replaceScriptBlockCharacterRefs(tx, block.blockId, toCharacterRefRows(block, knownCharacterIds));
            }
        });

        setBaseline(extracted.blocks);
    };

    return {persist, setBaseline};
};
```

> **Note on Step 4 (Case B inserts):** new rows are inserted at `-1_000_000 - finalOrder` (guaranteed distinct negative, free of collisions), then `writeFinalBlockOrders` negates all survivors to `-(order)-1` and re-assigns finals. Because the freshly-inserted rows are at `<= -1_000_000` and survivors at `>= -N-1 .. -1`, and `writeFinalBlockOrders` negates by `-(x)-1`, verify ranges don't collide in the test. If the negate step maps a survivor onto an inserted row's temp value, the unique index trips. **The test `reorder/insert` cases in Step 1 must pass** — if they fail with a unique violation, switch Case B inserts to also use a two-pass: insert at sequential large-negative temp values tracked locally, which is what `-1_000_000 - finalOrder` ensures (finalOrder ≤ N ≪ 1_000_000, and survivor negations are ≥ -(N+1), so ranges are disjoint). This is already disjoint; the note is a guard for reviewers.

- [ ] **Step 4: Run the tests to confirm pass**

Run: `pnpm --filter @stagistic/db test persistDocumentDelta`
Expected: PASS (6 tests). If a unique-violation surfaces in the reorder/insert case, re-check the temp-order ranges per the note above.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repo/persist/persistDocumentDelta.ts packages/db/src/repo/persist/persistDocumentDelta.test.ts
git commit -m "feat(db): persistDocumentDelta — granular diff-based block persistence

Case A (content-only) updates just the changed blocks. Case B (structural)
reconciles scenes/acts, deletes/inserts, and assigns order collision-safe.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Wire `persistDocumentDelta` into the content handler (replace migration-on-save)

**Files:**
- Modify: `packages/db/src/repo/content.ts` (moved here in Task 5)

- [ ] **Step 1: Replace `saveLatest`'s persist path with the delta persister**

In the content handler factory, create one persister per handler instance and use it; keep the timestamp transaction and `syncDb()`:
```ts
import {createDocumentPersister} from './persist/persistDocumentDelta';
// ... existing imports ...

export const createContentHandlers = ({getDb, recordOutbox, syncDb}: CreateContentHandlersArgs): ContentHandlers => {
    const persisters = new Map<string, ReturnType<typeof createDocumentPersister>>();

    const getPersister = (scriptId: string) => {
        let p = persisters.get(scriptId);

        if (!p) {
            p = createDocumentPersister(scriptId);
            persisters.set(scriptId, p);
        }

        return p;
    };

    const loadLatest: ContentHandlers['loadLatest'] = async scriptId => {
        const db = await getDb();
        const document = await loadLatestFromBlocks(db, scriptId);

        if (document) {
            // Baseline so the first autosave only writes the editor's normalization delta.
            getPersister(scriptId).setBaseline(extractScriptBlocks(scriptId, document).blocks);
        }

        return document;
    };

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
        const db = await getDb();
        const now = Date.now();

        await getPersister(scriptId).persist(db, value);

        await db.transaction(async tx => {
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({scriptId, opType: 'latest.save', payloadJson: JSON.stringify({scriptId, updatedAt: now})}, tx);
        });

        await syncDb();
    };

    return {loadLatest, saveLatest};
};
```
Add the `extractScriptBlocks` import from `../rewrite/jsonToBlocks`. Remove the now-unused `persistBlocksFromDocument` helper from `content.ts` if nothing else uses it. The `createScript` path in `createLocalPgliteRepository.ts` still uses `migrateScriptDocumentToBlocks` (the import wrapper) for first-time import — leave that path untouched.

> `value` is a `ScriptDocument` (`@stagistic/script`); `persist` expects `RewriteScriptDocument`. To keep extraction identical to the create/import path, convert the editor value first:
> ```ts
> await getPersister(scriptId).persist(db, convertDefaultScriptDocumentToLegacy(value));
> ```
> Import `convertDefaultScriptDocumentToLegacy` from `@stagistic/script`.
> In `loadLatest`, `document` comes from `rebuildScriptDocumentFromBlocks` and is **already** in the rewrite/legacy `fountainBlock` shape, so seed the baseline directly without conversion: `getPersister(scriptId).setBaseline(extractScriptBlocks(scriptId, document).blocks)`. This makes the first autosave write only the editor's normalization delta (benign).

- [ ] **Step 2: Typecheck**

Run: `<TYPECHECK>` for `db`.
Expected: no errors.

- [ ] **Step 3: Manual end-to-end verification (the headline fix)**

Run the dev app. For each, refresh after ~2s and confirm it persists:
- type text in a block ✓
- change a block's type ✓
- reorder a scene in the structure sidebar ✓
- insert/delete/rename an act ✓
- rename a scene heading (in editor) ✓

Then open devtools → Application → IndexedDB → `stagistic-main` and confirm row counts change on save.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/repo
git commit -m "feat(db): saveLatest persists only the changed blocks via persistDocumentDelta

Replaces migration-on-save (full re-UPSERT). loadLatest seeds the diff
baseline. Saves now persist across refresh; reorder no longer aborts on the
unique constraint.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Delete the dead `BlockSyncController` / TanStack-DB stack

**Files:**
- Delete: `packages/app-core/src/script-state/controller.ts`, `collections.ts`, `pacer.ts`, `blockDiffEngine.ts`, `snapshot.ts`
- Modify: `packages/app-core/src/script-state/hooks.ts` (reduce `useScriptState`) and `index.ts` exports
- Modify: `packages/app-core/src/script-state/types.ts` (drop collection/diff types)

- [ ] **Step 1: Find all consumers of `useScriptState` and the controller**

Run: `grep -rn "useScriptState\|BlockSyncController\|script-state/collections\|createScriptStateCollections" packages apps --include=*.ts --include=*.tsx | grep -v node_modules`
Record the consumer list (expected: `ScriptEditorRoute.tsx`).

- [ ] **Step 2: Reduce `useScriptState` to a thin autosave bridge**

Rewrite `packages/app-core/src/script-state/hooks.ts` so `useScriptState` no longer constructs a `BlockSyncController`. It returns only what `ScriptEditorRoute` still needs after Task 11. Minimum viable surface:
```ts
import type {ScriptDocument, ScriptBlockIndexSnapshot} from '@stagistic/script';

export interface ScriptStateApi {
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    onEditorValueChange: (value: ScriptDocument) => void,
}
```
If, after Task 11, `ScriptEditorRoute` no longer imports `useScriptState` at all, delete `hooks.ts` instead and remove its export from `index.ts`. **Decide based on Step 1's consumer list** — Task 11 removes the editor's dependence on the controller, so the likely outcome is full deletion.

- [ ] **Step 3: Delete the dead files**

```bash
git rm packages/app-core/src/script-state/controller.ts \
       packages/app-core/src/script-state/collections.ts \
       packages/app-core/src/script-state/pacer.ts \
       packages/app-core/src/script-state/blockDiffEngine.ts \
       packages/app-core/src/script-state/snapshot.ts
```

- [ ] **Step 4: Clean `index.ts` and `types.ts`**

Remove exports of deleted modules from `packages/app-core/src/script-state/index.ts` and `packages/app-core/src/index.ts`. In `types.ts` delete `ScriptStateCollections`, `ScriptStateRows`, `ScriptBlockChange*`, `BlockDiffResult`, `PersistLatestFn` if now unused (grep each before deleting).

- [ ] **Step 5: Remove the `@tanstack/react-db` / `@tanstack/store`(if unused) deps from app-core**

Run: `grep -rn "@tanstack/react-db\|@tanstack/store\|@tanstack/pacer-lite" packages/app-core/src | grep -v node_modules`
If a dep has no remaining references, remove it from `packages/app-core/package.json`.

- [ ] **Step 6: Typecheck**

Run: `<TYPECHECK>` for `app-core`.
Expected: errors ONLY from `ScriptEditorRoute` (fixed in Task 11). If app-core itself errors, fix the export/type cleanup.

- [ ] **Step 7: Commit** (may be combined with Task 11 if the app won't typecheck standalone)

```bash
git add -A
git commit -m "refactor(app-core): delete dead BlockSyncController + TanStack-DB stack

Sidebars read from the editor live store; these collections were never read.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Remove the dual save path in `ScriptEditorRoute`

**Files:**
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`

**Context:** Today `handleResolvedEditorValueChange` calls both the characters handler and `onScriptStateEditorValueChange` (controller). The editor's own autosave already calls `handleAutoSave` → `saveLatest`. Remove the controller branch; keep the editor autosave + the index snapshot source for sidebars from the editor live store.

- [ ] **Step 1: Drop `useScriptState` and its derived values**

In `ScriptEditorRoute.tsx`:
- Remove the `scriptState = useScriptState({...})` call and the destructure of `scriptStateEditorOverrideValue`, `scriptStateIndexSnapshot`, `onScriptStateEditorValueChange`.
- `handleResolvedEditorValueChange` becomes just the characters handler:
```ts
const handleResolvedEditorValueChange = useCallback((
    value: Parameters<typeof handleEditorValueChange>[0],
    meta?: Parameters<typeof handleEditorValueChange>[1],
) => {
    handleEditorValueChange(value, meta);
}, [handleEditorValueChange]);
```
- `structureSourceValue` / `resolvedEditorInitialValue`: replace `scriptStateEditorOverrideValue ?? editorOverrideValue ?? initialValue` with `editorOverrideValue ?? initialValue`.
- `sourceIndexForSidebars`: replace `scriptStateIndexSnapshot ?? initialIndexSnapshot ?? null` with `initialIndexSnapshot ?? null` (the structure sidebar already prefers the editor live store via `useEditorLiveStructure`; `indexSnapshot` is only the initial fallback).

- [ ] **Step 2: Confirm the structure sidebar still gets live updates**

`ScriptStructureSidebar` uses `useEditorLiveStructure()` and falls back to `indexSnapshot` only when `liveStructure.rows.length === 0`. After removing the controller, structure edits still flow editor → live store → sidebar. No change needed in the sidebar.

- [ ] **Step 3: Typecheck the whole app**

Run: `<TYPECHECK>` for `app-routes`, `app-core`, `web`.
Expected: no errors.

- [ ] **Step 4: Manual verification — sidebars + editor stay in sync, saves persist**

Run the dev app:
- Type a scene heading → structure sidebar updates live.
- Reorder a scene in the sidebar → editor reorders → refresh → persists.
- Rename/insert/delete act → editor + sidebar update → refresh → persists.
- Character sidebar still lists characters and colors apply in the editor.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(app-routes): single save path — editor autosave only

Remove the BlockSyncController branch from ScriptEditorRoute; sidebars read
the editor live store. saveLatest (now diff-based) is the only persist path.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Final cleanup & full verification

**Files:**
- Modify: `packages/db/src/repo/content.ts` debug remnants (if any Task 0 logging survived the move — Task 0 Step 5 should have reverted them at the pre-move path).
- Any leftover unused imports flagged by lint.

- [ ] **Step 1: Lint the touched packages**

Run: `pnpm --filter @stagistic/db lint && pnpm --filter @stagistic/app-core lint && pnpm --filter @stagistic/app-routes lint`
Fix unused imports / dead code flagged.

- [ ] **Step 2: Full typecheck + db tests**

Run: `<TYPECHECK>` (whole repo) and `pnpm --filter @stagistic/db test`.
Expected: clean typecheck; all db tests pass.

- [ ] **Step 3: Full manual regression (the spec's verification list)**

Run the dev app and confirm each, refreshing between:
- text change persists
- block type change persists
- scene reorder persists
- act insert/delete/rename persists
- scene-heading rename in editor → sidebar updates; persists
- character color/gender in sidebar → applies in editor; persists
- large script (paste ~hundreds of blocks): typing one char writes a single block (verify via temporary `console.warn` count in `persistDocumentDelta` Case A, then remove)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: lint + cleanup after save-flow simplification

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- **Out of scope (future plan):** generalizing the editor request channel for NEW sync pairs (e.g. rename-scene-from-sidebar). Existing pairs (act rename/insert/delete, scene reorder) must keep working — verified in Tasks 11–12. Do not add new request types here.
- **Out of scope:** hierarchical ordering, Electric/server sync, outbox re-enable, multi-tab.
- **Order field naming:** DB column `block_order`, schema/`ScriptBlock` property `blockOrder`. The in-memory `ExtractedBlockRow.orderNo` and `IndexedScriptBlock.orderNo` (document-derived) keep their names — they are not the DB column.
- **If Task 0 reveals the worker `syncToFs` is fundamentally broken** and unfixable in the current PGlite version, the fallback is the already-implemented direct main-thread `PGlite` bootstrap path; switching `getLocalDb` to it is acceptable and keeps the rest of the plan valid.
