import {parseStagistic} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../storage/fileStorage';
import {createTestDb} from '../testing/createTestDb';
import type {ScriptPackageWrite} from '../types/scriptPackageWrite';
import type {CreateScriptSnapshotInput} from '../types/scriptRepository';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

const SCRIPT_ID = 'script-1';

const packageWrite = (overrides: Partial<ScriptPackageWrite> = {}): ScriptPackageWrite => ({
    script: {
        id: SCRIPT_ID,
        title: 'The door',
        subtitle: null,
        createdAt: 1_000,
        updatedAt: 1_000,
    },
    document: parseStagistic('# Act One\n\n## Scene One\n\nThe room is dark.\n').document,
    titlePage: {},
    settings: {},
    characters: [],
    groups: [],
    genders: [],
    music: [
        {
            id: 'm1',
            sceneNumber: 1,
            indexInScene: 0,
            mode: 'open',
            title: 'Song',
            kind: null,
            startBlockId: null,
            endBlockId: null,
            createdAt: 1_000,
            updatedAt: 1_000,
        },
    ],
    locations: [],
    scenes: [],
    attachments: [
        {
            id: 'a1',
            filename: 'score.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            blob: new Blob(['pdf']),
            createdAt: 1_000,
            updatedAt: 1_000,
        },
    ],
    bindings: [
        {
            musicId: 'm1',
            attachmentId: 'a1',
            role: 'integrated_score',
            sortOrder: 0,
            createdAt: 1_000,
        },
    ],
    comments: {threads: [], messages: []},
    ...overrides,
});

const setup = async () => {
    const {db} = await createTestDb();
    const fileStorage = new InMemoryFileStorage();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage,
    });

    await repository.createScriptFromPackage(packageWrite());

    const source = await repository.getScriptPackageSource(SCRIPT_ID);
    const attachmentKey = source!.attachments[0].storageKey;
    let nextId = 0;
    const snapshotInput = (input: Partial<CreateScriptSnapshotInput> = {}): CreateScriptSnapshotInput => {
        nextId += 1;

        return {
            id: `snapshot-${nextId}`,
            kind: 'draft',
            payload: new Blob([`payload-${nextId}`]),
            documentSchemaVersion: 4,
            summaryMetadata: null,
            attachmentStorageKeys: [attachmentKey],
            ...input,
        };
    };

    return {
        repository,
        fileStorage,
        attachmentKey,
        snapshotInput,
    };
};

