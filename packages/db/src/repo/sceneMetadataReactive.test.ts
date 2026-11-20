import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createLocalPgliteRepository, InMemoryFileStorage} from '../index';
import {scriptSceneCharacters, scriptScenes} from '../schema';
import {createLiveTestDb} from '../testing/createLiveTestDb';
import {createReadOnlyScriptRepository} from './readOnlyScriptRepository';

const waitFor = async (condition: () => boolean) => {
    await expect.poll(condition).toBe(true);
};

describe('scene metadata reactive sources', () => {
    it('publishes SQL updates and heading removal to normal and read-only readers', async () => {
        const {db} = await createLiveTestDb();
        const repository = createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: new InMemoryFileStorage(),
        });

        await repository.createScriptWithId({
            id: 's1',
            title: 'Test',
            initialContent: {type: 'doc', content: [{type: 'scene', attrs: {id: 'h1'}}]},
        });
        await repository.confirmScriptCharacterWithId('s1', {id: 'c1', key: 'ANNA'});

        const reader = createReadOnlyScriptRepository(repository);
        const characters: string[][] = [];
        const synopses: (string | null)[][] = [];
        const stopCharacters = await reader.getScriptSceneCharactersSource('s1').subscribe(rows => {
            characters.push(rows.map(row => row.note ?? ''));
        });
        const stopSynopses = await reader.getScriptSceneSynopsesSource('s1').subscribe(rows => {
            synopses.push(rows.map(row => row.synopsis));
        });

        try {
            await db.insert(scriptSceneCharacters).values({
                scriptId: 's1',
                headingBlockId: 'h1',
                characterId: 'c1',
                note: 'Leaves',
                arcValue: 2,
                createdAt: 1,
                updatedAt: 1,
            });
            await db.update(scriptScenes).set({synopsis: 'Goodbye'});
            await waitFor(() => characters.some(rows => rows[0] === 'Leaves') && synopses.some(rows => rows[0] === 'Goodbye'));
            await repository.saveLatest('s1', {type: 'doc', content: [{type: 'stageDirection', attrs: {id: 'a1'}}]});
            await waitFor(() => characters.at(-1)?.length === 0 && synopses.at(-1)?.length === 0);
        } finally {
            stopCharacters();
            stopSynopses();
        }
    });
});
