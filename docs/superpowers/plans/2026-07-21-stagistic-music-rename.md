# Stagistic Music Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the script-bound musical `cue` domain to `music` across syntax, document nodes, TypeScript APIs, editor UI, persistence, attachments, tests, and documentation without changing behavior.

**Architecture:** `@stagistic/script` remains the source of truth for document nodes, derivation, numbering, parsing, and serialization. Downstream packages adopt the new contract in dependency order; a forward Drizzle migration renames relational storage and rewrites persisted inline JSON/outbox data. This is a clean break with no aliases or `@@cue` parser compatibility.

**Tech Stack:** TypeScript, React 19, Tiptap/ProseMirror, Drizzle ORM, PGlite/PostgreSQL, TanStack React DB, Vite Plus tests, pnpm workspaces.

**Source spec:** [Stagistic Music Rename — Design](../specs/2026-07-21-stagistic-music-rename-design.md)

## Global Constraints

- Use `music`, `Music`, `musicId`, `musicStart`, and `musicOut` for this domain.
- Text syntax is exactly `@@music N "title"` and `@@out N`; `@@cue` is rejected.
- Preserve numbering, open/hit behavior, assignment, attachments, and UI workflows.
- Set `SCRIPT_DOCUMENT_SCHEMA_VERSION` to `2`.
- Do not add old-name compatibility aliases or a generic production-cue abstraction.
- Keep `cue` only for character cues, actual/future production cues, immutable SQL history, and explicit old-to-new migration tests/documentation.
- Follow the repository TypeScript/React style: fat-arrow functions, guard clauses, files under 300 lines, and existing package boundaries.
- Do not edit `vite.config.js`, weaken tests, mutate snapshots to hide failures, or change browser-test viewports.
- Never commit as the agent. At each checkpoint, stage nothing and give the user the proposed commit message.

## Execution Notes

- This is a coordinated breaking rename. The whole graph can be temporarily red between tasks, but the package changed in a task must pass its focused tests before continuing.
- Dependency order is mandatory: script → db → editor → app-core → ui/app-routes → export/docs → repository verification.
- Use `git mv` for tracked path renames; do not delete/recreate files.
- After any `packages/db/src/` schema or manual migration edit, run `pnpm --filter @stagistic/db db:compile-migrations`.
- Do not bump the document schema for the DB table rename alone; bump it because `musicStart`/`musicOut`/`musicId` in stored block JSON change.

---

### Task 1: Rename the `@stagistic/script` music contract and syntax

**Files:**

- Rename directory: `packages/script/src/cues/` → `packages/script/src/music/`
- Rename: `packages/script/src/music/collectMusicAtoms.ts` → `packages/script/src/music/collectMusicAtoms.ts`
- Rename: `packages/script/src/music/collectMusicAtoms.test.ts` → `packages/script/src/music/collectMusicAtoms.test.ts`
- Rename: `packages/script/src/music/deriveMusic.ts` → `packages/script/src/music/deriveMusic.ts`
- Rename: `packages/script/src/music/deriveMusic.test.ts` → `packages/script/src/music/deriveMusic.test.ts`
- Modify: `packages/script/src/music/constants.ts`
- Modify: `packages/script/src/music/types.ts`
- Modify: `packages/script/src/music/format.ts`
- Modify: `packages/script/src/music/format.test.ts`
- Modify: `packages/script/src/music/index.ts`
- Modify: `packages/script/src/document/scriptDocument.ts`
- Modify: `packages/script/src/characters/characterRefsInScriptDocument.ts`
- Modify: `packages/script/src/indexing/scriptBlockIndex.ts`
- Modify: `packages/script/src/indexing/scriptBlockIndex.test.ts`
- Modify: `packages/script/src/parsing/inline.ts`
- Modify: `packages/script/src/parsing/parseStagistic.ts`
- Modify: `packages/script/src/parsing/parseStagistic.test.ts`
- Modify: `packages/script/src/serialization/serializeStagistic.ts`
- Modify: `packages/script/src/serialization/serializeStagistic.test.ts`
- Modify: `packages/script/src/index.ts`

**Interfaces:**

- Produces constants `MUSIC_START_NODE_NAME`, `MUSIC_OUT_NODE_NAME`, `MUSIC_ID_ATTR`, `MUSIC_MODE_ATTR`, `MUSIC_TITLE_ATTR`, `MUSIC_KIND_ATTR`, `MUSIC_DRAFT_ATTR`, and `MUSIC_MODES`.
- Produces types `MusicMode`, `MusicAtom`, `MusicBlockInput`, and `DerivedMusic`.
- Produces functions `collectMusicAtoms`, `deriveMusic`, `musicLetter`, `formatMusicNumber`, and `formatMusicOutLabel`.
- Produces `ScriptBlockIndexSnapshot['music']` and node attrs containing `musicId`.
- Consumed by Tasks 2, 3, and 6.

- [ ] **Step 1: Change script tests to describe the new public contract**

Move the tests with `git mv`, change fixtures from `musicStart`/`musicOut`/`musicId` to `musicStart`/`musicOut`/`musicId`, and change expected snapshots from `cues` to `music`. Add this explicit clean-break case to `parseStagistic.test.ts`:

```ts
it('rejects the removed @@cue syntax', () => {
    expect(() => parseStagistic('!Music begins @@cue 1 "Overture"'))
        .toThrow();
});
```

Change the syntax round-trip fixture to:

```ts
const source = `!Music begins @@music 1 "Overture"
!The music stops @@out 1`;

expect(serializeStagistic(parseStagistic(source))).toContain('@@music 1 "Overture"');
expect(serializeStagistic(parseStagistic(source))).toContain('@@out 1');
```

- [ ] **Step 2: Run the renamed tests and verify they fail before implementation**

Run: `pnpm --filter @stagistic/script test`

Expected: FAIL because `musicStart`, `musicId`, `deriveMusic`, and `@@music` are not implemented yet.

- [ ] **Step 3: Rename the domain directory and define the new constants/types**

Use `git mv packages/script/src/cues packages/script/src/music`, then rename the collect/derive files. Replace `constants.ts` with the new vocabulary:

```ts
export const MUSIC_START_NODE_NAME = 'musicStart';
export const MUSIC_OUT_NODE_NAME = 'musicOut';

export const MUSIC_ID_ATTR = 'musicId';
export const MUSIC_MODE_ATTR = 'mode';
export const MUSIC_TITLE_ATTR = 'title';
export const MUSIC_KIND_ATTR = 'kind';
export const MUSIC_DRAFT_ATTR = 'draft';

export const MUSIC_MODES = ['open', 'hit'] as const;
```

