import {createLocalPgliteRepository, InMemoryFileStorage} from '@stagistic/db';
import {createTestDb, loadMigratedDataDir} from '@stagistic/db/testing';
import type {ScriptDocument} from '@stagistic/script';
import {createStepkg} from '@stagistic/stepkg';
import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createSnapshotViewRepository} from '../snapshots/createSnapshotViewRepository';
import {
    createScriptSnapshotFromCurrent,
    loadScriptSnapshot,
    restoreScriptSnapshot,
} from '../snapshots/scriptSnapshotOperations';
import {importScriptPackageAsNew} from '../stepkg/importScriptPackageAsNew';
import {mapScriptPackageSourceToStepkg} from '../stepkg/mapScriptPackageSource';

// Cold migrations are fixture setup, as in the db project's shared test setup.
beforeAll(async () => {
    await loadMigratedDataDir();
});

const doc = (headings: string[]): ScriptDocument => ({
    type: 'doc',
    content: headings.map(id => ({
        type: 'scene',
        attrs: {id},
        content: [{type: 'text', text: id}],
    })),
});
const setup = async () => {
    const {db} = await createTestDb();
    const fileStorage = new InMemoryFileStorage();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage,
    });

    await repository.createScriptWithId({
        id: 's1',
        title: 'Test',
        initialContent: doc(['h1', 'h2']),
    });
    await repository.confirmScriptCharacterWithId('s1', {id: 'c1', key: 'ANNA'});
    await repository.putSceneCharacter('s1', 'h1', 'c1', {note: 'Waits', arcValue: 2});
    await repository.putSceneCharacter('s1', 'h2', 'c1', {note: 'Leaves'});
    await repository.updateSceneSynopsis('s1', 'h1', 'Waiting');

    return {repository, fileStorage};
};

describe('scene metadata snapshot and package integration', () => {
    it('imports a package beside its source with independent headings, characters and metadata', async () => {
        const {repository} = await setup();
        const source = await repository.getScriptPackageSource('s1');

        if (!source) throw new Error('Missing source');

        const exported = await createStepkg({
            snapshot: mapScriptPackageSourceToStepkg(source),
            generator: {name: 'Test', version: '1'},
            createdAt: new Date(),
            loadAsset: () => Promise.resolve(null),
        });

        if (!exported.ok) throw new Error(JSON.stringify(exported.issues));

        const imported = await importScriptPackageAsNew({repository, bytes: new Uint8Array(await exported.blob.arrayBuffer())});

        expect(imported.ok).toBe(true);

        if (!imported.ok) return;

        const copy = await repository.getScriptPackageSource(imported.scriptId);

        expect(copy?.sceneCharacters).toHaveLength(2);
        expect(copy?.sceneCharacters[0]).toMatchObject({note: 'Waits', arcValue: 2});
        expect(copy?.sceneCharacters[0]?.headingBlockId).not.toBe('h1');
        expect(copy?.sceneCharacters[0]?.characterId).not.toBe('c1');
        expect((await repository.loadLatest('s1'))?.content.map(node => node.attrs?.id)).toEqual(['h1', 'h2']);
        expect((await repository.listSceneCharacters('s1')).map(row => row.note)).toEqual(['Waits', 'Leaves']);
    });

    it('flushes before snapshot, stores only active metadata, opens read-only, and restores exact records', async () => {
        const {repository, fileStorage} = await setup();
        const saved = await createScriptSnapshotFromCurrent({
            repository,
            scriptId: 's1',
            kind: 'draft',
            flush: () => repository.saveLatest('s1', doc(['h1'])),
        });

        if (!saved) throw new Error('Missing draft');

        const loaded = await loadScriptSnapshot({
            repository,
            scriptId: 's1',
            snapshotId: saved.id,
        });

        expect(loaded.ok).toBe(true);

        if (!loaded.ok) return;

        expect(loaded.snapshot.sceneCharacters.items).toEqual([
            expect.objectContaining({
                headingBlockId: 'h1',
                note: 'Waits',
                arcValue: 2,
            }),
        ]);

        const views = createSnapshotViewRepository({createLocalDb: async () => (await createTestDb()).db, fileStorage});
        const reader = await views.open(loaded.snapshot);

        expect(await reader.listSceneCharacters('s1')).toEqual([expect.objectContaining({note: 'Waits', arcValue: 2})]);
        expect(await reader.getScriptSceneSynopsesSource('s1').read()).toEqual([{headingBlockId: 'h1', synopsis: 'Waiting'}]);
        await expect(reader.updateSceneSynopsis('s1', 'h1', 'No')).rejects.toThrow('read-only');
        await repository.putSceneCharacter('s1', 'h1', 'c1', {note: 'Changed', arcValue: -3});
        await repository.updateSceneSynopsis('s1', 'h1', 'Changed');
        await repository.saveLatest('s1', doc(['h1', 'h2']));
        await repository.putSceneCharacter('s1', 'h2', 'c1', {note: 'Detached'});
        await repository.saveLatest('s1', doc(['h1']));

        const restored = await restoreScriptSnapshot({
            repository,
            scriptId: 's1',
            snapshot: saved,
        });

        expect(restored.ok).toBe(true);
        expect(await repository.listSceneCharacters('s1')).toEqual([
            expect.objectContaining({
                headingBlockId: 'h1',
                note: 'Waits',
                arcValue: 2,
            }),
        ]);
        expect((await repository.getScriptPackageSource('s1'))?.scenes[0]?.synopsis).toBe('Waiting');

        if (restored.ok && restored.backup) {
            const backup = await loadScriptSnapshot({
                repository,
                scriptId: 's1',
                snapshotId: restored.backup.id,
            });

            expect(backup.ok).toBe(true);

            if (backup.ok) expect(backup.snapshot.sceneCharacters.items).toEqual([expect.objectContaining({note: 'Changed', arcValue: -3})]);
        }
    });
});
