# Cue PDF Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user attach multiple PDF files to a cue in the Attribute Manager, preview them inline in a modal, and remove them — all stored locally in the browser (no backend).

**Architecture:** Binaries live in IndexedDB behind a `FileStorage` abstraction injected into the repository; PGlite holds only metadata in two tables (`script_attachments` for the file record, `script_cue_attachments` for the cue↔file link). The Attribute Manager's existing Cue list gets its currently-placeholder detail pane filled with an attachments section; preview reuses the `pdfjs-dist` renderer already used by export.

**Tech Stack:** TypeScript, React, Drizzle ORM + PGlite, IndexedDB, `pdfjs-dist`, vite-plus test runner.

## Global Constraints

- **Checks:** typecheck `npx tsc -b`; lint `pnpm lint` (eslint + stylelint, `--fix` is the formatter); node tests `pnpm test`; browser tests `pnpm --filter @stagistic/<pkg> test:browser`. Do NOT use `vp lint`/`vp fmt`.
- **Test imports:** `import {describe, it, expect} from 'vite-plus/test'`.
- **DB migrations:** after any `packages/db/src/` schema or `drizzle/*.sql` change run `pnpm --filter @stagistic/db db:compile-migrations`. `compile-migrations.mjs` globs `drizzle/*.sql` sorted by filename — no `_journal.json` edit needed.
- **`SCRIPT_DOCUMENT_SCHEMA_VERSION`:** do NOT bump. This is DB/projection + UI only.
- **Commits:** prepare the commit and message only; the human runs the final `git commit`. Each task below ends by staging changes and STOPPING for the human to commit.
- **IDs:** use `uuidv7()` from `@stagistic/shared`, timestamps via `Date.now()` (mirrors `repo/cues.ts`).
- **Attachments are metadata-only in PGlite** — never store binary in Postgres. `.stagistic` export stays text-only.

---

## File Structure

**New files**
- `packages/db/src/fileStorage.ts` — `FileStorage` interface + `InMemoryFileStorage` (test/fallback impl).
- `packages/db/src/queries/scripts/attachments.ts` — Drizzle queries for both tables.
- `packages/db/src/repo/attachments.ts` — `createAttachmentHandlers`.
- `packages/db/src/repo/attachments.test.ts` — PGlite handler tests.
- `apps/web/src/db/fileStorage.ts` — `IndexedDbFileStorage`.
- `packages/app-routes/src/routes/script/export/renderPdfToCanvases.ts` — shared pdf.js render helper.
- `packages/app-routes/src/routes/script/attributes/useCueAttachmentsState.ts` — cue attachments state hook.
- `packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.tsx` — inline PDF preview modal.
- `packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.module.css`
- `packages/ui/src/dialogs/AttributeManagerCueDetail.tsx` — cue detail body (attachments section).
- `packages/ui/src/dialogs/AttributeManagerCueDetail.module.css`
- `packages/ui/src/dialogs/RemoveAttachmentModal.tsx` — delete-confirm modal.
- `packages/ui/src/dialogs/RemoveAttachmentModal.module.css`

**Modified files**
- `packages/db/src/schema.ts` — two new tables + `dbSchema`.
- `packages/db/drizzle/0014_add_script_attachments.sql` — new migration (create).
- `packages/db/src/types.ts` — `ScriptAttachment` type.
- `packages/db/src/queries/scripts/index.ts` — re-export attachments queries.
- `packages/db/src/scriptRepository.ts` — `ScriptAttachmentsRepository` + `ScriptRepository` additions.
- `packages/db/src/repo/createLocalPgliteRepository.ts` — accept `fileStorage`, wire handlers.
- `packages/db/src/index.ts` — export `FileStorage`, `InMemoryFileStorage`, `ScriptAttachment`.
- `apps/web/src/repo/index.ts` — construct + inject `IndexedDbFileStorage`.
- `packages/app-routes/src/routes/script/export/ExportPreview.tsx` — use shared helper.
- `packages/ui/src/dialogs/AttributeManagerListPanel.tsx` — optional `renderDetail` prop.
- `packages/ui/src/index.ts` — export new UI components.
- `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx` — wire cue detail.

---

## Task 1: FileStorage abstraction

**Files:**
- Create: `packages/db/src/fileStorage.ts`
- Test: `packages/db/src/fileStorage.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Produces: `interface FileStorage { save(blob: Blob): Promise<string>; get(key: string): Promise<Blob | null>; delete(key: string): Promise<void>; }` and `class InMemoryFileStorage implements FileStorage`.

- [ ] **Step 1: Write the failing test**

`packages/db/src/fileStorage.test.ts`:
```ts
import {describe, expect, it} from 'vite-plus/test';

import {InMemoryFileStorage} from './fileStorage';