Make `types.ts` expose only the new names:

```ts
import type {MUSIC_MODES} from './constants';

export type MusicMode = (typeof MUSIC_MODES)[number];

export type MusicAtom =
    | {
        role: 'start', musicId: string, mode: MusicMode, title: string, kind: string | null,
    }
    | {role: 'out'};

export interface MusicBlockInput {
    blockId: string,
    blockType: string,
    musicAtoms: MusicAtom[],
}

export interface DerivedMusic {
    musicId: string,
    sceneNumber: number,
    indexInScene: number,
    sceneMusicCount: number,
    mode: MusicMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
```

Use `sceneMusicCount`, not `sceneCueCount`, so numbering data also has no hidden old terminology.

- [ ] **Step 4: Rename collection, derivation, and formatting APIs**

Implement `collectMusicAtoms(blockNode): MusicAtom[]` against `MUSIC_*` constants. Rename every local `cue` variable that represents music to `musicEntry` or `music`; keep character-cue variables unchanged.

`deriveMusic` keeps the single-pass algorithm while returning the new shape:

```ts
export const deriveMusic = (blocks: MusicBlockInput[]): DerivedMusic[] => {
    const music: DerivedMusic[] = [];
    const musicByScene = new Map<number, DerivedMusic[]>();
    let openMusic: DerivedMusic | null = null;
    let sceneNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            sceneNumber += 1;
            openMusic = null;
        }

        block.musicAtoms.forEach(atom => {
            if (atom.role === 'start') {
                const sceneMusic = musicByScene.get(sceneNumber) ?? [];
                const musicEntry: DerivedMusic = {
                    musicId: atom.musicId,
                    sceneNumber,
                    indexInScene: sceneMusic.length,
                    sceneMusicCount: 0,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                };

                sceneMusic.push(musicEntry);
                musicByScene.set(sceneNumber, sceneMusic);
                music.push(musicEntry);

                if (atom.mode === 'open') {
                    openMusic = musicEntry;
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
        sceneMusic.forEach(musicEntry => {
            musicEntry.sceneMusicCount = sceneMusic.length;
        });
    });

    return music;
};
```

Rename formatter inputs and exports:

```ts
type MusicNumberInput = Pick<DerivedMusic, 'sceneNumber' | 'indexInScene' | 'sceneMusicCount'>;
type MusicOutLabelInput = MusicNumberInput & Pick<DerivedMusic, 'title'>;

export const musicLetter = (index: number): string => {
    let result = '';
    let n = index;

    do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return result;
};

export const formatMusicNumber = (musicEntry: MusicNumberInput): string => {
    if (musicEntry.sceneMusicCount <= 1) {
        return `${musicEntry.sceneNumber})`;
    }

    return `${musicEntry.sceneNumber}.${musicLetter(musicEntry.indexInScene)})`;
};

export const formatMusicOutLabel = (musicEntry: MusicOutLabelInput): string => {
    const number = formatMusicNumber(musicEntry);
    const title = musicEntry.title.trim();

    return title.length > 0 ? `${number} out (${title})` : `${number} out`;
};
```

Update `music/index.ts` and `script/src/index.ts` so no old music-domain export remains.

- [ ] **Step 5: Rename document indexing and bump the stored schema**

Set:

```ts
export const SCRIPT_DOCUMENT_SCHEMA_VERSION = 2;
```

In `scriptBlockIndex.ts`, change block inputs from `cueAtoms` to `musicAtoms`, snapshot `cues` to `music`, and call `collectMusicAtoms`/`deriveMusic`. Update character-ref scanning to ignore `MUSIC_START_NODE_NAME` where it previously ignored the musical cue atom.

- [ ] **Step 6: Replace only the musical syntax/parser state**

In `parsing/inline.ts`, rename `readCueMarker` to `readMusicMarker`, its parsed `cue` property to `music`, and use:

```ts
const musicMatch = (/^@@music\s+(\d+)\s+/u).exec(source.slice(start));
```

In `parseStagistic.ts`, rename `seenCueNumbers`/`openCueNumber` and musical marker locals to `seenMusicNumbers`/`openMusicNumber`. Keep `parseCharacterCue`, character-cue errors, and character-cue locals named `cue` because those refer to the separate character-cue concept.

In `serializeStagistic.ts`, emit `@@music`, rename musical state to `openMusicNumber`, and keep `serializeCharacterCue` unchanged.

- [ ] **Step 7: Verify the script package**

Run:

```bash
pnpm --filter @stagistic/script test
pnpm --filter @stagistic/script typecheck
```

Expected: PASS. Downstream packages may still fail until their tasks are complete.

- [ ] **Step 8: Prepare the review checkpoint**

Do not commit. Report changed script files and propose: `refactor(script): rename musical cues to music`.

---

### Task 2: Rename database APIs and migrate persisted data

**Files:**

- Create: `packages/db/drizzle/0019_rename_cues_to_music.sql`
- Regenerate: `packages/db/src/migrations.compiled.ts`
- Modify: `packages/db/src/schema.ts`
- Rename: `packages/db/src/types/musicAttachments.ts` → `packages/db/src/types/musicAttachments.ts`
- Modify: `packages/db/src/types/index.ts`
- Modify: `packages/db/src/types/script.ts`
- Modify: `packages/db/src/scriptRepository.ts`
- Rename: `packages/db/src/queries/scripts/cues.ts` → `packages/db/src/queries/scripts/music.ts`
- Rename: `packages/db/src/queries/scripts/cues.test.ts` → `packages/db/src/queries/scripts/music.test.ts`
- Modify: `packages/db/src/queries/scripts/attachments.ts`
- Modify: `packages/db/src/queries/scripts/duplicate.ts`
- Modify: `packages/db/src/queries/scripts/index.ts`
- Rename: `packages/db/src/repo/cues.ts` → `packages/db/src/repo/music.ts`
- Modify: `packages/db/src/repo/attachments.ts`
- Modify: `packages/db/src/repo/createLocalPgliteRepository.ts`
- Modify: `packages/db/src/repo/createLocalPgliteReactiveSources.ts`
- Modify: `packages/db/src/repo/documentProjection.ts`
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.ts`
- Rename: `packages/db/src/repo/persist/persistDocumentDelta.cues.test.ts` → `packages/db/src/repo/persist/persistDocumentDelta.music.test.ts`
- Modify: `packages/db/src/blocks/extract.ts`
- Modify: `packages/db/src/blocks/extractHelpers.ts`
- Modify: `packages/db/src/blocks/types.ts`
- Rename: `packages/db/src/blocks/extract.cues.test.ts` → `packages/db/src/blocks/extract.music.test.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/src/pglite/migrations.test.ts`
- Modify: `packages/db/src/queries/scripts/attachments.ts`
- Modify: `packages/db/src/reactive/pgliteReactiveQuerySource.test.ts`
- Modify: `packages/db/src/repo/atomicOutbox.test.ts`
- Modify: `packages/db/src/repo/attachments.test.ts`
- Modify: `packages/db/src/repo/sync/mutationEnvelope.test.ts`

**Interfaces:**

- Produces ORM tables `scriptMusic` and `scriptMusicAttachments`.
- Produces types `ScriptMusic`, `ScriptMusicAttachment`, `ScriptMusicAttachmentBinding`, `MusicAttachmentRole`, and `MUSIC_ATTACHMENT_ROLES`.
- Produces repository APIs `ScriptMusicRepository`, `allocateScriptMusicId`, `getScriptMusicSource`, `listScriptMusic`, `createScriptMusic`, `updateScriptMusic`, and `deleteScriptMusic`.
- Produces attachment APIs `getMusicAttachment`, `setMusicAttachment`, and `removeMusicAttachment`.
- Consumed by Tasks 4 and 5.

- [ ] **Step 1: Add a failing forward-migration test**

In `pglite/migrations.test.ts`, locate `0019_rename_cues_to_music`, apply all earlier migrations manually, and seed:

```sql
INSERT INTO scripts (id, title, created_at, updated_at)
VALUES ('script-1', 'Test', 1, 1);

