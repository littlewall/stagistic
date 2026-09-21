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

const write = (): ScriptPackageWrite => ({
    script: {id: 'imported-1', title: 'Imported', subtitle: null, createdAt: 1_000, updatedAt: 2_000},
    document: parseStagistic(source).document,
    titlePage: {source: 'Original'},
    settings: {visual: {characterColorSaturation: 0.4}},
    characters: [],
    groups: [],
    genders: [],
    music: [],
    locations: [],
    scenes: [],
    attachments: [],
    bindings: [],
});

const makeRepository = (db: Awaited<ReturnType<typeof createTestDb>>['db'], fileStorage = new InMemoryFileStorage()) =>
    createLocalPgliteRepository({getLocalDb: () => Promise.resolve(db), syncToFs: () => Promise.resolve(), fileStorage});

describe('createScriptFromPackage', () => {
    it('materializes a full script in one transaction', async () => {
        const {db} = await createTestDb();
        const repository = makeRepository(db);

        await repository.createScriptFromPackage(write());

        const source = await repository.getScriptPackageSource('imported-1');
        expect(source?.script.title).toBe('Imported');
        expect(source?.titlePage).toMatchObject({source: 'Original'});
        expect(source?.settings).toMatchObject({visual: {characterColorSaturation: 0.4}});
        expect(source?.document.content.length ?? 0).toBeGreaterThan(0);
    });

    it('materializes characters, groups, genders, locations, music, scenes and attachments', async () => {
        const {db} = await createTestDb();
        const fileStorage = new InMemoryFileStorage();
        const repository = makeRepository(db, fileStorage);
        const input = write();
        input.characters = [
            {
                id: 'c1',
                key: 'MARA',
                colorHex: '#ff0000',
                genderKey: 'f',
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: 1_000,
                updatedAt: 1_000,
            },
        ];
        input.genders = [{id: 'gd1', key: 'f', label: 'Female', createdAt: 1_000, updatedAt: 1_000}];
        input.groups = [{id: 'g1', key: 'FAMILY', colorHex: null, memberIds: ['c1'], createdAt: 1_000, updatedAt: 1_000}];
        input.locations = [{id: 'l1', name: 'Kitchen', description: null, createdAt: 1_000, updatedAt: 1_000}];
        input.music = [
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
        ];
        input.attachments = [
            {id: 'a1', filename: 'score.pdf', mimeType: 'application/pdf', sizeBytes: 3, blob: new Blob(['pdf']), createdAt: 1_000, updatedAt: 1_000},
        ];
        input.bindings = [{musicId: 'm1', attachmentId: 'a1', role: 'integrated_score', sortOrder: 0, createdAt: 1_000}];

        await repository.createScriptFromPackage(input);

        const source = await repository.getScriptPackageSource('imported-1');
        expect(source?.characters.some(character => character.id === 'c1')).toBe(true);
        expect(source?.characterGenders.some(gender => gender.id === 'gd1')).toBe(true);
        expect(source?.characterGroupMembers).toContainEqual({groupId: 'g1', characterId: 'c1'});
        expect(source?.locations.some(location => location.id === 'l1')).toBe(true);
        expect(source?.music.some(item => item.id === 'm1')).toBe(true);
        expect(source?.attachments.some(attachment => attachment.id === 'a1')).toBe(true);
        expect(source?.musicAttachmentBindings.some(binding => binding.attachmentId === 'a1')).toBe(true);

        const blob = await fileStorage.get(source!.attachments.find(attachment => attachment.id === 'a1')!.storageKey);
        expect(blob).not.toBeNull();
    });

    it('rolls back and cleans blobs when the document is invalid', async () => {
        const {db} = await createTestDb();
        const fileStorage = new InMemoryFileStorage();
        const repository = makeRepository(db, fileStorage);
        const broken = write();
        broken.document = {type: 'doc'} as ScriptPackageWrite['document'];
        broken.attachments = [{id: 'a1', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 3, blob: new Blob(['pdf']), createdAt: 1, updatedAt: 1}];

        await expect(repository.createScriptFromPackage(broken)).rejects.toBeTruthy();
        expect(await repository.getScriptSummary('imported-1')).toBeNull();
    });
});