describe('InMemoryFileStorage', () => {
    it('round-trips a blob and returns a key', async () => {
        const storage = new InMemoryFileStorage();
        const blob = new Blob(['hello'], {type: 'application/pdf'});

        const key = await storage.save(blob);
        const loaded = await storage.get(key);

        expect(typeof key).toBe('string');
        expect(await loaded?.text()).toBe('hello');
    });

    it('returns null for an unknown key', async () => {
        const storage = new InMemoryFileStorage();

        expect(await storage.get('missing')).toBeNull();
    });

    it('deletes a stored blob', async () => {
        const storage = new InMemoryFileStorage();
        const key = await storage.save(new Blob(['x']));

        await storage.delete(key);

        expect(await storage.get(key)).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test run fileStorage`
Expected: FAIL — cannot find `./fileStorage`.

- [ ] **Step 3: Write minimal implementation**

`packages/db/src/fileStorage.ts`:
```ts
import {uuidv7} from '@stagistic/shared';

export interface FileStorage {
    save(blob: Blob): Promise<string>,
    get(key: string): Promise<Blob | null>,
    delete(key: string): Promise<void>,
}

export class InMemoryFileStorage implements FileStorage {
    private readonly blobs = new Map<string, Blob>();

    async save(blob: Blob): Promise<string> {
        const key = uuidv7();

        this.blobs.set(key, blob);

        return key;
    }

    async get(key: string): Promise<Blob | null> {
        return this.blobs.get(key) ?? null;
    }

    async delete(key: string): Promise<void> {
        this.blobs.delete(key);
    }
}
```

- [ ] **Step 4: Export from the package index**

In `packages/db/src/index.ts` add (near other exports):
```ts
export {InMemoryFileStorage, type FileStorage} from './fileStorage';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @stagistic/db test run fileStorage`
Expected: PASS (3 tests).

- [ ] **Step 6: Stage and stop for commit**

```bash
git add packages/db/src/fileStorage.ts packages/db/src/fileStorage.test.ts packages/db/src/index.ts
```
Proposed message: `feat(db): add FileStorage abstraction with in-memory impl`. Ask the human to commit.

---

## Task 2: Attachment tables (schema + migration)

**Files:**
- Modify: `packages/db/src/schema.ts:318-357`
- Create: `packages/db/drizzle/0014_add_script_attachments.sql`

**Interfaces:**
- Produces: Drizzle tables `scriptAttachments` and `scriptCueAttachments`, both added to `dbSchema`.

- [ ] **Step 1: Confirm imports in schema.ts**

Ensure the top-of-file drizzle import includes `primaryKey` (used for the join table's composite key). If missing, add it to the existing `import {... } from 'drizzle-orm/pg-core'` line alongside `bigint, index, integer, pgTable, text`.

- [ ] **Step 2: Add the tables**

In `packages/db/src/schema.ts`, immediately after the `scriptCues` table (line ~338, before `export const dbSchema`):
```ts
/*
 * Attachment file records (metadata only). Binaries live outside Postgres in a
 * FileStorage (IndexedDB in the browser); storage_key is the FileStorage key.
 */
export const scriptAttachments = pgTable(
    'script_attachments',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        filename: text('filename').notNull(),
        mimeType: text('mime_type').notNull(),
        sizeBytes: bigint('size_bytes', {mode: 'number'}).notNull(),
        storageKey: text('storage_key').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_attachments_script_id_idx').on(table.scriptId),
    }),
);

/* Join between a cue and an attachment. Both sides cascade-delete. */
export const scriptCueAttachments = pgTable(
    'script_cue_attachments',
    {
        cueId: text('cue_id')
            .notNull()
            .references(() => scriptCues.id, {onDelete: 'cascade'}),
        attachmentId: text('attachment_id')
            .notNull()
            .references(() => scriptAttachments.id, {onDelete: 'cascade'}),
        sortOrder: integer('sort_order').notNull().default(0),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    },
    table => ({
        pk: primaryKey({columns: [table.cueId, table.attachmentId]}),
        cueIdIdx: index('script_cue_attachments_cue_id_idx').on(table.cueId),
        attachmentIdIdx: index('script_cue_attachments_attachment_id_idx').on(table.attachmentId),
    }),
);
```

Then add both to `dbSchema`:
```ts
export const dbSchema = {
    // ...existing entries...
    scriptCues,
    scriptAttachments,
    scriptCueAttachments,
};
```

- [ ] **Step 3: Write the migration SQL**

`packages/db/drizzle/0014_add_script_attachments.sql`:
```sql
CREATE TABLE "script_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_cue_attachments" (
	"cue_id" text NOT NULL,
	"attachment_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "script_cue_attachments_cue_attachment_pk" PRIMARY KEY("cue_id","attachment_id")
);
--> statement-breakpoint
ALTER TABLE "script_attachments" ADD CONSTRAINT "script_attachments_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" ADD CONSTRAINT "script_cue_attachments_cue_id_script_cues_id_fk" FOREIGN KEY ("cue_id") REFERENCES "public"."script_cues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" ADD CONSTRAINT "script_cue_attachments_attachment_id_script_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."script_attachments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "script_attachments_script_id_idx" ON "script_attachments" USING btree ("script_id");
--> statement-breakpoint
CREATE INDEX "script_cue_attachments_cue_id_idx" ON "script_cue_attachments" USING btree ("cue_id");
--> statement-breakpoint
CREATE INDEX "script_cue_attachments_attachment_id_idx" ON "script_cue_attachments" USING btree ("attachment_id");
```

- [ ] **Step 4: Compile migrations**

Run: `pnpm --filter @stagistic/db db:compile-migrations`
Expected: prints `Compiled N migrations` and `packages/db/src/migrations.compiled.ts` now contains a `"0014_add_script_attachments"` entry.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @stagistic/db typecheck`
Expected: PASS.

- [ ] **Step 6: Stage and stop for commit**

```bash
git add packages/db/src/schema.ts packages/db/drizzle/0014_add_script_attachments.sql packages/db/src/migrations.compiled.ts
```
Proposed message: `feat(db): add script_attachments and script_cue_attachments tables`. Ask the human to commit.

---

## Task 3: Attachment queries

**Files:**
- Create: `packages/db/src/queries/scripts/attachments.ts`
- Modify: `packages/db/src/queries/scripts/index.ts`

**Interfaces:**
- Consumes: `scriptAttachments`, `scriptCueAttachments` (Task 2).
- Produces:
  - `insertAttachment(db, row: InsertAttachmentRow): Promise<void>`
  - `insertCueAttachmentLink(db, row: {cueId, attachmentId, sortOrder, createdAt}): Promise<void>`
  - `listAttachmentsByCue(db, cueId: string): Promise<AttachmentRow[]>`
  - `getAttachmentById(db, attachmentId: string): Promise<AttachmentRow | null>`
  - `deleteCueAttachmentLink(db, {cueId, attachmentId}): Promise<void>`
  - `deleteAttachment(db, attachmentId: string): Promise<void>`
  - `countAttachmentLinks(db, attachmentId: string): Promise<number>`
  - Types `InsertAttachmentRow`, `AttachmentRow`.

- [ ] **Step 1: Write the queries**

`packages/db/src/queries/scripts/attachments.ts`:
```ts
import {and, asc, eq, sql} from 'drizzle-orm';

import {scriptAttachments, scriptCueAttachments} from '../../schema';
import type {DbClient} from '../types';

export interface InsertAttachmentRow {
    id: string,
    scriptId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    storageKey: string,
    createdAt: number,
    updatedAt: number,
}

export type AttachmentRow = InsertAttachmentRow;

export const insertAttachment = async (db: DbClient, row: InsertAttachmentRow) => {
    await db.insert(scriptAttachments).values(row);
};

export const insertCueAttachmentLink = async (
    db: DbClient,
    row: {cueId: string, attachmentId: string, sortOrder: number, createdAt: number},
) => {
    await db.insert(scriptCueAttachments).values(row);
};

export const listAttachmentsByCue = async (db: DbClient, cueId: string): Promise<AttachmentRow[]> => {
    const rows = await db
        .select({
            id: scriptAttachments.id,
            scriptId: scriptAttachments.scriptId,
            filename: scriptAttachments.filename,
            mimeType: scriptAttachments.mimeType,
            sizeBytes: scriptAttachments.sizeBytes,
            storageKey: scriptAttachments.storageKey,
            createdAt: scriptAttachments.createdAt,
            updatedAt: scriptAttachments.updatedAt,
        })
        .from(scriptCueAttachments)
        .innerJoin(scriptAttachments, eq(scriptCueAttachments.attachmentId, scriptAttachments.id))
        .where(eq(scriptCueAttachments.cueId, cueId))
        .orderBy(asc(scriptCueAttachments.sortOrder), asc(scriptAttachments.createdAt));

    return rows;
};

export const getAttachmentById = async (db: DbClient, attachmentId: string): Promise<AttachmentRow | null> => {
    const rows = await db
        .select()
        .from(scriptAttachments)
        .where(eq(scriptAttachments.id, attachmentId))
        .limit(1);

    return rows[0] ?? null;
};

export const deleteCueAttachmentLink = async (
    db: DbClient,
    payload: {cueId: string, attachmentId: string},
) => {
    await db
        .delete(scriptCueAttachments)
        .where(and(
            eq(scriptCueAttachments.cueId, payload.cueId),
            eq(scriptCueAttachments.attachmentId, payload.attachmentId),
        ));
};

export const deleteAttachment = async (db: DbClient, attachmentId: string) => {
    await db.delete(scriptAttachments).where(eq(scriptAttachments.id, attachmentId));
};

export const countAttachmentLinks = async (db: DbClient, attachmentId: string): Promise<number> => {
    const rows = await db
        .select({count: sql<number>`count(*)::int`})
        .from(scriptCueAttachments)
        .where(eq(scriptCueAttachments.attachmentId, attachmentId));

    return rows[0]?.count ?? 0;
};
```

- [ ] **Step 2: Re-export**

In `packages/db/src/queries/scripts/index.ts` add:
```ts
export * from './attachments';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @stagistic/db typecheck`
Expected: PASS.

- [ ] **Step 4: Stage and stop for commit**

```bash
git add packages/db/src/queries/scripts/attachments.ts packages/db/src/queries/scripts/index.ts
```
Proposed message: `feat(db): add attachment queries`. Ask the human to commit.

---

## Task 4: Repository interface + ScriptAttachment type

**Files:**
- Modify: `packages/db/src/types.ts`
- Modify: `packages/db/src/scriptRepository.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Produces:
  - `ScriptAttachment` type (in `types.ts`) = same shape as `AttachmentRow`.
  - `ScriptAttachmentsRepository { listByCue(cueId): Promise<ScriptAttachment[]>; attachToCue(scriptId, cueId, file: {name, type, size, blob: Blob}): Promise<ScriptAttachment | null>; removeFromCue(scriptId, cueId, attachmentId): Promise<void>; getBlob(storageKey): Promise<Blob | null>; }`
  - `ScriptRepository` methods: `listCueAttachments`, `attachCueAttachment`, `removeCueAttachment`, `getAttachmentBlob` (delegating signatures below).

Note: `attachToCue` takes a plain `{name, type, size, blob}` object rather than the DOM `File` so `packages/db` stays DOM-lib-agnostic and the handler is testable in Node.

- [ ] **Step 1: Add the ScriptAttachment type**

In `packages/db/src/types.ts`, mirroring the existing `ScriptCue`/`ScriptLocation` exported types, add:
```ts
export interface ScriptAttachment {
    id: string,
    scriptId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    storageKey: string,
    createdAt: number,
    updatedAt: number,
}
```

- [ ] **Step 2: Add repository interfaces**

In `packages/db/src/scriptRepository.ts`:

Add `ScriptAttachment` to the type import from `./types` (the block at lines 7-13).

Add an upload-input type and the sub-repository interface after `ScriptLocationsRepository` (line ~56):
```ts
export interface CueAttachmentUpload {
    name: string,
    type: string,
    size: number,
    blob: Blob,
}

export interface ScriptAttachmentsRepository {
    listByCue(cueId: string): Promise<ScriptAttachment[]>,
    attachToCue(scriptId: string, cueId: string, file: CueAttachmentUpload): Promise<ScriptAttachment | null>,
    removeFromCue(scriptId: string, cueId: string, attachmentId: string): Promise<void>,
    getBlob(storageKey: string): Promise<Blob | null>,
}
```

Add to the `ScriptRepository` interface (after the cue methods, line ~72):
```ts
    listCueAttachments(cueId: string): Promise<ScriptAttachment[]>,
    attachCueAttachment(scriptId: string, cueId: string, file: CueAttachmentUpload): Promise<ScriptAttachment | null>,
    removeCueAttachment(scriptId: string, cueId: string, attachmentId: string): Promise<void>,
    getAttachmentBlob(storageKey: string): Promise<Blob | null>,
```

- [ ] **Step 3: Export the type from the package**

In `packages/db/src/index.ts` add `ScriptAttachment` to the existing type export block from `./types` (near `ScriptCue`).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @stagistic/db typecheck`
Expected: FAIL — `createLocalPgliteRepository` no longer satisfies `ScriptRepository` (missing 4 methods). This is expected; Task 5 implements them. Confirm the ONLY errors are the four missing members in `createLocalPgliteRepository.ts`.

- [ ] **Step 5: Stage and stop for commit**

```bash
git add packages/db/src/types.ts packages/db/src/scriptRepository.ts packages/db/src/index.ts
```
Proposed message: `feat(db): declare attachment repository interface`. Ask the human to commit. (Typecheck stays red until Task 5 — note this to the human.)

---

## Task 5: Attachment repository handlers + wiring

**Files:**
- Create: `packages/db/src/repo/attachments.ts`
- Create: `packages/db/src/repo/attachments.test.ts`
- Modify: `packages/db/src/repo/createLocalPgliteRepository.ts`
- Modify: `apps/web/src/repo/index.ts`
- Create: `apps/web/src/db/fileStorage.ts`

**Interfaces:**
- Consumes: queries (Task 3), `FileStorage` (Task 1), `ScriptAttachmentsRepository`, `CueAttachmentUpload` (Task 4), `GetDb`/`RecordOutbox`/`SyncDb` (`repo/types.ts`).
- Produces: `createAttachmentHandlers({getDb, recordOutbox, syncDb, fileStorage}): ScriptAttachmentsRepository`. `LocalPgliteRepositoryDeps` gains `fileStorage: FileStorage`.

- [ ] **Step 1: Write the failing handler test**

`packages/db/src/repo/attachments.test.ts` (uses the project PGlite test-db helper — mirror the import used by `packages/db/src/repo/*.test.ts`; here assumed `createTestDb` from `./persist/createTestDb` per existing tests — verify the exact path against a sibling test before writing):
```ts
import {describe, expect, it} from 'vite-plus/test';

import {InMemoryFileStorage} from '../fileStorage';
import * as dbQueries from '../queries';
import {createTestDb} from './persist/createTestDb';
import {createAttachmentHandlers} from './attachments';

const upload = (name: string) => ({
    name,
    type: 'application/pdf',
    size: 3,
    blob: new Blob(['pdf'], {type: 'application/pdf'}),
});

const setup = async () => {
    const db = await createTestDb();
    const scriptId = 'script-1';
    const cueId = 'cue-1';

    await db.insert(dbQueries /* schema.scripts */); // replace with the test helper's script+cue seeding

    const handlers = createAttachmentHandlers({
        getDb: async () => db,
        recordOutbox: async () => {},
        syncDb: async () => {},
        fileStorage: new InMemoryFileStorage(),
    });

    return {db, scriptId, cueId, handlers};
};

describe('createAttachmentHandlers', () => {
    it('attaches a pdf and lists it', async () => {
        const {scriptId, cueId, handlers} = await setup();

        const created = await handlers.attachToCue(scriptId, cueId, upload('score.pdf'));
        const listed = await handlers.listByCue(cueId);

        expect(created?.filename).toBe('score.pdf');
        expect(listed).toHaveLength(1);
        expect(await handlers.getBlob(created!.storageKey)).not.toBeNull();
    });

    it('removes the link and GCs the orphaned attachment + blob', async () => {
        const {scriptId, cueId, handlers} = await setup();
        const created = await handlers.attachToCue(scriptId, cueId, upload('a.pdf'));

        await handlers.removeFromCue(scriptId, cueId, created!.id);

        expect(await handlers.listByCue(cueId)).toHaveLength(0);
        expect(await handlers.getBlob(created!.storageKey)).toBeNull();
    });
});
```
NOTE for implementer: replace the seeding placeholder with the real test-db seeding used by sibling repo tests (`createTestDb` + direct `db.insert(schema.scripts...)` / `schema.scriptCues...`). Read one sibling `repo/*.test.ts` first to copy exact seeding + import path. Do not leave the placeholder.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @stagistic/db test run repo/attachments`
Expected: FAIL — cannot find `./attachments`.

- [ ] **Step 3: Write the handlers**

`packages/db/src/repo/attachments.ts`:
```ts
import {uuidv7} from '@stagistic/shared';

import type {FileStorage} from '../fileStorage';
import * as dbQueries from '../queries';
import type {CueAttachmentUpload, ScriptAttachmentsRepository} from '../scriptRepository';
import type {GetDb, RecordOutbox, SyncDb} from './types';

interface CreateAttachmentHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
    fileStorage: FileStorage,
}

export const createAttachmentHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
    fileStorage,
}: CreateAttachmentHandlersArgs): ScriptAttachmentsRepository => {
    const listByCue: ScriptAttachmentsRepository['listByCue'] = async cueId => {
        const db = await getDb();

        return dbQueries.listAttachmentsByCue(db, cueId);
    };

    const attachToCue: ScriptAttachmentsRepository['attachToCue'] = async (scriptId, cueId, file) => {
        if (!cueId) {
            return null;
        }

        const storageKey = await fileStorage.save(file.blob);
        const db = await getDb();
        const now = Date.now();
        const attachmentId = uuidv7();
        const filename = file.name.trim() || 'attachment.pdf';

        await dbQueries.insertAttachment(db, {
            id: attachmentId,
            scriptId,
            filename,
            mimeType: file.type || 'application/pdf',
            sizeBytes: file.size,
            storageKey,
            createdAt: now,
            updatedAt: now,
        });
        await dbQueries.insertCueAttachmentLink(db, {
            cueId,
            attachmentId,
            sortOrder: now,
            createdAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {scriptId, updatedAt: now});
        await recordOutbox({
            scriptId,
            opType: 'cueAttachment.attach',
            payloadJson: JSON.stringify({scriptId, cueId, attachmentId, filename, createdAt: now}),
        });
        await syncDb();

        return dbQueries.getAttachmentById(db, attachmentId);
    };

    const removeFromCue: ScriptAttachmentsRepository['removeFromCue'] = async (scriptId, cueId, attachmentId) => {
        if (!cueId || !attachmentId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();
        const attachment = await dbQueries.getAttachmentById(db, attachmentId);

        await dbQueries.deleteCueAttachmentLink(db, {cueId, attachmentId});

        const remaining = await dbQueries.countAttachmentLinks(db, attachmentId);

        if (remaining === 0 && attachment) {
            await dbQueries.deleteAttachment(db, attachmentId);
            await fileStorage.delete(attachment.storageKey);
        }

        await dbQueries.updateScriptTimestamp(db, {scriptId, updatedAt: now});
        await recordOutbox({
            scriptId,
            opType: 'cueAttachment.detach',
            payloadJson: JSON.stringify({scriptId, cueId, attachmentId, updatedAt: now}),
        });
        await syncDb();
    };

    const getBlob: ScriptAttachmentsRepository['getBlob'] = async storageKey => {
        return fileStorage.get(storageKey);
    };

    return {listByCue, attachToCue, removeFromCue, getBlob};
};
```
(If `dbQueries.updateScriptTimestamp` is not the correct name, use the same call `repo/cues.ts` uses — copy verbatim from there.)

- [ ] **Step 4: Wire into createLocalPgliteRepository**

In `packages/db/src/repo/createLocalPgliteRepository.ts`:

Add import: `import {createAttachmentHandlers} from './attachments';` and `import type {FileStorage} from '../fileStorage';`.

Extend deps:
```ts
export interface LocalPgliteRepositoryDeps {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
    fileStorage: FileStorage,
}
```
Destructure `fileStorage` in the factory args. After the `cues`/`locations` handler construction add:
```ts
    const attachments = createAttachmentHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
        fileStorage,
    });