INSERT INTO script_blocks (
    id, script_id, block_type, block_order, text_content, content_json, created_at, updated_at
) VALUES (
    'block-1', 'script-1', 'stage_direction', 'a0', '',
    '[{"type":"musicStart","attrs":{"musicId":"music-1","mode":"open","title":"Overture","kind":"song"}}]',
    1, 1
);

INSERT INTO script_music (
    id, script_id, scene_number, index_in_scene, mode, title, kind, start_block_id, created_at, updated_at
) VALUES ('music-1', 'script-1', 1, 0, 'open', 'Overture', 'song', 'block-1', 1, 1);
```

Also seed one attachment binding and one `sync_outbox` row whose `op_type`, envelope `operationType`, `entityKey`, and payload use `cue`/`musicId`. After `runPgliteMigrations`, assert:

```ts
expect(musicRows.rows[0]?.id).toBe('music-1');
expect(bindingRows.rows[0]?.musicId).toBe('music-1');
expect(blockRows.rows[0]?.contentJson).toContain('"type":"musicStart"');
expect(blockRows.rows[0]?.contentJson).toContain('"musicId":"music-1"');
expect(outboxRows.rows[0]?.opType).toBe('music.update');
expect(outboxRows.rows[0]?.payloadJson).toContain('"musicId":"music-1"');
```

Query `pg_indexes` and `pg_constraint` to assert all live identifiers use `script_music`; assert `to_regclass('script_music')` and `to_regclass('script_music_attachments')` return null.

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `pnpm --filter @stagistic/db test -- src/pglite/migrations.test.ts`

Expected: FAIL because migration `0019_rename_cues_to_music` does not exist.

- [ ] **Step 3: Add the forward SQL migration**

Create `0019_rename_cues_to_music.sql` with explicit table, column, constraint, and index renames:

```sql
ALTER TABLE "script_music" RENAME TO "script_music";
--> statement-breakpoint
ALTER TABLE "script_music" RENAME CONSTRAINT "script_music_pkey" TO "script_music_pkey";
--> statement-breakpoint
ALTER TABLE "script_music" RENAME CONSTRAINT "script_music_script_id_scripts_id_fk" TO "script_music_script_id_scripts_id_fk";
--> statement-breakpoint
ALTER INDEX "script_music_script_id_idx" RENAME TO "script_music_script_id_idx";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME TO "script_music_attachments";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME COLUMN "music_id" TO "music_id";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME CONSTRAINT "script_music_attachments_cue_attachment_pk" TO "script_music_attachments_music_attachment_pk";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME CONSTRAINT "script_music_attachments_music_id_script_music_id_fk" TO "script_music_attachments_music_id_script_music_id_fk";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME CONSTRAINT "script_music_attachments_attachment_id_script_attachments_id_fk" TO "script_music_attachments_attachment_id_script_attachments_id_fk";
--> statement-breakpoint
ALTER INDEX "script_music_attachments_cue_role_unique_idx" RENAME TO "script_music_attachments_music_role_unique_idx";
--> statement-breakpoint
ALTER INDEX "script_music_attachments_music_id_idx" RENAME TO "script_music_attachments_music_id_idx";
--> statement-breakpoint
ALTER INDEX "script_music_attachments_attachment_id_idx" RENAME TO "script_music_attachments_attachment_id_idx";
```

Then rewrite compact `JSON.stringify` output without changing opaque id values:

```sql
UPDATE "script_blocks"
SET "content_json" = replace(
    replace(
        replace("content_json", '"type":"musicStart"', '"type":"musicStart"'),
        '"type":"musicOut"', '"type":"musicOut"'
    ),
    '"musicId":', '"musicId":'
)
WHERE "content_json" LIKE '%"musicStart"%'
   OR "content_json" LIKE '%"musicOut"%'
   OR "content_json" LIKE '%"musicId"%';
--> statement-breakpoint
UPDATE "sync_outbox"
SET
    "op_type" = replace("op_type", 'cue.', 'music.'),
    "payload_json" = replace(
        replace(
            replace("payload_json", '"operationType":"cue.', '"operationType":"music.'),
            '"entityKey":"cue:', '"entityKey":"music:'
        ),
        '"musicId":', '"musicId":'
    )
WHERE "op_type" LIKE 'cue.%'
   OR "payload_json" LIKE '%"operationType":"cue.%'
   OR "payload_json" LIKE '%"entityKey":"cue:%'
   OR "payload_json" LIKE '%"musicId"%';
