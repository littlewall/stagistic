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
            id: 'c1',
            key: 'MARA',
            colorHex: null,
            genderKey: null,
            notes: null,
            backstory: null,
            outline: null,
            voiceType: null,
            vocalRangeLow: null,
            vocalRangeHigh: null,
            createdAt: 1_000,
            updatedAt: 1_000,
        },
    ],
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
                    id: 'c2',
                    key: 'JUNO',
                    colorHex: null,
                    genderKey: null,
                    notes: null,
                    backstory: null,
                    outline: null,
                    voiceType: null,
                    vocalRangeLow: null,
                    vocalRangeHigh: null,
                    createdAt: 5_000,
                    updatedAt: 5_000,
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
            attachments: [
                {id: 'a2', filename: 'new.pdf', mimeType: 'application/pdf', sizeBytes: 3, blob: new Blob(['new']), createdAt: 5_000, updatedAt: 5_000},
            ],
        };

        await expect(repository.restoreScriptFromPackage(broken)).rejects.toBeTruthy();

        expect(await fileStorage.get(oldAttachmentKey)).not.toBeNull();
        const stillOriginal = await repository.getScriptPackageSource('script-1');
        expect(stillOriginal?.attachments.map(attachment => attachment.id)).toEqual(['a1']);
    });
});