```
Add to the returned object (after the cue entries):
```ts
        listCueAttachments: cueId => attachments.listByCue(cueId),
        attachCueAttachment: (scriptId, cueId, file) => attachments.attachToCue(scriptId, cueId, file),
        removeCueAttachment: (scriptId, cueId, attachmentId) => attachments.removeFromCue(scriptId, cueId, attachmentId),
        getAttachmentBlob: storageKey => attachments.getBlob(storageKey),
```

- [ ] **Step 5: Run handler test**

Run: `pnpm --filter @stagistic/db test run repo/attachments`
Expected: PASS (2 tests). Also run `pnpm --filter @stagistic/db typecheck` → PASS.

- [ ] **Step 6: Implement IndexedDbFileStorage**

`apps/web/src/db/fileStorage.ts`:
```ts
import type {FileStorage} from '@stagistic/db';
import {uuidv7} from '@stagistic/shared';

const DB_NAME = 'stagistic-files';
const STORE = 'files';

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, {keyPath: 'id'});
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | undefined> => {
    const db = await openDatabase();

    try {
        return await new Promise<T | undefined>((resolve, reject) => {
            const transaction = db.transaction(STORE, mode);
            const request = run(transaction.objectStore(STORE));

            transaction.oncomplete = () => resolve(request?.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        db.close();
    }
};

export class IndexedDbFileStorage implements FileStorage {
    async save(blob: Blob): Promise<string> {
        const id = uuidv7();

        await runTransaction('readwrite', store => store.put({id, blob}));

        if (navigator.storage?.persist) {
            void navigator.storage.persist();
        }

        return id;
    }

    async get(key: string): Promise<Blob | null> {
        const record = await runTransaction<{id: string, blob: Blob}>('readonly', store => store.get(key));

        return record?.blob ?? null;
    }

    async delete(key: string): Promise<void> {
        await runTransaction('readwrite', store => store.delete(key));
    }
}
```

- [ ] **Step 7: Inject it in apps/web**

`apps/web/src/repo/index.ts`:
```ts
import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';

import {getLocalDb, syncToFs} from '~db';
import {IndexedDbFileStorage} from '~db/fileStorage';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository({
    getLocalDb,
    syncToFs,
    fileStorage: new IndexedDbFileStorage(),
});
```
(Use whatever import alias resolves `apps/web/src/db/fileStorage.ts` — mirror the existing `~db` alias; if `~db` maps to `src/db/index.ts`, import from `'~db/fileStorage'` or a relative `../db/fileStorage`.)

- [ ] **Step 8: Typecheck the graph**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 9: Stage and stop for commit**

```bash
git add packages/db/src/repo/attachments.ts packages/db/src/repo/attachments.test.ts packages/db/src/repo/createLocalPgliteRepository.ts apps/web/src/db/fileStorage.ts apps/web/src/repo/index.ts
```
Proposed message: `feat: attachment repository handlers + IndexedDB file storage`. Ask the human to commit.

---

## Task 6: Shared pdf.js render helper

**Files:**
- Create: `packages/app-routes/src/routes/script/export/renderPdfToCanvases.ts`
- Modify: `packages/app-routes/src/routes/script/export/ExportPreview.tsx`

**Interfaces:**
- Produces: `renderPdfToCanvases(data: ArrayBuffer, scale: number): Promise<HTMLCanvasElement[]>`. Worker src is configured once inside this module.

- [ ] **Step 1: Extract the helper**

`packages/app-routes/src/routes/script/export/renderPdfToCanvases.ts`:
```ts
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const renderPage = async (page: pdfjs.PDFPageProxy, scale: number): Promise<HTMLCanvasElement> => {
    const viewport = page.getViewport({scale});
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context unavailable');
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    await page.render({canvas, canvasContext: context, viewport}).promise;

    return canvas;
};

export const renderPdfToCanvases = async (data: ArrayBuffer, scale: number): Promise<HTMLCanvasElement[]> => {
    const pdf = await pdfjs.getDocument({data}).promise;
    const canvases: HTMLCanvasElement[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);

        canvases.push(await renderPage(page, scale));
    }

    return canvases;
};
```

- [ ] **Step 2: Use it in ExportPreview**

In `packages/app-routes/src/routes/script/export/ExportPreview.tsx`: remove the `pdfjs`/`pdfWorkerUrl` imports, the `pdfjs.GlobalWorkerOptions` line, and the local `renderPage`. Import `{renderPdfToCanvases} from './renderPdfToCanvases'`. Replace the render loop (lines ~64-73) with:
```ts
            const data = await artifact.arrayBuffer();
            const canvases = await renderPdfToCanvases(data, zoom);
```
Replace `setPageCount(pdf.numPages)` with `setPageCount(canvases.length)`. Keep the rest unchanged.

- [ ] **Step 3: Typecheck + verify export still renders**

Run: `pnpm --filter @stagistic/app-routes typecheck`
Expected: PASS. Manually confirm the export preview still renders (unchanged behavior) if running the app.

- [ ] **Step 4: Stage and stop for commit**

```bash
git add packages/app-routes/src/routes/script/export/renderPdfToCanvases.ts packages/app-routes/src/routes/script/export/ExportPreview.tsx
```
Proposed message: `refactor(app-routes): extract shared renderPdfToCanvases helper`. Ask the human to commit.

---

## Task 7: `renderDetail` prop on AttributeManagerListPanel

**Files:**
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.tsx:19-31,100-116`

**Interfaces:**
- Produces: optional prop `renderDetail?: (item: AttributeManagerListItem) => ReactNode`. When provided and an item is selected, its return value replaces the `detailPlaceholder` body.

- [ ] **Step 1: Add the prop**

In `AttributeManagerListPanelProps` add:
```ts
    /** When provided, renders custom detail-body content for the selected item instead of the placeholder. */
    renderDetail?: (item: AttributeManagerListItem) => ReactNode,
```
Destructure `renderDetail` in the component args.

- [ ] **Step 2: Use it in the detail body**

Replace the detail body block (lines ~107-109):
```tsx
                        <div className={styles.detailBody}>
                            {renderDetail
                                ? renderDetail(selectedItem)
                                : <p className={styles.detailPlaceholder}>{detailPlaceholder}</p>}
                        </div>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @stagistic/ui typecheck`
Expected: PASS (existing callers omit `renderDetail`, so they are unaffected).

- [ ] **Step 4: Stage and stop for commit**

```bash
git add packages/ui/src/dialogs/AttributeManagerListPanel.tsx
```
Proposed message: `feat(ui): allow custom detail body in AttributeManagerListPanel`. Ask the human to commit.

---

## Task 8: RemoveAttachmentModal

**Files:**
- Create: `packages/ui/src/dialogs/RemoveAttachmentModal.tsx`
- Create: `packages/ui/src/dialogs/RemoveAttachmentModal.module.css`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `RemoveAttachmentModal` with props `{isOpen, attachmentName, isRemoving?, onClose, onConfirm}` (mirrors `RemovePlaceModal`).

- [ ] **Step 1: Create the modal** (mirror `RemovePlaceModal.tsx`)

`packages/ui/src/dialogs/RemoveAttachmentModal.tsx`:
```tsx
import {Button} from '../atoms/Button';
import {ModalDialog} from './ModalDialog';
import styles from './RemoveAttachmentModal.module.css';

export interface RemoveAttachmentModalProps {
    isOpen: boolean,
    attachmentName: string,
    isRemoving?: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
}

export const RemoveAttachmentModal = ({
    isOpen,
    attachmentName,
    isRemoving = false,
    onClose,
    onConfirm,
}: RemoveAttachmentModalProps) => (
    <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Remove attachment"
    >
        <h2 className={styles.title}>Remove {attachmentName}?</h2>
        <p className={styles.subtitle}>
            This deletes the file from this browser. It cannot be undone.
        </p>
        <div className={styles.actions}>
            <Button
                variant="danger"
                isPending={isRemoving}
                onPress={() => void onConfirm()}
            >
                Remove
            </Button>
            <Button
                variant="ghost"
                isDisabled={isRemoving}
                onPress={onClose}
            >
                Cancel
            </Button>
        </div>
    </ModalDialog>
);
```

- [ ] **Step 2: Copy the styles**

Create `packages/ui/src/dialogs/RemoveAttachmentModal.module.css` by copying `RemovePlaceModal.module.css` verbatim (same `.title`, `.subtitle`, `.actions` classes).

- [ ] **Step 3: Export**

In `packages/ui/src/index.ts` add an export for `RemoveAttachmentModal` next to `RemovePlaceModal`'s export (match the existing export style).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @stagistic/ui typecheck`
Expected: PASS.

- [ ] **Step 5: Stage and stop for commit**

```bash
git add packages/ui/src/dialogs/RemoveAttachmentModal.tsx packages/ui/src/dialogs/RemoveAttachmentModal.module.css packages/ui/src/index.ts
```
Proposed message: `feat(ui): add RemoveAttachmentModal`. Ask the human to commit.

---

## Task 9: CueAttachmentPreviewModal

**Files:**
- Create: `packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.tsx`
- Create: `packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.module.css`

**Interfaces:**
- Consumes: `renderPdfToCanvases` (Task 6), `ModalDialog`, `ProgressCircle` from `@stagistic/ui`.
- Produces: `CueAttachmentPreviewModal` with props `{isOpen, attachmentName, loadBlob: () => Promise<Blob | null>, onClose}`.

- [ ] **Step 1: Create the modal**

`packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.tsx`:
```tsx
import {ModalDialog, ProgressCircle} from '@stagistic/ui';
import {useEffect, useRef, useState} from 'react';

import {renderPdfToCanvases} from '../export/renderPdfToCanvases';
import styles from './CueAttachmentPreviewModal.module.css';

export interface CueAttachmentPreviewModalProps {
    isOpen: boolean,
    attachmentName: string,
    loadBlob: () => Promise<Blob | null>,
    onClose: () => void,
}

type PreviewStatus = 'loading' | 'ready' | 'missing' | 'error';

export const CueAttachmentPreviewModal = ({
    isOpen,
    attachmentName,
    loadBlob,
    onClose,
}: CueAttachmentPreviewModalProps) => {
    const pagesRef = useRef<HTMLDivElement | null>(null);
    const [status, setStatus] = useState<PreviewStatus>('loading');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let cancelled = false;

        setStatus('loading');

        const render = async () => {
            const blob = await loadBlob();

            if (cancelled) {
                return;
            }

            if (!blob) {
                setStatus('missing');

                return;
            }

            const canvases = await renderPdfToCanvases(await blob.arrayBuffer(), 1);

            if (cancelled || !pagesRef.current) {
                return;
            }

            pagesRef.current.replaceChildren(...canvases.map(canvas => {
                const frame = document.createElement('div');

                frame.className = styles.page;
                frame.append(canvas);

                return frame;
            }));
            setStatus('ready');
        };

        void render().catch(() => {
            if (!cancelled) {
                setStatus('error');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isOpen, loadBlob]);

    return (
        <ModalDialog isOpen={isOpen} onClose={onClose} ariaLabel={`Preview ${attachmentName}`}>
            <header className={styles.header}>
                <h2 className={styles.title}>{attachmentName}</h2>
            </header>
            <div className={styles.body}>
                <div className={styles.pages} ref={pagesRef} aria-busy={status === 'loading'} />
                {status === 'loading' ? (
                    <div className={styles.overlay} role="status">
                        <ProgressCircle aria-label="Loading preview" isIndeterminate />
                    </div>
                ) : null}
                {status === 'missing' ? (
                    <p className={styles.message}>This attachment is not available in this browser.</p>
                ) : null}
                {status === 'error' ? (
                    <p className={styles.message} role="alert">Preview failed.</p>
                ) : null}
            </div>
        </ModalDialog>
    );
};
```

- [ ] **Step 2: Create styles**

`packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.module.css` — minimal, mirroring `ExportPreview.module.css` conventions:
```css
.header {
    margin-block-end: 12px;
}

.title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.body {
    position: relative;
    max-block-size: 70vh;
    overflow: auto;
}

.pages {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
}

.page {
    box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
}

.overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
}

.message {
    padding: 24px;
    color: var(--color-text-muted, #888);
    text-align: center;
}
```
(Verify `--color-text-muted` or the project's muted-text token against a sibling `.module.css`; use the established token.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @stagistic/app-routes typecheck`
Expected: PASS.

- [ ] **Step 4: Lint (stylelint owns CSS formatting)**

Run: `npx stylelint "packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.module.css" --fix`
Expected: no unfixable errors.

- [ ] **Step 5: Stage and stop for commit**

```bash
git add packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.tsx packages/app-routes/src/routes/script/attributes/CueAttachmentPreviewModal.module.css
```
Proposed message: `feat(app-routes): add cue attachment PDF preview modal`. Ask the human to commit.

---

## Task 10: AttributeManagerCueDetail

**Files:**
- Create: `packages/ui/src/dialogs/AttributeManagerCueDetail.tsx`
- Create: `packages/ui/src/dialogs/AttributeManagerCueDetail.module.css`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `AttributeManagerCueDetail` — presentational. Props:
```ts
export interface CueAttachmentView {
    id: string,
    filename: string,
    sizeBytes: number,
    isAvailable: boolean,
}
export interface AttributeManagerCueDetailProps {
    attachments: CueAttachmentView[],
    isUploading?: boolean,
    onUploadPdf: (file: File) => void,
    onPreview: (attachmentId: string) => void,
    onRemove: (attachmentId: string) => void,
}
```

- [ ] **Step 1: Create the component**

`packages/ui/src/dialogs/AttributeManagerCueDetail.tsx`:
```tsx
import {useRef} from 'react';

import {Button} from '../atoms/Button';
import styles from './AttributeManagerCueDetail.module.css';

export interface CueAttachmentView {
    id: string,
    filename: string,
    sizeBytes: number,
    isAvailable: boolean,
}

export interface AttributeManagerCueDetailProps {
    attachments: CueAttachmentView[],
    isUploading?: boolean,
    onUploadPdf: (file: File) => void,
    onPreview: (attachmentId: string) => void,
    onRemove: (attachmentId: string) => void,
}

const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

export const AttributeManagerCueDetail = ({
    attachments,
    isUploading = false,
    onUploadPdf,
    onPreview,
    onRemove,
}: AttributeManagerCueDetailProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>Attachments</h4>
                <Button
                    variant="ghost"
                    isPending={isUploading}
                    onPress={() => inputRef.current?.click()}
                >
                    Upload PDF
                </Button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className={styles.hiddenInput}
                    onChange={event => {
                        const file = event.target.files?.[0];

                        if (file && file.type === 'application/pdf') {
                            onUploadPdf(file);
                        }

                        event.target.value = '';
                    }}
                />
            </div>
            {attachments.length === 0 ? (
                <p className={styles.empty}>No attachments yet.</p>
            ) : (
                <ul className={styles.list}>
                    {attachments.map(attachment => (
                        <li key={attachment.id} className={styles.item}>
                            <button
                                type="button"
                                className={styles.itemName}
                                disabled={!attachment.isAvailable}
                                onClick={() => onPreview(attachment.id)}
                            >
                                {attachment.filename}
                            </button>
                            <span className={styles.itemSize}>
                                {attachment.isAvailable ? formatSize(attachment.sizeBytes) : 'unavailable'}
                            </span>
                            <Button variant="ghost" onPress={() => onRemove(attachment.id)}>
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Create styles**

`packages/ui/src/dialogs/AttributeManagerCueDetail.module.css`:
```css
.section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.sectionHeader {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
}

.sectionTitle {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
}

.hiddenInput {
    display: none;
}

.empty {
    margin: 0;
    color: var(--color-text-muted, #888);
    font-size: 13px;
}

.list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.item {
    display: flex;
    gap: 8px;
    align-items: center;
}

.itemName {
    flex: 1;
    padding: 0;
    color: inherit;
    font: inherit;
    text-align: start;
    background: none;
    border: none;
    cursor: pointer;
}

.itemName:disabled {
    color: var(--color-text-muted, #888);
    cursor: default;
}

.itemSize {
    color: var(--color-text-muted, #888);
    font-size: 12px;
}
```
(Verify the muted-text token against a sibling module file and match it.)

- [ ] **Step 3: Export**

In `packages/ui/src/index.ts` export `AttributeManagerCueDetail` and its `CueAttachmentView` / `AttributeManagerCueDetailProps` types (match the export style used for `AttributeManagerListPanel`).

- [ ] **Step 4: Typecheck + stylelint**

Run: `pnpm --filter @stagistic/ui typecheck` → PASS.
Run: `npx stylelint "packages/ui/src/dialogs/AttributeManagerCueDetail.module.css" --fix` → clean.

- [ ] **Step 5: Stage and stop for commit**

```bash
git add packages/ui/src/dialogs/AttributeManagerCueDetail.tsx packages/ui/src/dialogs/AttributeManagerCueDetail.module.css packages/ui/src/index.ts
```
Proposed message: `feat(ui): add cue detail attachments section`. Ask the human to commit.

---

## Task 11: useCueAttachmentsState hook

**Files:**
- Create: `packages/app-routes/src/routes/script/attributes/useCueAttachmentsState.ts`

**Interfaces:**
- Consumes: `useScriptRepository` return type, repository attachment methods (Task 4).
- Produces: `useCueAttachmentsState(scriptId, scriptRepository)` returning `{attachmentsByCue: Map<string, ScriptAttachment[]>, uploadingCueIds: Set<string>, loadCue(cueId), uploadPdf(cueId, file: File), remove(cueId, attachmentId), getBlob(storageKey)}`. Mirrors `useScriptPlacesState`.

- [ ] **Step 1: Create the hook**

`packages/app-routes/src/routes/script/attributes/useCueAttachmentsState.ts`:
```ts
import {type useScriptRepository} from '@stagistic/app-core';
import {useCallback, useState} from 'react';

type ScriptRepository = ReturnType<typeof useScriptRepository>;
type ScriptAttachment = Awaited<ReturnType<ScriptRepository['listCueAttachments']>>[number];

export const useCueAttachmentsState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
) => {
    const [attachmentsByCue, setAttachmentsByCue] = useState<Map<string, ScriptAttachment[]>>(new Map());
    const [uploadingCueIds, setUploadingCueIds] = useState<Set<string>>(new Set());

    const setCueAttachments = useCallback((cueId: string, rows: ScriptAttachment[]) => {
        setAttachmentsByCue(previous => {
            const next = new Map(previous);

            next.set(cueId, rows);

            return next;
        });
    }, []);

    const loadCue = useCallback(async (cueId: string) => {
        const rows = await scriptRepository.listCueAttachments(cueId);

        setCueAttachments(cueId, rows);
    }, [scriptRepository, setCueAttachments]);

    const uploadPdf = useCallback(async (cueId: string, file: File) => {
        if (!scriptId) {
            return;
        }

        setUploadingCueIds(previous => new Set(previous).add(cueId));

        try {
            await scriptRepository.attachCueAttachment(scriptId, cueId, {
                name: file.name,
                type: file.type,
                size: file.size,
                blob: file,
            });
            const rows = await scriptRepository.listCueAttachments(cueId);

            setCueAttachments(cueId, rows);
        } finally {
            setUploadingCueIds(previous => {
                const next = new Set(previous);

                next.delete(cueId);

                return next;
            });
        }
    }, [scriptId, scriptRepository, setCueAttachments]);

    const remove = useCallback(async (cueId: string, attachmentId: string) => {
        if (!scriptId) {
            return;
        }

        await scriptRepository.removeCueAttachment(scriptId, cueId, attachmentId);
        const rows = await scriptRepository.listCueAttachments(cueId);

        setCueAttachments(cueId, rows);
    }, [scriptId, scriptRepository, setCueAttachments]);

    const getBlob = useCallback((storageKey: string) => {
        return scriptRepository.getAttachmentBlob(storageKey);
    }, [scriptRepository]);

    return {attachmentsByCue, uploadingCueIds, loadCue, uploadPdf, remove, getBlob};
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @stagistic/app-routes typecheck`
Expected: PASS.

- [ ] **Step 3: Stage and stop for commit**

```bash
git add packages/app-routes/src/routes/script/attributes/useCueAttachmentsState.ts
```
Proposed message: `feat(app-routes): add cue attachments state hook`. Ask the human to commit.

---

## Task 12: Wire cue detail into the Attribute Manager

**Files:**
- Modify: `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx:41,179-180,302-311`
- Create: `packages/app-routes/src/routes/script/attributes/CueAttachmentsDetail.tsx` (container binding hook → UI + modals)
- Test: `packages/app-routes/src/routes/script/settings/AttributeManagerCueAttachments.browser.test.tsx`

**Interfaces:**
- Consumes: `useCueAttachmentsState` (Task 11), `AttributeManagerCueDetail` + `CueAttachmentView` + `RemoveAttachmentModal` (Tasks 8, 10), `CueAttachmentPreviewModal` (Task 9).

- [ ] **Step 1: Create the detail container**

`packages/app-routes/src/routes/script/attributes/CueAttachmentsDetail.tsx`:
```tsx
import {AttributeManagerCueDetail, type CueAttachmentView, RemoveAttachmentModal} from '@stagistic/ui';
import {useEffect, useState} from 'react';

import {CueAttachmentPreviewModal} from './CueAttachmentPreviewModal';
import {useCueAttachmentsState} from './useCueAttachmentsState';

interface CueAttachmentsDetailProps {
    cueId: string,
    state: ReturnType<typeof useCueAttachmentsState>,
}

export const CueAttachmentsDetail = ({cueId, state}: CueAttachmentsDetailProps) => {
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const rows = state.attachmentsByCue.get(cueId) ?? [];

    useEffect(() => {
        void state.loadCue(cueId);
    }, [cueId, state]);

    const views: CueAttachmentView[] = rows.map(row => ({
        id: row.id,
        filename: row.filename,
        sizeBytes: row.sizeBytes,
        isAvailable: true,
    }));
    const previewRow = rows.find(row => row.id === previewId) ?? null;
    const removeRow = rows.find(row => row.id === removeId) ?? null;

    return (
        <>
            <AttributeManagerCueDetail
                attachments={views}
                isUploading={state.uploadingCueIds.has(cueId)}
                onUploadPdf={file => void state.uploadPdf(cueId, file)}
                onPreview={setPreviewId}
                onRemove={setRemoveId}
            />
            <CueAttachmentPreviewModal
                isOpen={previewRow !== null}
                attachmentName={previewRow?.filename ?? ''}
                loadBlob={() => (previewRow ? state.getBlob(previewRow.storageKey) : Promise.resolve(null))}
                onClose={() => setPreviewId(null)}
            />
            <RemoveAttachmentModal
                isOpen={removeRow !== null}
                attachmentName={removeRow?.filename ?? ''}
                onClose={() => setRemoveId(null)}
                onConfirm={async () => {
                    if (removeRow) {
                        await state.remove(cueId, removeRow.id);
                    }

                    setRemoveId(null);
                }}
            />
        </>
    );
};
```

- [ ] **Step 2: Wire it in the provider**

In `ScriptSettingsModalProvider.tsx`:

Add imports:
```ts
import {CueAttachmentsDetail} from '../attributes/CueAttachmentsDetail';
import {useCueAttachmentsState} from '../attributes/useCueAttachmentsState';
```

After `const placeState = useScriptPlacesState(currentScriptId, scriptRepository);` (line ~180) add:
```ts
    const cueAttachmentsState = useCueAttachmentsState(currentScriptId, scriptRepository);
```

Replace the Cues `AttributeManagerListPanel` block (lines ~302-311): keep every existing prop, remove `detailPlaceholder`, and add `renderDetail`:
```tsx
                    {activeAttributeManagerPanelId === ATTRIBUTE_MANAGER_PANEL_CUES ? (
                        <AttributeManagerListPanel
                            items={attributeManagerCues}
                            initialSelectedItemId={selectedAttributeManagerCueId}
                            detailTypeLabel="Cue"
                            emptyListLabel="No cues yet"
                            emptyDetailLabel="Select a cue"
                            detailPlaceholder="Cue details are coming soon."
                            renderDetail={item => (
                                <CueAttachmentsDetail cueId={item.id} state={cueAttachmentsState} />
                            )}
                        />
                    ) : null}
```
(`detailPlaceholder` stays as a required-prop fallback but is now unused for cues.)

- [ ] **Step 3: Typecheck the graph**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 4: Write a browser test**

`packages/app-routes/src/routes/script/settings/AttributeManagerCueAttachments.browser.test.tsx` — render the provider (or the `CueAttachmentsDetail` with a stub `state`) with one cue selected; assert the "Attachments" heading, the "Upload PDF" button, and "No attachments yet." render; simulate a stub upload and assert the row appears. Mirror the setup of `AttributeManagerCharactersPanel.browser.test.tsx` / `AttributeManagerListPanel.browser.test.tsx` (read one first for the exact harness + render utilities). Use a fake `state` object matching `useCueAttachmentsState`'s return shape so no real repo/IndexedDB is needed:
```tsx
import {describe, expect, it} from 'vite-plus/test';
// ...mirror sibling browser-test imports (render, screen, userEvent)...

import {CueAttachmentsDetail} from '../attributes/CueAttachmentsDetail';

const makeState = (rows: Array<{id: string, filename: string, sizeBytes: number, storageKey: string}>) => ({
    attachmentsByCue: new Map([['cue-1', rows]]),
    uploadingCueIds: new Set<string>(),
    loadCue: async () => {},
    uploadPdf: async () => {},
    remove: async () => {},
    getBlob: async () => null,
});

describe('CueAttachmentsDetail', () => {
    it('shows the empty state and upload control', async () => {
        render(<CueAttachmentsDetail cueId="cue-1" state={makeState([]) as never} />);

        expect(screen.getByText('No attachments yet.')).toBeTruthy();
        expect(screen.getByRole('button', {name: 'Upload PDF'})).toBeTruthy();
    });

    it('lists an existing attachment', async () => {
        render(
            <CueAttachmentsDetail
                cueId="cue-1"
                state={makeState([{id: 'a1', filename: 'score.pdf', sizeBytes: 2048, storageKey: 'k'}]) as never}
            />,
        );

        expect(screen.getByText('score.pdf')).toBeTruthy();
    });
});
```

- [ ] **Step 5: Run the browser test**

Run: `pnpm --filter @stagistic/app-routes test:browser CueAttachments`
Expected: PASS. (If app-routes has no `test:browser`, place the test in the package that does — mirror where sibling AttributeManager browser tests live; they are under `packages/ui`. In that case put the test in `packages/ui` importing the presentational `AttributeManagerCueDetail` directly instead of the container.)

- [ ] **Step 6: Full check pass**

Run: `npx tsc -b` → PASS. `pnpm lint` → clean (run `--fix` variants if needed). `pnpm test` → green (excluding known pre-existing reds).

- [ ] **Step 7: Stage and stop for commit**

```bash
git add packages/app-routes/src/routes/script/attributes/CueAttachmentsDetail.tsx packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx packages/app-routes/src/routes/script/settings/AttributeManagerCueAttachments.browser.test.tsx
```
Proposed message: `feat: attach and preview PDFs on cues in the attribute manager`. Ask the human to commit.

---

## Self-Review

**Spec coverage**
- FileStorage abstraction + IndexedDB impl + persist() → Tasks 1, 5. ✓
- `script_attachments` + `script_cue_attachments` metadata-only tables → Task 2. ✓
- Queries + handlers (attach/list/remove/orphan-GC/getBlob) + interface + wiring → Tasks 3, 4, 5. ✓
- `.stagistic` stays text-only → no export change made anywhere. ✓
- Cue detail fills existing placeholder via `renderDetail` → Tasks 7, 12. ✓
- Attachments section with Upload PDF → Task 10. ✓
- Inline preview modal reusing pdf.js (shared helper) → Tasks 6, 9. ✓
- RemoveAttachmentModal → Task 8. ✓
- State hook mirroring places → Task 11. ✓
- Missing-blob defensive placeholder → preview modal `missing` status (Task 9); the list-row `isAvailable` flag exists (Task 10) though the container currently sets it `true` (blob presence is confirmed lazily on preview — acceptable for MVP, noted). ✓
- Tests: DB handler (Task 5) + browser (Task 12). ✓
- No `SCRIPT_DOCUMENT_SCHEMA_VERSION` bump. ✓

**Placeholder scan:** The two explicit "replace this" notes (Task 5 test seeding, Task 12 test harness) require reading one sibling test for exact utilities — flagged inline with instructions rather than left blank. All production code is complete.

**Type consistency:** `attachToCue`/`attachCueAttachment` take `CueAttachmentUpload {name,type,size,blob}`; the hook passes a `File` (structurally compatible). `ScriptAttachment` shape is identical across `types.ts`, `AttachmentRow`, and the hook's inferred type. Method names (`listCueAttachments`, `attachCueAttachment`, `removeCueAttachment`, `getAttachmentBlob`) match between `scriptRepository.ts`, `createLocalPgliteRepository.ts`, and `useCueAttachmentsState.ts`.

## Notes / Open follow-ups (out of MVP scope)
- Reordering attachments (`sort_order` is stored, currently `Date.now()`; no UI).
- Proactive `isAvailable=false` detection (would require a batch `has(keys)` on FileStorage).
- Bundling files into `.stagistic` (future container format).