describe('script snapshots', () => {
    it('numbers drafts from a counter that never reuses a deleted number', async () => {
        const {repository, snapshotInput} = await setup();

        const first = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput({note: '  first  pass '}));
        const second = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());

        expect(first).toMatchObject({
            kind: 'draft',
            number: 1,
            name: null,
            note: 'first pass',
        });
        expect(second?.number).toBe(2);

        await repository.deleteScriptSnapshot(SCRIPT_ID, second!.id);

        const third = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());

        expect(third?.number).toBe(3);
        expect((await repository.listScriptSnapshots(SCRIPT_ID)).map(snapshot => snapshot.number)).toEqual([3, 1]);
    });

    it('requires a name for a version and gives it no draft number', async () => {
        const {repository, snapshotInput} = await setup();

        await expect(repository.createScriptSnapshot(SCRIPT_ID, snapshotInput({kind: 'version', name: '  '}))).rejects.toThrow('A version needs a name.');

        const version = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput({kind: 'version', name: 'Edinburgh Fringe 2026'}));

        expect(version).toMatchObject({
            kind: 'version',
            number: null,
            name: 'Edinburgh Fringe 2026',
        });
        expect((await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput()))?.number).toBe(1);
    });

    it('marks a draft as a version and keeps its number', async () => {
        const {repository, snapshotInput} = await setup();
        const draft = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput({note: 'new final monologue'}));

        await expect(repository.updateScriptSnapshot(SCRIPT_ID, draft!.id, {kind: 'version'})).rejects.toThrow('A version needs a name.');

        const version = await repository.updateScriptSnapshot(SCRIPT_ID, draft!.id, {kind: 'version', name: 'Festival'});

        expect(version).toMatchObject({
            kind: 'version',
            number: 1,
            name: 'Festival',
            note: 'new final monologue',
        });

        const renamed = await repository.updateScriptSnapshot(SCRIPT_ID, draft!.id, {name: 'Festival cut', note: null});

        expect(renamed).toMatchObject({
            kind: 'version',
            name: 'Festival cut',
            note: null,
        });
    });

    it('stores the payload outside the database and removes it with the snapshot', async () => {
        const {
            repository,
            fileStorage,
            snapshotInput,
        } = await setup();
        const snapshot = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());
        const payload = await repository.loadScriptSnapshotPayload(SCRIPT_ID, snapshot!.id);

        expect(await payload?.text()).toBe('payload-1');
        expect(snapshot?.payloadByteLength).toBe(9);

        await repository.deleteScriptSnapshot(SCRIPT_ID, snapshot!.id);

        expect(await fileStorage.get(snapshot!.payloadStorageKey)).toBeNull();
        expect(await repository.getScriptSnapshot(SCRIPT_ID, snapshot!.id)).toBeNull();
    });

    it('keeps attachment blobs referenced by a snapshot until the last reference goes', async () => {
        const {
            repository,
            fileStorage,
            attachmentKey,
            snapshotInput,
        } = await setup();
        const snapshot = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());

        await repository.removeMusicAttachment(SCRIPT_ID, 'm1', 'integrated_score');

        expect(await fileStorage.get(attachmentKey)).not.toBeNull();

        await repository.deleteScriptSnapshot(SCRIPT_ID, snapshot!.id);

        expect(await fileStorage.get(attachmentKey)).toBeNull();
    });

    it('keeps snapshot-referenced blobs when a package replace drops the attachment', async () => {
        const {
            repository,
            fileStorage,
            attachmentKey,
            snapshotInput,
        } = await setup();

        await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());
        await repository.restoreScriptFromPackage(packageWrite({attachments: [], bindings: []}));

        expect(await fileStorage.get(attachmentKey)).not.toBeNull();
        expect(await repository.listScriptSnapshots(SCRIPT_ID)).toHaveLength(1);
    });

    it('reuses an existing blob instead of copying it', async () => {
        const {
            repository,
            fileStorage,
            attachmentKey,
            snapshotInput,
        } = await setup();

        await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());
        await repository.restoreScriptFromPackage(packageWrite({
            attachments: [
                {
                    id: 'a1',
                    filename: 'score.pdf',
                    mimeType: 'application/pdf',
                    sizeBytes: 3,
                    existingStorageKey: attachmentKey,
                    createdAt: 1_000,
                    updatedAt: 1_000,
                },
            ],
        }));

        const source = await repository.getScriptPackageSource(SCRIPT_ID);

        expect(source?.attachments.map(attachment => attachment.storageKey)).toEqual([attachmentKey]);
        expect(await fileStorage.get(attachmentKey)).not.toBeNull();
    });

    it('removes snapshots and their blobs with the script', async () => {
        const {
            repository,
            fileStorage,
            attachmentKey,
            snapshotInput,
        } = await setup();
        const snapshot = await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());

        await repository.removeMusicAttachment(SCRIPT_ID, 'm1', 'integrated_score');
        await repository.deleteScript(SCRIPT_ID);

        expect(await fileStorage.get(snapshot!.payloadStorageKey)).toBeNull();
        expect(await fileStorage.get(attachmentKey)).toBeNull();
    });

    it('leaves the draft counter untouched by a package replace', async () => {
        const {repository, snapshotInput} = await setup();

        await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput());
        await repository.restoreScriptFromPackage(packageWrite());

        expect((await repository.createScriptSnapshot(SCRIPT_ID, snapshotInput()))?.number).toBe(2);
    });
});
