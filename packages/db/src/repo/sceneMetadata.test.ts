import {eq} from 'drizzle-orm';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createLocalPgliteRepository, InMemoryFileStorage} from '../index';
import {scriptCharacters, scripts} from '../schema';
import {createTestDb} from '../testing/createTestDb';
import {createReadOnlyScriptRepository} from './readOnlyScriptRepository';
import {createSceneMetadataHandlers} from './sceneMetadata';
import type {RecordOutbox} from './types';

const setup = async () => {
    const {db} = await createTestDb();
    const syncToFs = vi.fn(() => Promise.resolve());
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs,
        fileStorage: new InMemoryFileStorage(),
    });

    await repository.createScriptWithId({
        id: 's1',
        title: 'Test',
        initialContent: {type: 'doc', content: [{type: 'scene', attrs: {id: 'h1'}}]},
    });
    await repository.confirmScriptCharacterWithId('s1', {id: 'c1', key: 'ANNA'});

    const recordOutbox = vi.fn<RecordOutbox>(() => Promise.resolve());
    const handlers = createSceneMetadataHandlers({
        getDb: () => Promise.resolve(db),
        syncDb: syncToFs,
        recordOutbox,
    });

    return {
        db,
        repository: {...repository, ...handlers},
        syncToFs,
        recordOutbox,
    };
};

describe('scene metadata repository', () => {
    it('stores partial updates, normalizes empty text, records outbox operations and syncs', async () => {
        const {
            repository,
            syncToFs,
            recordOutbox,
        } = await setup();

        syncToFs.mockClear();
        await repository.putSceneCharacter('s1', 'h1', 'c1', {note: '  Wants to leave  ', arcValue: 2});
        await repository.putSceneCharacter('s1', 'h1', 'c1', {note: '  '});
        expect(await repository.listSceneCharacters('s1')).toEqual([
            expect.objectContaining({
                headingBlockId: 'h1',
                characterId: 'c1',
                note: null,
                arcValue: 2,
            }),
        ]);
        expect(await repository.updateSceneSynopsis('s1', 'h1', '  A goodbye  ')).toBe(true);
        expect((await repository.getScriptPackageSource('s1'))?.scenes[0]?.synopsis).toBe('A goodbye');
        await repository.updateSceneSynopsis('s1', 'h1', ' ');
        expect((await repository.getScriptPackageSource('s1'))?.scenes[0]?.synopsis).toBeNull();
        await repository.removeSceneCharacter('s1', 'h1', 'c1');
        expect(await repository.listSceneCharacters('s1')).toEqual([]);
        expect(recordOutbox.mock.calls.map(([row]) => row.opType)).toEqual(expect.arrayContaining([
            'scene.character.put',
            'scene.character.remove',
            'scene.synopsis.update',
        ]));
        expect(syncToFs).toHaveBeenCalledTimes(5);
    });

    it('rejects invalid arcs, missing headings and characters from another script', async () => {
        const {repository} = await setup();

        await expect(repository.putSceneCharacter('s1', 'h1', 'c1', {arcValue: 4})).rejects.toThrow();
        await expect(repository.putSceneCharacter('s1', 'h1', 'c1', {arcValue: 1.5})).rejects.toThrow();
        expect(await repository.updateSceneSynopsis('s1', 'missing', 'No')).toBe(false);
        expect(await repository.putSceneCharacter('s1', 'missing', 'c1', {})).toBeNull();
        await repository.createScriptWithId({id: 's2', title: 'Other'});
        await repository.confirmScriptCharacterWithId('s2', {id: 'c2', key: 'BEN'});
        expect(await repository.putSceneCharacter('s1', 'h1', 'c2', {})).toBeNull();
    });

    it('cascades character and script deletion and rejects read-only mutations', async () => {
        const {db, repository} = await setup();
        const readonly = createReadOnlyScriptRepository(repository);

        await expect(readonly.putSceneCharacter('s1', 'h1', 'c1', {})).rejects.toThrow('read-only');
        await expect(readonly.removeSceneCharacter('s1', 'h1', 'c1')).rejects.toThrow('read-only');
        await expect(readonly.updateSceneSynopsis('s1', 'h1', 'No')).rejects.toThrow('read-only');
        await repository.putSceneCharacter('s1', 'h1', 'c1', {});
        await db.delete(scriptCharacters).where(eq(scriptCharacters.id, 'c1'));
        expect(await readonly.listSceneCharacters('s1')).toEqual([]);
        await repository.confirmScriptCharacterWithId('s1', {id: 'c3', key: 'CLARA'});
        await repository.putSceneCharacter('s1', 'h1', 'c3', {});
        await db.delete(scripts).where(eq(scripts.id, 's1'));
        expect(await repository.listSceneCharacters('s1')).toEqual([]);
    });
});