```

Before finalizing the constraint names, run the pre-0019 fixture and query `pg_constraint`; use the actual names if PGlite reports a difference.

- [ ] **Step 4: Rename the ORM schema and DB types**

In `schema.ts`, define:

```ts
export const scriptMusic = pgTable('script_music', {
    id: text('id').primaryKey(),
    scriptId: text('script_id')
        .notNull()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    sceneNumber: integer('scene_number').notNull().default(0),
    indexInScene: integer('index_in_scene').notNull().default(0),
    mode: text('mode').notNull().default('open'),
    title: text('title').notNull().default(''),
    kind: text('kind'),
    startBlockId: text('start_block_id'),
    endBlockId: text('end_block_id'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
}, table => ({
    scriptIdIdx: index('script_music_script_id_idx').on(table.scriptId),
}));

export const scriptMusicAttachments = pgTable('script_music_attachments', {
    musicId: text('music_id')
        .notNull()
        .references(() => scriptMusic.id, {onDelete: 'cascade'}),
    attachmentId: text('attachment_id')
        .notNull()
        .references(() => scriptAttachments.id, {onDelete: 'cascade'}),
    role: text('role').notNull().default('integrated_score'),
    sortOrder: bigint('sort_order', {mode: 'number'}).notNull().default(0),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
}, table => ({
    pk: primaryKey({
        columns: [table.musicId, table.attachmentId],
        name: 'script_music_attachments_music_attachment_pk',
    }),
    musicRoleUniqueIdx: uniqueIndex('script_music_attachments_music_role_unique_idx')
        .on(table.musicId, table.role),
    musicIdIdx: index('script_music_attachments_music_id_idx').on(table.musicId),
    attachmentIdIdx: index('script_music_attachments_attachment_id_idx').on(table.attachmentId),
}));
```

Update `dbSchema` and inferred types. Rename `MUSIC_ATTACHMENT_ROLES` to `MUSIC_ATTACHMENT_ROLES`; the persisted value remains `integrated_score`.

- [ ] **Step 5: Rename query and repository surfaces**

Use `git mv` for `queries/scripts/cues.ts`, its test, and `repo/cues.ts`. Apply this complete API map:

```text
ScriptMusicUpsertRow                 → ScriptMusicUpsertRow
InsertScriptMusicRow                → InsertScriptMusicRow
listScriptMusic                    → listScriptMusic
bulkUpsertScriptMusic              → bulkUpsertScriptMusic
insertScriptMusic                   → insertScriptMusic
getScriptMusicById                  → getScriptMusicById
updateScriptMusic                   → updateScriptMusic
bulkUnassignScriptMusic            → bulkUnassignScriptMusic
unassignScriptMusic                 → unassignScriptMusic
deleteScriptMusic                   → deleteScriptMusic
bulkDeleteScriptMusic              → bulkDeleteScriptMusic
createCueHandlers                 → createMusicHandlers
ScriptMusicRepository              → ScriptMusicRepository
CreateScriptMusicInput              → CreateScriptMusicInput
CreateScriptMusicWithIdInput        → CreateScriptMusicWithIdInput
UpdateScriptMusicInput              → UpdateScriptMusicInput
MusicAttachmentUpload               → MusicAttachmentUpload
```

Repository payloads use `musicId`; outbox records use `music.create`, `music.update`, `music.delete`, `music:*`, and JSON payload key `musicId`.

- [ ] **Step 6: Rename attachment and projection plumbing**

Rename all cue-specific attachment methods and types:

```text
getByCueRole / getMusicAttachment       → getByMusicRole / getMusicAttachment
setForCue / setMusicAttachment          → setForMusic / setMusicAttachment
removeFromCue / removeMusicAttachment   → removeFromMusic / removeMusicAttachment
ScriptMusicAttachment                   → ScriptMusicAttachment
ScriptMusicAttachmentBinding            → ScriptMusicAttachmentBinding
MusicAttachmentRole                     → MusicAttachmentRole
```

Attachment outbox entity keys become `music:${musicId}:attachment:${role}` and payloads use `musicId`.

In extraction/projection/persistence, rename `extracted.cues` to `extracted.music`, call `deriveMusic`, and upsert/unassign `scriptMusic` rows. Rename signature variables from `cueSignature` to `musicSignature` without changing delta semantics.

- [ ] **Step 7: Update all DB tests to the new contract**

Rename test descriptions, fixtures, helpers, and imports. Opaque fixture ids may use `music-1`; do not mass-replace character-cue terminology. Mutation-envelope expectations become:

```ts
operationType: 'music.update',
entityKey: 'music:music-1',
```

Update old migration-repair tests carefully: SQL executed before 0019 must still refer to historical `script_music`/`music_id`; assertions after the full chain must use `script_music`/`music_id`. Those pre-migration references are intentional migration-history exceptions.

For the 0015 and 0016 repair fixtures, apply only migrations before the migration under test, seed the old schema, then let `runPgliteMigrations` apply that migration and every later migration:

```ts
const targetIndex = compiledMigrations.findIndex(
    migration => migration.id === '0016_add_cue_attachment_roles',
);

for (const migration of compiledMigrations.slice(0, targetIndex)) {
    await client.exec(migration.sql);
    await client.query(
        `INSERT INTO __stagistic_migrations (id, applied_at, checksum)
         VALUES ($1, $2, $3)`,
        [migration.id, Date.now(), migration.checksum],
    );
}

// Seed the historical table names here, then run the remaining chain.
await runPgliteMigrations(client);
```

Use the analogous target id `0015_widen_attachment_sort_order` for the 0015 fixture.

- [ ] **Step 8: Compile migrations and verify the DB package**

Run:

```bash
pnpm --filter @stagistic/db db:compile-migrations
pnpm --filter @stagistic/db test
pnpm --filter @stagistic/db typecheck
```

Expected: all PASS and `migrations.compiled.ts` contains 20 migrations ending with `0019_rename_cues_to_music`.

- [ ] **Step 9: Prepare the review checkpoint**

Do not commit. Report migration/data assertions and propose: `refactor(db): rename script cue persistence to music`.

---

### Task 3: Rename the editor document nodes, commands, and live model

**Files:**

- Rename: `packages/editor/src/editor/components/CueDraftSuggestionsOverlay.tsx` → `MusicDraftSuggestionsOverlay.tsx`
- Rename: `packages/editor/src/editor/components/CueIcons.tsx` → `MusicIcons.tsx`
- Rename: `packages/editor/src/editor/components/CueSuggestionsOverlay.tsx` → `MusicSuggestionsOverlay.tsx`
- Rename: `packages/editor/src/editor/components/blockActions/stageDirectionCueActions.ts` → `stageDirectionMusicActions.ts`
- Rename: `packages/editor/src/editor/components/blockActions/stageDirectionCueActions.test.ts` → `stageDirectionMusicActions.test.ts`
- Rename directory: `packages/editor/src/editor/tiptap/extensions/cue/` → `packages/editor/src/editor/tiptap/extensions/music/`
- Rename: `packages/editor/src/editor/tiptap/extensions/music/CueCommandsExtension.ts` → `MusicCommandsExtension.ts`
- Rename: `packages/editor/src/editor/tiptap/extensions/music/cueCommands.ts` → `musicCommands.ts`
- Rename: `packages/editor/src/editor/tiptap/extensions/music/cueCaret.ts` → `musicCaret.ts`
- Rename directory: `packages/editor/src/editor/tiptap/extensions/cueInput/` → `packages/editor/src/editor/tiptap/extensions/musicInput/`
- Rename: `packages/editor/src/editor/tiptap/extensions/musicInput/cueCompose.browser.test.tsx` → `musicCompose.browser.test.tsx`
- Rename: `packages/editor/src/editor/tiptap/extensions/musicInput/cueCompose.module.css` → `musicCompose.module.css`
- Rename directory: `packages/editor/src/editor/tiptap/extensions/cueNumbering/` → `packages/editor/src/editor/tiptap/extensions/musicNumbering/`
- Rename: `packages/editor/src/editor/tiptap/extensions/musicNumbering/cueLabels.ts` → `musicLabels.ts`
- Rename: `packages/editor/src/editor/tiptap/extensions/musicNumbering/cueLabels.test.ts` → `musicLabels.test.ts`
- Rename: `packages/editor/src/editor/tiptap/extensions/CueInputExtension.ts` → `MusicInputExtension.ts`
- Rename: `packages/editor/src/editor/tiptap/extensions/CueNumberingExtension.ts` → `MusicNumberingExtension.ts`
- Rename: `packages/editor/src/editor/tiptap/nodes/MusicStartNode.ts` → `MusicStartNode.ts`
- Rename: `packages/editor/src/editor/tiptap/nodes/MusicOutNode.ts` → `MusicOutNode.ts`
- Rename: `packages/editor/src/editor/tiptap/nodes/CuePill.tsx` → `MusicPill.tsx`
- Rename: `packages/editor/src/editor/tiptap/nodes/MusicOutPill.tsx` → `MusicOutPill.tsx`
- Rename: `packages/editor/src/editor/tiptap/nodes/CuePillControls.tsx` → `MusicPillControls.tsx`
- Rename: `packages/editor/src/editor/tiptap/nodes/CuePill.module.css` → `MusicPill.module.css`
- Rename: `packages/editor/src/editor/tiptap/nodes/cuePillHelpers.ts` → `musicPillHelpers.ts`
- Rename: `packages/editor/src/editor/tiptap/nodes/cueCaret.browser.test.tsx` → `musicCaret.browser.test.tsx`
- Rename: `packages/editor/src/editor/tiptap/nodes/cueNode.browser.test.tsx` → `musicNode.browser.test.tsx`
- Rename: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.cues.test.ts` → `buildIndexSnapshotFromPmDoc.music.test.ts`
- Modify: `packages/editor/src/editor/Editor.tsx`
- Modify: `packages/editor/src/editor/components/EditorCanvas.tsx`
- Modify: `packages/editor/src/editor/components/EditorBlockActionsOverlay.tsx`
- Modify: `packages/editor/src/editor/components/blockActions/actionTypes.ts`
- Modify: `packages/editor/src/editor/components/blockActions/blockActionRegistry.ts`
- Modify: `packages/editor/src/editor/components/blockActions/BlockActionMenu.tsx`
- Modify: `packages/editor/src/editor/components/blockActions/BlockActionMenu.browser.test.tsx`
- Modify: `packages/editor/src/editor/components/blockActions/ContextMenu.test.tsx`
- Modify: `packages/editor/src/editor/components/blockActions/useOverlayPosition.ts`
- Modify: `packages/editor/src/editor/components/editorShell/EditorShell.tsx`
- Modify: `packages/editor/src/editor/contracts.ts`
- Modify: `packages/editor/src/editor/elementSelection/context.tsx`
- Modify: `packages/editor/src/editor/elementSelection/context.browser.test.tsx`
- Modify: `packages/editor/src/editor/hooks/editorLifecycleSync.ts`
- Modify: `packages/editor/src/editor/hooks/useEditorCharacterColors.ts`
- Modify: `packages/editor/src/editor/hooks/useEditorStructureRequests.ts`
- Modify: `packages/editor/src/editor/live/hooks.ts`
- Modify: `packages/editor/src/editor/live/store.ts`
- Modify: `packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts`
- Modify: `packages/editor/src/editor/runtime/editorRuntimeTypes.ts`
- Modify: `packages/editor/src/editor/runtime/transactionGuards.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/EditorRuntimeExtension.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/index.ts`
- Modify: `packages/editor/src/editor/tiptap/nodes/index.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/commands.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/commands.test.ts`
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/normalizeStageDirectionContent.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts`
- Modify: `packages/editor/src/index.ts`

**Interfaces:**

- Produces `PersistentMusicKind`, `PersistentMusicRef`, `EditorMusicCreateRequest`, `EditorMusicRemoveRequest`, `UpdateMusicRequest`, and `EditorLiveMusicSnapshot`.
- Produces callbacks `onRequestCreateMusic`, `onRequestRemoveMusic`, `onOpenMusicManager`, `onMusicAssigned`, and `onMusicUnassigned`.
- Produces element selection `{type: 'music', musicId}`.
- Produces Tiptap commands and extensions named `Music*` with no `Cue*` aliases.
- Consumed by Task 5.

- [ ] **Step 1: Rename editor tests and expected DOM/API vocabulary first**

Use `git mv` for the files/directories above. Change fixtures to `musicStart`, `musicOut`, and `musicId`. Change expected DOM selectors:

```text
data-cue-pill          → data-music-pill
data-cue-id            → data-music-id
data-cue-mode          → data-music-mode
data-cue-title         → data-music-title
data-cue-kind          → data-music-kind
data-cue-draft         → data-music-draft
data-cue-compose       → data-music-compose
data-cue-number        → data-music-number
data-cue-title-input   → data-music-title-input
```

Update ARIA assertions from “Cue suggestions”, “Remove cue”, and “Edit cue” to “Music suggestions”, “Remove music”, and “Edit music”.

- [ ] **Step 2: Run focused editor tests and verify they fail**

Run:

```bash
pnpm --filter @stagistic/editor test
pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/extensions/musicInput/musicCompose.browser.test.tsx
```

Expected: FAIL until the node/extension/contract implementation is renamed.

- [ ] **Step 3: Rename the public editor contract**

Apply this map in `contracts.ts` and every consumer:

```text
PersistentCueKind       → PersistentMusicKind
PersistentCueRef        → PersistentMusicRef
EditorCueCreateRequest  → EditorMusicCreateRequest
EditorCueRemoveRequest  → EditorMusicRemoveRequest
UpdateCueRequest        → UpdateMusicRequest
EditorLiveCueSnapshot   → EditorLiveMusicSnapshot
cues snapshot property  → music
updateCueRequest        → updateMusicRequest
```

The new request shape is:

```ts
export interface EditorMusicRemoveRequest {
    musicId: string,
    title: string,
    complete: () => boolean,
}
```

Rename all lifecycle callback props to the `Music` names listed in Interfaces.

- [ ] **Step 4: Rename nodes, commands, input, and numbering extensions**

Use the new `MUSIC_*` imports and exported names throughout. Tiptap nodes must be registered as exactly `musicStart` and `musicOut`; HTML must render `data-music-pill="start|out"` and `data-music-id`.

Apply the full extension map:

```text
CueCommandsExtension / cueCommands  → MusicCommandsExtension / musicCommands
CueInputExtension / cueInput        → MusicInputExtension / musicInput
CueNumberingExtension               → MusicNumberingExtension
cueComposeKey                       → musicComposeKey
cueComposeCloseMeta                 → musicComposeCloseMeta
cueComposeOpenMeta                  → musicComposeOpenMeta
cueLabels                           → musicLabels
cueCaret                            → musicCaret
```

Commands become `insertMusicStart`, `insertMusicOut`, `removeMusic`, `unassignMusic`, and `updateMusicMetadata`; command parameters use `musicId`.

- [ ] **Step 5: Rename block actions, selection, and live runtime state**

Block-action icon/type values become `music`, `musicStart`, `musicHit`, and `musicOut`. Action labels become `Music`, `Add music`, `Add music out`, and their existing hit/open variants under Music terminology.

Element selection becomes:

```ts
type EditorElementSelection =
    | {type: 'music', musicId: string}
    | {
        type: 'character', characterId: string | null, characterKey: string,
    }
    | null;
```

Runtime snapshots expose `music`; labels use `formatMusicNumber` and `formatMusicOutLabel`. Rename local signatures, maps, ids, and positions without changing memoization/recompute behavior.

- [ ] **Step 6: Preserve true character-cue terminology**

Do not rename `characterTokenScan.ts` source `'cue'`, character `(cue)` block comments, `serializeCharacterCue`, or character-suggestion tests that say “character cue”. These are semantic audit passes, not missed replacements.

- [ ] **Step 7: Verify editor package tests and typecheck**

Run:

```bash
pnpm --filter @stagistic/editor test
pnpm --filter @stagistic/editor test:browser
pnpm --filter @stagistic/editor typecheck
```

Expected: Node tests and typecheck PASS. Report known pre-existing browser failures verbatim if they recur; do not alter assertions or viewport.

- [ ] **Step 8: Prepare the review checkpoint**

Do not commit. Report focused browser results and propose: `refactor(editor): rename musical cues to music`.

---

### Task 4: Rename app-core music collections and attachment state

**Files:**

- Rename directory: `packages/app-core/src/cues/` → `packages/app-core/src/music/`
- Rename: `packages/app-core/src/music/scriptMusicStore.ts` → `scriptMusicStore.ts`
- Rename: `packages/app-core/src/music/scriptMusicStore.test.ts` → `scriptMusicStore.test.ts`
- Rename: `packages/app-core/src/music/useScriptMusic.ts` → `useScriptMusic.ts`
- Rename: `packages/app-core/src/music/useScriptMusic.browser.test.tsx` → `useScriptMusic.browser.test.tsx`
- Modify: `packages/app-core/src/music/index.ts`
- Modify: `packages/app-core/src/attachments/scriptAttachmentsStore.ts`
- Modify: `packages/app-core/src/attachments/scriptAttachmentsStore.test.ts`
- Modify: `packages/app-core/src/attachments/useScriptAttachments.ts`
- Modify: `packages/app-core/src/index.ts`

**Interfaces:**

- Produces `createScriptMusicStore`, `ScriptMusicStore`, `getScriptMusicStore`, and `useScriptMusic`.
- `useScriptMusic` returns `{music, createMusic, updateMusic, deleteMusic, isLoading, error}`.
- Attachment state is keyed by `musicId` and returns `ScriptMusicAttachment` values.
- Consumed by Task 5.

- [ ] **Step 1: Rename app-core tests and expectations**

Update repository fakes to implement the Task 2 methods and change collection ids from `script-cues:${scriptId}` to `script-music:${scriptId}`. Tests must assert the new hook result:

```ts
expect(result.current.music).toEqual([
    expect.objectContaining({id: 'music-1', title: 'Overture'}),
]);
```

- [ ] **Step 2: Run tests and verify the old implementation fails the new contract**

Run: `pnpm --filter @stagistic/app-core test`

Expected: FAIL because stores/hooks still export cue names.

- [ ] **Step 3: Rename stores, hooks, mutations, and attachment keys**

Use `git mv` and apply:

```text
createScriptMusicStore / getScriptMusicStore → createScriptMusicStore / getScriptMusicStore
useScriptMusic                             → useScriptMusic
cues.collection / catalog.cues            → music.collection / catalog.music
createCue / updateCue / deleteCue          → createMusic / updateMusic / deleteMusic
uploadingMusicIds                            → uploadingMusicIds
integratedScoresByCue                      → integratedScoresByMusic
enqueueCue                                 → enqueueMusic
```

Use `ScriptMusic`, `CreateScriptMusicInput`, `UpdateScriptMusicInput`, and Task 2 attachment types. Error messages say “music entry could not be created/updated”.

- [ ] **Step 4: Verify app-core**

Run:

```bash
pnpm --filter @stagistic/app-core test
pnpm --filter @stagistic/app-core test:browser
pnpm --filter @stagistic/app-core typecheck
```

Expected: PASS.

- [ ] **Step 5: Prepare the review checkpoint**

Do not commit. Propose: `refactor(app-core): rename cue state to music`.

---

### Task 5: Rename shared UI and app-route surfaces

**Files:**

- Rename: `packages/ui/src/dialogs/AttributeManagerCueDetail.tsx` → `AttributeManagerMusicDetail.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.tsx`
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.browser.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Rename directory: `packages/app-routes/src/routes/script/editor/cues/` → `packages/app-routes/src/routes/script/editor/music/`
- Rename: `packages/app-routes/src/routes/script/editor/music/AddCueModal.tsx` → `packages/app-routes/src/routes/script/editor/music/AddMusicModal.tsx`
- Rename: `packages/app-routes/src/routes/script/editor/music/CuesSidebarContextActions.tsx` → `packages/app-routes/src/routes/script/editor/music/MusicSidebarContextActions.tsx`
- Rename: `packages/app-routes/src/routes/script/editor/music/DeleteCueModal.tsx` → `packages/app-routes/src/routes/script/editor/music/DeleteMusicModal.tsx`
- Rename: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.tsx` → `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.tsx`
- Rename: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx` → `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx`
- Rename: `packages/app-routes/src/routes/script/editor/music/UnassignCueModal.tsx` → `packages/app-routes/src/routes/script/editor/music/UnassignMusicModal.tsx`
- Rename: `packages/app-routes/src/routes/script/editor/music/useScriptMusicState.ts` → `packages/app-routes/src/routes/script/editor/music/useScriptMusicState.ts`
- Rename: `packages/app-routes/src/routes/script/editor/music/useScriptMusicState.browser.test.tsx` → `packages/app-routes/src/routes/script/editor/music/useScriptMusicState.browser.test.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/music/index.ts`
- Modify: `packages/app-routes/src/routes/script/editor/music/types.ts`
- Rename: `packages/app-routes/src/routes/script/attributes/MusicAttachmentPreviewModal.tsx` → `MusicAttachmentPreviewModal.tsx`
- Rename: `packages/app-routes/src/routes/script/attributes/MusicAttachmentsDetail.tsx` → `MusicAttachmentsDetail.tsx`
- Rename: `packages/app-routes/src/routes/script/attributes/useMusicAttachmentsState.ts` → `useMusicAttachmentsState.ts`
- Rename: `packages/app-routes/src/routes/script/settings/AttributeManagerMusicAttachments.browser.test.tsx` → `AttributeManagerMusicAttachments.browser.test.tsx`
- Rename: `packages/app-routes/src/routes/script/settings/attributeManagerCueItems.tsx` → `attributeManagerMusicItems.tsx`
- Rename: `packages/app-routes/src/routes/script/settings/attributeManagerCueItems.test.tsx` → `attributeManagerMusicItems.test.tsx`
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx`
- Modify: `packages/app-routes/src/routes/script/attributes/attributeManagerMenu.ts`
- Modify: `packages/app-routes/src/routes/script/attributes/useAttributeManagerModalState.ts`
- Modify: `packages/app-routes/src/routes/script/controller/editorLoadState.ts`
- Modify: `packages/app-routes/src/routes/script/controller/editorLoadState.test.ts`
- Modify: `packages/app-routes/src/routes/script/controller/types.ts`
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/AttributeManagerSidebarButton.tsx`
- Modify: `packages/app-routes/src/routes/script/editor/structure/structureRows.test.ts`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/ScriptSettingsModalProvider.tsx`
- Modify: `packages/app-routes/src/routes/script/settings/useAttributeManagerItems.ts`
- Modify: `packages/app-routes/src/routes/script/useScriptEditorController.ts`

**Interfaces:**

- Produces route types `ScriptMusicKind`, `ScriptMusicListItem`, `CreateScriptMusicInput`, and `UpdateScriptMusicInput`.
- Produces `useScriptMusicState`, `ScriptMusicSidebar`, `AddMusicModal`, `DeleteMusicModal`, and `UnassignMusicModal`.
- Attribute manager uses id/key `music`, selection `selectedMusicId`, and detail component `AttributeManagerMusicDetail`.

- [ ] **Step 1: Rename UI tests and user-facing assertions first**

Update browser/unit expectations to exact copy:

```text
Cues                 → Music
Add cue              → Add music
Delete cue           → Delete music
Unassign cue         → Unassign music
Cue title            → Music title
Cue suggestions      → Music suggestions
No cues              → No music
```

Keep item kind labels “Song” and “Instrumental”. Use grammar such as “music entry” only where a countable noun is required in a sentence.

- [ ] **Step 2: Run UI and app-route tests to establish RED**

Run:

```bash
pnpm --filter @stagistic/ui test
pnpm --filter @stagistic/app-routes test
```

Expected: FAIL on removed cue exports/copy.

- [ ] **Step 3: Rename shared UI contracts**

Export `AttributeManagerMusicDetail`. Change `AttributeManagerListPanel` item kind/id from cue terminology to `music` and update ARIA text. Verify UI package typecheck before updating routes:

```bash
pnpm --filter @stagistic/ui test
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/ui typecheck
```

- [ ] **Step 4: Rename the route feature directory and state API**

Use `git mv` and apply:

```text
ScriptMusicSidebar / CuesSidebarContextActions → ScriptMusicSidebar / MusicSidebarContextActions
useScriptMusicState                            → useScriptMusicState
cueState / cueCatalog / cues                  → musicState / musicCatalog / music
AddCueModal / DeleteCueModal / UnassignCueModal
                                              → AddMusicModal / DeleteMusicModal / UnassignMusicModal
markCueAssigned / markCueUnassigned           → markMusicAssigned / markMusicUnassigned
unassignCue                                   → unassignMusic
```

Wire Task 3 editor callbacks and Task 4 hook names through `ScriptEditorRoute` and controller types.

- [ ] **Step 5: Rename attribute-manager and attachment flows**

Apply:

```text
MusicAttachmentsDetail             → MusicAttachmentsDetail
MusicAttachmentPreviewModal        → MusicAttachmentPreviewModal
useMusicAttachmentsState           → useMusicAttachmentsState
attributeManagerCueItems         → attributeManagerMusicItems
selectedMusicId / openCue          → selectedMusicId / openMusic
openAttributeManagerCue          → openAttributeManagerMusic
setCueTitleDraft/getCueTitleDraft
                                  → setMusicTitleDraft/getMusicTitleDraft
```

All ids/parameters/maps use `musicId`. The integrated-score PDF behavior and role remain unchanged.

- [ ] **Step 6: Verify UI and app-routes**

Run:

```bash
pnpm --filter @stagistic/ui test
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/ui typecheck
pnpm --filter @stagistic/app-routes test
pnpm --filter @stagistic/app-routes test:browser
pnpm --filter @stagistic/app-routes typecheck
```

Expected: PASS apart from separately documented pre-existing browser reds.

- [ ] **Step 7: Prepare the review checkpoint**

Do not commit. Propose: `refactor(app): rename cue UI to music`.

---

### Task 6: Rename export, landing pages, and repository documentation

**Files:**

- Modify: `packages/export/src/transcribeExportPlan.ts`
- Modify: `packages/export/src/transcribeExportPlan.test.ts`
- Modify: `apps/landing/src/pages/index.astro`
- Modify: `apps/landing/src/pages/index.module.css`
- Modify: `apps/landing/src/pages/syntax.astro`
- Modify: `apps/landing/src/pages/syntax.module.css`
- Modify: `docs/persistence.md`
- Modify: `docs/script-best-practice.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify music-domain terminology in the existing files currently returned by `rg -l -i '\bcues?\b' docs/superpowers`:
  `docs/superpowers/specs/2026-06-14-stagistic-data-model-design.md`,
  `docs/superpowers/specs/2026-06-14-stagistic-syntax-design.md`,
  `docs/superpowers/specs/2026-06-24-stagistic-music-editor-design.md`,
  `docs/superpowers/specs/2026-06-29-stagistic-block-action-menu-design.md`,
  `docs/superpowers/specs/2026-06-29-stagistic-music-numbering-design.md`,
  `docs/superpowers/specs/2026-07-07-character-highlight-underline-design.md`,
  `docs/superpowers/specs/2026-07-07-export-modular-layout-design.md`,
  `docs/superpowers/specs/2026-07-07-shared-pagination-core-design.md`,
  `docs/superpowers/specs/2026-07-09-collaboration-readiness-persistence-design.md`,
  `docs/superpowers/specs/2026-07-14-music-pdf-attachments-design.md`,
  `docs/superpowers/specs/2026-07-15-local-first-state-sync-design.md`,
  `docs/superpowers/plans/2026-06-14-stagistic-clean-break-rename.md`,
  `docs/superpowers/plans/2026-06-15-stagistic-character-tags.md`,
  `docs/superpowers/plans/2026-06-24-stagistic-music.md`,
  `docs/superpowers/plans/2026-06-29-stagistic-music-numbering.md`,
  `docs/superpowers/plans/2026-07-03-editor-surface-cache.md`,
  `docs/superpowers/plans/2026-07-07-export-modular-layout.md`,
  `docs/superpowers/plans/2026-07-07-shared-pagination-core.md`,
  `docs/superpowers/plans/2026-07-14-music-pdf-attachments.md`,
  `docs/superpowers/plans/2026-07-15-local-first-state-sync.md`, and
  `docs/superpowers/plans/2026-07-16-metadata-sync-provider-evaluation.md`.

**Interfaces:**

- Export code reads `index.music` and `musicId`.
- Landing syntax documentation shows `@@music`/`@@out` and labels the feature Music.
- Documentation distinguishes script-bound music from real character/production cues.

- [ ] **Step 1: Update export tests and implementation**

Change export fixtures from `cues`/`musicId` to `music`/`musicId`; rename locals and test descriptions. Preserve output ordering and PDF behavior.

Run:

```bash
pnpm --filter @stagistic/export test
pnpm --filter @stagistic/export typecheck
```

Expected: PASS.

- [ ] **Step 2: Update landing feature and syntax copy**

Use “Music” for the editor feature and show:

```text
!Music begins @@music 1 "Overture"
!Music ends @@out 1
```

Rename CSS classes whose names encode the old music domain. Do not replace legitimate prose about future sound/light/FX cues or character cues.

- [ ] **Step 3: Update active docs and prior design/plan terminology semantically**

Replace musical `cue` names, code identifiers, file paths, tables, and examples with the final contract. Keep an explicit note where an older document is superseded by the 2026-07-21 design. Do not blindly replace:

- “character cue”;
- future sound/light/FX cue discussions;
- historical migration filenames and pre-migration SQL identifiers;
- the old `@@cue` token when a clean-break rejection/migration is being documented.

Update the known browser-test filenames in `AGENTS.md`/`CLAUDE.md` from `cueCaret` to `musicCaret` after the actual file rename.

- [ ] **Step 4: Verify docs and landing build/type surfaces**

Run:

```bash
pnpm --filter @stagistic/export test
pnpm --filter @stagistic/export typecheck
pnpm lint
```

Expected: PASS, with no stale path/import references.

- [ ] **Step 5: Prepare the review checkpoint**

Do not commit. Propose: `docs: rename script-bound cues to music`.

---

### Task 7: Run semantic audit and canonical verification

**Files:**

- Modify only files identified by the audit as missed active music-domain usages.
- Refresh: `graphify-out/` via `graphify update .`.

**Interfaces:**

- Confirms the complete clean-break contract and repository health.

- [ ] **Step 1: Audit remaining old identifiers**

Run:

```bash
rg -n -i '\bcue[a-zA-Z_]*\b|cue_' \
  packages apps docs AGENTS.md CLAUDE.md \
  --glob '!packages/db/src/migrations.compiled.ts'
```

Classify every result. It must be one of:

- character cue;
- future/actual production cue;
- immutable migration SQL or an explicit migration test;
- explicit old-to-new/rejection wording in the approved 2026-07-21 spec/plan.

Anything else is a missed rename. Fix it and rerun the focused package test.

- [ ] **Step 2: Audit filesystem paths and exports**

Run:

```bash
rg --files packages apps | rg -i 'cue'
rg -n 'Cue|musicId|musicStart|musicOut|scriptMusic|script_music' packages apps \
  --glob '!packages/db/src/migrations.compiled.ts'
```

Expected filesystem results: only files genuinely about character/production cues, if any. Expected source results: only semantically legitimate character/production cues and explicit migration fixtures.

- [ ] **Step 3: Recompile migrations and run canonical checks**

Run in this order:

```bash
pnpm --filter @stagistic/db db:compile-migrations
npx tsc -b
pnpm lint
pnpm test
pnpm --filter @stagistic/app-core test:browser
pnpm --filter @stagistic/app-routes test:browser
pnpm --filter @stagistic/editor test:browser
pnpm --filter @stagistic/ui test:browser
```

Expected: typecheck, lint, and Node tests PASS. Record exact browser failures and distinguish only known pre-existing failures; do not weaken them.

- [ ] **Step 4: Refresh the knowledge graph and check the diff**

Run:

```bash
graphify update .
git diff --check
git status --short
```

Expected: graph update succeeds, `git diff --check` prints nothing, and status contains only intentional rename/spec/plan/graph changes plus any user changes that were already present.

- [ ] **Step 5: Prepare final handoff**

Do not commit. Give the user:

- concise outcome summary;
- migration and schema-version summary;
- exact verification results, including any pre-existing reds;
- semantic-audit exceptions that remain;
- proposed final commit message: `refactor: rename script cues to music`.
