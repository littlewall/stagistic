import {
    createLocalPgliteRepository,
    InMemoryFileStorage,
    ReadOnlyScriptRepositoryError,
    type ScriptRepository,
} from '@stagistic/db';
import {createTestDb} from '@stagistic/db/testing';
import {createEmptyScriptDocument} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createSnapshotViewRepository} from './createSnapshotViewRepository';
import {createScriptSnapshotFromCurrent, loadScriptSnapshot} from './scriptSnapshotOperations';

const SCRIPT_ID = 'script-1';

const setup = async () => {
    const {db} = await createTestDb();
    const fileStorage = new InMemoryFileStorage();
    const live = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage,
    });
    let createdDatabases = 0;
    const views = createSnapshotViewRepository({
        createLocalDb: async () => {
            createdDatabases += 1;

            return (await createTestDb()).db;
        },
        fileStorage,
    });

    await live.createScriptWithId({
        id: SCRIPT_ID,
        title: 'The door',
        initialContent: createEmptyScriptDocument(),
    });

    const snapshotOf = async (title: string) => {
        await live.renameScriptTitle(SCRIPT_ID, title);

        const snapshot = await createScriptSnapshotFromCurrent({
            repository: live,
            scriptId: SCRIPT_ID,
            kind: 'draft',
        });
        const loaded = await loadScriptSnapshot({
            repository: live,
            scriptId: SCRIPT_ID,
            snapshotId: requireValue(snapshot).id,
        });

        if (!loaded.ok) throw new Error('snapshot did not load');

        return loaded.snapshot;
    };

    return {
        live,
        views,
        snapshotOf,
        getCreatedDatabases: () => createdDatabases,
    };
};

const mutations = (repository: ScriptRepository) => [
    () => repository.saveLatest(SCRIPT_ID, createEmptyScriptDocument()),
    () => repository.renameScriptTitle(SCRIPT_ID, 'Changed'),
    () => repository.setActiveBlock(SCRIPT_ID, null),
    () => repository.createScriptMusic(SCRIPT_ID, {title: 'Song', kind: 'song'}),
    () => repository.saveScriptSettings(SCRIPT_ID, {}),
    () => repository.deleteScript(SCRIPT_ID),
];

describe('snapshot view repository', () => {
    it('serves the stored state and rejects every mutation', async () => {
        const {views, snapshotOf} = await setup();
        const repository = await views.open(await snapshotOf('Draft one title'));

        expect((await repository.getScriptSummary(SCRIPT_ID))?.title).toBe('Draft one title');
        expect(await repository.loadLatest(SCRIPT_ID)).not.toBeNull();

        for (const mutate of mutations(repository)) {
            await expect(mutate()).rejects.toBeInstanceOf(ReadOnlyScriptRepositoryError);
        }
    });

    it('reuses one database and replaces the previously opened state', async () => {
        const {
            live,
            views,
            snapshotOf,
            getCreatedDatabases,
        } = await setup();
        const first = await snapshotOf('First');
        const second = await snapshotOf('Second');

        await views.open(first);

        const repository = await views.open(second);

        expect(getCreatedDatabases()).toBe(1);
        expect((await repository.listScripts()).map(script => script.title)).toEqual(['Second']);
        expect((await live.getScriptSummary(SCRIPT_ID))?.title).toBe('Second');
    });
});
