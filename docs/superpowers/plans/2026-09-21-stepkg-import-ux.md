# Stepkg import UX (restore branch + import modal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Home route's import modal accept `.stepkg` packages alongside `.stagistic`, detect when a package's script already exists locally, and offer either a fresh copy or a full in-place replace — backed by a new atomic "restore" write path.

**Architecture:** Two phases. **Phase A (backend)** adds a `restoreScriptFromPackage` write path in `@stagistic/db` (full replace of an existing script's domain rows, sharing its row-writer with the existing `createScriptFromPackage`) and two new `@stagistic/app-core` orchestrators (`peekStepkgPackage` for a cheap manifest-only collision check, `restoreScriptPackage` for the full restore). **Phase B (UI/UX)** generalizes the existing delete-confirmation component, threads `.stepkg` bytes through the import modal's presentational layer via injected callbacks, and rewires `app-routes`' global modal plumbing to call the new backend functions.

**Tech Stack:** TypeScript, Drizzle + PGlite, React + react-aria-components, `vite-plus/test` (Vitest, incl. browser mode), `fflate` (via `@stagistic/stepkg`, backend only).

**Spec:** `docs/superpowers/specs/2026-09-21-stepkg-import-ux-design.md`

## Global Constraints

- Restore is a **full replace**: every domain row for that `script.id` is replaced with exactly what the package contains; nothing is merged. (spec §2)
- Collision detection happens **immediately after file selection**, before the name field appears. (spec §2, §3)
- No collision → only "import as new" is ever shown; the New/Replace choice never renders as a disabled no-op. (spec §2)
- Replace requires **type-to-confirm** (phrase `"replace me"`) plus a **separate, repeatable "Download backup"** action — both inside the same modal, no second stacked dialog. (spec §2, §7)
- `packages/ui` gains **no new dependency** on `@stagistic/db` or `@stagistic/stepkg`; all `.stepkg`-aware behavior is injected via callback props. (spec §2, §5)
- The import modal stays reachable **only from the Home route** — replace never touches a script open in the editor. (spec §2)
- On restore failure, the transaction rolls back and the **pre-existing local script must be completely unchanged** — the opposite invariant from create, where failure leaves nothing. (spec §4, §8)
- `DeleteScriptConfirm` is generalized into `TypeToConfirmAction` and reused by both script deletion and package replace, not duplicated. (spec §7)

---

## Phase A — Backend (restore write path + peek)

### Task 1: Bulk delete-by-scriptId queries

**Files:**
- Modify: `packages/db/src/queries/scripts/characters/write.ts`
- Modify: `packages/db/src/queries/scripts/characters/genders.ts`
- Modify: `packages/db/src/queries/scripts/characters/index.ts`
- Modify: `packages/db/src/queries/scripts/locations.ts`
- Modify: `packages/db/src/queries/scripts/music.ts`
- Modify: `packages/db/src/queries/scripts/attachments.ts`
- Test: `packages/db/src/queries/scripts/bulkDelete.test.ts`

**Interfaces:**
- Consumes: `DbClient` from `../../types` (or `../types` depending on file depth, matching each file's existing import); `scriptCharacters`, `scriptCharacterGenders`, `scriptLocations`, `scriptMusic`, `scriptAttachments` from each file's existing schema import (already imported in all five files).
- Produces:
  - `deleteScriptCharactersByScriptId(db: DbClient, scriptId: string): Promise<void>`
  - `deleteScriptCharacterGendersByScriptId(db: DbClient, scriptId: string): Promise<void>`
  - `deleteScriptLocationsByScriptId(db: DbClient, scriptId: string): Promise<void>`
  - `deleteScriptMusicByScriptId(db: DbClient, scriptId: string): Promise<void>`
  - `deleteScriptAttachmentsByScriptId(db: DbClient, scriptId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/queries/scripts/bulkDelete.test.ts
import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../../testing/createTestDb';
import {deleteScriptCharacterGendersByScriptId, insertScriptCharacterGenders} from './characters/genders';
import {deleteScriptCharactersByScriptId, insertScriptCharacters} from './characters/write';
import {listScriptCharacters} from './characters/read';
import {deleteScriptAttachmentsByScriptId, insertAttachment, listScriptAttachments} from './attachments';
import {deleteScriptLocationsByScriptId, insertScriptLocations, listScriptLocations} from './locations';
import {deleteScriptMusicByScriptId, insertScriptMusic, listScriptMusic} from './music';

describe('bulk delete-by-scriptId queries', () => {
    it('removes only the rows belonging to the given script', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc1');
        await seedScript(db, 'sc2');
        const now = 1_000;

        await insertScriptCharacters(db, [
            {id: 'c1', scriptId: 'sc1', characterKey: 'MARA', kind: 'character', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null, voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: now, updatedAt: now},
            {id: 'c2', scriptId: 'sc2', characterKey: 'JUNO', kind: 'character', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null, voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: now, updatedAt: now},
        ]);
        await insertScriptCharacterGenders(db, [
            {id: 'g1', scriptId: 'sc1', genderKey: 'f', genderLabel: 'Female', createdAt: now, updatedAt: now},
            {id: 'g2', scriptId: 'sc2', genderKey: 'f', genderLabel: 'Female', createdAt: now, updatedAt: now},
        ]);
        await insertScriptLocations(db, [
            {id: 'l1', scriptId: 'sc1', name: 'Kitchen', description: null, createdAt: now, updatedAt: now},
            {id: 'l2', scriptId: 'sc2', name: 'Attic', description: null, createdAt: now, updatedAt: now},
        ]);
        await insertScriptMusic(db, {id: 'm1', scriptId: 'sc1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Song', kind: null, startBlockId: null, endBlockId: null, createdAt: now, updatedAt: now});
        await insertScriptMusic(db, {id: 'm2', scriptId: 'sc2', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Other', kind: null, startBlockId: null, endBlockId: null, createdAt: now, updatedAt: now});
        await insertAttachment(db, {id: 'a1', scriptId: 'sc1', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 3, storageKey: 'key-1', createdAt: now, updatedAt: now});
        await insertAttachment(db, {id: 'a2', scriptId: 'sc2', filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 3, storageKey: 'key-2', createdAt: now, updatedAt: now});

        await deleteScriptCharactersByScriptId(db, 'sc1');
        await deleteScriptCharacterGendersByScriptId(db, 'sc1');
        await deleteScriptLocationsByScriptId(db, 'sc1');
        await deleteScriptMusicByScriptId(db, 'sc1');
        await deleteScriptAttachmentsByScriptId(db, 'sc1');

        expect((await listScriptCharacters(db, 'sc1')).length).toBe(0);
        expect((await listScriptCharacters(db, 'sc2')).some(character => character.id === 'c2')).toBe(true);
        expect((await listScriptLocations(db, 'sc1')).length).toBe(0);
        expect((await listScriptLocations(db, 'sc2')).some(location => location.id === 'l2')).toBe(true);
        expect((await listScriptMusic(db, 'sc1')).length).toBe(0);
        expect((await listScriptMusic(db, 'sc2')).some(item => item.id === 'm2')).toBe(true);
        expect((await listScriptAttachments(db, 'sc1')).length).toBe(0);
        expect((await listScriptAttachments(db, 'sc2')).some(attachment => attachment.id === 'a2')).toBe(true);
    });

    it('is a no-op when the script has no rows in a domain', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc3');

        await deleteScriptCharactersByScriptId(db, 'sc3');
        await deleteScriptCharacterGendersByScriptId(db, 'sc3');
        await deleteScriptLocationsByScriptId(db, 'sc3');
        await deleteScriptMusicByScriptId(db, 'sc3');
        await deleteScriptAttachmentsByScriptId(db, 'sc3');

        expect(true).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run db:test -- bulkDelete`
Expected: FAIL — the new delete functions do not exist.

- [ ] **Step 3: Add the delete queries**

In `packages/db/src/queries/scripts/characters/write.ts`, after `insertScriptCharacters`:

```ts
export const deleteScriptCharactersByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptCharacters).where(eq(scriptCharacters.scriptId, scriptId));
};
```

In `packages/db/src/queries/scripts/characters/genders.ts`, after `insertScriptCharacterGenders`:

```ts
export const deleteScriptCharacterGendersByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptCharacterGenders).where(eq(scriptCharacterGenders.scriptId, scriptId));
};
```

In `packages/db/src/queries/scripts/locations.ts`, after `insertScriptLocations`:

```ts
export const deleteScriptLocationsByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptLocations).where(eq(scriptLocations.scriptId, scriptId));
};
```

In `packages/db/src/queries/scripts/music.ts` (imports already include `eq`, `scriptMusic`), add:

```ts
export const deleteScriptMusicByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptMusic).where(eq(scriptMusic.scriptId, scriptId));
};
```

In `packages/db/src/queries/scripts/attachments.ts`, after `deleteAttachment`:

```ts
export const deleteScriptAttachmentsByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptAttachments).where(eq(scriptAttachments.scriptId, scriptId));
};
```

- [ ] **Step 4: Export the two new characters-file functions from the barrel**

`packages/db/src/queries/scripts/characters/index.ts` uses named exports (not `export *`). Add to the existing `export {...} from './write';` and `export {...} from './genders';` lists:

```ts
export {
    getScriptCharacterGenderByKey,
    insertScriptCharacterGenders,
    deleteScriptCharacterGendersByScriptId,
    listScriptCharacterGenders,
    upsertScriptCharacterGender,
} from './genders';
```

```ts
export {
    deleteScriptCharacter,
    deleteScriptCharactersByScriptId,
    insertScriptCharacters,
    touchScriptCharacter,
    updateScriptCharacterBackstory,
    updateScriptCharacterColor,
    updateScriptCharacterGender,
    updateScriptCharacterKey,
    updateScriptCharacterNotes,
    updateScriptCharacterOutline,
    updateScriptCharacterVocalRange,
    updateScriptCharacterVoiceType,
    upsertScriptCharacter,
} from './write';
```

`locations.ts`, `music.ts`, and `attachments.ts` are re-exported via `export * from './locations'` / `'./music'` / `'./attachments'` in `packages/db/src/queries/scripts/index.ts` already — no change needed there.

- [ ] **Step 5: Run tests to verify they pass**

Run: `moon run db:test -- bulkDelete`, then `moon run db:typecheck`, `moon run db:lint`.
Expected: PASS; typecheck and lint clean (the repo has one known pre-existing `db:lint` failure in `src/repo/attachments.ts:41` unrelated to this change — do not fix it as part of this task).

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/queries/scripts/characters/write.ts packages/db/src/queries/scripts/characters/genders.ts packages/db/src/queries/scripts/characters/index.ts packages/db/src/queries/scripts/locations.ts packages/db/src/queries/scripts/music.ts packages/db/src/queries/scripts/attachments.ts packages/db/src/queries/scripts/bulkDelete.test.ts
git commit -m "feat(db): add bulk delete-by-scriptId queries for restore"
```

---

### Task 2: `restoreScriptFromPackage` — shared writer + full replace

**Files:**
- Modify: `packages/db/src/repo/importPackage.ts`
- Modify: `packages/db/src/scriptRepository.ts`
- Modify: `packages/db/src/repo/createLocalPgliteRepository.ts`
- Test: `packages/db/src/repo/restorePackage.test.ts`

**Interfaces:**
- Consumes: Task 1's five delete queries; existing `dbQueries.updateScript` (`{id, title, subtitle, updatedAt}`), `dbQueries.listScriptAttachments(db, scriptId)`; everything `createScriptFromPackage` already used (unchanged).
- Produces:
  - `ScriptRepository.restoreScriptFromPackage(input: ScriptPackageWrite): Promise<void>` — same `ScriptPackageWrite` shape `createScriptFromPackage` takes; `input.script.id` must already exist locally.

The current `packages/db/src/repo/importPackage.ts` (read in full before editing) has `createScriptFromPackage` doing, in order: insert script row, insert genders/characters/groups/members/locations/music, run `migrateScriptDocumentToBlocks`, patch scene metadata + locations, write title page + settings, insert attachments + bindings, record outbox — wrapped in blob-save-before-tx / blob-cleanup-on-failure. This task extracts everything **after** the script-row write into a shared `writePackageDomainRowsTx` helper, and adds `restoreScriptFromPackage` which does its own script-row **update** plus a delete pass before calling the same shared helper.

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/repo/restorePackage.test.ts
import {parseStagistic} from '@stagistic/script';
import {describe, expect, it} from 'vite-plus/test';

import {InMemoryFileStorage} from '../fileStorage';
import type {ScriptPackageWrite} from '../scriptPackageWrite';
import {createTestDb} from '../testing/createTestDb';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

const source = `# Act One

## Scene One

The room is dark.

MARA
SING TO ME.
`;

const baseWrite = (): ScriptPackageWrite => ({
    script: {id: 'script-1', title: 'Original', subtitle: null, createdAt: 1_000, updatedAt: 2_000},
    document: parseStagistic(source).document,
    titlePage: {source: 'Original'},
    settings: {},
    characters: [
        {
            id: 'c1', key: 'MARA', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null,
            voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: 1_000, updatedAt: 1_000,
        },
    ],
    groups: [],
    genders: [],
    music: [{id: 'm1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Song', kind: null, startBlockId: null, endBlockId: null, createdAt: 1_000, updatedAt: 1_000}],
    locations: [{id: 'l1', name: 'Kitchen', description: null, createdAt: 1_000, updatedAt: 1_000}],
    scenes: [],
    attachments: [{id: 'a1', filename: 'score.pdf', mimeType: 'application/pdf', sizeBytes: 3, blob: new Blob(['pdf']), createdAt: 1_000, updatedAt: 1_000}],
    bindings: [{musicId: 'm1', attachmentId: 'a1', role: 'integrated_score', sortOrder: 0, createdAt: 1_000}],
});

const makeRepository = (db: Awaited<ReturnType<typeof createTestDb>>['db'], fileStorage = new InMemoryFileStorage()) =>
    createLocalPgliteRepository({getLocalDb: () => Promise.resolve(db), syncToFs: () => Promise.resolve(), fileStorage});

describe('restoreScriptFromPackage', () => {
    it('fully replaces an existing script, dropping rows the new package does not have', async () => {
        const {db} = await createTestDb();
        const fileStorage = new InMemoryFileStorage();
        const repository = makeRepository(db, fileStorage);

        await repository.createScriptFromPackage(baseWrite());
        const original = await repository.getScriptPackageSource('script-1');
        const oldAttachmentKey = original!.attachments.find(attachment => attachment.id === 'a1')!.storageKey;
        expect(await fileStorage.get(oldAttachmentKey)).not.toBeNull();

        const replacement: ScriptPackageWrite = {
            ...baseWrite(),
            script: {id: 'script-1', title: 'Replaced', subtitle: null, createdAt: 1_000, updatedAt: 5_000},
            characters: [
                {
                    id: 'c2', key: 'JUNO', colorHex: null, genderKey: null, notes: null, backstory: null, outline: null,
                    voiceType: null, vocalRangeLow: null, vocalRangeHigh: null, createdAt: 5_000, updatedAt: 5_000,
                },
            ],
            music: [],
            locations: [],
            attachments: [],
            bindings: [],
        };

        await repository.restoreScriptFromPackage(replacement);

        const restored = await repository.getScriptPackageSource('script-1');
        expect(restored?.script.title).toBe('Replaced');
        expect(restored?.characters.map(character => character.id)).toEqual(['c2']);
        expect(restored?.music).toEqual([]);
        expect(restored?.locations).toEqual([]);
        expect(restored?.attachments).toEqual([]);
        expect(await fileStorage.get(oldAttachmentKey)).toBeNull();
    });

    it('leaves the original script untouched when restore fails', async () => {
        const {db} = await createTestDb();
        const repository = makeRepository(db);

        await repository.createScriptFromPackage(baseWrite());

        const broken: ScriptPackageWrite = {
            ...baseWrite(),
            document: {type: 'doc'} as ScriptPackageWrite['document'],
        };

        await expect(repository.restoreScriptFromPackage(broken)).rejects.toBeTruthy();

        const stillOriginal = await repository.getScriptPackageSource('script-1');
        expect(stillOriginal?.script.title).toBe('Original');
        expect(stillOriginal?.characters.map(character => character.id)).toEqual(['c1']);
    });

    it('cleans up newly-saved blobs on failure without deleting the still-valid old blob', async () => {
        const {db} = await createTestDb();
        const fileStorage = new InMemoryFileStorage();
        const repository = makeRepository(db, fileStorage);

        await repository.createScriptFromPackage(baseWrite());
        const original = await repository.getScriptPackageSource('script-1');
        const oldAttachmentKey = original!.attachments.find(attachment => attachment.id === 'a1')!.storageKey;

        const broken: ScriptPackageWrite = {
            ...baseWrite(),
            document: {type: 'doc'} as ScriptPackageWrite['document'],
            attachments: [{id: 'a2', filename: 'new.pdf', mimeType: 'application/pdf', sizeBytes: 3, blob: new Blob(['new']), createdAt: 5_000, updatedAt: 5_000}],
        };

        await expect(repository.restoreScriptFromPackage(broken)).rejects.toBeTruthy();

        expect(await fileStorage.get(oldAttachmentKey)).not.toBeNull();
        const stillOriginal = await repository.getScriptPackageSource('script-1');
        expect(stillOriginal?.attachments.map(attachment => attachment.id)).toEqual(['a1']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run db:test -- restorePackage`
Expected: FAIL — `repository.restoreScriptFromPackage` is not a function.

- [ ] **Step 3: Refactor `importPackage.ts` to extract the shared writer, then add `restoreScriptFromPackage`**

Replace the full contents of `packages/db/src/repo/importPackage.ts` with:

```ts
import {eq} from 'drizzle-orm';

import type {FileStorage} from '../fileStorage';
import * as dbQueries from '../queries';
import type {DbClient} from '../queries';
import {scriptScenes} from '../schema';
import type {ScriptPackageWrite} from '../scriptPackageWrite';
import {writeScriptSettingsTx} from './config';
import {LEGACY_TO_BLOCKS_TRIGGERS, migrateScriptDocumentToBlocks} from './migration/legacyToBlocks';
import {writeTitlePageFieldsTx} from './titlePage';
import type {GetDb, RecordOutbox, SyncDb} from './types';

interface CreateImportPackageHandlerArgs {
    getDb: GetDb;
    recordOutbox: RecordOutbox;
    syncDb: SyncDb;
    fileStorage: FileStorage;
}

const writePackageDomainRowsTx = async (
    tx: DbClient,
    scriptId: string,
    input: ScriptPackageWrite,
    storageKeyByAttachment: Map<string, string>,
    now: number,
): Promise<void> => {
    await dbQueries.insertScriptCharacterGenders(
        tx,
        input.genders.map(gender => ({id: gender.id, scriptId, genderKey: gender.key, genderLabel: gender.label, createdAt: gender.createdAt, updatedAt: gender.updatedAt})),
    );
    await dbQueries.insertScriptCharacters(
        tx,
        input.characters.map(character => ({
            id: character.id,
            scriptId,
            characterKey: character.key,
            kind: 'character',
            colorHex: character.colorHex,
            genderKey: character.genderKey,
            notes: character.notes,
            backstory: character.backstory,
            outline: character.outline,
            voiceType: character.voiceType,
            vocalRangeLow: character.vocalRangeLow,
            vocalRangeHigh: character.vocalRangeHigh,
            createdAt: character.createdAt,
            updatedAt: character.updatedAt,
        })),
    );
    await dbQueries.insertScriptCharacters(
        tx,
        input.groups.map(group => ({
            id: group.id,
            scriptId,
            characterKey: group.key,
            kind: 'group',
            colorHex: group.colorHex,
            genderKey: null,
            notes: null,
            backstory: null,
            outline: null,
            voiceType: null,
            vocalRangeLow: null,
            vocalRangeHigh: null,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
        })),
    );
    await dbQueries.insertScriptCharacterGroupMembers(
        tx,
        input.groups.flatMap(group => group.memberIds.map(characterId => ({groupId: group.id, characterId}))),
    );

    await dbQueries.insertScriptLocations(
        tx,
        input.locations.map(location => ({id: location.id, scriptId, name: location.name, description: location.description, createdAt: location.createdAt, updatedAt: location.updatedAt})),
    );

    for (const item of input.music) {
        await dbQueries.insertScriptMusic(tx, {
            id: item.id,
            scriptId,
            sceneNumber: item.sceneNumber,
            indexInScene: item.indexInScene,
            mode: item.mode,
            title: item.title,
            kind: item.kind,
            startBlockId: item.startBlockId,
            endBlockId: item.endBlockId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        });
    }

    await migrateScriptDocumentToBlocks({
        db: tx,
        scriptId,
        sourceDocument: input.document,
        trigger: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
        context: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
    });

    const projectedScenes = await tx
        .select({id: scriptScenes.id, headingBlockId: scriptScenes.headingBlockId})
        .from(scriptScenes)
        .where(eq(scriptScenes.scriptId, scriptId));
    const sceneIdByHeading = new Map(
        projectedScenes.filter(scene => scene.headingBlockId).map(scene => [scene.headingBlockId as string, scene.id]),
    );

    for (const scene of input.scenes) {
        if (!scene.headingBlockId) continue;
        const projectedSceneId = sceneIdByHeading.get(scene.headingBlockId);
        if (!projectedSceneId) continue;
        await dbQueries.updateScriptSceneMetadata(tx, {sceneId: projectedSceneId, colorHex: scene.colorHex, synopsis: scene.synopsis, updatedAt: now});
        await dbQueries.replaceScriptSceneLocations(tx, {scriptId, sceneHeadingBlockId: scene.headingBlockId, locationIds: scene.locationIds});
    }

    await writeTitlePageFieldsTx(tx, scriptId, input.titlePage, now);
    await writeScriptSettingsTx(tx, scriptId, input.settings, now);

    for (const attachment of input.attachments) {
        await dbQueries.insertAttachment(tx, {
            id: attachment.id,
            scriptId,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            storageKey: storageKeyByAttachment.get(attachment.id)!,
            createdAt: attachment.createdAt,
            updatedAt: attachment.updatedAt,
        });
    }
    for (const binding of input.bindings) {
        await dbQueries.insertMusicAttachmentLink(tx, {
            musicId: binding.musicId,
            attachmentId: binding.attachmentId,
            role: binding.role,
            sortOrder: binding.sortOrder,
            createdAt: binding.createdAt,
        });
    }
};

const saveAttachmentBlobs = async (
    fileStorage: FileStorage,
    input: ScriptPackageWrite,
): Promise<{storageKeyByAttachment: Map<string, string>; savedKeys: string[]}> => {
    const storageKeyByAttachment = new Map<string, string>();
    const savedKeys: string[] = [];

    for (const attachment of input.attachments) {
        const key = await fileStorage.save(attachment.blob);
        storageKeyByAttachment.set(attachment.id, key);
        savedKeys.push(key);
    }

    return {storageKeyByAttachment, savedKeys};
};

const deleteBlobsBestEffort = async (fileStorage: FileStorage, keys: string[], context: string): Promise<void> => {
    await Promise.all(
        keys.map(key =>
            fileStorage.delete(key).catch(() => {
                console.error(`[import] Failed to clean up ${context}.`);
            }),
        ),
    );
};

export const createImportPackageHandler = ({getDb, recordOutbox, syncDb, fileStorage}: CreateImportPackageHandlerArgs) => {
    const createScriptFromPackage = async (input: ScriptPackageWrite): Promise<void> => {
        const db = await getDb();
        const scriptId = input.script.id;
        const now = input.script.updatedAt;
        const {storageKeyByAttachment, savedKeys} = await saveAttachmentBlobs(fileStorage, input);

        try {
            await db.transaction(async tx => {
                await dbQueries.insertScript(tx, {id: scriptId, title: input.script.title, createdAt: input.script.createdAt, updatedAt: input.script.updatedAt});
                if (input.script.subtitle) {
                    await dbQueries.updateScriptSubtitle(tx, {id: scriptId, subtitle: input.script.subtitle, updatedAt: now});
                }

                await writePackageDomainRowsTx(tx, scriptId, input, storageKeyByAttachment, now);

                await recordOutbox(
                    {scriptId, entityKey: `script:${scriptId}`, opType: 'script.import', occurredAt: now, payloadJson: JSON.stringify({scriptId, createdAt: input.script.createdAt})},
                    tx,
                );
            });
        } catch (error) {
            await deleteBlobsBestEffort(fileStorage, savedKeys, 'an uncommitted blob');
            throw error;
        }

        await syncDb();
    };

    const restoreScriptFromPackage = async (input: ScriptPackageWrite): Promise<void> => {
        const db = await getDb();
        const scriptId = input.script.id;
        const now = input.script.updatedAt;
        const {storageKeyByAttachment, savedKeys} = await saveAttachmentBlobs(fileStorage, input);
        let removedStorageKeys: string[] = [];

        try {
            await db.transaction(async tx => {
                await dbQueries.updateScript(tx, {id: scriptId, title: input.script.title, subtitle: input.script.subtitle, updatedAt: now});

                const existingAttachments = await dbQueries.listScriptAttachments(tx, scriptId);
                removedStorageKeys = existingAttachments.map(attachment => attachment.storageKey);

                await dbQueries.deleteScriptCharactersByScriptId(tx, scriptId);
                await dbQueries.deleteScriptCharacterGendersByScriptId(tx, scriptId);
                await dbQueries.deleteScriptLocationsByScriptId(tx, scriptId);
                await dbQueries.deleteScriptMusicByScriptId(tx, scriptId);
                await dbQueries.deleteScriptAttachmentsByScriptId(tx, scriptId);

                await writePackageDomainRowsTx(tx, scriptId, input, storageKeyByAttachment, now);

                await recordOutbox(
                    {scriptId, entityKey: `script:${scriptId}`, opType: 'script.restore', occurredAt: now, payloadJson: JSON.stringify({scriptId, updatedAt: now})},
                    tx,
                );
            });
        } catch (error) {
            await deleteBlobsBestEffort(fileStorage, savedKeys, 'an uncommitted blob');
            throw error;
        }

        await syncDb();
        await deleteBlobsBestEffort(fileStorage, removedStorageKeys, 'a replaced blob');
    };

    return {createScriptFromPackage, restoreScriptFromPackage};
};
```

> `dbQueries.deleteScriptCharactersByScriptId` etc. resolve through `import * as dbQueries from '../queries'` because Task 1 exported them from `characters/index.ts` (named) and the `locations`/`music`/`attachments` files (via existing `export *` barrels).

- [ ] **Step 4: Wire the interface and repository**

In `packages/db/src/scriptRepository.ts`, add to the `ScriptRepository` interface right after `createScriptFromPackage`:

```ts
    restoreScriptFromPackage(input: ScriptPackageWrite): Promise<void>;
```

In `packages/db/src/repo/createLocalPgliteRepository.ts`, add right after `createScriptFromPackage: input => importPackage.createScriptFromPackage(input),`:

```ts
        restoreScriptFromPackage: input => importPackage.restoreScriptFromPackage(input),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `moon run db:test -- restorePackage`, then full `moon run db:test` (confirm no regression in the existing `importPackage.test.ts`), then `moon run db:typecheck`, `moon run db:lint`.
Expected: PASS; typecheck clean; lint clean except the pre-existing `attachments.ts:41` issue.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/repo/importPackage.ts packages/db/src/scriptRepository.ts packages/db/src/repo/createLocalPgliteRepository.ts packages/db/src/repo/restorePackage.test.ts
git commit -m "feat(db): add restoreScriptFromPackage full-replace write path"
```

---

### Task 3: `peekStepkgPackage` — cheap manifest-only collision check

**Files:**
- Create: `packages/app-core/src/stepkg/peekStepkgPackage.ts`
- Create: `packages/app-core/src/stepkg/peekStepkgPackage.test.ts`
- Modify: `packages/app-core/src/stepkg/index.ts`

**Interfaces:**
- Consumes: `readStepkgContainer` from `@stagistic/stepkg`; `type ScriptRepository` from `@stagistic/db`.
- Produces:
  - `type StepkgPeekResult = {ok: true; scriptId: string; packageTitle: string; existingScript: {id: string; title: string} | null} | {ok: false; issues: StepkgImportIssue[]}`
  - `peekStepkgPackage(args: {repository: ScriptRepository; bytes: Uint8Array}): Promise<StepkgPeekResult>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/app-core/src/stepkg/peekStepkgPackage.test.ts
import {createEmptyScriptDocument} from '@stagistic/script';
import type {ScriptRepository, ScriptSummary} from '@stagistic/db';
import {createStepkg, type StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {peekStepkgPackage} from './peekStepkgPackage';

const snapshot: StepkgSnapshot = {
    script: {id: 'script-1', title: 'My Play', subtitle: null, createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T11:00:00.000Z'},
    document: createEmptyScriptDocument(),
    titlePage: {},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    attachmentBindings: [],
};

const exportBytes = async (): Promise<Uint8Array> => {
    const result = await createStepkg({snapshot, generator: {name: 'Stagistic', version: '0.0.0'}, createdAt: new Date('2026-09-21T12:00:00.000Z'), loadAsset: () => Promise.resolve(null)});
    if (!result.ok) throw new Error('export failed');
    return new Uint8Array(await result.blob.arrayBuffer());
};

describe('peekStepkgPackage', () => {
    it('reports no collision when the script is not known locally', async () => {
        const repository = {getScriptSummary: () => Promise.resolve(null)} as unknown as ScriptRepository;
        const result = await peekStepkgPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scriptId).toBe('script-1');
            expect(result.packageTitle).toBe('My Play');
            expect(result.existingScript).toBeNull();
        }
    });

    it('reports a collision with the local script title', async () => {
        const existing: ScriptSummary = {id: 'script-1', title: 'Local Copy', subtitle: null, createdAt: 1, updatedAt: 1, activeBlockId: null};
        const repository = {getScriptSummary: () => Promise.resolve(existing)} as unknown as ScriptRepository;
        const result = await peekStepkgPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.existingScript).toEqual({id: 'script-1', title: 'Local Copy'});
    });

    it('returns issues for an invalid package without calling the repository', async () => {
        let called = false;
        const repository = {getScriptSummary: () => { called = true; return Promise.resolve(null); }} as unknown as ScriptRepository;

        const result = await peekStepkgPackage({repository, bytes: new TextEncoder().encode('not a zip')});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
        expect(called).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run app-core:test -- peekStepkgPackage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `peekStepkgPackage.ts`**

```ts
// packages/app-core/src/stepkg/peekStepkgPackage.ts
import type {ScriptRepository} from '@stagistic/db';
import {readStepkgContainer, type StepkgImportIssue} from '@stagistic/stepkg';

export type StepkgPeekResult =
    | {ok: true; scriptId: string; packageTitle: string; existingScript: {id: string; title: string} | null}
    | {ok: false; issues: StepkgImportIssue[]};

export interface PeekStepkgPackageArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
}

export const peekStepkgPackage = async ({repository, bytes}: PeekStepkgPackageArgs): Promise<StepkgPeekResult> => {
    const container = await readStepkgContainer(bytes);
    if (!container.ok) return container;

    const {manifest} = container;
    const existing = await repository.getScriptSummary(manifest.script.id);

    return {
        ok: true,
        scriptId: manifest.script.id,
        packageTitle: manifest.script.title,
        existingScript: existing ? {id: existing.id, title: existing.title} : null,
    };
};
```

- [ ] **Step 4: Add export and run tests**

Add `export * from './peekStepkgPackage';` to `packages/app-core/src/stepkg/index.ts`. Run `moon run app-core:test -- peekStepkgPackage`, `moon run app-core:typecheck`, `moon run app-core:lint`.
Expected: PASS; clean (the repo has one known pre-existing `app-core:lint` failure in `src/collections/createReactiveCollection.test.ts:148` unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/stepkg/peekStepkgPackage.ts packages/app-core/src/stepkg/peekStepkgPackage.test.ts packages/app-core/src/stepkg/index.ts
git commit -m "feat(app-core): add cheap manifest-only .stepkg collision peek"
```

---

### Task 4: `restoreScriptPackage` orchestration

**Files:**
- Create: `packages/app-core/src/stepkg/restoreScriptPackage.ts`
- Create: `packages/app-core/src/stepkg/restoreScriptPackage.test.ts`
- Modify: `packages/app-core/src/stepkg/index.ts`

**Interfaces:**
- Consumes: `readStepkg` from `@stagistic/stepkg`; `mapStepkgSnapshotToPackageWrite` (existing); `type ScriptRepository` from `@stagistic/db`; `type StepkgImportResult` from `./importScriptPackageAsNew` (existing, reused as-is).
- Produces: `restoreScriptPackage(args: {repository: ScriptRepository; bytes: Uint8Array}): Promise<StepkgImportResult>`

Unlike `importScriptPackageAsNew`, this performs **no** `remapStepkgIds` call — the package's own IDs are written as-is — and calls `repository.restoreScriptFromPackage` instead of `createScriptFromPackage`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/app-core/src/stepkg/restoreScriptPackage.test.ts
import type {ScriptPackageWrite, ScriptRepository} from '@stagistic/db';
import {createEmptyScriptDocument} from '@stagistic/script';
import {createStepkg, type StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {restoreScriptPackage} from './restoreScriptPackage';

const snapshot: StepkgSnapshot = {
    script: {id: 'script-1', title: 'Original', subtitle: null, createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T11:00:00.000Z'},
    document: createEmptyScriptDocument(),
    titlePage: {},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    attachmentBindings: [],
};

const exportBytes = async (): Promise<Uint8Array> => {
    const result = await createStepkg({snapshot, generator: {name: 'Stagistic', version: '0.0.0'}, createdAt: new Date('2026-09-21T12:00:00.000Z'), loadAsset: () => Promise.resolve(null)});
    if (!result.ok) throw new Error('export failed');
    return new Uint8Array(await result.blob.arrayBuffer());
};

describe('restoreScriptPackage', () => {
    it('restores using the package\'s own script id, without remapping', async () => {
        let captured: ScriptPackageWrite | null = null;
        const repository = {
            restoreScriptFromPackage: (input: ScriptPackageWrite) => {
                captured = input;
                return Promise.resolve();
            },
        } as unknown as ScriptRepository;

        const result = await restoreScriptPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scriptId).toBe('script-1');
            expect(result.title).toBe('Original');
        }
        expect(captured).not.toBeNull();
        expect(captured!.script.id).toBe('script-1');
    });

    it('returns issues for a corrupt package and never calls the repository', async () => {
        let called = false;
        const repository = {
            restoreScriptFromPackage: () => { called = true; return Promise.resolve(); },
        } as unknown as ScriptRepository;

        const result = await restoreScriptPackage({repository, bytes: new TextEncoder().encode('not a zip')});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
        expect(called).toBe(false);
    });

    it('surfaces write_failed when the repository write throws', async () => {
        const repository = {restoreScriptFromPackage: () => Promise.reject(new Error('db exploded'))} as unknown as ScriptRepository;

        const result = await restoreScriptPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues).toEqual([{code: 'write_failed', stage: 'write'}]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run app-core:test -- restoreScriptPackage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `restoreScriptPackage.ts`**

```ts
// packages/app-core/src/stepkg/restoreScriptPackage.ts
import type {ScriptRepository} from '@stagistic/db';
import {readStepkg} from '@stagistic/stepkg';

import type {StepkgImportResult} from './importScriptPackageAsNew';
import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

export interface RestoreScriptPackageArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
}

export const restoreScriptPackage = async ({repository, bytes}: RestoreScriptPackageArgs): Promise<StepkgImportResult> => {
    const read = await readStepkg(bytes);
    if (!read.ok) return {ok: false, issues: read.issues};

    const write = mapStepkgSnapshotToPackageWrite(read.package.snapshot, read.package.assets);

    try {
        await repository.restoreScriptFromPackage(write);
    } catch {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {ok: true, scriptId: write.script.id, title: write.script.title};
};
```

- [ ] **Step 4: Add export and run full verification**

Add `export * from './restoreScriptPackage';` to `packages/app-core/src/stepkg/index.ts`. Run `moon run app-core:test`, `moon run app-core:typecheck`, `moon run app-core:lint`, then `moon run db:test` and `moon run stepkg:test` once more to confirm no cross-package regression.
Expected: all PASS; only the two pre-existing, unrelated lint failures noted earlier remain.

- [ ] **Step 5: Commit**

```bash
git add packages/app-core/src/stepkg/restoreScriptPackage.ts packages/app-core/src/stepkg/restoreScriptPackage.test.ts packages/app-core/src/stepkg/index.ts
git commit -m "feat(app-core): add restoreScriptPackage orchestration"
```

---

## Phase B — UI/UX (import modal + wiring)

### Task 5: Generalize `DeleteScriptConfirm` into `TypeToConfirmAction`

**Files:**
- Create: `packages/ui/src/dialogs/TypeToConfirmAction.tsx`
- Create: `packages/ui/src/dialogs/TypeToConfirmAction.module.css`
- Create: `packages/ui/src/dialogs/TypeToConfirmAction.browser.test.tsx`
- Create: `packages/ui/src/dialogs/deleteScriptConfirmPhrase.ts`
- Delete: `packages/ui/src/dialogs/DeleteScriptConfirm.tsx`, `packages/ui/src/dialogs/DeleteScriptConfirm.module.css`, `packages/ui/src/dialogs/DeleteScriptConfirm.browser.test.tsx`, `packages/ui/src/dialogs/__screenshots__/DeleteScriptConfirm.browser.test.tsx/` (directory)
- Modify: `packages/ui/src/dialogs/DeleteScriptModal.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/tokens.test.ts`
- Modify: `packages/app-routes/src/routes/script/editor/settings/danger-zone/DangerZoneSettingsPanel.tsx`

**Interfaces:**
- Produces:
  - `TypeToConfirmActionProps = {phrase: string; confirmLabel: ReactNode; inputAriaLabel?: string; isPending?: boolean; secondaryAction?: ReactNode; onConfirm: () => void | Promise<void>}`
  - `TypeToConfirmAction(props: TypeToConfirmActionProps)`
  - `DELETE_SCRIPT_CONFIRM_PHRASE = 'delete me'` (from `deleteScriptConfirmPhrase.ts`)

`DeleteScriptConfirm` currently has two consumers — `DeleteScriptModal.tsx` and `DangerZoneSettingsPanel.tsx` — both pass `scriptTitle` only to build an aria-label (`Type ${DELETE_SCRIPT_CONFIRM_PHRASE} to delete ${scriptTitle}`). The generic component drops `scriptTitle` and takes `inputAriaLabel` directly; both callers build their own label string.

- [ ] **Step 1: Write the failing test (adapted from the existing `DeleteScriptConfirm.browser.test.tsx`, generic phrase)**

```tsx
// packages/ui/src/dialogs/TypeToConfirmAction.browser.test.tsx
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {TypeToConfirmAction} from './TypeToConfirmAction';

const mountedRoots: Root[] = [];

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);
        if (element) return element;
        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const renderAction = (onConfirm: () => void) => {
    const host = document.createElement('div');

    host.style.width = '480px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<TypeToConfirmAction phrase="replace me" confirmLabel="Replace script" onConfirm={onConfirm} />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('TypeToConfirmAction', () => {
    it('keeps the confirm button disabled until the exact phrase is typed', async () => {
        const onConfirm = vi.fn();

        renderAction(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const button = await waitForElement<HTMLButtonElement>('button');

        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe('Replace script');

        await input.fill('replace');
        expect(button.disabled).toBe(true);

        await input.fill('replace me');
        expect(button.disabled).toBe(false);
    });

    it('calls onConfirm once unlocked, and trims surrounding whitespace', async () => {
        const onConfirm = vi.fn();

        renderAction(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const buttonElement = await waitForElement<HTMLButtonElement>('button');
        const button = page.elementLocator(buttonElement);

        await input.fill('  replace me  ');
        expect(buttonElement.disabled).toBe(false);

        await button.click();
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui:test-browser -- TypeToConfirmAction`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `TypeToConfirmAction.module.css`** (copy of `DeleteScriptConfirm.module.css` verbatim — same class names, same tokens):

```css
.stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}

.confirmField {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.confirmLabel {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
}

.confirmPhrase {
    padding: var(--space-px) var(--space-md);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: var(--color-status-danger);
    background: color-mix(in oklch, var(--color-status-danger) 12%, transparent);
    border-radius: var(--radius-sm);
}

.confirmInput {
    --input-height: var(--control-height-lg);
    --input-border-color: color-mix(in oklch, var(--color-status-danger) 30%, var(--color-border));

    max-width: 280px;
}

.actions {
    display: flex;
    gap: var(--space-md);
    align-items: center;
    justify-content: flex-start;
}
```

- [ ] **Step 4: Create `TypeToConfirmAction.tsx`**

```tsx
// packages/ui/src/dialogs/TypeToConfirmAction.tsx
import {type ReactNode, useCallback, useId, useState} from 'react';

import {Button} from '../atoms/Button';
import {Input} from '../atoms/Input';
import styles from './TypeToConfirmAction.module.css';

export interface TypeToConfirmActionProps {
    phrase: string,
    confirmLabel: ReactNode,
    inputAriaLabel?: string,
    isPending?: boolean,
    secondaryAction?: ReactNode,
    onConfirm: () => void | Promise<void>,
}

export const TypeToConfirmAction = ({
    phrase,
    confirmLabel,
    inputAriaLabel,
    isPending = false,
    secondaryAction,
    onConfirm,
}: TypeToConfirmActionProps) => {
    const inputId = useId();
    const [confirmText, setConfirmText] = useState('');
    const isUnlocked = confirmText.trim() === phrase;

    const handleConfirm = useCallback(() => {
        if (!isUnlocked || isPending) {
            return;
        }

        void onConfirm();
    }, [isUnlocked, isPending, onConfirm]);

    return (
        <div className={styles.stack}>
            <label className={styles.confirmField} htmlFor={inputId}>
                <span className={styles.confirmLabel}>
                    Type{' '}
                    <code className={styles.confirmPhrase}>{phrase}</code>
                    {' '}to confirm
                </span>
                <Input
                    id={inputId}
                    type="text"
                    className={styles.confirmInput}
                    value={confirmText}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={phrase}
                    disabled={isPending}
                    aria-label={inputAriaLabel}
                    onChange={event => setConfirmText(event.target.value)}
                />
            </label>
            <div className={styles.actions}>
                <Button
                    variant="danger"
                    isDisabled={!isUnlocked}
                    isPending={isPending}
                    onPress={handleConfirm}
                >
                    {confirmLabel}
                </Button>
                {secondaryAction}
            </div>
        </div>
    );
};
```

- [ ] **Step 5: Delete the old files**

```bash
git rm packages/ui/src/dialogs/DeleteScriptConfirm.tsx packages/ui/src/dialogs/DeleteScriptConfirm.module.css packages/ui/src/dialogs/DeleteScriptConfirm.browser.test.tsx
git rm -r packages/ui/src/dialogs/__screenshots__/DeleteScriptConfirm.browser.test.tsx
```

- [ ] **Step 6: Create `deleteScriptConfirmPhrase.ts`**

```ts
// packages/ui/src/dialogs/deleteScriptConfirmPhrase.ts
export const DELETE_SCRIPT_CONFIRM_PHRASE = 'delete me';
```

- [ ] **Step 7: Update `DeleteScriptModal.tsx`**

Replace the `DeleteScriptConfirm` import and usage:

```tsx
import {DELETE_SCRIPT_CONFIRM_PHRASE} from './deleteScriptConfirmPhrase';
import {TypeToConfirmAction} from './TypeToConfirmAction';
```

```tsx
<TypeToConfirmAction
    key={isOpen ? 'open' : 'closed'}
    phrase={DELETE_SCRIPT_CONFIRM_PHRASE}
    confirmLabel="Delete script"
    inputAriaLabel={scriptTitle ? `Type ${DELETE_SCRIPT_CONFIRM_PHRASE} to delete ${scriptTitle}` : undefined}
    isPending={isDeleting}
    secondaryAction={(
        <Button
            variant="ghost"
            isDisabled={isDeleting}
            onPress={onClose}
        >
            Cancel
        </Button>
    )}
    onConfirm={onConfirm}
/>
```

(The `<div className={styles.body}>` wrapper and `DeleteScriptConfirm`'s previous `scriptTitle` prop are removed; everything else in the file is unchanged.)

- [ ] **Step 8: Update `DangerZoneSettingsPanel.tsx`**

```tsx
import {
    TypeToConfirmAction,
    DELETE_SCRIPT_CONFIRM_PHRASE,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';
```

```tsx
<TypeToConfirmAction
    phrase={DELETE_SCRIPT_CONFIRM_PHRASE}
    confirmLabel="Delete script"
    inputAriaLabel={scriptTitle ? `Type ${DELETE_SCRIPT_CONFIRM_PHRASE} to delete ${scriptTitle}` : undefined}
    isPending={isDeleting}
    onConfirm={handleDelete}
/>
```

- [ ] **Step 9: Update `packages/ui/src/index.ts`**

Replace:

```ts
export {DELETE_SCRIPT_CONFIRM_PHRASE, DeleteScriptConfirm, type DeleteScriptConfirmProps} from './dialogs/DeleteScriptConfirm';
```

with:

```ts
export {DELETE_SCRIPT_CONFIRM_PHRASE} from './dialogs/deleteScriptConfirmPhrase';
export {TypeToConfirmAction, type TypeToConfirmActionProps} from './dialogs/TypeToConfirmAction';
```

(Keep this alphabetically placed the same way the rest of the file is ordered — insert `TypeToConfirmAction`'s export where `DeleteScriptConfirm`'s used to be is fine; exact ordering is not test-enforced beyond the catalog check in Step 10.)

- [ ] **Step 10: Update `packages/ui/src/tokens.test.ts`**

In the `NOT_CATALOGUED_YET` set, replace the `'DeleteScriptConfirm'` entry with `'TypeToConfirmAction'`.

- [ ] **Step 11: Run tests to verify they pass**

Run: `moon run ui:test-browser -- TypeToConfirmAction`, then `moon run ui:test`, `moon run ui:typecheck`, `moon run ui:lint`, then `moon run app-routes:typecheck` (for `DangerZoneSettingsPanel.tsx`) and any existing app-routes tests touching the danger zone panel.
Expected: all PASS.

- [ ] **Step 12: Commit**

```bash
git add packages/ui/src/dialogs/TypeToConfirmAction.tsx packages/ui/src/dialogs/TypeToConfirmAction.module.css packages/ui/src/dialogs/TypeToConfirmAction.browser.test.tsx packages/ui/src/dialogs/deleteScriptConfirmPhrase.ts packages/ui/src/dialogs/DeleteScriptModal.tsx packages/ui/src/index.ts packages/ui/src/tokens.test.ts packages/app-routes/src/routes/script/editor/settings/danger-zone/DangerZoneSettingsPanel.tsx
git commit -m "refactor(ui): generalize DeleteScriptConfirm into TypeToConfirmAction"
```

---

### Task 6: `.stepkg` file classification in `model.ts` / `ImportDropZone`

**Files:**
- Modify: `packages/ui/src/dialogs/importScript/model.ts`
- Modify: `packages/ui/src/dialogs/importScript/model.test.ts`
- Modify: `packages/ui/src/dialogs/importScript/types.ts`
- Modify: `packages/ui/src/dialogs/importScript/ImportDropZone.tsx`
- Modify: `packages/ui/src/dialogs/importScript/ImportDropZone.browser.test.tsx`

**Interfaces:**
- Produces:
  - `type SelectedFile = {kind: 'stagistic'; name: string; file?: File; text?: string} | {kind: 'stepkg'; name: string; file?: File; bytes?: Uint8Array}`
  - `isStagisticFileName(name: string): boolean` (unchanged)
  - `isStepkgFileName(name: string): boolean`
  - `classifyFileKind(name: string): 'stagistic' | 'stepkg' | null`
  - `getFileBaseName(name: string): string` (now strips either extension)
  - `ImportDropZoneProps` gains `hint: string` and `acceptedExtensions: readonly string[]`

- [ ] **Step 1: Extend the failing test**

Add to `packages/ui/src/dialogs/importScript/model.test.ts`:

```ts
import {
    classifyFileKind,
    getFileBaseName,
    isStagisticFileName,
    isStepkgFileName,
} from './model';

describe('Stagistic import file model', () => {
    it('accepts only .stagistic files case-insensitively', () => {
        expect(isStagisticFileName('play.stagistic')).toBe(true);
        expect(isStagisticFileName('PLAY.STAGISTIC')).toBe(true);
        expect(isStagisticFileName('play.fountain')).toBe(false);
        expect(isStagisticFileName('play.stagistic.txt')).toBe(false);
    });

    it('derives the default script name from the file name', () => {
        expect(getFileBaseName('When Night Falls.stagistic')).toBe('When Night Falls');
    });
});

describe('Stepkg import file model', () => {
    it('accepts only .stepkg files case-insensitively', () => {
        expect(isStepkgFileName('play.stepkg')).toBe(true);
        expect(isStepkgFileName('PLAY.STEPKG')).toBe(true);
        expect(isStepkgFileName('play.stagistic')).toBe(false);
    });

    it('derives the default script name from a .stepkg file name', () => {
        expect(getFileBaseName('When Night Falls.stepkg')).toBe('When Night Falls');
    });

    it('classifies file kinds by extension, or null for unsupported files', () => {
        expect(classifyFileKind('play.stagistic')).toBe('stagistic');
        expect(classifyFileKind('play.stepkg')).toBe('stepkg');
        expect(classifyFileKind('play.fountain')).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui:test -- model`
Expected: FAIL — `isStepkgFileName`/`classifyFileKind` not exported.

- [ ] **Step 3: Rewrite `model.ts`**

```ts
export interface ImportPayload {
    name: string,
    fileName: string,
    text: string,
}

export type SelectedFile =
    | {kind: 'stagistic', name: string, file?: File, text?: string}
    | {kind: 'stepkg', name: string, file?: File, bytes?: Uint8Array};

export interface DropEvent {
    items: readonly unknown[],
}

interface FileDropItem {
    kind: 'file',
    name: string,
    getFile: () => Promise<File>,
}

export const isFileDropItem = (item: unknown): item is FileDropItem => {
    if (typeof item !== 'object' || item === null) {
        return false;
    }

    const candidate = item as Record<string, unknown>;

    return candidate.kind === 'file'
        && typeof candidate.name === 'string'
        && typeof candidate.getFile === 'function';
};

export const isStagisticFileName = (name: string) => {
    return name.toLowerCase().endsWith('.stagistic');
};

export const isStepkgFileName = (name: string) => {
    return name.toLowerCase().endsWith('.stepkg');
};

export const classifyFileKind = (name: string): 'stagistic' | 'stepkg' | null => {
    if (isStagisticFileName(name)) return 'stagistic';
    if (isStepkgFileName(name)) return 'stepkg';
    return null;
};

export const getFileBaseName = (name: string) => {
    return name.replace(/\.(stagistic|stepkg)$/i, '');
};
```

- [ ] **Step 4: Update `types.ts`**

```ts
import type {
    DropEvent,
    ImportPayload,
} from './model';

export interface ImportScriptFile {
    fileName: string,
    text: string,
}

export type StepkgPeekResult =
    | {ok: true, scriptId: string, packageTitle: string, existingLocalTitle: string | null}
    | {ok: false, message: string};

export interface ImportDropZoneProps {
    fileLabel: string,
    hint: string,
    acceptedExtensions: readonly string[],
    onDrop: (event: DropEvent) => void,
    onFileSelect: (files: FileList | null) => void,
    onPickFile?: () => void | Promise<void>,
}

export interface UseImportScriptModalStateArgs {
    isOpen: boolean,
    onImportStagistic: (payload: ImportPayload) => void | Promise<void>,
    onImportStepkgAsNew: (payload: {fileName: string, bytes: Uint8Array, title: string}) => void | Promise<void>,
    onReplaceWithStepkg: (payload: {fileName: string, bytes: Uint8Array}) => void | Promise<void>,
    onDownloadStepkgBackup: (scriptId: string) => void | Promise<void>,
    onPeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>,
    onPickFile?: () => Promise<ImportScriptFile | null>,
    preselectedFile?: ImportScriptFile | null,
}
```

- [ ] **Step 5: Update `ImportDropZone.tsx`**

```tsx
import {useRef} from 'react';
import {
    Button,
    FileTrigger,
    useDrop,
} from 'react-aria-components';

import styles from '../ImportScriptModal.module.css';
import type {ImportDropZoneProps} from './types';

export const ImportDropZone = ({
    fileLabel,
    hint,
    acceptedExtensions,
    onDrop,
    onFileSelect,
    onPickFile,
}: ImportDropZoneProps) => {
    const dropZoneRef = useRef<HTMLDivElement | null>(null);
    const {dropProps, isDropTarget} = useDrop({
        ref: dropZoneRef,
        getDropOperation: () => 'copy',
        onDrop,
    });
    const dropZoneProps = {
        ...dropProps,
        className: styles.dropZone,
        'data-drop-target': isDropTarget || undefined,
    };

    if (onPickFile) {
        return (
            <div {...dropZoneProps} ref={dropZoneRef}>
                <Button
                    className={styles.dropZoneTrigger}
                    onPress={() => {
                        void onPickFile();
                    }}
                >
                    <span className={styles.dropZoneLabel}>{fileLabel}</span>
                    <span className={styles.dropZoneHint}>{hint}</span>
                </Button>
            </div>
        );
    }

    return (
        <div {...dropZoneProps} ref={dropZoneRef}>
            <FileTrigger
                acceptedFileTypes={[...acceptedExtensions]}
                onSelect={onFileSelect}
            >
                <Button className={styles.dropZoneTrigger}>
                    <span className={styles.dropZoneLabel}>{fileLabel}</span>
                    <span className={styles.dropZoneHint}>{hint}</span>
                </Button>
            </FileTrigger>
        </div>
    );
};
```

- [ ] **Step 6: Update `ImportDropZone.browser.test.tsx`**

Pass the two new required props in `renderDropZone`:

```tsx
mountedRoot.render(
    <ImportDropZone
        fileLabel="Choose a script"
        hint="Drop a .stagistic or .stepkg file here, or click to browse."
        acceptedExtensions={['.stagistic', '.stepkg']}
        onDrop={() => {}}
        onFileSelect={() => {}}
        onPickFile={onPickFile}
    />,
);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `moon run ui:test -- model`, `moon run ui:test-browser -- ImportDropZone`, then `moon run ui:typecheck`, `moon run ui:lint`.
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/dialogs/importScript/model.ts packages/ui/src/dialogs/importScript/model.test.ts packages/ui/src/dialogs/importScript/types.ts packages/ui/src/dialogs/importScript/ImportDropZone.tsx packages/ui/src/dialogs/importScript/ImportDropZone.browser.test.tsx
git commit -m "feat(ui): classify .stepkg files alongside .stagistic in the import drop zone"
```

---

### Task 7: `useImportScriptModalState` — peek, choice, and submit logic

**Files:**
- Modify: `packages/ui/src/dialogs/importScript/useImportScriptModalState.ts`
- Create: `packages/ui/src/dialogs/importScript/useImportScriptModalState.browser.test.tsx`

**Interfaces:**
- Consumes: Task 6's `SelectedFile`, `classifyFileKind`, `getFileBaseName`, `isFileDropItem` from `./model`; `StepkgPeekResult`, `UseImportScriptModalStateArgs` from `./types`.
- Produces: `useImportScriptModalState(args: UseImportScriptModalStateArgs)` returning:
  ```ts
  {
      inputRef: RefObject<HTMLInputElement | null>,
      name: string,
      selectedFile: SelectedFile | null,
      fileLabel: string,
      fileError: string | null,
      isPeeking: boolean,
      stepkgPeek: StepkgPeekResult | null,
      importChoice: 'new' | 'replace',
      isProcessing: boolean,
      isDownloadingBackup: boolean,
      showNameField: boolean,
      showChoiceToggle: boolean,
      showReplacePanel: boolean,
      canSubmitNew: boolean,
      handleSubmit: (event: FormEvent) => void,
      handleNameChange: (event: ChangeEvent<HTMLInputElement>) => void,
      handleDrop: (event: DropEvent) => void,
      handleFileSelect: (files: FileList | null) => void,
      handlePickFile: () => void,
      handleChoiceChange: (choice: 'new' | 'replace') => void,
      handleReplaceConfirm: () => void,
      handleDownloadBackup: () => void,
  }
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/dialogs/importScript/useImportScriptModalState.browser.test.tsx
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import type {StepkgPeekResult} from './types';
import {useImportScriptModalState} from './useImportScriptModalState';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const buildFileList = (file: File): FileList => {
    const transfer = new DataTransfer();

    transfer.items.add(file);

    return transfer.files;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

type Api = ReturnType<typeof useImportScriptModalState>;

const mount = (args: Parameters<typeof useImportScriptModalState>[0]) => {
    let api: Api | null = null;
    const Harness = () => {
        api = useImportScriptModalState(args);
        return null;
    };
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<Harness />);
    mountedRoots.push(root);

    return () => api;
};

describe('useImportScriptModalState', () => {
    it('rejects an unsupported file extension', async () => {
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: true, scriptId: 's', packageTitle: 'T', existingLocalTitle: null} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['x'], 'play.fountain')));
        await waitFor(() => getApi()!.fileError !== null);

        expect(getApi()!.fileError).toBe('Only .stagistic or .stepkg files are supported.');
        expect(getApi()!.selectedFile).toBeNull();
    });

    it('shows the name field immediately for a .stagistic selection', async () => {
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: true, scriptId: 's', packageTitle: 'T', existingLocalTitle: null} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['---\ntitle: X\n---'], 'When Night Falls.stagistic')));
        await waitFor(() => getApi()!.selectedFile !== null);

        expect(getApi()!.showNameField).toBe(true);
        expect(getApi()!.showChoiceToggle).toBe(false);
        expect(getApi()!.name).toBe('When Night Falls');
    });

    it('peeks a .stepkg selection and shows only the name field when there is no collision', async () => {
        const onPeekStepkg = vi.fn(() => Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: null} satisfies StepkgPeekResult));
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg,
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);

        expect(onPeekStepkg).toHaveBeenCalledTimes(1);
        expect(getApi()!.showNameField).toBe(true);
        expect(getApi()!.showChoiceToggle).toBe(false);
        expect(getApi()!.name).toBe('My Play');
        expect(getApi()!.canSubmitNew).toBe(true);
    });

    it('reveals the New/Replace choice on collision, and the replace panel when Replace is selected', async () => {
        const onPeekStepkg = () => Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult);
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg,
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);

        expect(getApi()!.showChoiceToggle).toBe(true);
        expect(getApi()!.importChoice).toBe('new');
        expect(getApi()!.showNameField).toBe(true);
        expect(getApi()!.showReplacePanel).toBe(false);

        getApi()!.handleChoiceChange('replace');
        await waitFor(() => getApi()!.importChoice === 'replace');

        expect(getApi()!.showReplacePanel).toBe(true);
        expect(getApi()!.showNameField).toBe(false);
        expect(getApi()!.canSubmitNew).toBe(false);
    });

    it('surfaces a peek failure as a file error and does not reveal the name field', async () => {
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: false, message: "This file isn't a valid Stagistic package."} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['not a zip'], 'broken.stepkg')));
        await waitFor(() => getApi()!.fileError !== null);

        expect(getApi()!.fileError).toBe("This file isn't a valid Stagistic package.");
        expect(getApi()!.showNameField).toBe(false);
    });

    it('calls onReplaceWithStepkg with the selected bytes when replace is confirmed', async () => {
        const onReplaceWithStepkg = vi.fn(() => Promise.resolve());
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg,
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);
        getApi()!.handleChoiceChange('replace');
        await waitFor(() => getApi()!.showReplacePanel);

        await getApi()!.handleReplaceConfirm();

        expect(onReplaceWithStepkg).toHaveBeenCalledTimes(1);
        expect(onReplaceWithStepkg.mock.calls[0]?.[0]?.fileName).toBe('play.stepkg');
    });

    it('downloads a backup using the peeked script id', async () => {
        const onDownloadStepkgBackup = vi.fn(() => Promise.resolve());
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup,
            onPeekStepkg: () => Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);

        await getApi()!.handleDownloadBackup();

        expect(onDownloadStepkgBackup).toHaveBeenCalledWith('script-1');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run ui:test-browser -- useImportScriptModalState`
Expected: FAIL — current hook signature doesn't match (`onImport` vs `onImportStagistic`, no peek/choice logic).

- [ ] **Step 3: Rewrite `useImportScriptModalState.ts`**

```ts
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    classifyFileKind,
    type DropEvent,
    getFileBaseName,
    isFileDropItem,
    type SelectedFile,
} from './model';
import type {StepkgPeekResult, UseImportScriptModalStateArgs} from './types';

const UNSUPPORTED_FILE_ERROR = 'Only .stagistic or .stepkg files are supported.';

export const useImportScriptModalState = ({
    isOpen,
    onImportStagistic,
    onImportStepkgAsNew,
    onReplaceWithStepkg,
    onDownloadStepkgBackup,
    onPeekStepkg,
    onPickFile,
    preselectedFile,
}: UseImportScriptModalStateArgs) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isPeeking, setIsPeeking] = useState(false);
    const [stepkgPeek, setStepkgPeek] = useState<StepkgPeekResult | null>(null);
    const [importChoice, setImportChoice] = useState<'new' | 'replace'>('new');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setSelectedFile(null);
            setFileError(null);
            setIsPeeking(false);
            setStepkgPeek(null);
            setImportChoice('new');
            setIsProcessing(false);
            setIsDownloadingBackup(false);

            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !preselectedFile) {
            return;
        }

        setSelectedFile({kind: 'stagistic', name: preselectedFile.fileName, text: preselectedFile.text});
        setFileError(null);
        setStepkgPeek(null);
        setImportChoice('new');
        setName(previous => (previous.trim() === '' ? getFileBaseName(preselectedFile.fileName) : previous));
    }, [isOpen, preselectedFile]);

    const fileLabel = useMemo(() => {
        if (!selectedFile) {
            return 'Drop your .stagistic or .stepkg file here';
        }

        return selectedFile.name;
    }, [selectedFile]);

    const peekStepkg = useCallback(async (bytes: Uint8Array) => {
        setIsPeeking(true);

        try {
            const result = await onPeekStepkg(bytes);

            setIsPeeking(false);

            if (!result.ok) {
                setFileError(result.message);
                setStepkgPeek(null);

                return;
            }

            setStepkgPeek(result);
            setImportChoice('new');
            setName(previous => (previous.trim() === '' ? result.packageTitle : previous));
        } catch {
            setIsPeeking(false);
            setFileError('Failed to read the package.');
            setStepkgPeek(null);
        }
    }, [onPeekStepkg]);

    const applyStagisticFile = useCallback((file: {name: string, file?: File, text?: string}) => {
        setSelectedFile({kind: 'stagistic', ...file});
        setFileError(null);
        setStepkgPeek(null);
        setImportChoice('new');
        setName(previous => (previous.trim() === '' ? getFileBaseName(file.name) : previous));
    }, []);

    const applyStepkgFile = useCallback((fileName: string, bytes: Uint8Array) => {
        setSelectedFile({kind: 'stepkg', name: fileName, bytes});
        setFileError(null);
        setStepkgPeek(null);
        void peekStepkg(bytes);
    }, [peekStepkg]);

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleDrop = useCallback(async (event: DropEvent) => {
        const item = event.items.find(isFileDropItem);

        if (!item) {
            setFileError('Please drop a .stagistic or .stepkg file.');

            return;
        }

        const file = await item.getFile();
        const kind = classifyFileKind(file.name);

        if (kind === 'stagistic') {
            applyStagisticFile({name: file.name, file});

            return;
        }

        if (kind === 'stepkg') {
            applyStepkgFile(file.name, new Uint8Array(await file.arrayBuffer()));

            return;
        }

        setFileError(UNSUPPORTED_FILE_ERROR);
        setSelectedFile(null);
    }, [applyStagisticFile, applyStepkgFile]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }

        const file = files[0];
        const kind = file ? classifyFileKind(file.name) : null;

        if (!file || !kind) {
            setFileError(UNSUPPORTED_FILE_ERROR);
            setSelectedFile(null);

            return;
        }

        if (kind === 'stagistic') {
            applyStagisticFile({name: file.name, file});

            return;
        }

        void file.arrayBuffer().then(buffer => applyStepkgFile(file.name, new Uint8Array(buffer)));
    }, [applyStagisticFile, applyStepkgFile]);

    const handlePickFile = useCallback(async () => {
        if (!onPickFile) {
            return;
        }

        try {
            const picked = await onPickFile();

            if (!picked) {
                return;
            }

            applyStagisticFile({name: picked.fileName, text: picked.text});
        } catch (error) {
            console.error('Failed to pick file', error);
            setFileError('Failed to open the file picker.');
        }
    }, [applyStagisticFile, onPickFile]);

    const handleChoiceChange = useCallback((choice: 'new' | 'replace') => {
        setImportChoice(choice);
    }, []);

    const showNameField = selectedFile?.kind === 'stagistic'
        || (selectedFile?.kind === 'stepkg' && stepkgPeek?.ok === true && (stepkgPeek.existingLocalTitle === null || importChoice === 'new'));
    const showChoiceToggle = selectedFile?.kind === 'stepkg' && stepkgPeek?.ok === true && stepkgPeek.existingLocalTitle !== null;
    const showReplacePanel = showChoiceToggle && importChoice === 'replace';
    const canSubmitNew = !isProcessing && !isPeeking && (
        (selectedFile?.kind === 'stagistic' && Boolean(selectedFile.text || selectedFile.file))
        || (selectedFile?.kind === 'stepkg' && Boolean(selectedFile.bytes) && stepkgPeek?.ok === true && !showReplacePanel)
    );

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedFile || isProcessing) {
            return;
        }

        if (selectedFile.kind === 'stagistic') {
            const fileText = selectedFile.text ?? (selectedFile.file ? await selectedFile.file.text() : null);

            if (!fileText) {
                setFileError('Please drop a .stagistic file first.');

                return;
            }

            setFileError(null);
            setIsProcessing(true);

            try {
                await onImportStagistic({name, fileName: selectedFile.name, text: fileText});
            } finally {
                setIsProcessing(false);
            }

            return;
        }

        if (!selectedFile.bytes) {
            setFileError('Please drop a .stepkg file first.');

            return;
        }

        setFileError(null);
        setIsProcessing(true);

        try {
            await onImportStepkgAsNew({fileName: selectedFile.name, bytes: selectedFile.bytes, title: name});
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, name, onImportStagistic, onImportStepkgAsNew, selectedFile]);

    const handleReplaceConfirm = useCallback(async () => {
        if (!selectedFile || selectedFile.kind !== 'stepkg' || !selectedFile.bytes || isProcessing) {
            return;
        }

        setIsProcessing(true);

        try {
            await onReplaceWithStepkg({fileName: selectedFile.name, bytes: selectedFile.bytes});
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, onReplaceWithStepkg, selectedFile]);

    const handleDownloadBackup = useCallback(async () => {
        if (!stepkgPeek?.ok || isDownloadingBackup) {
            return;
        }

        setIsDownloadingBackup(true);

        try {
            await onDownloadStepkgBackup(stepkgPeek.scriptId);
        } finally {
            setIsDownloadingBackup(false);
        }
    }, [isDownloadingBackup, onDownloadStepkgBackup, stepkgPeek]);

    return {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        isProcessing,
        isDownloadingBackup,
        showNameField,
        showChoiceToggle,
        showReplacePanel,
        canSubmitNew,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
        handleChoiceChange,
        handleReplaceConfirm,
        handleDownloadBackup,
    };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `moon run ui:test-browser -- useImportScriptModalState`, then `moon run ui:typecheck`, `moon run ui:lint`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/dialogs/importScript/useImportScriptModalState.ts packages/ui/src/dialogs/importScript/useImportScriptModalState.browser.test.tsx
git commit -m "feat(ui): add .stepkg peek, new/replace choice, and submit logic to the import modal state"
```

---

### Task 8: `ImportScriptModal.tsx` — progressive-disclosure markup

**Files:**
- Modify: `packages/ui/src/dialogs/ImportScriptModal.tsx`
- Modify: `packages/ui/src/dialogs/ImportScriptModal.module.css`
- Modify: `packages/ui/src/dialogs/types.ts`
- Create: `packages/ui/src/dialogs/ImportScriptModal.browser.test.tsx`

**Interfaces:**
- Consumes: Task 7's `useImportScriptModalState`; Task 5's `TypeToConfirmAction`; existing `Notice` (`packages/ui/src/feedback/Notice.tsx`), `ToggleButtonGroup` (`packages/ui/src/molecules/ToggleButtonGroup.tsx`), `Button`, `ModalActions`, `ModalDialog`, `ModalHeader`.
- Produces: `ImportScriptModalProps` (updated), `ImportScriptModal` component (rewritten body, same export name).

- [ ] **Step 1: Update `ImportScriptModalProps` in `types.ts`**

```ts
import type {ReactNode} from 'react';

import type {ImportPayload} from './importScript/model';
import type {ImportScriptFile, StepkgPeekResult} from './importScript/types';

export type NewScriptShape = 'multi-act' | 'one-act';

export interface NewScriptModalProps {
    isOpen: boolean,
    isTransitioning?: boolean,
    onClose: () => void,
    onCreate: (name: string, shape: NewScriptShape) => void | Promise<void>,
}

export interface ImportScriptModalProps {
    isOpen: boolean,
    onClose: () => void,
    onImportStagistic: (payload: ImportPayload) => void | Promise<void>,
    onImportStepkgAsNew: (payload: {fileName: string, bytes: Uint8Array, title: string}) => void | Promise<void>,
    onReplaceWithStepkg: (payload: {fileName: string, bytes: Uint8Array}) => void | Promise<void>,
    onDownloadStepkgBackup: (scriptId: string) => void | Promise<void>,
    onPeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>,
    onPickFile?: () => Promise<ImportScriptFile | null>,
    preselectedFile?: ImportScriptFile | null,
    isLoading?: boolean,
    isDownloadingBackup?: boolean,
}
```

(Keep the rest of the file — `SettingsNav*` types etc. — unchanged.)

- [ ] **Step 2: Write the failing test**

```tsx
// packages/ui/src/dialogs/ImportScriptModal.browser.test.tsx
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';

import {ImportScriptModal} from './ImportScriptModal';
import type {StepkgPeekResult} from './importScript/types';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const buildFileList = (file: File): FileList => {
    const transfer = new DataTransfer();

    transfer.items.add(file);

    return transfer.files;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const selectViaNativeInput = (host: HTMLElement, file: File) => {
    const input = host.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) throw new Error('Expected a native file input');

    Object.defineProperty(input, 'files', {value: buildFileList(file), configurable: true});
    input.dispatchEvent(new Event('change', {bubbles: true}));
};

describe('ImportScriptModal', () => {
    it('shows only the drop zone until a file is selected', () => {
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(
            <ImportScriptModal
                isOpen
                onClose={() => {}}
                onImportStagistic={() => Promise.resolve()}
                onImportStepkgAsNew={() => Promise.resolve()}
                onReplaceWithStepkg={() => Promise.resolve()}
                onDownloadStepkgBackup={() => Promise.resolve()}
                onPeekStepkg={() => Promise.resolve({ok: true, scriptId: 's', packageTitle: 'T', existingLocalTitle: null} satisfies StepkgPeekResult)}
            />,
        );
        mountedRoots.push(root);

        expect(host.querySelector('#import-script-name')).toBeNull();
    });

    it('reveals the New/Replace toggle and the replace panel on a .stepkg collision', async () => {
        const onPeekStepkg = () => Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult);
        const onDownloadStepkgBackup = vi.fn(() => Promise.resolve());
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(
            <ImportScriptModal
                isOpen
                onClose={() => {}}
                onImportStagistic={() => Promise.resolve()}
                onImportStepkgAsNew={() => Promise.resolve()}
                onReplaceWithStepkg={() => Promise.resolve()}
                onDownloadStepkgBackup={onDownloadStepkgBackup}
                onPeekStepkg={onPeekStepkg}
            />,
        );
        mountedRoots.push(root);

        selectViaNativeInput(host, new File(['zip-bytes'], 'play.stepkg'));
        await waitFor(() => host.textContent?.includes('Replace existing') ?? false);

        const replaceOption = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Replace existing'));

        expect(replaceOption).toBeTruthy();
        replaceOption?.click();

        await waitFor(() => host.textContent?.includes('Download backup') ?? false);
        expect(host.querySelector('#import-script-name')).toBeNull();

        const backupButton = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Download backup'));

        backupButton?.click();
        await waitFor(() => onDownloadStepkgBackup.mock.calls.length > 0);
        expect(onDownloadStepkgBackup).toHaveBeenCalledWith('script-1');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `moon run ui:test-browser -- ImportScriptModal`
Expected: FAIL — current component still uses the old `onImport` prop and renders no dynamic sections.

- [ ] **Step 4: Add CSS classes**

Append to `packages/ui/src/dialogs/ImportScriptModal.module.css`:

```css
.hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
}

.replacePanel {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    align-items: flex-start;
}
```

- [ ] **Step 5: Rewrite `ImportScriptModal.tsx`**

```tsx
import {Button} from '../atoms/Button';
import {Notice} from '../feedback/Notice';
import {ToggleButtonGroup} from '../molecules/ToggleButtonGroup';
import {ImportDropZone} from './importScript/ImportDropZone';
import {useImportScriptModalState} from './importScript/useImportScriptModalState';
import styles from './ImportScriptModal.module.css';
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';
import {TypeToConfirmAction} from './TypeToConfirmAction';
import type {ImportScriptModalProps} from './types';

const REPLACE_SCRIPT_CONFIRM_PHRASE = 'replace me';

export const ImportScriptModal = ({
    isOpen,
    onClose,
    onImportStagistic,
    onImportStepkgAsNew,
    onReplaceWithStepkg,
    onDownloadStepkgBackup,
    onPeekStepkg,
    onPickFile,
    preselectedFile,
    isLoading,
    isDownloadingBackup,
}: ImportScriptModalProps) => {
    const {
        inputRef,
        name,
        fileLabel,
        fileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        showNameField,
        showChoiceToggle,
        showReplacePanel,
        canSubmitNew,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
        handleChoiceChange,
        handleReplaceConfirm,
        handleDownloadBackup,
    } = useImportScriptModalState({
        isOpen,
        onImportStagistic,
        onImportStepkgAsNew,
        onReplaceWithStepkg,
        onDownloadStepkgBackup,
        onPeekStepkg,
        onPickFile,
        preselectedFile,
    });

    const existingTitle = stepkgPeek?.ok ? stepkgPeek.existingLocalTitle : null;

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Import script"
        >
            <ModalHeader
                title="Import script"
                description="Bring in a .stagistic or .stepkg file and continue working in the editor."
            />
            <form className={styles.form} onSubmit={handleSubmit}>
                <ImportDropZone
                    fileLabel={fileLabel}
                    hint="Drop a .stagistic or .stepkg file here, or click to browse."
                    acceptedExtensions={['.stagistic', '.stepkg']}
                    onDrop={event => {
                        void handleDrop(event);
                    }}
                    onFileSelect={handleFileSelect}
                    onPickFile={onPickFile ? handlePickFile : undefined}
                />
                {isPeeking ? <p className={styles.hint}>Reading package…</p> : null}
                {fileError ? (
                    <p className={styles.error} role="alert">
                        {fileError}
                    </p>
                ) : null}
                {showChoiceToggle ? (
                    <ToggleButtonGroup
                        ariaLabel="Import mode"
                        options={[
                            {value: 'new', label: 'Import as new copy'},
                            {value: 'replace', label: `Replace existing "${existingTitle}"`},
                        ]}
                        value={importChoice}
                        onChange={handleChoiceChange}
                    />
                ) : null}
                {showNameField ? (
                    <>
                        <label className={styles.label} htmlFor="import-script-name">
                            Script name
                        </label>
                        <input
                            id="import-script-name"
                            ref={inputRef}
                            className={styles.input}
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Untitled script"
                        />
                    </>
                ) : null}
                {showReplacePanel ? (
                    <div className={styles.replacePanel}>
                        <Notice variant="warning">
                            Replacing will overwrite &quot;{existingTitle}&quot; with this package. Local changes made since
                            the last export will be lost.
                        </Notice>
                        <Button
                            variant="secondary"
                            type="button"
                            isPending={isDownloadingBackup}
                            onPress={() => {
                                void handleDownloadBackup();
                            }}
                        >
                            Download backup
                        </Button>
                        <TypeToConfirmAction
                            phrase={REPLACE_SCRIPT_CONFIRM_PHRASE}
                            confirmLabel="Replace script"
                            isPending={isLoading}
                            onConfirm={handleReplaceConfirm}
                        />
                    </div>
                ) : null}
                <ModalActions>
                    {!showReplacePanel ? (
                        <Button
                            variant="primary"
                            type="submit"
                            isDisabled={!canSubmitNew}
                            isPending={isLoading}
                        >
                            Import script
                        </Button>
                    ) : null}
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `moon run ui:test-browser -- ImportScriptModal`, then `moon run ui:test`, `moon run ui:test-browser`, `moon run ui:typecheck`, `moon run ui:lint`.
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/dialogs/ImportScriptModal.tsx packages/ui/src/dialogs/ImportScriptModal.module.css packages/ui/src/dialogs/types.ts packages/ui/src/dialogs/ImportScriptModal.browser.test.tsx
git commit -m "feat(ui): progressive-disclosure .stepkg flow in the import modal"
```

---

### Task 9: Wire `.stepkg` import/restore/backup into `app-routes`

**Files:**
- Modify: `packages/app-routes/src/global-modals/modals/globalModalTypes.ts`
- Modify: `packages/app-routes/src/global-modals/modals/useGlobalModalMutations.ts`
- Modify: `packages/app-routes/src/global-modals/modals/useGlobalModalMutations.browser.test.tsx`
- Modify: `packages/app-routes/src/global-modals/modals/useGlobalModalActions.ts`
- Modify: `packages/app-routes/src/global-modals/modals/GlobalModalsProvider.tsx`

**Interfaces:**
- Consumes: `peekStepkgPackage`, `restoreScriptPackage`, `importScriptPackageAsNew`, `exportScriptPackage` (all from `@stagistic/app-core`); `type ScriptRepository` from `@stagistic/app-core`; `downloadBlob` from `../../routes/script/downloadStagistic`; Task 8's `ImportScriptModalProps`.
- Produces: `useGlobalModalMutations`/`useGlobalModalActions` gain `handleImportStagistic` (renamed from `handleImport`), `handlePeekStepkg`, `handleImportStepkgAsNew`, `handleReplaceWithStepkg`, `handleDownloadStepkgBackup`, and `isDownloadingBackup` state.

- [ ] **Step 1: Update `globalModalTypes.ts`**

Add the import (near the top, alongside existing imports) and extend the interfaces:

```ts
import type {ScriptRepository} from '@stagistic/app-core';
import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';
import type {StepkgPeekResult} from '@stagistic/ui';
import type {NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../../routes/script/types';
```

> Confirm `StepkgPeekResult` is exported from `packages/ui/src/index.ts` (it is a type re-exported through `./dialogs/types` today — if the barrel doesn't already expose it, add `export type {StepkgPeekResult} from './dialogs/importScript/types';` to `packages/ui/src/index.ts` as part of this step).

Add `repository: ScriptRepository` to `UseGlobalModalActionsArgs`:

```ts
export interface UseGlobalModalActionsArgs {
    scriptActions: ScriptActionsAdapter,
    repository: ScriptRepository,
    saveTitlePage: (scriptId: string, settings: TitlePageSettings) => Promise<void>,
    navigation: {
        navigate: NavigateFunction,
    },
    notifications: {
        addToast: (toast: AppToastPayload) => void,
    },
}
```

In `GlobalModalActions`, rename `handleImport` to `handleImportStagistic` and add the four new handlers plus `isDownloadingBackup`:

```ts
export interface GlobalModalActions {
    isNewScriptOpen: boolean,
    newScriptTransitionPath: string | null,
    isImportOpen: boolean,
    prefilledImport: ScriptImportFile | null,
    isImportLoading: boolean,
    isDownloadingBackup: boolean,
    scriptToDelete: ScriptToDelete | null,
    isDeleteScriptOpen: boolean,
    isDeleting: boolean,
    scriptToRename: ScriptToRename | null,
    isRenameScriptOpen: boolean,
    isRenaming: boolean,
    scriptToDuplicate: ScriptToDuplicate | null,
    isDuplicateScriptOpen: boolean,
    isDuplicating: boolean,
    openNewScript: () => void,
    closeNewScript: () => void,
    completeNewScriptTransition: () => void,
    openImportScript: () => void,
    closeImportScript: () => void,
    openDeleteScript: (script: ScriptToDelete) => void,
    closeDeleteScript: () => void,
    openRenameScript: (script: ScriptToRename) => void,
    closeRenameScript: () => void,
    openDuplicateScript: (script: ScriptToDuplicate) => void,
    closeDuplicateScript: () => void,
    setPrefilledImport: (value: ScriptImportFile | null) => void,
    handleCreate: (name: string, shape: NewScriptShape) => Promise<void>,
    handleImportStagistic: (payload: ScriptImportFile & {name: string}) => Promise<void>,
    handlePeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>,
    handleImportStepkgAsNew: (payload: {fileName: string, bytes: Uint8Array, title: string}) => Promise<void>,
    handleReplaceWithStepkg: (payload: {fileName: string, bytes: Uint8Array}) => Promise<void>,
    handleDownloadStepkgBackup: (scriptId: string) => Promise<void>,
    handleDelete: () => Promise<void>,
    handleRename: (values: {title: string, subtitle: string}) => Promise<void>,
    handleDuplicate: (values: {
        title: string,
        copySettings: boolean,
        copyAttributes: boolean,
        openInEditor: boolean,
    }) => Promise<void>,
}
```

- [ ] **Step 2: Update `useGlobalModalMutations.ts`**

Add imports:

```ts
import {exportScriptPackage, importScriptPackageAsNew, peekStepkgPackage, restoreScriptPackage, trimOrFallback} from '@stagistic/app-core';
```

> `trimOrFallback` already comes from `@stagistic/script` today — keep that import as-is; the four new functions come from `@stagistic/app-core`, which this file does not yet import. Add a second import line rather than merging if `@stagistic/app-core` isn't already imported here.

```ts
import {downloadBlob} from '../../routes/script/downloadStagistic';
```

Add `repository: ScriptRepository` and `setIsDownloadingBackup` to `UseGlobalModalMutationsArgs` (extend the existing `Pick<UseGlobalModalActionsArgs, 'saveTitlePage' | 'scriptActions'>` to also pick `'repository'`, and add `setIsDownloadingBackup: Dispatch<SetStateAction<boolean>>`):

```ts
interface UseGlobalModalMutationsArgs extends Pick<
    UseGlobalModalActionsArgs,
    'saveTitlePage' | 'scriptActions' | 'repository'
> {
    navigate: UseGlobalModalActionsArgs['navigation']['navigate'],
    addToast: (toast: AppToastPayload) => void,
    scriptToDelete: ScriptToDelete | null,
    scriptToRename: ScriptToRename | null,
    scriptToDuplicate: ScriptToDuplicate | null,
    setNewScriptTransitionPath: Dispatch<SetStateAction<string | null>>,
    setIsImportOpen: Dispatch<SetStateAction<boolean>>,
    setIsImportLoading: Dispatch<SetStateAction<boolean>>,
    setIsDownloadingBackup: Dispatch<SetStateAction<boolean>>,
    setPrefilledImport: Dispatch<SetStateAction<ScriptImportFile | null>>,
    setScriptToDelete: Dispatch<SetStateAction<ScriptToDelete | null>>,
    setIsDeleting: Dispatch<SetStateAction<boolean>>,
    setScriptToRename: Dispatch<SetStateAction<ScriptToRename | null>>,
    setIsRenaming: Dispatch<SetStateAction<boolean>>,
    setScriptToDuplicate: Dispatch<SetStateAction<ScriptToDuplicate | null>>,
    setIsDuplicating: Dispatch<SetStateAction<boolean>>,
}
```

In the destructured params of `useGlobalModalMutations`, add `repository` and `setIsDownloadingBackup`. Rename `handleImport` to `handleImportStagistic` (body unchanged — only the name and its references change). After it, add:

```ts
const PEEK_ERROR_MESSAGES: Record<string, string> = {
    not_a_zip: "This file isn't a valid Stagistic package.",
    manifest_invalid: "This file isn't a valid Stagistic package.",
    unsupported_format_version: 'This package was created by an incompatible version of Stagistic.',
    unsupported_document_schema_version: 'This package was created by a newer version of Stagistic. Update the app to import it.',
};
const DEFAULT_PEEK_ERROR = "This file isn't a valid Stagistic package.";
const PACKAGE_SUBMIT_ERROR = 'This package appears to be corrupted or incomplete. Try exporting it again.';

const handlePeekStepkg = useCallback(async (bytes: Uint8Array) => {
    const result = await peekStepkgPackage({repository, bytes});

    if (!result.ok) {
        const code = result.issues[0]?.code;

        return {ok: false as const, message: (code && PEEK_ERROR_MESSAGES[code]) || DEFAULT_PEEK_ERROR};
    }

    return {
        ok: true as const,
        scriptId: result.scriptId,
        packageTitle: result.packageTitle,
        existingLocalTitle: result.existingScript?.title ?? null,
    };
}, [repository]);

const handleImportStepkgAsNew = useCallback(async (payload: {fileName: string, bytes: Uint8Array, title: string}) => {
    setIsImportLoading(true);

    try {
        const result = await importScriptPackageAsNew({repository, bytes: payload.bytes, title: payload.title});

        if (!result.ok) {
            throw new Error(PACKAGE_SUBMIT_ERROR);
        }

        setIsImportOpen(false);
        setPrefilledImport(null);
        void navigate(`/script/${result.scriptId}/editor`);
        addToast({title: 'Script imported', description: result.title, variant: 'success'});
    } catch (error) {
        console.error('Failed to import script');
        addToast({
            title: 'Failed to import script',
            description: error instanceof Error ? error.message : 'Please check the file and try again.',
            variant: 'error',
        });
    } finally {
        setIsImportLoading(false);
    }
}, [addToast, navigate, repository, setIsImportLoading, setIsImportOpen, setPrefilledImport]);

const handleReplaceWithStepkg = useCallback(async (payload: {fileName: string, bytes: Uint8Array}) => {
    setIsImportLoading(true);

    try {
        const result = await restoreScriptPackage({repository, bytes: payload.bytes});

        if (!result.ok) {
            throw new Error(PACKAGE_SUBMIT_ERROR);
        }

        setIsImportOpen(false);
        setPrefilledImport(null);
        void navigate(`/script/${result.scriptId}/editor`);
        addToast({title: 'Script replaced', description: result.title, variant: 'success'});
    } catch (error) {
        console.error('Failed to replace script');
        addToast({
            title: 'Failed to import script',
            description: error instanceof Error ? error.message : 'Please check the file and try again.',
            variant: 'error',
        });
    } finally {
        setIsImportLoading(false);
    }
}, [addToast, navigate, repository, setIsImportLoading, setIsImportOpen, setPrefilledImport]);

const handleDownloadStepkgBackup = useCallback(async (scriptId: string) => {
    setIsDownloadingBackup(true);

    try {
        const result = await exportScriptPackage({repository, scriptId, generator: {name: 'Stagistic', version: 'web'}});

        if (result.ok) {
            downloadBlob(result.fileName, result.blob);
        }
    } finally {
        setIsDownloadingBackup(false);
    }
}, [repository, setIsDownloadingBackup]);
```

Update the hook's return object to expose the renamed and new handlers (`handleImportStagistic, handlePeekStepkg, handleImportStepkgAsNew, handleReplaceWithStepkg, handleDownloadStepkgBackup` alongside the existing `handleCreate, handleDelete, handleRename, handleDuplicate`).

- [ ] **Step 3: Update the existing `useGlobalModalMutations.browser.test.tsx` harness**

The `Harness` component's `useGlobalModalMutations({...})` call must now also pass `repository` and `setIsDownloadingBackup`:

```tsx
({handleCreate} = useGlobalModalMutations({
    scriptActions: {
        createScript: () => Promise.resolve('script-1'),
        renameScript: () => Promise.resolve(),
        duplicateScript: () => Promise.resolve('script-copy'),
        deleteScript: () => Promise.resolve(),
    },
    repository: {} as ScriptRepository,
    saveTitlePage: () => Promise.resolve(),
    navigate,
    addToast: vi.fn(),
    scriptToDelete: null,
    scriptToRename: null,
    scriptToDuplicate: null,
    setNewScriptTransitionPath,
    setIsImportOpen: noopSetter,
    setIsImportLoading: noopSetter,
    setIsDownloadingBackup: noopSetter,
    setPrefilledImport: noopSetter,
    setScriptToDelete: noopSetter,
    setIsDeleting: noopSetter,
    setScriptToRename: noopSetter,
    setIsRenaming: noopSetter,
    setScriptToDuplicate: noopSetter,
    setIsDuplicating: noopSetter,
}));
```

Add `import type {ScriptRepository} from '@stagistic/app-core';` to the test file's imports. The existing test only exercises `handleCreate`, so `repository: {} as ScriptRepository` is safe — it is never called in that test.

- [ ] **Step 4: Update `useGlobalModalActions.ts`**

Accept and thread `repository`, add `isDownloadingBackup` state, pass `setIsDownloadingBackup` into `useGlobalModalMutations`, and include `isDownloadingBackup` plus the new handlers in the returned object and its `useMemo` dependency array:

```ts
export const useGlobalModalActions = ({
    scriptActions,
    repository,
    saveTitlePage,
    navigation,
    notifications,
}: UseGlobalModalActionsArgs): GlobalModalActions => {
    const {navigate} = navigation;
    const {addToast} = notifications;
    const [isNewScriptOpen, setIsNewScriptOpen] = useState(false);
    const [newScriptTransitionPath, setNewScriptTransitionPath] = useState<string | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
    const [prefilledImport, setPrefilledImport] = useState<ScriptImportFile | null>(null);
    // ...rest of the existing state declarations unchanged...

    const mutations = useGlobalModalMutations({
        scriptActions,
        repository,
        saveTitlePage,
        navigate,
        addToast,
        scriptToDelete,
        scriptToRename,
        scriptToDuplicate,
        setNewScriptTransitionPath,
        setIsImportOpen,
        setIsImportLoading,
        setIsDownloadingBackup,
        setPrefilledImport,
        setScriptToDelete,
        setIsDeleting,
        setScriptToRename,
        setIsRenaming,
        setScriptToDuplicate,
        setIsDuplicating,
    });

    return useMemo(() => ({
        isNewScriptOpen,
        newScriptTransitionPath,
        isImportOpen,
        prefilledImport,
        isImportLoading,
        isDownloadingBackup,
        // ...rest unchanged...
        ...mutations,
    }), [
        // ...existing deps, plus:
        isDownloadingBackup,
        // ...
    ]);
};
```

(Apply this as a targeted edit to the existing file — add `repository` to the destructured args, add the `isDownloadingBackup` state pair, pass both into `useGlobalModalMutations`, and add `isDownloadingBackup` to both the returned object and the `useMemo` dependency array. Every other line stays as it is today.)

- [ ] **Step 5: Update `GlobalModalsProvider.tsx`**

Pass `repository: scriptRepository` into `useGlobalModalActions`, destructure the new state/handlers, and update the `<ImportScriptModal>` JSX to the new prop names:

```tsx
const {
    isNewScriptOpen,
    newScriptTransitionPath,
    isImportOpen,
    prefilledImport,
    isImportLoading,
    isDownloadingBackup,
    scriptToDelete,
    isDeleteScriptOpen,
    isDeleting,
    scriptToRename,
    isRenameScriptOpen,
    isRenaming,
    scriptToDuplicate,
    isDuplicateScriptOpen,
    isDuplicating,
    openNewScript,
    closeNewScript,
    completeNewScriptTransition,
    openImportScript,
    closeImportScript,
    openDeleteScript,
    closeDeleteScript,
    openRenameScript,
    closeRenameScript,
    openDuplicateScript,
    closeDuplicateScript,
    handleCreate,
    handleImportStagistic,
    handlePeekStepkg,
    handleImportStepkgAsNew,
    handleReplaceWithStepkg,
    handleDownloadStepkgBackup,
    handleDelete,
    handleRename,
    handleDuplicate,
} = useGlobalModalActions({
    scriptActions,
    repository: scriptRepository,
    saveTitlePage,
    navigation: {
        navigate,
    },
    notifications: {
        addToast,
    },
});
```

```tsx
<ImportScriptModal
    isOpen={isImportOpen}
    onClose={closeImportScript}
    onImportStagistic={handleImportStagistic}
    onImportStepkgAsNew={handleImportStepkgAsNew}
    onReplaceWithStepkg={handleReplaceWithStepkg}
    onDownloadStepkgBackup={handleDownloadStepkgBackup}
    onPeekStepkg={handlePeekStepkg}
    preselectedFile={prefilledImport}
    isLoading={isImportLoading}
    isDownloadingBackup={isDownloadingBackup}
/>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `moon run app-routes:test`, `moon run app-routes:test-browser`, `moon run app-routes:typecheck`, `moon run app-routes:lint`.
Expected: all PASS.

- [ ] **Step 7: Full cross-package verification**

Run, in order: `moon run stepkg:test`, `moon run db:test`, `moon run app-core:test`, `moon run ui:test`, `moon run ui:test-browser`, `moon run app-routes:test`, `moon run app-routes:test-browser`, then `moon run stepkg:typecheck`, `moon run db:typecheck`, `moon run app-core:typecheck`, `moon run ui:typecheck`, `moon run app-routes:typecheck`, then the same five packages' `:lint` tasks.
Expected: all green, aside from the two pre-existing unrelated lint failures already noted (`db/src/repo/attachments.ts:41`, `app-core/src/collections/createReactiveCollection.test.ts:148`).

- [ ] **Step 8: Commit**

```bash
git add packages/app-routes/src/global-modals/modals/globalModalTypes.ts packages/app-routes/src/global-modals/modals/useGlobalModalMutations.ts packages/app-routes/src/global-modals/modals/useGlobalModalMutations.browser.test.tsx packages/app-routes/src/global-modals/modals/useGlobalModalActions.ts packages/app-routes/src/global-modals/modals/GlobalModalsProvider.tsx packages/ui/src/index.ts
git commit -m "feat(app-routes): wire .stepkg peek, import-as-new, replace, and backup into the import modal"
```

---

## Self-Review

**Spec coverage:**
- §2 full-replace semantics, immediate collision detection, no dead Replace option, type-to-confirm + backup, `packages/ui` dependency boundary, Home-route-only scope, shared `TypeToConfirmAction` → Tasks 2, 3, 7, 5. ✓
- §3 modal flow (progressive disclosure, peek before name field, New/Replace default, inline replace panel) → Tasks 7, 8. ✓
- §4 `peekStepkgPackage`, `restoreScriptFromPackage`/`restoreScriptPackage`, backup reuse of `exportScriptPackage`/`downloadBlob` → Tasks 1, 2, 3, 4, 9. ✓
- §5 UI/data flow, prop renames, `SelectedFile` union, app-routes wiring → Tasks 6, 7, 8, 9. ✓
- §6 copy (peek errors, submit error, hints, replace warning, success toasts) → Tasks 8 (rendered copy), 9 (`PEEK_ERROR_MESSAGES`, `PACKAGE_SUBMIT_ERROR`, toast copy). ✓
- §7 `TypeToConfirmAction` generalization, both existing call sites updated → Task 5. ✓
- §8 testing (db full-replace + rollback-preserves-original + blob cleanup; app-core peek/restore; ui file-detection/peek-states/choice/confirm-gating; app-routes handler wiring) → Tasks 1, 2, 3, 4, 7, 8, 9. ✓
- §9/§10 non-goals and success criteria are all negative constraints or already covered by the above — no task contradicts them (no native picker touched, no merge logic, Home-route-only, standalone `.stagistic` behavior unchanged aside from the `handleImportStagistic` rename). ✓

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N" — every step has literal code or an exact command. The one spot needing executor judgment (`StepkgPeekResult` barrel export in `packages/ui/src/index.ts`, Task 9 Step 1) is flagged as a concrete "confirm and add if missing" instruction, not deferred work.

**Type consistency:** `StepkgPeekResult` defined once in Task 6 (`packages/ui/src/dialogs/importScript/types.ts`) and consumed unchanged by Tasks 7, 8, 9. `ScriptPackageWrite` reused as-is (no new type) by Task 2's `restoreScriptFromPackage`. `StepkgImportResult` reused as-is (no new type) by Task 4's `restoreScriptPackage`. Hook return shape defined in Task 7 matches exactly what Task 8's JSX destructures. `ImportScriptModalProps` field names (`onImportStagistic`, `onImportStepkgAsNew`, `onReplaceWithStepkg`, `onDownloadStepkgBackup`, `onPeekStepkg`) are identical across Tasks 6 (types.ts draft superseded by Task 8's final version — Task 8 Step 1 is the authoritative final shape), 8, and 9's `GlobalModalsProvider` JSX. `GlobalModalActions`/`UseGlobalModalMutationsArgs` handler names (`handleImportStagistic`, `handlePeekStepkg`, `handleImportStepkgAsNew`, `handleReplaceWithStepkg`, `handleDownloadStepkgBackup`) match across Task 9's three files.
