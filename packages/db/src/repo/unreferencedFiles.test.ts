import {getUuidv7Timestamp, requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../storage/fileStorage';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';
import {UNREFERENCED_FILE_MIN_AGE_MS} from './unreferencedFiles';

const SCRIPT_ID = 'script-1';

const setup = async () => {
    const {db} = await createTestDb();
    const fileStorage = new InMemoryFileStorage();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage,
    });

    await seedScript(db, SCRIPT_ID);

    const snapshot = requireValue(await repository.createScriptSnapshot(SCRIPT_ID, {
        id: repository.allocateScriptSnapshotId(),
        kind: 'draft',
        payload: new Blob(['payload']),
        documentSchemaVersion: 1,
        summaryMetadata: null,
        attachmentStorageKeys: [],
    }));

    return {
        fileStorage,
        repository,
        snapshot,
    };
};

describe('collectUnreferencedFiles', () => {
    it('keeps blobs a row references and deletes the rest', async () => {
        const {
            fileStorage,
            repository,
            snapshot,
        } = await setup();
        const orphanKey = await fileStorage.save(new Blob(['orphan']));

        expect(await repository.collectUnreferencedFiles({minAgeMs: 0})).toBe(1);
        expect(await fileStorage.get(orphanKey)).toBeNull();
        expect(await fileStorage.get(snapshot.payloadStorageKey)).not.toBeNull();
    });

    it('keeps young blobs another tab may not have committed yet', async () => {
        const {fileStorage, repository} = await setup();
        const orphanKey = await fileStorage.save(new Blob(['orphan']));
        const savedAt = requireValue(getUuidv7Timestamp(orphanKey));

        expect(await repository.collectUnreferencedFiles({now: savedAt + UNREFERENCED_FILE_MIN_AGE_MS - 1})).toBe(0);
        expect(await fileStorage.get(orphanKey)).not.toBeNull();

        expect(await repository.collectUnreferencedFiles({now: savedAt + UNREFERENCED_FILE_MIN_AGE_MS})).toBe(1);
        expect(await fileStorage.get(orphanKey)).toBeNull();
    });

    it('keeps the payload of a deleted snapshot until collection', async () => {
        const {
            fileStorage,
            repository,
            snapshot,
        } = await setup();

        await repository.deleteScriptSnapshot(SCRIPT_ID, snapshot.id);

        expect(await fileStorage.get(snapshot.payloadStorageKey)).not.toBeNull();
    });
});
